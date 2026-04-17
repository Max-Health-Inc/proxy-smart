/**
 * ValueSet: medicationrequest-status
 * URL: http://hl7.org/fhir/ValueSet/medicationrequest-status
 * Size: 8 concepts
 */
export const MedicationrequestStatusConcepts = [
    { code: "active", system: "http://hl7.org/fhir/CodeSystem/medicationrequest-status", display: "Active" },
    { code: "on-hold", system: "http://hl7.org/fhir/CodeSystem/medicationrequest-status", display: "On Hold" },
    { code: "cancelled", system: "http://hl7.org/fhir/CodeSystem/medicationrequest-status", display: "Cancelled" },
    { code: "completed", system: "http://hl7.org/fhir/CodeSystem/medicationrequest-status", display: "Completed" },
    { code: "entered-in-error", system: "http://hl7.org/fhir/CodeSystem/medicationrequest-status", display: "Entered in Error" },
    { code: "stopped", system: "http://hl7.org/fhir/CodeSystem/medicationrequest-status", display: "Stopped" },
    { code: "draft", system: "http://hl7.org/fhir/CodeSystem/medicationrequest-status", display: "Draft" },
    { code: "unknown", system: "http://hl7.org/fhir/CodeSystem/medicationrequest-status", display: "Unknown" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidMedicationrequestStatusCode(code) {
    return MedicationrequestStatusConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getMedicationrequestStatusConcept(code) {
    return MedicationrequestStatusConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const MedicationrequestStatusCodes = MedicationrequestStatusConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomMedicationrequestStatusCode() {
    return MedicationrequestStatusCodes[Math.floor(Math.random() * MedicationrequestStatusCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomMedicationrequestStatusConcept() {
    return MedicationrequestStatusConcepts[Math.floor(Math.random() * MedicationrequestStatusConcepts.length)];
}
