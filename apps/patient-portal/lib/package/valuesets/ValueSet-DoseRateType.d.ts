/**
 * ValueSet: dose-rate-type
 * URL: http://hl7.org/fhir/ValueSet/dose-rate-type
 * Size: 2 concepts
 */
export declare const DoseRateTypeConcepts: readonly [{
    readonly code: "calculated";
    readonly system: "http://terminology.hl7.org/CodeSystem/dose-rate-type";
    readonly display: "Calculated";
}, {
    readonly code: "ordered";
    readonly system: "http://terminology.hl7.org/CodeSystem/dose-rate-type";
    readonly display: "Ordered";
}];
/** Union type of all valid codes in this ValueSet */
export type DoseRateTypeCode = "calculated" | "ordered";
/** Type representing a concept from this ValueSet */
export type DoseRateTypeConcept = typeof DoseRateTypeConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidDoseRateTypeCode(code: string): code is DoseRateTypeCode;
/**
 * Get concept details by code
 */
export declare function getDoseRateTypeConcept(code: string): DoseRateTypeConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const DoseRateTypeCodes: ("calculated" | "ordered")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomDoseRateTypeCode(): DoseRateTypeCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomDoseRateTypeConcept(): DoseRateTypeConcept;
