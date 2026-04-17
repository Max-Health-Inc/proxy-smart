/**
 * ValueSet: v3-ConfidentialityClassification
 * URL: http://terminology.hl7.org/ValueSet/v3-ConfidentialityClassification
 * Size: 6 concepts
 */
export declare const V3ConfidentialityClassificationConcepts: readonly [{
    readonly code: "U";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality";
    readonly display: "unrestricted";
}, {
    readonly code: "L";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality";
    readonly display: "low";
}, {
    readonly code: "M";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality";
    readonly display: "moderate";
}, {
    readonly code: "N";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality";
    readonly display: "normal";
}, {
    readonly code: "R";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality";
    readonly display: "restricted";
}, {
    readonly code: "V";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality";
    readonly display: "very restricted";
}];
/** Union type of all valid codes in this ValueSet */
export type V3ConfidentialityClassificationCode = "U" | "L" | "M" | "N" | "R" | "V";
/** Type representing a concept from this ValueSet */
export type V3ConfidentialityClassificationConcept = typeof V3ConfidentialityClassificationConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidV3ConfidentialityClassificationCode(code: string): code is V3ConfidentialityClassificationCode;
/**
 * Get concept details by code
 */
export declare function getV3ConfidentialityClassificationConcept(code: string): V3ConfidentialityClassificationConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const V3ConfidentialityClassificationCodes: ("N" | "U" | "L" | "M" | "R" | "V")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomV3ConfidentialityClassificationCode(): V3ConfidentialityClassificationCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomV3ConfidentialityClassificationConcept(): V3ConfidentialityClassificationConcept;
