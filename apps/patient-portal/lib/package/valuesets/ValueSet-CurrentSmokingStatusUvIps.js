/**
 * ValueSet: CurrentSmokingStatusUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/current-smoking-status-uv-ips
 * Size: 8 concepts
 */
export const CurrentSmokingStatusUvIpsConcepts = [
    { code: "449868002", system: "http://snomed.info/sct", display: "Smokes tobacco daily (finding)" },
    { code: "428041000124106", system: "http://snomed.info/sct", display: "Occasional tobacco smoker (finding)" },
    { code: "8517006", system: "http://snomed.info/sct", display: "Ex-smoker (finding)" },
    { code: "266919005", system: "http://snomed.info/sct", display: "Never smoked tobacco (finding)" },
    { code: "77176002", system: "http://snomed.info/sct", display: "Smoker (finding)" },
    { code: "266927001", system: "http://snomed.info/sct", display: "Tobacco smoking consumption unknown (finding)" },
    { code: "230063004", system: "http://snomed.info/sct", display: "Heavy cigarette smoker (finding)" },
    { code: "230060001", system: "http://snomed.info/sct", display: "Light cigarette smoker (finding)" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidCurrentSmokingStatusUvIpsCode(code) {
    return CurrentSmokingStatusUvIpsConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getCurrentSmokingStatusUvIpsConcept(code) {
    return CurrentSmokingStatusUvIpsConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const CurrentSmokingStatusUvIpsCodes = CurrentSmokingStatusUvIpsConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomCurrentSmokingStatusUvIpsCode() {
    return CurrentSmokingStatusUvIpsCodes[Math.floor(Math.random() * CurrentSmokingStatusUvIpsCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomCurrentSmokingStatusUvIpsConcept() {
    return CurrentSmokingStatusUvIpsConcepts[Math.floor(Math.random() * CurrentSmokingStatusUvIpsConcepts.length)];
}
