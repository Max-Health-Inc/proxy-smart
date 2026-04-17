/**
 * ValueSet: ProblemTypeUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/problem-type-uv-ips
 * Size: 1 concepts
 */
export const ProblemTypeUvIpsConcepts = [
    { code: "problem-list-item", system: "http://terminology.hl7.org/CodeSystem/condition-category", display: "Problem List Item" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidProblemTypeUvIpsCode(code) {
    return ProblemTypeUvIpsConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getProblemTypeUvIpsConcept(code) {
    return ProblemTypeUvIpsConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ProblemTypeUvIpsCodes = ProblemTypeUvIpsConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomProblemTypeUvIpsCode() {
    return ProblemTypeUvIpsCodes[Math.floor(Math.random() * ProblemTypeUvIpsCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomProblemTypeUvIpsConcept() {
    return ProblemTypeUvIpsConcepts[Math.floor(Math.random() * ProblemTypeUvIpsConcepts.length)];
}
