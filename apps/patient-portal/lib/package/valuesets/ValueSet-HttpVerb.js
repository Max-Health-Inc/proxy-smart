/**
 * ValueSet: http-verb
 * URL: http://hl7.org/fhir/ValueSet/http-verb
 * Size: 6 concepts
 */
export const HttpVerbConcepts = [
    { code: "GET", system: "http://hl7.org/fhir/http-verb", display: "GET" },
    { code: "HEAD", system: "http://hl7.org/fhir/http-verb", display: "HEAD" },
    { code: "POST", system: "http://hl7.org/fhir/http-verb", display: "POST" },
    { code: "PUT", system: "http://hl7.org/fhir/http-verb", display: "PUT" },
    { code: "DELETE", system: "http://hl7.org/fhir/http-verb", display: "DELETE" },
    { code: "PATCH", system: "http://hl7.org/fhir/http-verb", display: "PATCH" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidHttpVerbCode(code) {
    return HttpVerbConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getHttpVerbConcept(code) {
    return HttpVerbConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const HttpVerbCodes = HttpVerbConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomHttpVerbCode() {
    return HttpVerbCodes[Math.floor(Math.random() * HttpVerbCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomHttpVerbConcept() {
    return HttpVerbConcepts[Math.floor(Math.random() * HttpVerbConcepts.length)];
}
