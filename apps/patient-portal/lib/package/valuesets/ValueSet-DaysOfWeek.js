/**
 * ValueSet: days-of-week
 * URL: http://hl7.org/fhir/ValueSet/days-of-week
 * Size: 7 concepts
 */
export const DaysOfWeekConcepts = [
    { code: "mon", system: "http://hl7.org/fhir/days-of-week", display: "Monday" },
    { code: "tue", system: "http://hl7.org/fhir/days-of-week", display: "Tuesday" },
    { code: "wed", system: "http://hl7.org/fhir/days-of-week", display: "Wednesday" },
    { code: "thu", system: "http://hl7.org/fhir/days-of-week", display: "Thursday" },
    { code: "fri", system: "http://hl7.org/fhir/days-of-week", display: "Friday" },
    { code: "sat", system: "http://hl7.org/fhir/days-of-week", display: "Saturday" },
    { code: "sun", system: "http://hl7.org/fhir/days-of-week", display: "Sunday" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidDaysOfWeekCode(code) {
    return DaysOfWeekConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getDaysOfWeekConcept(code) {
    return DaysOfWeekConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const DaysOfWeekCodes = DaysOfWeekConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomDaysOfWeekCode() {
    return DaysOfWeekCodes[Math.floor(Math.random() * DaysOfWeekCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomDaysOfWeekConcept() {
    return DaysOfWeekConcepts[Math.floor(Math.random() * DaysOfWeekConcepts.length)];
}
