/**
 * ValueSet: allergy-intolerance-type
 * URL: http://hl7.org/fhir/ValueSet/allergy-intolerance-type
 * Size: 2 concepts
 */
export declare const AllergyIntoleranceTypeConcepts: readonly [{
    readonly code: "allergy";
    readonly system: "http://hl7.org/fhir/allergy-intolerance-type";
    readonly display: "Allergy";
}, {
    readonly code: "intolerance";
    readonly system: "http://hl7.org/fhir/allergy-intolerance-type";
    readonly display: "Intolerance";
}];
/** Union type of all valid codes in this ValueSet */
export type AllergyIntoleranceTypeCode = "allergy" | "intolerance";
/** Type representing a concept from this ValueSet */
export type AllergyIntoleranceTypeConcept = typeof AllergyIntoleranceTypeConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidAllergyIntoleranceTypeCode(code: string): code is AllergyIntoleranceTypeCode;
/**
 * Get concept details by code
 */
export declare function getAllergyIntoleranceTypeConcept(code: string): AllergyIntoleranceTypeConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const AllergyIntoleranceTypeCodes: ("allergy" | "intolerance")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomAllergyIntoleranceTypeCode(): AllergyIntoleranceTypeCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomAllergyIntoleranceTypeConcept(): AllergyIntoleranceTypeConcept;
