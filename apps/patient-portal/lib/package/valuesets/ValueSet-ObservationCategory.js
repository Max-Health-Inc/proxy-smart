/**
 * ValueSet: observation-category
 * URL: http://hl7.org/fhir/ValueSet/observation-category
 * Size: 9 concepts
 */
export const ObservationCategoryConcepts = [
    { code: "social-history", system: "http://terminology.hl7.org/CodeSystem/observation-category", display: "Social History" },
    { code: "vital-signs", system: "http://terminology.hl7.org/CodeSystem/observation-category", display: "Vital Signs" },
    { code: "imaging", system: "http://terminology.hl7.org/CodeSystem/observation-category", display: "Imaging" },
    { code: "laboratory", system: "http://terminology.hl7.org/CodeSystem/observation-category", display: "Laboratory" },
    { code: "procedure", system: "http://terminology.hl7.org/CodeSystem/observation-category", display: "Procedure" },
    { code: "survey", system: "http://terminology.hl7.org/CodeSystem/observation-category", display: "Survey" },
    { code: "exam", system: "http://terminology.hl7.org/CodeSystem/observation-category", display: "Exam" },
    { code: "therapy", system: "http://terminology.hl7.org/CodeSystem/observation-category", display: "Therapy" },
    { code: "activity", system: "http://terminology.hl7.org/CodeSystem/observation-category", display: "Activity" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidObservationCategoryCode(code) {
    return ObservationCategoryConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getObservationCategoryConcept(code) {
    return ObservationCategoryConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ObservationCategoryCodes = ObservationCategoryConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomObservationCategoryCode() {
    return ObservationCategoryCodes[Math.floor(Math.random() * ObservationCategoryCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomObservationCategoryConcept() {
    return ObservationCategoryConcepts[Math.floor(Math.random() * ObservationCategoryConcepts.length)];
}
