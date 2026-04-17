/**
 * ValueSet: medication-status
 * URL: http://hl7.org/fhir/ValueSet/medication-status
 * Size: 3 concepts
 */
export const MedicationStatusConcepts = [
    { code: "active", system: "http://hl7.org/fhir/CodeSystem/medication-status", display: "Active" },
    { code: "inactive", system: "http://hl7.org/fhir/CodeSystem/medication-status", display: "Inactive" },
    { code: "entered-in-error", system: "http://hl7.org/fhir/CodeSystem/medication-status", display: "Entered in Error" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidMedicationStatusCode(code) {
    return MedicationStatusConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getMedicationStatusConcept(code) {
    return MedicationStatusConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const MedicationStatusCodes = MedicationStatusConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomMedicationStatusCode() {
    return MedicationStatusCodes[Math.floor(Math.random() * MedicationStatusCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomMedicationStatusConcept() {
    return MedicationStatusConcepts[Math.floor(Math.random() * MedicationStatusConcepts.length)];
}
