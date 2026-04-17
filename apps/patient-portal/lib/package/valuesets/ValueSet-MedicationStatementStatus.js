/**
 * ValueSet: medication-statement-status
 * URL: http://hl7.org/fhir/ValueSet/medication-statement-status
 * Size: 8 concepts
 */
export const MedicationStatementStatusConcepts = [
    { code: "active", system: "http://hl7.org/fhir/CodeSystem/medication-statement-status", display: "Active" },
    { code: "completed", system: "http://hl7.org/fhir/CodeSystem/medication-statement-status", display: "Completed" },
    { code: "entered-in-error", system: "http://hl7.org/fhir/CodeSystem/medication-statement-status", display: "Entered in Error" },
    { code: "intended", system: "http://hl7.org/fhir/CodeSystem/medication-statement-status", display: "Intended" },
    { code: "stopped", system: "http://hl7.org/fhir/CodeSystem/medication-statement-status", display: "Stopped" },
    { code: "on-hold", system: "http://hl7.org/fhir/CodeSystem/medication-statement-status", display: "On Hold" },
    { code: "unknown", system: "http://hl7.org/fhir/CodeSystem/medication-statement-status", display: "Unknown" },
    { code: "not-taken", system: "http://hl7.org/fhir/CodeSystem/medication-statement-status", display: "Not Taken" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidMedicationStatementStatusCode(code) {
    return MedicationStatementStatusConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getMedicationStatementStatusConcept(code) {
    return MedicationStatementStatusConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const MedicationStatementStatusCodes = MedicationStatementStatusConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomMedicationStatementStatusCode() {
    return MedicationStatementStatusCodes[Math.floor(Math.random() * MedicationStatementStatusCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomMedicationStatementStatusConcept() {
    return MedicationStatementStatusConcepts[Math.floor(Math.random() * MedicationStatementStatusConcepts.length)];
}
