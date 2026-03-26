/**
 * CQL Pre-population Service
 *
 * Executes CQL expressions from FHIR Questionnaire `cqf-expression` / `initialExpression`
 * extensions against patient FHIR data to produce a pre-populated QuestionnaireResponse.
 *
 * Flow:
 * 1. Extract CQL library references from Questionnaire extensions
 * 2. Load the CQL Library resource (ELM JSON) from the FHIR server
 * 3. Fetch relevant patient data (conditions, observations, etc.)
 * 4. Execute CQL expressions via cql-execution engine
 * 5. Map results back to QuestionnaireResponse answers
 */
import { Library as CqlLibrary, Repository, Executor, PatientContext, CodeService } from "cql-execution"
import cqlFhir from "cql-exec-fhir"
import type {
  Patient,
  Questionnaire,
  QuestionnaireItem,
  QuestionnaireResponse,
  QuestionnaireResponseItem,
  Bundle,
  Library,
} from "fhir/r4"
import { authFetch, fhirBaseUrl } from "./fhir-client"

// CQL extension URLs used by DTR / CQF Questionnaires
const CQF_LIBRARY_URL = "http://hl7.org/fhir/StructureDefinition/cqf-library"
const INIT_EXPRESSION_URL = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression"
const CQF_EXPRESSION_URL = "http://hl7.org/fhir/StructureDefinition/cqf-expression"
const LAUNCH_CONTEXT_URL = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext"

/** Result of CQL pre-population */
export interface PrePopulationResult {
  /** Pre-populated QuestionnaireResponse (items with initial values) */
  questionnaireResponse: QuestionnaireResponse
  /** CQL expression names that were evaluated */
  evaluatedExpressions: string[]
  /** Whether a CQL library was found and executed */
  cqlExecuted: boolean
}

/**
 * Extract CQL Library canonical URLs from Questionnaire extensions
 */
function extractCqlLibraryRefs(questionnaire: Questionnaire): string[] {
  const refs: string[] = []

  // Check cqf-library extension on root
  for (const ext of questionnaire.extension ?? []) {
    if (ext.url === CQF_LIBRARY_URL && ext.valueCanonical) {
      refs.push(ext.valueCanonical)
    }
  }

  return refs
}

/**
 * Extract CQL expression references from Questionnaire items (recursive)
 */
function extractItemExpressions(
  items: QuestionnaireItem[]
): Map<string, { expression: string; language: string }> {
  const exprs = new Map<string, { expression: string; language: string }>()

  function walk(itemList: QuestionnaireItem[]) {
    for (const item of itemList) {
      for (const ext of item.extension ?? []) {
        if (
          (ext.url === INIT_EXPRESSION_URL || ext.url === CQF_EXPRESSION_URL) &&
          ext.valueExpression?.expression
        ) {
          exprs.set(item.linkId, {
            expression: ext.valueExpression.expression,
            language: ext.valueExpression.language ?? "text/cql",
          })
        }
      }
      if (item.item?.length) walk(item.item)
    }
  }

  walk(items)
  return exprs
}

/**
 * Fetch a FHIR Library resource and extract ELM JSON content
 */
async function fetchElmLibrary(libraryRef: string): Promise<object | null> {
  try {
    // libraryRef could be a canonical URL or Library/id
    let url: string
    if (libraryRef.startsWith("Library/")) {
      url = `${fhirBaseUrl}/${libraryRef}`
    } else {
      // Canonical URL — search by url
      url = `${fhirBaseUrl}/Library?url=${encodeURIComponent(libraryRef)}&_count=1`
    }

    const res = await authFetch(url, {
      headers: { Accept: "application/fhir+json" },
    })
    if (!res.ok) return null

    const data = await res.json()
    let library: Library

    if (data.resourceType === "Bundle") {
      const bundle = data as Bundle
      library = bundle.entry?.[0]?.resource as Library
      if (!library) return null
    } else {
      library = data as Library
    }

    // Find ELM JSON content (application/elm+json)
    const elmContent = library.content?.find(
      (c) => c.contentType === "application/elm+json"
    )

    if (elmContent?.data) {
      const decoded = atob(elmContent.data)
      return JSON.parse(decoded)
    }

    return null
  } catch {
    return null
  }
}

/**
 * Fetch patient context data for CQL execution
 */
async function fetchPatientBundle(patientId: string): Promise<Bundle> {
  // Fetch patient + relevant resources via $everything or manual queries
  const resourceTypes = [
    "Patient",
    "Condition",
    "Observation",
    "MedicationRequest",
    "Procedure",
    "AllergyIntolerance",
    "Coverage",
    "ServiceRequest",
  ]

  const entries: Bundle["entry"] = []

  // Fetch each resource type for the patient
  for (const type of resourceTypes) {
    try {
      const param = type === "Patient" ? "_id" : "patient"
      const url = `${fhirBaseUrl}/${type}?${param}=${patientId}&_count=100`
      const res = await authFetch(url, {
        headers: { Accept: "application/fhir+json" },
      })
      if (res.ok) {
        const bundle = (await res.json()) as Bundle
        if (bundle.entry) {
          entries.push(...bundle.entry)
        }
      }
    } catch {
      // Continue with other resource types
    }
  }

  return {
    resourceType: "Bundle",
    type: "searchset",
    entry: entries,
  }
}

/**
 * Convert a CQL result value to a FHIR answer
 */
function cqlValueToAnswer(
  value: unknown,
  item: QuestionnaireItem
): QuestionnaireResponseItem["answer"] {
  if (value == null) return undefined

  switch (item.type) {
    case "boolean":
      return [{ valueBoolean: Boolean(value) }]
    case "integer":
      return [{ valueInteger: typeof value === "number" ? Math.round(value) : parseInt(String(value), 10) }]
    case "decimal":
      return [{ valueDecimal: typeof value === "number" ? value : parseFloat(String(value)) }]
    case "date":
      // CQL Date objects have a toString()
      return [{ valueDate: String(value) }]
    case "dateTime":
      return [{ valueDateTime: String(value) }]
    case "string":
    case "text":
    case "url":
      return [{ valueString: String(value) }]
    case "choice": {
      if (typeof value === "object" && value !== null && "code" in value) {
        const coding = value as { code: string; system?: string; display?: string }
        return [{ valueCoding: { code: coding.code, system: coding.system, display: coding.display } }]
      }
      return [{ valueString: String(value) }]
    }
    default:
      return [{ valueString: String(value) }]
  }
}

/**
 * Pre-populate a Questionnaire using CQL expressions
 *
 * @param questionnaire - FHIR Questionnaire with CQL extensions
 * @param patient - The current patient
 * @returns Pre-populated QuestionnaireResponse, or a minimal empty one if no CQL found
 */
export async function prePopulateWithCql(
  questionnaire: Questionnaire,
  patient: Patient
): Promise<PrePopulationResult> {
  const emptyResult: PrePopulationResult = {
    questionnaireResponse: {
      resourceType: "QuestionnaireResponse",
      questionnaire: questionnaire.url ?? `Questionnaire/${questionnaire.id}`,
      status: "in-progress",
      subject: { reference: `Patient/${patient.id}` },
      authored: new Date().toISOString(),
      item: [],
    },
    evaluatedExpressions: [],
    cqlExecuted: false,
  }

  // 1. Extract CQL library references
  const libraryRefs = extractCqlLibraryRefs(questionnaire)
  if (libraryRefs.length === 0) return emptyResult

  // 2. Extract item-level CQL expressions
  const itemExpressions = extractItemExpressions(questionnaire.item ?? [])
  if (itemExpressions.size === 0) return emptyResult

  // 3. Fetch ELM libraries
  const elmLibraries: object[] = []
  for (const ref of libraryRefs) {
    const elm = await fetchElmLibrary(ref)
    if (elm) elmLibraries.push(elm)
  }

  if (elmLibraries.length === 0) return emptyResult

  // 4. Fetch patient data for CQL context
  const patientBundle = await fetchPatientBundle(patient.id!)

  // 5. Execute CQL
  try {
    const repository = new Repository(elmLibraries)
    const mainLib = new CqlLibrary(elmLibraries[0], repository)
    const codeService = new CodeService({})
    const executor = new Executor(mainLib, codeService)

    // Create FHIR-based patient source from the bundle
    const patientSource = cqlFhir.PatientSource.FHIRv401()
    patientSource.loadBundles([patientBundle])

    const results = await executor.exec(patientSource)
    const patientResults = results.patientResults[patient.id!] ?? {}

    // 6. Map CQL results to QuestionnaireResponse items
    const evaluatedExpressions: string[] = []

    function buildItems(qItems: QuestionnaireItem[]): QuestionnaireResponseItem[] {
      const responseItems: QuestionnaireResponseItem[] = []

      for (const qItem of qItems) {
        const responseItem: QuestionnaireResponseItem = {
          linkId: qItem.linkId,
          text: qItem.text,
        }

        // Check if this item has a CQL expression
        const expr = itemExpressions.get(qItem.linkId)
        if (expr) {
          const cqlResult = patientResults[expr.expression]
          if (cqlResult !== undefined) {
            const answer = cqlValueToAnswer(cqlResult, qItem)
            if (answer) {
              responseItem.answer = answer
              evaluatedExpressions.push(expr.expression)
            }
          }
        }

        // Recurse into nested items
        if (qItem.item?.length) {
          responseItem.item = buildItems(qItem.item)
        }

        responseItems.push(responseItem)
      }

      return responseItems
    }

    const items = buildItems(questionnaire.item ?? [])

    return {
      questionnaireResponse: {
        resourceType: "QuestionnaireResponse",
        questionnaire: questionnaire.url ?? `Questionnaire/${questionnaire.id}`,
        status: "in-progress",
        subject: { reference: `Patient/${patient.id}` },
        authored: new Date().toISOString(),
        item: items,
      },
      evaluatedExpressions,
      cqlExecuted: true,
    }
  } catch (err) {
    console.warn("[CQL Pre-population] CQL execution failed:", err)
    return emptyResult
  }
}
