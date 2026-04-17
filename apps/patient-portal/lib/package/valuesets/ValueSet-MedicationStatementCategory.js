/**
 * ValueSet: medication-statement-category
 * URL: http://hl7.org/fhir/ValueSet/medication-statement-category
 * Size: 4 concepts
 */
export const MedicationStatementCategoryConcepts = [
    { code: "inpatient", system: "http://terminology.hl7.org/CodeSystem/medication-statement-category", display: "Inpatient" },
    { code: "outpatient", system: "http://terminology.hl7.org/CodeSystem/medication-statement-category", display: "Outpatient" },
    { code: "community", system: "http://terminology.hl7.org/CodeSystem/medication-statement-category", display: "Community" },
    { code: "patientspecified", system: "http://terminology.hl7.org/CodeSystem/medication-statement-category", display: "Patient Specified" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidMedicationStatementCategoryCode(code) {
    return MedicationStatementCategoryConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getMedicationStatementCategoryConcept(code) {
    return MedicationStatementCategoryConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const MedicationStatementCategoryCodes = MedicationStatementCategoryConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomMedicationStatementCategoryCode() {
    return MedicationStatementCategoryCodes[Math.floor(Math.random() * MedicationStatementCategoryCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomMedicationStatementCategoryConcept() {
    return MedicationStatementCategoryConcepts[Math.floor(Math.random() * MedicationStatementCategoryConcepts.length)];
}
