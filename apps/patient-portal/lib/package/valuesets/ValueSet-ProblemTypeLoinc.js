/**
 * ValueSet: ProblemTypeLoinc
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/problem-type-loinc
 * Size: 1 concepts
 */
export const ProblemTypeLoincConcepts = [
    { code: "75326-9", system: "http://loinc.org", display: "Problem" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidProblemTypeLoincCode(code) {
    return ProblemTypeLoincConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getProblemTypeLoincConcept(code) {
    return ProblemTypeLoincConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ProblemTypeLoincCodes = ProblemTypeLoincConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomProblemTypeLoincCode() {
    return ProblemTypeLoincCodes[Math.floor(Math.random() * ProblemTypeLoincCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomProblemTypeLoincConcept() {
    return ProblemTypeLoincConcepts[Math.floor(Math.random() * ProblemTypeLoincConcepts.length)];
}
