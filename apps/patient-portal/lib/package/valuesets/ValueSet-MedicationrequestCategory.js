/**
 * ValueSet: medicationrequest-category
 * URL: http://hl7.org/fhir/ValueSet/medicationrequest-category
 * Size: 4 concepts
 */
export const MedicationrequestCategoryConcepts = [
    { code: "inpatient", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-category", display: "Inpatient" },
    { code: "outpatient", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-category", display: "Outpatient" },
    { code: "community", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-category", display: "Community" },
    { code: "discharge", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-category", display: "Discharge" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidMedicationrequestCategoryCode(code) {
    return MedicationrequestCategoryConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getMedicationrequestCategoryConcept(code) {
    return MedicationrequestCategoryConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const MedicationrequestCategoryCodes = MedicationrequestCategoryConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomMedicationrequestCategoryCode() {
    return MedicationrequestCategoryCodes[Math.floor(Math.random() * MedicationrequestCategoryCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomMedicationrequestCategoryConcept() {
    return MedicationrequestCategoryConcepts[Math.floor(Math.random() * MedicationrequestCategoryConcepts.length)];
}
