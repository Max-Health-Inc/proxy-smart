/**
 * ValueSet: flag-status
 * URL: http://hl7.org/fhir/ValueSet/flag-status
 * Size: 3 concepts
 */
export declare const FlagStatusConcepts: readonly [{
    readonly code: "active";
    readonly system: "http://hl7.org/fhir/flag-status";
    readonly display: "Active";
}, {
    readonly code: "inactive";
    readonly system: "http://hl7.org/fhir/flag-status";
    readonly display: "Inactive";
}, {
    readonly code: "entered-in-error";
    readonly system: "http://hl7.org/fhir/flag-status";
    readonly display: "Entered in Error";
}];
/** Union type of all valid codes in this ValueSet */
export type FlagStatusCode = "active" | "inactive" | "entered-in-error";
/** Type representing a concept from this ValueSet */
export type FlagStatusConcept = typeof FlagStatusConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidFlagStatusCode(code: string): code is FlagStatusCode;
/**
 * Get concept details by code
 */
export declare function getFlagStatusConcept(code: string): FlagStatusConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const FlagStatusCodes: ("active" | "entered-in-error" | "inactive")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomFlagStatusCode(): FlagStatusCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomFlagStatusConcept(): FlagStatusConcept;
