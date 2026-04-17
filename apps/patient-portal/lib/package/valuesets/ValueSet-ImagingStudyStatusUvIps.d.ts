/**
 * ValueSet: ImagingStudyStatusUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/imaging-study-status-uv-ips
 * Size: 4 concepts
 */
export declare const ImagingStudyStatusUvIpsConcepts: readonly [{
    readonly code: "registered";
    readonly system: "http://hl7.org/fhir/imagingstudy-status";
}, {
    readonly code: "available";
    readonly system: "http://hl7.org/fhir/imagingstudy-status";
}, {
    readonly code: "cancelled";
    readonly system: "http://hl7.org/fhir/imagingstudy-status";
}, {
    readonly code: "unknown";
    readonly system: "http://hl7.org/fhir/imagingstudy-status";
}];
/** Union type of all valid codes in this ValueSet */
export type ImagingStudyStatusUvIpsCode = "registered" | "available" | "cancelled" | "unknown";
/** Type representing a concept from this ValueSet */
export type ImagingStudyStatusUvIpsConcept = typeof ImagingStudyStatusUvIpsConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidImagingStudyStatusUvIpsCode(code: string): code is ImagingStudyStatusUvIpsCode;
/**
 * Get concept details by code
 */
export declare function getImagingStudyStatusUvIpsConcept(code: string): ImagingStudyStatusUvIpsConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ImagingStudyStatusUvIpsCodes: ("unknown" | "registered" | "cancelled" | "available")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomImagingStudyStatusUvIpsCode(): ImagingStudyStatusUvIpsCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomImagingStudyStatusUvIpsConcept(): ImagingStudyStatusUvIpsConcept;
