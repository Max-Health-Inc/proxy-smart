/**
 * Document Import Pipeline
 *
 * PDF → OCR/extract → AI (generate FHIR JSON) → babelfhir-ts validate() loop
 *
 * Returns validated resources to the caller — the SMART app (patient portal)
 * is responsible for persisting them through the FHIR proxy using its own
 * access token so that scope enforcement, consent, and audit all apply.
 *
 * PDF extraction engines (caller chooses):
 * - opendataloader — local, deterministic, no cloud calls (requires Java 11+)
 *
 * Also uses:
 * - Vercel AI SDK generateText with Output.json() for FHIR generation
 * - babelfhir-ts IPS-generated classes for FHIRPath-based validation
 * - Self-healing loop: validation errors are fed back to the LLM (max 10 retries)
 */

import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { extractTextFromPdf as opendataloaderExtract } from '@/lib/pdf-extract-opendataloader'
import type { PdfExtractResult, PdfEngine } from '@/lib/pdf-extract-types'
import { logger } from '@/lib/logger'
import {
  PatientUvIpsClass,
  ConditionUvIpsClass,
  AllergyIntoleranceUvIpsClass,
  MedicationRequestIPSClass,
  MedicationStatementIPSClass,
  ObservationResultsLaboratoryPathologyUvIpsClass,
  ObservationResultsRadiologyUvIpsClass,
  ImmunizationUvIpsClass,
  ProcedureUvIpsClass,
  DiagnosticReportUvIpsClass,
} from 'hl7.fhir.uv.ips-generated'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DocumentImportResult {
  fileName: string
  pagesProcessed: number
  extractedText: string
  /** Which PDF extraction engine was used */
  engine: PdfEngine
  /** Validated FHIR resources ready for the client to POST through the FHIR proxy */
  resources: ValidatedResource[]
  /** Resources that could not be fixed after all retries */
  failed: FailedResource[]
  /** Pre-built DocumentReference for the original PDF (client should POST this too) */
  documentReference: fhir4.DocumentReference
  processingTimeMs: number
}

export interface ValidatedResource {
  resourceType: string
  resource: fhir4.Resource
  /** 0 = first attempt passed */
  retriesNeeded: number
  warnings: string[]
}

export interface FailedResource {
  resourceType: string
  resource: unknown
  errors: string[]
  warnings: string[]
  retriesAttempted: number
}

export interface DocumentImportOptions {
  patientId: string
  maxRetries?: number
  model?: string
  /** PDF extraction engine. Default: 'opendataloader' */
  engine?: PdfEngine
}

// ---------------------------------------------------------------------------
// resourceType → babelfhir-ts Class mapping
// ---------------------------------------------------------------------------

type ValidatableClass = {
  new (resource: unknown): { validate(): Promise<{ errors: string[]; warnings: string[] }> }
}

const RESOURCE_CLASS_MAP: Record<string, ValidatableClass> = {
  Patient: PatientUvIpsClass as unknown as ValidatableClass,
  Condition: ConditionUvIpsClass as unknown as ValidatableClass,
  AllergyIntolerance: AllergyIntoleranceUvIpsClass as unknown as ValidatableClass,
  MedicationRequest: MedicationRequestIPSClass as unknown as ValidatableClass,
  MedicationStatement: MedicationStatementIPSClass as unknown as ValidatableClass,
  Observation: ObservationResultsRadiologyUvIpsClass as unknown as ValidatableClass,
  Immunization: ImmunizationUvIpsClass as unknown as ValidatableClass,
  Procedure: ProcedureUvIpsClass as unknown as ValidatableClass,
  DiagnosticReport: DiagnosticReportUvIpsClass as unknown as ValidatableClass,
}

const LAB_OBSERVATION_CATEGORIES = ['laboratory', 'LAB']

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const FHIR_GENERATION_SYSTEM_PROMPT = `You are a clinical data extraction expert. Given markdown text extracted from a medical document (lab report, discharge summary, prescription, etc.), generate valid FHIR R4 resources.

Rules:
- Output a JSON object with a "resources" array containing FHIR R4 resources
- Each resource MUST have a valid "resourceType" field
- Use IPS (International Patient Summary) profile conventions
- Do NOT include meta.tag on extracted resources — provenance is tracked separately on the DocumentReference
- For Patient resources, include name, birthDate, gender when available
- For Observations, include code (LOINC preferred), value, effectiveDateTime, status
- For Conditions, include code (SNOMED preferred), clinicalStatus, verificationStatus
- For MedicationRequests, include medicationCodeableConcept, dosageInstruction
- For AllergyIntolerance, include code, clinicalStatus, type, category
- Use proper FHIR coding systems: http://loinc.org, http://snomed.info/sct, http://www.nlm.nih.gov/research/umls/rxnorm
- All resources must have status fields set appropriately
- Do NOT include resource IDs — the FHIR server will assign them
- Reference the patient as "Patient/{patientId}" where patientId is provided in the prompt`

// ---------------------------------------------------------------------------
// Pipeline steps
// ---------------------------------------------------------------------------

/** Step 1: Extract text from a PDF using the chosen engine */
export async function extractTextFromPdf(
  filePath: string,
  _engine: PdfEngine = 'opendataloader',
): Promise<PdfExtractResult> {
  return opendataloaderExtract(filePath)
}

/** Step 2: Ask the LLM to produce FHIR resources from the OCR text */
async function generateFhirResources(
  markdown: string,
  patientId: string,
  model: string,
): Promise<fhir4.Resource[]> {
  const { output } = await generateText({
    model: openai(model),
    output: Output.json(),
    system: FHIR_GENERATION_SYSTEM_PROMPT,
    prompt: `Extract FHIR R4 resources from the following clinical document. The patient reference is "Patient/${patientId}".

Document content:
${markdown}`,
  })

  const parsed = output as { resources?: unknown[] } | null
  if (!parsed?.resources || !Array.isArray(parsed.resources)) {
    throw new Error('AI did not return a valid { resources: [...] } structure')
  }
  return parsed.resources as fhir4.Resource[]
}

/** Step 3: Validate one resource with babelfhir-ts, self-healing up to maxRetries */
async function validateWithRetry(
  resource: fhir4.Resource,
  patientId: string,
  model: string,
  maxRetries: number,
): Promise<ValidatedResource | FailedResource> {
  const resourceType = (resource as { resourceType?: string }).resourceType
  if (!resourceType) {
    return { resourceType: 'Unknown', resource, errors: ['Missing resourceType'], warnings: [], retriesAttempted: 0 }
  }

  let ClassRef = RESOURCE_CLASS_MAP[resourceType]
  if (!ClassRef) {
    return { resourceType, resource, retriesNeeded: 0, warnings: [`No IPS validator for ${resourceType}`] }
  }

  // Pick lab-specific validator when appropriate
  if (resourceType === 'Observation') {
    const obs = resource as fhir4.Observation
    const cats = obs.category?.flatMap(c => c.coding?.map(cd => cd.code) ?? []) ?? []
    if (cats.some(c => c && LAB_OBSERVATION_CATEGORIES.includes(c))) {
      ClassRef = ObservationResultsLaboratoryPathologyUvIpsClass as unknown as ValidatableClass
    }
  }

  let current = resource
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { errors, warnings } = await new ClassRef(current).validate()

      if (errors.length === 0) {
        return { resourceType, resource: current, retriesNeeded: attempt, warnings }
      }
      if (attempt === maxRetries) {
        return { resourceType, resource: current, errors, warnings, retriesAttempted: attempt }
      }

      logger.server.info('🔄 Validation failed, retrying', { resourceType, attempt: attempt + 1, errorCount: errors.length })

      const { output } = await generateText({
        model: openai(model),
        output: Output.json(),
        system: `You are a FHIR R4 validation expert. Fix the given FHIR resource based on the validation errors.
Return ONLY the corrected resource as a JSON object (not wrapped in anything).
The patient reference should be "Patient/${patientId}".
Do NOT change the resourceType. Keep all existing data, only fix the errors.`,
        prompt: `Fix this ${resourceType} resource:\n\n${JSON.stringify(current, null, 2)}\n\nValidation errors:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`,
      })

      if (output && typeof output === 'object') {
        current = output as unknown as fhir4.Resource
      }
    } catch (err) {
      logger.server.error('Validation error', { resourceType, attempt, error: err })
      if (attempt === maxRetries) {
        return { resourceType, resource: current, errors: [`Validation threw: ${err instanceof Error ? err.message : String(err)}`], warnings: [], retriesAttempted: attempt }
      }
    }
  }

  return { resourceType, resource: current, errors: ['Exhausted retries'], warnings: [], retriesAttempted: maxRetries }
}

/** Build a DocumentReference wrapping the original PDF as base64 attachment */
function buildDocumentReference(patientId: string, fileName: string, pdfBase64: string): fhir4.DocumentReference {
  return {
    resourceType: 'DocumentReference',
    status: 'current',
    type: { coding: [{ system: 'http://loinc.org', code: '11502-2', display: 'Laboratory report' }] },
    subject: { reference: `Patient/${patientId}` },
    date: new Date().toISOString(),
    description: `Imported document: ${fileName}`,
    content: [{ attachment: { contentType: 'application/pdf', data: pdfBase64, title: fileName } }],
    meta: { tag: [{ system: 'http://proxy-smart.dev/tags', code: 'patient-submitted' }] },
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Run the document import pipeline (OCR → AI → validate).
 *
 * Returns validated resources + a DocumentReference for the original PDF.
 * The caller (SMART app) is responsible for POSTing these through the FHIR
 * proxy using its own access token — this ensures scope enforcement, consent
 * checks, and audit logging all happen correctly.
 */
export async function importDocument(
  filePath: string,
  fileName: string,
  pdfBase64: string,
  options: DocumentImportOptions,
): Promise<DocumentImportResult> {
  const start = performance.now()
  const maxRetries = options.maxRetries ?? 10
  const model = options.model ?? 'gpt-5.4'
  const engine = options.engine ?? 'opendataloader'

  // Step 1: Extract text from PDF
  const { markdown, pages } = await extractTextFromPdf(filePath, engine)

  // Step 2: AI generates FHIR resources
  const rawResources = await generateFhirResources(markdown, options.patientId, model)
  logger.server.info('🤖 AI generated resources', {
    count: rawResources.length,
    types: rawResources.map(r => (r as { resourceType?: string }).resourceType),
  })

  // Step 3: Validate each with babelfhir-ts self-healing loop
  const results = await Promise.all(
    rawResources.map(r => validateWithRetry(r, options.patientId, model, maxRetries)),
  )

  const resources: ValidatedResource[] = []
  const failed: FailedResource[] = []
  for (const r of results) {
    if ('errors' in r) failed.push(r)
    else resources.push(r)
  }

  logger.server.info('✅ Validation complete', { validated: resources.length, failed: failed.length })

  // Step 4: Build DocumentReference (returned to the client, NOT persisted here)
  const documentReference = buildDocumentReference(options.patientId, fileName, pdfBase64)

  return {
    fileName,
    pagesProcessed: pages,
    extractedText: markdown,
    engine,
    resources,
    failed,
    documentReference,
    processingTimeMs: Math.round(performance.now() - start),
  }
}

// ---------------------------------------------------------------------------
// Text-based generation (Patient Scribe)
// ---------------------------------------------------------------------------

export interface ScribeResult {
  resources: ValidatedResource[]
  failed: FailedResource[]
  processingTimeMs: number
}

/**
 * Generate FHIR resources from free text (no PDF involved).
 * Reuses the same AI generation prompt + babelfhir-ts validation loop.
 */
export async function generateFromText(
  text: string,
  options: { patientId: string; maxRetries?: number; model?: string },
): Promise<ScribeResult> {
  const start = performance.now()
  const maxRetries = options.maxRetries ?? 10
  const model = options.model ?? 'gpt-5.4'

  const rawResources = await generateFhirResources(text, options.patientId, model)
  logger.server.info('🤖 Scribe generated resources', {
    count: rawResources.length,
    types: rawResources.map(r => (r as { resourceType?: string }).resourceType),
  })

  const results = await Promise.all(
    rawResources.map(r => validateWithRetry(r, options.patientId, model, maxRetries)),
  )

  const resources: ValidatedResource[] = []
  const failed: FailedResource[] = []
  for (const r of results) {
    if ('errors' in r) failed.push(r)
    else resources.push(r)
  }

  return {
    resources,
    failed,
    processingTimeMs: Math.round(performance.now() - start),
  }
}
