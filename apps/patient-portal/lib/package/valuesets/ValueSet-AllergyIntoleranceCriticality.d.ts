/**
 * ValueSet: allergy-intolerance-criticality
 * URL: http://hl7.org/fhir/ValueSet/allergy-intolerance-criticality
 * Size: 3 concepts
 */
export declare const AllergyIntoleranceCriticalityConcepts: readonly [{
    readonly code: "low";
    readonly system: "http://hl7.org/fhir/allergy-intolerance-criticality";
    readonly display: "Low Risk";
}, {
    readonly code: "high";
    readonly system: "http://hl7.org/fhir/allergy-intolerance-criticality";
    readonly display: "High Risk";
}, {
    readonly code: "unable-to-assess";
    readonly system: "http://hl7.org/fhir/allergy-intolerance-criticality";
    readonly display: "Unable to Assess Risk";
}];
/** Union type of all valid codes in this ValueSet */
export type AllergyIntoleranceCriticalityCode = "low" | "high" | "unable-to-assess";
/** Type representing a concept from this ValueSet */
export type AllergyIntoleranceCriticalityConcept = typeof AllergyIntoleranceCriticalityConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidAllergyIntoleranceCriticalityCode(code: string): code is AllergyIntoleranceCriticalityCode;
/**
 * Get concept details by code
 */
export declare function getAllergyIntoleranceCriticalityConcept(code: string): AllergyIntoleranceCriticalityConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const AllergyIntoleranceCriticalityCodes: ("low" | "high" | "unable-to-assess")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomAllergyIntoleranceCriticalityCode(): AllergyIntoleranceCriticalityCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomAllergyIntoleranceCriticalityConcept(): AllergyIntoleranceCriticalityConcept;
