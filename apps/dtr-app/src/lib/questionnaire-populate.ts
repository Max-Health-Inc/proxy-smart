/**
 * Questionnaire Pre-population Service
 *
 * Uses the FHIR server's Questionnaire/$populate operation to produce a
 * pre-populated QuestionnaireResponse. The server handles all CQL / FHIRPath
 * expression evaluation, library resolution, and patient data fetching.
 *
 * Falls back to an empty QuestionnaireResponse if the server doesn't support
 * $populate — the Smart Forms renderer will still handle SDC initialExpression
 * and calculatedExpression via its built-in FHIRPath engine.
 */
import type { Patient, Questionnaire, QuestionnaireResponse, Parameters } from "fhir/r4"
import type { DTRQuestionnairePackageInputParameters } from "hl7.fhir.us.davinci-dtr-generated"
import { authFetch, fhirBaseUrl } from "./fhir-client"

/** Result of pre-population */
export interface PrePopulationResult {
  /** Pre-populated QuestionnaireResponse */
  questionnaireResponse: QuestionnaireResponse
  /** Whether server-side $populate was used */
  serverPopulated: boolean
}

/**
 * Pre-populate a Questionnaire via the FHIR server's $populate operation.
 *
 * @param questionnaire - FHIR Questionnaire to populate
 * @param patient - The current patient context
 * @returns Pre-populated QuestionnaireResponse, or an empty one if $populate is unavailable
 */
export async function prePopulate(
  questionnaire: Questionnaire,
  patient: Patient
): Promise<PrePopulationResult> {
  const emptyQr: QuestionnaireResponse = {
    resourceType: "QuestionnaireResponse",
    questionnaire: questionnaire.url ?? `Questionnaire/${questionnaire.id}`,
    status: "in-progress",
    subject: { reference: `Patient/${patient.id}` },
    authored: new Date().toISOString(),
    item: [],
  }

  // Try server-side $populate
  try {
    const populateUrl = questionnaire.id
      ? `${fhirBaseUrl}/Questionnaire/${questionnaire.id}/$populate`
      : `${fhirBaseUrl}/Questionnaire/$populate`

    const body: DTRQuestionnairePackageInputParameters = {
      resourceType: "Parameters",
      parameter: [
        ...(questionnaire.id
          ? []
          : [{ name: "questionnaire", resource: questionnaire }]),
        {
          name: "subject",
          valueReference: { reference: `Patient/${patient.id}` },
        },
      ],
    }

    const res = await authFetch(populateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/fhir+json",
        Accept: "application/fhir+json",
      },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const data: QuestionnaireResponse | Parameters = await res.json()

      // $populate returns a QuestionnaireResponse directly or wrapped in Parameters
      let qr: QuestionnaireResponse
      if (data.resourceType === "QuestionnaireResponse") {
        qr = data as QuestionnaireResponse
      } else if (data.resourceType === "Parameters") {
        const params = data as Parameters
        const param = params.parameter?.find(
          (p) => p.name === "response"
        )
        qr = (param?.resource as QuestionnaireResponse) ?? emptyQr
      } else {
        return { questionnaireResponse: emptyQr, serverPopulated: false }
      }

      // Ensure patient subject is set
      qr.subject = { reference: `Patient/${patient.id}` }
      qr.status = "in-progress"

      return { questionnaireResponse: qr, serverPopulated: true }
    }
  } catch {
    // $populate not supported — fall through
  }

  // Fallback: return empty QR — Smart Forms renderer will handle
  // SDC expressions (initialExpression, calculatedExpression, x-fhir-query)
  // via its built-in FHIRPath engine
  return { questionnaireResponse: emptyQr, serverPopulated: false }
}
