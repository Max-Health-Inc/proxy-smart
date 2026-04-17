/**
 * ValueSet: condition-ver-status
 * URL: http://hl7.org/fhir/ValueSet/condition-ver-status
 * Size: 4 concepts
 */
export const ConditionVerStatusConcepts = [
    { code: "unconfirmed", system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", display: "Unconfirmed" },
    { code: "confirmed", system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", display: "Confirmed" },
    { code: "refuted", system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", display: "Refuted" },
    { code: "entered-in-error", system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", display: "Entered in Error" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidConditionVerStatusCode(code) {
    return ConditionVerStatusConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getConditionVerStatusConcept(code) {
    return ConditionVerStatusConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ConditionVerStatusCodes = ConditionVerStatusConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomConditionVerStatusCode() {
    return ConditionVerStatusCodes[Math.floor(Math.random() * ConditionVerStatusCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomConditionVerStatusConcept() {
    return ConditionVerStatusConcepts[Math.floor(Math.random() * ConditionVerStatusConcepts.length)];
}
