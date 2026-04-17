/**
 * ValueSet: data-absent-reason
 * URL: http://hl7.org/fhir/ValueSet/data-absent-reason
 * Size: 8 concepts
 */
export declare const DataAbsentReasonConcepts: readonly [{
    readonly code: "unknown";
    readonly system: "http://terminology.hl7.org/CodeSystem/data-absent-reason";
    readonly display: "Unknown";
}, {
    readonly code: "masked";
    readonly system: "http://terminology.hl7.org/CodeSystem/data-absent-reason";
    readonly display: "Masked";
}, {
    readonly code: "not-applicable";
    readonly system: "http://terminology.hl7.org/CodeSystem/data-absent-reason";
    readonly display: "Not Applicable";
}, {
    readonly code: "unsupported";
    readonly system: "http://terminology.hl7.org/CodeSystem/data-absent-reason";
    readonly display: "Unsupported";
}, {
    readonly code: "as-text";
    readonly system: "http://terminology.hl7.org/CodeSystem/data-absent-reason";
    readonly display: "As Text";
}, {
    readonly code: "error";
    readonly system: "http://terminology.hl7.org/CodeSystem/data-absent-reason";
    readonly display: "Error";
}, {
    readonly code: "not-performed";
    readonly system: "http://terminology.hl7.org/CodeSystem/data-absent-reason";
    readonly display: "Not Performed";
}, {
    readonly code: "not-permitted";
    readonly system: "http://terminology.hl7.org/CodeSystem/data-absent-reason";
    readonly display: "Not Permitted";
}];
/** Union type of all valid codes in this ValueSet */
export type DataAbsentReasonCode = "unknown" | "masked" | "not-applicable" | "unsupported" | "as-text" | "error" | "not-performed" | "not-permitted";
/** Type representing a concept from this ValueSet */
export type DataAbsentReasonConcept = typeof DataAbsentReasonConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidDataAbsentReasonCode(code: string): code is DataAbsentReasonCode;
/**
 * Get concept details by code
 */
export declare function getDataAbsentReasonConcept(code: string): DataAbsentReasonConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const DataAbsentReasonCodes: ("unknown" | "masked" | "not-applicable" | "unsupported" | "as-text" | "error" | "not-performed" | "not-permitted")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomDataAbsentReasonCode(): DataAbsentReasonCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomDataAbsentReasonConcept(): DataAbsentReasonConcept;
