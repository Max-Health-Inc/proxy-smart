/**
 * ValueSet: list-order
 * URL: http://hl7.org/fhir/ValueSet/list-order
 * Size: 8 concepts
 */
export const ListOrderConcepts = [
    { code: "user", system: "http://terminology.hl7.org/CodeSystem/list-order", display: "Sorted by User" },
    { code: "system", system: "http://terminology.hl7.org/CodeSystem/list-order", display: "Sorted by System" },
    { code: "event-date", system: "http://terminology.hl7.org/CodeSystem/list-order", display: "Sorted by Event Date" },
    { code: "entry-date", system: "http://terminology.hl7.org/CodeSystem/list-order", display: "Sorted by Item Date" },
    { code: "priority", system: "http://terminology.hl7.org/CodeSystem/list-order", display: "Sorted by Priority" },
    { code: "alphabetic", system: "http://terminology.hl7.org/CodeSystem/list-order", display: "Sorted Alphabetically" },
    { code: "category", system: "http://terminology.hl7.org/CodeSystem/list-order", display: "Sorted by Category" },
    { code: "patient", system: "http://terminology.hl7.org/CodeSystem/list-order", display: "Sorted by Patient" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidListOrderCode(code) {
    return ListOrderConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getListOrderConcept(code) {
    return ListOrderConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ListOrderCodes = ListOrderConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomListOrderCode() {
    return ListOrderCodes[Math.floor(Math.random() * ListOrderCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomListOrderConcept() {
    return ListOrderConcepts[Math.floor(Math.random() * ListOrderConcepts.length)];
}
