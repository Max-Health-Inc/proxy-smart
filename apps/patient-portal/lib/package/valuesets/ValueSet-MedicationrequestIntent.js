/**
 * ValueSet: medicationrequest-intent
 * URL: http://hl7.org/fhir/ValueSet/medicationrequest-intent
 * Size: 8 concepts
 */
export const MedicationrequestIntentConcepts = [
    { code: "proposal", system: "http://hl7.org/fhir/CodeSystem/medicationrequest-intent", display: "Proposal" },
    { code: "plan", system: "http://hl7.org/fhir/CodeSystem/medicationrequest-intent", display: "Plan" },
    { code: "order", system: "http://hl7.org/fhir/CodeSystem/medicationrequest-intent", display: "Order" },
    { code: "original-order", system: "http://hl7.org/fhir/CodeSystem/medicationrequest-intent", display: "Original Order" },
    { code: "reflex-order", system: "http://hl7.org/fhir/CodeSystem/medicationrequest-intent", display: "Reflex Order" },
    { code: "filler-order", system: "http://hl7.org/fhir/CodeSystem/medicationrequest-intent", display: "Filler Order" },
    { code: "instance-order", system: "http://hl7.org/fhir/CodeSystem/medicationrequest-intent", display: "Instance Order" },
    { code: "option", system: "http://hl7.org/fhir/CodeSystem/medicationrequest-intent", display: "Option" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidMedicationrequestIntentCode(code) {
    return MedicationrequestIntentConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getMedicationrequestIntentConcept(code) {
    return MedicationrequestIntentConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const MedicationrequestIntentCodes = MedicationrequestIntentConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomMedicationrequestIntentCode() {
    return MedicationrequestIntentCodes[Math.floor(Math.random() * MedicationrequestIntentCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomMedicationrequestIntentConcept() {
    return MedicationrequestIntentConcepts[Math.floor(Math.random() * MedicationrequestIntentConcepts.length)];
}
