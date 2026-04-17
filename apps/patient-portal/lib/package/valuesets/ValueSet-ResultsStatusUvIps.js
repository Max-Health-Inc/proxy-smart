/**
 * ValueSet: ResultsStatusUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/results-status-uv-ips
 * Size: 7 concepts
 */
export const ResultsStatusUvIpsConcepts = [
    { code: "registered", system: "http://hl7.org/fhir/observation-status" },
    { code: "preliminary", system: "http://hl7.org/fhir/observation-status" },
    { code: "final", system: "http://hl7.org/fhir/observation-status" },
    { code: "amended", system: "http://hl7.org/fhir/observation-status" },
    { code: "corrected", system: "http://hl7.org/fhir/observation-status" },
    { code: "cancelled", system: "http://hl7.org/fhir/observation-status" },
    { code: "unknown", system: "http://hl7.org/fhir/observation-status" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidResultsStatusUvIpsCode(code) {
    return ResultsStatusUvIpsConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getResultsStatusUvIpsConcept(code) {
    return ResultsStatusUvIpsConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ResultsStatusUvIpsCodes = ResultsStatusUvIpsConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomResultsStatusUvIpsCode() {
    return ResultsStatusUvIpsCodes[Math.floor(Math.random() * ResultsStatusUvIpsCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomResultsStatusUvIpsConcept() {
    return ResultsStatusUvIpsConcepts[Math.floor(Math.random() * ResultsStatusUvIpsConcepts.length)];
}
