import type { Consent, CodeableConcept } from "fhir/r4"

export type ConsentDraft = {
  patientId: string
  practitionerId: string
  practitionerDisplay?: string
  resourceTypes: string[]
  action: "access" | "disclose"
  periodStart: string
  periodEnd?: string
}

const CONSENT_SCOPE: CodeableConcept = {
  coding: [
    {
      system: "http://terminology.hl7.org/CodeSystem/consentscope",
      code: "patient-privacy",
      display: "Privacy Consent",
    },
  ],
}

const CONSENT_CATEGORY: CodeableConcept[] = [
  {
    coding: [
      {
        system: "http://loinc.org",
        code: "57016-8",
        display: "Privacy policy acknowledgment Document",
      },
    ],
  },
]

/**
 * Build a FHIR R4 Consent resource from a draft.
 */
export function buildR4Consent(
  draft: ConsentDraft,
  performerReference: string,
): Consent {
  const consent: Consent = {
    resourceType: "Consent",
    status: "active",
    scope: CONSENT_SCOPE,
    category: CONSENT_CATEGORY,
    patient: { reference: `Patient/${draft.patientId}` },
    dateTime: new Date().toISOString(),
    performer: [{ reference: performerReference }],
    policyRule: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
          code: "OPTIN",
          display: "opt-in",
        },
      ],
    },
    provision: {
      type: "permit",
      period: {
        start: draft.periodStart,
        ...(draft.periodEnd ? { end: draft.periodEnd } : {}),
      },
      actor: [
        {
          role: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                code: "PRCP",
                display: "primary information recipient",
              },
            ],
          },
          reference: {
            reference: `Practitioner/${draft.practitionerId}`,
            ...(draft.practitionerDisplay
              ? { display: draft.practitionerDisplay }
              : {}),
          },
        },
      ],
      action: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/consentaction",
              code: draft.action,
              display: draft.action === "access" ? "Access" : "Disclose",
            },
          ],
        },
      ],
      class: draft.resourceTypes.map((code) => ({
        system: "http://hl7.org/fhir/resource-types",
        code,
      })),
    },
  }

  return consent
}

/** Common FHIR resource types relevant for consent */
export const RESOURCE_TYPE_OPTIONS = [
  { code: "Observation", label: "Observations" },
  { code: "Condition", label: "Conditions" },
  { code: "MedicationRequest", label: "Medications" },
  { code: "DiagnosticReport", label: "Diagnostic Reports" },
  { code: "Encounter", label: "Encounters" },
  { code: "AllergyIntolerance", label: "Allergies" },
  { code: "Procedure", label: "Procedures" },
  { code: "Immunization", label: "Immunizations" },
  { code: "CarePlan", label: "Care Plans" },
  { code: "DocumentReference", label: "Documents" },
] as const
