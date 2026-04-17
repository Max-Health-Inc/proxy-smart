/**
 * ValueSet: medicationrequest-course-of-therapy
 * URL: http://hl7.org/fhir/ValueSet/medicationrequest-course-of-therapy
 * Size: 3 concepts
 */
export const MedicationrequestCourseOfTherapyConcepts = [
    { code: "continuous", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-course-of-therapy", display: "Continuous long term therapy" },
    { code: "acute", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-course-of-therapy", display: "Short course (acute) therapy" },
    { code: "seasonal", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-course-of-therapy", display: "Seasonal" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidMedicationrequestCourseOfTherapyCode(code) {
    return MedicationrequestCourseOfTherapyConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getMedicationrequestCourseOfTherapyConcept(code) {
    return MedicationrequestCourseOfTherapyConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const MedicationrequestCourseOfTherapyCodes = MedicationrequestCourseOfTherapyConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomMedicationrequestCourseOfTherapyCode() {
    return MedicationrequestCourseOfTherapyCodes[Math.floor(Math.random() * MedicationrequestCourseOfTherapyCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomMedicationrequestCourseOfTherapyConcept() {
    return MedicationrequestCourseOfTherapyConcepts[Math.floor(Math.random() * MedicationrequestCourseOfTherapyConcepts.length)];
}
