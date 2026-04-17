/**
 * ValueSet: PregnancyStatusUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/pregnancy-status-uv-ips
 * Size: 4 concepts
 */
export const PregnancyStatusUvIpsConcepts = [
    { code: "77386006", system: "http://snomed.info/sct", display: "Pregnant" },
    { code: "60001007", system: "http://snomed.info/sct", display: "Not pregnant" },
    { code: "152231000119106", system: "http://snomed.info/sct", display: "Pregnancy not yet confirmed" },
    { code: "146799005", system: "http://snomed.info/sct", display: "Possible pregnancy" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidPregnancyStatusUvIpsCode(code) {
    return PregnancyStatusUvIpsConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getPregnancyStatusUvIpsConcept(code) {
    return PregnancyStatusUvIpsConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const PregnancyStatusUvIpsCodes = PregnancyStatusUvIpsConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomPregnancyStatusUvIpsCode() {
    return PregnancyStatusUvIpsCodes[Math.floor(Math.random() * PregnancyStatusUvIpsCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomPregnancyStatusUvIpsConcept() {
    return PregnancyStatusUvIpsConcepts[Math.floor(Math.random() * PregnancyStatusUvIpsConcepts.length)];
}
