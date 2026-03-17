import type { Patient } from "fhir/r4"
import type { PASClaim } from "hl7.fhir.us.davinci-pas-generated"
import type { SelectedService } from "@/components/ServiceSelector"

interface BuildClaimParams {
  patient: Patient
  service: SelectedService
  questionnaireResponseId?: string
}

/**
 * Build a PAS-compliant Claim resource for prior authorization.
 *
 * Da Vinci PAS IG profile: http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-claim
 */
export function buildPasClaim({ patient, service, questionnaireResponseId }: BuildClaimParams): PASClaim {
  const now = new Date().toISOString()

  const claim: PASClaim = {
    resourceType: "Claim",
    status: "active",
    use: "preauthorization",
    identifier: [{
      system: "https://proxy-smart.com/fhir/claim-id",
      value: crypto.randomUUID(),
    }],
    type: {
      coding: [{
        system: "http://terminology.hl7.org/CodeSystem/claim-type",
        code: service.procedure.category === "dental" ? "oral" : "professional",
      }],
    },
    patient: {
      reference: `Patient/${patient.id}`,
      display: formatPatientName(patient),
    },
    created: now,
    priority: {
      coding: [{
        system: "http://terminology.hl7.org/CodeSystem/processpriority",
        code: "normal",
      }],
    },
    insurer: {
      display: "Payer (via PAS)",
    },
    provider: {
      display: "Requesting Provider",
    },
    insurance: [{
      sequence: 1,
      focal: true,
      coverage: { display: "Patient coverage" },
    }],
    diagnosis: service.diagnosis ? [{
      sequence: 1,
      diagnosisCodeableConcept: service.diagnosis.code,
    }] : service.diagnosisText ? [{
      sequence: 1,
      diagnosisCodeableConcept: {
        text: service.diagnosisText,
      },
    }] : undefined,
    procedure: [{
      sequence: 1,
      procedureCodeableConcept: {
        coding: [{
          system: service.procedure.system,
          code: service.procedure.code,
          display: service.procedure.display,
        }],
      },
    }],
    item: [{
      sequence: 1,
      category: {
        coding: [{
          system: "http://terminology.hl7.org/CodeSystem/ex-benefitcategory",
          code: "1",
          display: "Medical Care",
        }],
      },
      productOrService: {
        coding: [{
          system: "http://terminology.hl7.org/CodeSystem/data-absent-reason" as const,
          code: "not-applicable" as const,
          display: "Not Applicable",
        }],
      },
      quantity: { value: 1 },
      extension: [{
        url: "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-requestedService" as const,
        valueReference: {
          display: `${service.procedure.code} - ${service.procedure.display}`,
        },
      }],
    }],
    // Link to QuestionnaireResponse supporting info
    supportingInfo: questionnaireResponseId ? [{
      sequence: 1,
      category: {
        coding: [{
          system: "http://hl7.org/fhir/us/davinci-pas/CodeSystem/PASSupportingInfoType",
          code: "questionnaire",
          display: "Questionnaire Response",
        }],
      },
      valueReference: {
        reference: `QuestionnaireResponse/${questionnaireResponseId}`,
      },
    }] : undefined,
  }

  return claim
}

function formatPatientName(patient: Patient): string {
  const name = patient.name?.[0]
  if (!name) return "Unknown"
  const parts: string[] = []
  if (name.given?.length) parts.push(name.given.join(" "))
  if (name.family) parts.push(name.family)
  return parts.join(" ") || name.text || "Unknown"
}
