/**
 * ValueSet: ResultsStatusUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/results-status-uv-ips
 * Size: 7 concepts
 */
export declare const ResultsStatusUvIpsConcepts: readonly [{
    readonly code: "registered";
    readonly system: "http://hl7.org/fhir/observation-status";
}, {
    readonly code: "preliminary";
    readonly system: "http://hl7.org/fhir/observation-status";
}, {
    readonly code: "final";
    readonly system: "http://hl7.org/fhir/observation-status";
}, {
    readonly code: "amended";
    readonly system: "http://hl7.org/fhir/observation-status";
}, {
    readonly code: "corrected";
    readonly system: "http://hl7.org/fhir/observation-status";
}, {
    readonly code: "cancelled";
    readonly system: "http://hl7.org/fhir/observation-status";
}, {
    readonly code: "unknown";
    readonly system: "http://hl7.org/fhir/observation-status";
}];
/** Union type of all valid codes in this ValueSet */
export type ResultsStatusUvIpsCode = "registered" | "preliminary" | "final" | "amended" | "corrected" | "cancelled" | "unknown";
/** Type representing a concept from this ValueSet */
export type ResultsStatusUvIpsConcept = typeof ResultsStatusUvIpsConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidResultsStatusUvIpsCode(code: string): code is ResultsStatusUvIpsCode;
/**
 * Get concept details by code
 */
export declare function getResultsStatusUvIpsConcept(code: string): ResultsStatusUvIpsConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ResultsStatusUvIpsCodes: ("unknown" | "final" | "preliminary" | "amended" | "registered" | "corrected" | "cancelled")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomResultsStatusUvIpsCode(): ResultsStatusUvIpsCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomResultsStatusUvIpsConcept(): ResultsStatusUvIpsConcept;
