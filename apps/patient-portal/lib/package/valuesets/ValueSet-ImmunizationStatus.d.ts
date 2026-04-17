/**
 * ValueSet: immunization-status
 * URL: http://hl7.org/fhir/ValueSet/immunization-status
 * Size: 3 concepts
 */
export declare const ImmunizationStatusConcepts: readonly [{
    readonly code: "completed";
    readonly system: "http://hl7.org/fhir/event-status";
    readonly display: "Completed";
}, {
    readonly code: "entered-in-error";
    readonly system: "http://hl7.org/fhir/event-status";
    readonly display: "Entered in Error";
}, {
    readonly code: "not-done";
    readonly system: "http://hl7.org/fhir/event-status";
    readonly display: "Not Done";
}];
/** Union type of all valid codes in this ValueSet */
export type ImmunizationStatusCode = "completed" | "entered-in-error" | "not-done";
/** Type representing a concept from this ValueSet */
export type ImmunizationStatusConcept = typeof ImmunizationStatusConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidImmunizationStatusCode(code: string): code is ImmunizationStatusCode;
/**
 * Get concept details by code
 */
export declare function getImmunizationStatusConcept(code: string): ImmunizationStatusConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ImmunizationStatusCodes: ("entered-in-error" | "completed" | "not-done")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomImmunizationStatusCode(): ImmunizationStatusCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomImmunizationStatusConcept(): ImmunizationStatusConcept;
