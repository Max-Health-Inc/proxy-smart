/**
 * ValueSet: immunization-origin
 * URL: http://hl7.org/fhir/ValueSet/immunization-origin
 * Size: 4 concepts
 */
export declare const ImmunizationOriginConcepts: readonly [{
    readonly code: "provider";
    readonly system: "http://terminology.hl7.org/CodeSystem/immunization-origin";
    readonly display: "Other Provider";
}, {
    readonly code: "record";
    readonly system: "http://terminology.hl7.org/CodeSystem/immunization-origin";
    readonly display: "Written Record";
}, {
    readonly code: "recall";
    readonly system: "http://terminology.hl7.org/CodeSystem/immunization-origin";
    readonly display: "Parent/Guardian/Patient Recall";
}, {
    readonly code: "school";
    readonly system: "http://terminology.hl7.org/CodeSystem/immunization-origin";
    readonly display: "School Record";
}];
/** Union type of all valid codes in this ValueSet */
export type ImmunizationOriginCode = "provider" | "record" | "recall" | "school";
/** Type representing a concept from this ValueSet */
export type ImmunizationOriginConcept = typeof ImmunizationOriginConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidImmunizationOriginCode(code: string): code is ImmunizationOriginCode;
/**
 * Get concept details by code
 */
export declare function getImmunizationOriginConcept(code: string): ImmunizationOriginConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ImmunizationOriginCodes: ("provider" | "record" | "recall" | "school")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomImmunizationOriginCode(): ImmunizationOriginCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomImmunizationOriginConcept(): ImmunizationOriginConcept;
