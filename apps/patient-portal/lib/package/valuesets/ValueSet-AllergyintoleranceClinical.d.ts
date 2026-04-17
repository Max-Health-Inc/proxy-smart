/**
 * ValueSet: allergyintolerance-clinical
 * URL: http://hl7.org/fhir/ValueSet/allergyintolerance-clinical
 * Size: 2 concepts
 */
export declare const AllergyintoleranceClinicalConcepts: readonly [{
    readonly code: "active";
    readonly system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical";
    readonly display: "Active";
}, {
    readonly code: "inactive";
    readonly system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical";
    readonly display: "Inactive";
}];
/** Union type of all valid codes in this ValueSet */
export type AllergyintoleranceClinicalCode = "active" | "inactive";
/** Type representing a concept from this ValueSet */
export type AllergyintoleranceClinicalConcept = typeof AllergyintoleranceClinicalConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidAllergyintoleranceClinicalCode(code: string): code is AllergyintoleranceClinicalCode;
/**
 * Get concept details by code
 */
export declare function getAllergyintoleranceClinicalConcept(code: string): AllergyintoleranceClinicalConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const AllergyintoleranceClinicalCodes: ("active" | "inactive")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomAllergyintoleranceClinicalCode(): AllergyintoleranceClinicalCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomAllergyintoleranceClinicalConcept(): AllergyintoleranceClinicalConcept;
