/**
 * ValueSet: condition-severity
 * URL: http://hl7.org/fhir/ValueSet/condition-severity
 * Size: 3 concepts
 */
export declare const ConditionSeverityConcepts: readonly [{
    readonly code: "24484000";
    readonly system: "http://snomed.info/sct";
    readonly display: "Severe";
}, {
    readonly code: "6736007";
    readonly system: "http://snomed.info/sct";
    readonly display: "Moderate";
}, {
    readonly code: "255604002";
    readonly system: "http://snomed.info/sct";
    readonly display: "Mild";
}];
/** Union type of all valid codes in this ValueSet */
export type ConditionSeverityCode = "24484000" | "6736007" | "255604002";
/** Type representing a concept from this ValueSet */
export type ConditionSeverityConcept = typeof ConditionSeverityConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidConditionSeverityCode(code: string): code is ConditionSeverityCode;
/**
 * Get concept details by code
 */
export declare function getConditionSeverityConcept(code: string): ConditionSeverityConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ConditionSeverityCodes: ("24484000" | "6736007" | "255604002")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomConditionSeverityCode(): ConditionSeverityCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomConditionSeverityConcept(): ConditionSeverityConcept;
