/**
 * ValueSet: administrative-gender
 * URL: http://hl7.org/fhir/ValueSet/administrative-gender
 * Size: 4 concepts
 */
export declare const AdministrativeGenderConcepts: readonly [{
    readonly code: "male";
    readonly system: "http://hl7.org/fhir/administrative-gender";
    readonly display: "Male";
}, {
    readonly code: "female";
    readonly system: "http://hl7.org/fhir/administrative-gender";
    readonly display: "Female";
}, {
    readonly code: "other";
    readonly system: "http://hl7.org/fhir/administrative-gender";
    readonly display: "Other";
}, {
    readonly code: "unknown";
    readonly system: "http://hl7.org/fhir/administrative-gender";
    readonly display: "Unknown";
}];
/** Union type of all valid codes in this ValueSet */
export type AdministrativeGenderCode = "male" | "female" | "other" | "unknown";
/** Type representing a concept from this ValueSet */
export type AdministrativeGenderConcept = typeof AdministrativeGenderConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidAdministrativeGenderCode(code: string): code is AdministrativeGenderCode;
/**
 * Get concept details by code
 */
export declare function getAdministrativeGenderConcept(code: string): AdministrativeGenderConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const AdministrativeGenderCodes: ("unknown" | "male" | "female" | "other")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomAdministrativeGenderCode(): AdministrativeGenderCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomAdministrativeGenderConcept(): AdministrativeGenderConcept;
