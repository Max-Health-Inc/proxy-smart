/**
 * ValueSet: DiagnosticReportStatusUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/diagnostics-report-status-uv-ips
 * Size: 9 concepts
 */
export const DiagnosticReportStatusUvIpsConcepts = [
    { code: "registered", system: "http://hl7.org/fhir/diagnostic-report-status" },
    { code: "partial", system: "http://hl7.org/fhir/diagnostic-report-status" },
    { code: "preliminary", system: "http://hl7.org/fhir/diagnostic-report-status" },
    { code: "final", system: "http://hl7.org/fhir/diagnostic-report-status" },
    { code: "amended", system: "http://hl7.org/fhir/diagnostic-report-status" },
    { code: "corrected", system: "http://hl7.org/fhir/diagnostic-report-status" },
    { code: "appended", system: "http://hl7.org/fhir/diagnostic-report-status" },
    { code: "cancelled", system: "http://hl7.org/fhir/diagnostic-report-status" },
    { code: "unknown", system: "http://hl7.org/fhir/diagnostic-report-status" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidDiagnosticReportStatusUvIpsCode(code) {
    return DiagnosticReportStatusUvIpsConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getDiagnosticReportStatusUvIpsConcept(code) {
    return DiagnosticReportStatusUvIpsConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const DiagnosticReportStatusUvIpsCodes = DiagnosticReportStatusUvIpsConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomDiagnosticReportStatusUvIpsCode() {
    return DiagnosticReportStatusUvIpsCodes[Math.floor(Math.random() * DiagnosticReportStatusUvIpsCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomDiagnosticReportStatusUvIpsConcept() {
    return DiagnosticReportStatusUvIpsConcepts[Math.floor(Math.random() * DiagnosticReportStatusUvIpsConcepts.length)];
}
