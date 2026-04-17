/**
 * ValueSet: marital-status
 * URL: http://hl7.org/fhir/ValueSet/marital-status
 * Size: 11 concepts
 */
export declare const MaritalStatusConcepts: readonly [{
    readonly code: "A";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus";
    readonly display: "Annulled";
}, {
    readonly code: "D";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus";
    readonly display: "Divorced";
}, {
    readonly code: "I";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus";
    readonly display: "Interlocutory";
}, {
    readonly code: "L";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus";
    readonly display: "Legally Separated";
}, {
    readonly code: "M";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus";
    readonly display: "Married";
}, {
    readonly code: "P";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus";
    readonly display: "Polygamous";
}, {
    readonly code: "S";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus";
    readonly display: "Never Married";
}, {
    readonly code: "T";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus";
    readonly display: "Domestic partner";
}, {
    readonly code: "U";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus";
    readonly display: "unmarried";
}, {
    readonly code: "W";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus";
    readonly display: "Widowed";
}, {
    readonly code: "UNK";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-NullFlavor";
    readonly display: "unknown";
}];
/** Union type of all valid codes in this ValueSet */
export type MaritalStatusCode = "A" | "D" | "I" | "L" | "M" | "P" | "S" | "T" | "U" | "W" | "UNK";
/** Type representing a concept from this ValueSet */
export type MaritalStatusConcept = typeof MaritalStatusConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidMaritalStatusCode(code: string): code is MaritalStatusCode;
/**
 * Get concept details by code
 */
export declare function getMaritalStatusConcept(code: string): MaritalStatusConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const MaritalStatusCodes: ("UNK" | "U" | "L" | "M" | "I" | "A" | "D" | "P" | "S" | "T" | "W")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomMaritalStatusCode(): MaritalStatusCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomMaritalStatusConcept(): MaritalStatusConcept;
