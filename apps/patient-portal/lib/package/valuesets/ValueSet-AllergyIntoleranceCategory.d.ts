/**
 * ValueSet: allergy-intolerance-category
 * URL: http://hl7.org/fhir/ValueSet/allergy-intolerance-category
 * Size: 4 concepts
 */
export declare const AllergyIntoleranceCategoryConcepts: readonly [{
    readonly code: "food";
    readonly system: "http://hl7.org/fhir/allergy-intolerance-category";
    readonly display: "Food";
}, {
    readonly code: "medication";
    readonly system: "http://hl7.org/fhir/allergy-intolerance-category";
    readonly display: "Medication";
}, {
    readonly code: "environment";
    readonly system: "http://hl7.org/fhir/allergy-intolerance-category";
    readonly display: "Environment";
}, {
    readonly code: "biologic";
    readonly system: "http://hl7.org/fhir/allergy-intolerance-category";
    readonly display: "Biologic";
}];
/** Union type of all valid codes in this ValueSet */
export type AllergyIntoleranceCategoryCode = "food" | "medication" | "environment" | "biologic";
/** Type representing a concept from this ValueSet */
export type AllergyIntoleranceCategoryConcept = typeof AllergyIntoleranceCategoryConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidAllergyIntoleranceCategoryCode(code: string): code is AllergyIntoleranceCategoryCode;
/**
 * Get concept details by code
 */
export declare function getAllergyIntoleranceCategoryConcept(code: string): AllergyIntoleranceCategoryConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const AllergyIntoleranceCategoryCodes: ("food" | "medication" | "environment" | "biologic")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomAllergyIntoleranceCategoryCode(): AllergyIntoleranceCategoryCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomAllergyIntoleranceCategoryConcept(): AllergyIntoleranceCategoryConcept;
