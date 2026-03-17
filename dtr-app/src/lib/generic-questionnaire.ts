import type { QuestionnaireItem } from "fhir/r4"

/**
 * Generic PA documentation items — used when no payer-specific Questionnaire is found.
 * Modeled after DHCS 6560 (Medi-Cal Rx Prior Authorization Request) and
 * Da Vinci DTR standard documentation requirements.
 */
export const GENERIC_PA_ITEMS: QuestionnaireItem[] = [
  {
    linkId: "pa-urgency",
    text: "Is this request urgent?",
    type: "boolean",
    required: true,
  },
  {
    linkId: "pa-new-or-continuation",
    text: "Request type",
    type: "choice",
    required: true,
    answerOption: [
      { valueCoding: { code: "new", display: "New request" } },
      { valueCoding: { code: "continuation", display: "Continuation of therapy" } },
      { valueCoding: { code: "reauthorization", display: "Re-authorization" } },
    ],
  },
  {
    linkId: "pa-medical-necessity",
    text: "Medical necessity / clinical justification",
    type: "text",
    required: true,
  },
  {
    linkId: "pa-prior-treatments",
    text: "Prior treatments tried and results",
    type: "text",
    required: false,
  },
  {
    linkId: "pa-treatment-start-date",
    text: "Requested treatment start date",
    type: "date",
    required: true,
  },
  {
    linkId: "pa-treatment-duration",
    text: "Estimated treatment duration (days)",
    type: "integer",
    required: false,
  },
  {
    linkId: "pa-quantity",
    text: "Quantity / number of units requested",
    type: "integer",
    required: true,
  },
  {
    linkId: "pa-prescriber-npi",
    text: "Prescriber NPI",
    type: "string",
    required: true,
  },
  {
    linkId: "pa-prescriber-specialty",
    text: "Prescriber specialty",
    type: "string",
    required: false,
  },
  {
    linkId: "pa-facility-name",
    text: "Facility / office name",
    type: "string",
    required: false,
  },
  {
    linkId: "pa-allergies",
    text: "Known allergies relevant to this request",
    type: "text",
    required: false,
  },
  {
    linkId: "pa-supporting-info",
    text: "Additional supporting information (attach X-rays, lab data, chart notes as needed)",
    type: "text",
    required: false,
  },
]
