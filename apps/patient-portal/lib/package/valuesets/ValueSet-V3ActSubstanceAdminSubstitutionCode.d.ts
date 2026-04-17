/**
 * ValueSet: v3.ActSubstanceAdminSubstitutionCode
 * URL: http://terminology.hl7.org/ValueSet/v3-ActSubstanceAdminSubstitutionCode
 * Size: 9 concepts
 */
export declare const V3ActSubstanceAdminSubstitutionCodeConcepts: readonly [{
    readonly code: "E";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution";
    readonly display: "equivalent";
}, {
    readonly code: "EC";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution";
    readonly display: "equivalent composition";
}, {
    readonly code: "BC";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution";
    readonly display: "brand composition";
}, {
    readonly code: "G";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution";
    readonly display: "generic composition";
}, {
    readonly code: "TE";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution";
    readonly display: "therapeutic alternative";
}, {
    readonly code: "TB";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution";
    readonly display: "therapeutic brand";
}, {
    readonly code: "TG";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution";
    readonly display: "therapeutic generic";
}, {
    readonly code: "F";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution";
    readonly display: "formulary";
}, {
    readonly code: "N";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution";
    readonly display: "none";
}];
/** Union type of all valid codes in this ValueSet */
export type V3ActSubstanceAdminSubstitutionCodeCode = "E" | "EC" | "BC" | "G" | "TE" | "TB" | "TG" | "F" | "N";
/** Type representing a concept from this ValueSet */
export type V3ActSubstanceAdminSubstitutionCodeConcept = typeof V3ActSubstanceAdminSubstitutionCodeConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidV3ActSubstanceAdminSubstitutionCodeCode(code: string): code is V3ActSubstanceAdminSubstitutionCodeCode;
/**
 * Get concept details by code
 */
export declare function getV3ActSubstanceAdminSubstitutionCodeConcept(code: string): V3ActSubstanceAdminSubstitutionCodeConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const V3ActSubstanceAdminSubstitutionCodeCodes: ("E" | "N" | "EC" | "F" | "BC" | "G" | "TE" | "TB" | "TG")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomV3ActSubstanceAdminSubstitutionCodeCode(): V3ActSubstanceAdminSubstitutionCodeCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomV3ActSubstanceAdminSubstitutionCodeConcept(): V3ActSubstanceAdminSubstitutionCodeConcept;
