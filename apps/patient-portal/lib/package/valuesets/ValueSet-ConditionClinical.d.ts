/**
 * ValueSet: condition-clinical
 * URL: http://hl7.org/fhir/ValueSet/condition-clinical
 * Size: 2 concepts
 */
export declare const ConditionClinicalConcepts: readonly [{
    readonly code: "active";
    readonly system: "http://terminology.hl7.org/CodeSystem/condition-clinical";
    readonly display: "Active";
}, {
    readonly code: "inactive";
    readonly system: "http://terminology.hl7.org/CodeSystem/condition-clinical";
    readonly display: "Inactive";
}];
/** Union type of all valid codes in this ValueSet */
export type ConditionClinicalCode = "active" | "inactive";
/** Type representing a concept from this ValueSet */
export type ConditionClinicalConcept = typeof ConditionClinicalConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidConditionClinicalCode(code: string): code is ConditionClinicalCode;
/**
 * Get concept details by code
 */
export declare function getConditionClinicalConcept(code: string): ConditionClinicalConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ConditionClinicalCodes: ("active" | "inactive")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomConditionClinicalCode(): ConditionClinicalCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomConditionClinicalConcept(): ConditionClinicalConcept;
