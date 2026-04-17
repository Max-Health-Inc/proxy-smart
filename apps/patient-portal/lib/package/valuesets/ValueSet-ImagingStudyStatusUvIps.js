/**
 * ValueSet: ImagingStudyStatusUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/imaging-study-status-uv-ips
 * Size: 4 concepts
 */
export const ImagingStudyStatusUvIpsConcepts = [
    { code: "registered", system: "http://hl7.org/fhir/imagingstudy-status" },
    { code: "available", system: "http://hl7.org/fhir/imagingstudy-status" },
    { code: "cancelled", system: "http://hl7.org/fhir/imagingstudy-status" },
    { code: "unknown", system: "http://hl7.org/fhir/imagingstudy-status" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidImagingStudyStatusUvIpsCode(code) {
    return ImagingStudyStatusUvIpsConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getImagingStudyStatusUvIpsConcept(code) {
    return ImagingStudyStatusUvIpsConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ImagingStudyStatusUvIpsCodes = ImagingStudyStatusUvIpsConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomImagingStudyStatusUvIpsCode() {
    return ImagingStudyStatusUvIpsCodes[Math.floor(Math.random() * ImagingStudyStatusUvIpsCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomImagingStudyStatusUvIpsConcept() {
    return ImagingStudyStatusUvIpsConcepts[Math.floor(Math.random() * ImagingStudyStatusUvIpsConcepts.length)];
}
