/**
 * ValueSet: DiagnosticReportStatusUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/diagnostics-report-status-uv-ips
 * Size: 9 concepts
 */
export declare const DiagnosticReportStatusUvIpsConcepts: readonly [{
    readonly code: "registered";
    readonly system: "http://hl7.org/fhir/diagnostic-report-status";
}, {
    readonly code: "partial";
    readonly system: "http://hl7.org/fhir/diagnostic-report-status";
}, {
    readonly code: "preliminary";
    readonly system: "http://hl7.org/fhir/diagnostic-report-status";
}, {
    readonly code: "final";
    readonly system: "http://hl7.org/fhir/diagnostic-report-status";
}, {
    readonly code: "amended";
    readonly system: "http://hl7.org/fhir/diagnostic-report-status";
}, {
    readonly code: "corrected";
    readonly system: "http://hl7.org/fhir/diagnostic-report-status";
}, {
    readonly code: "appended";
    readonly system: "http://hl7.org/fhir/diagnostic-report-status";
}, {
    readonly code: "cancelled";
    readonly system: "http://hl7.org/fhir/diagnostic-report-status";
}, {
    readonly code: "unknown";
    readonly system: "http://hl7.org/fhir/diagnostic-report-status";
}];
/** Union type of all valid codes in this ValueSet */
export type DiagnosticReportStatusUvIpsCode = "registered" | "partial" | "preliminary" | "final" | "amended" | "corrected" | "appended" | "cancelled" | "unknown";
/** Type representing a concept from this ValueSet */
export type DiagnosticReportStatusUvIpsConcept = typeof DiagnosticReportStatusUvIpsConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidDiagnosticReportStatusUvIpsCode(code: string): code is DiagnosticReportStatusUvIpsCode;
/**
 * Get concept details by code
 */
export declare function getDiagnosticReportStatusUvIpsConcept(code: string): DiagnosticReportStatusUvIpsConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const DiagnosticReportStatusUvIpsCodes: ("unknown" | "final" | "preliminary" | "amended" | "registered" | "partial" | "corrected" | "appended" | "cancelled")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomDiagnosticReportStatusUvIpsCode(): DiagnosticReportStatusUvIpsCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomDiagnosticReportStatusUvIpsConcept(): DiagnosticReportStatusUvIpsConcept;
