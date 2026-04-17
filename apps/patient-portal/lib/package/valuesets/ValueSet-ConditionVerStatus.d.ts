/**
 * ValueSet: condition-ver-status
 * URL: http://hl7.org/fhir/ValueSet/condition-ver-status
 * Size: 4 concepts
 */
export declare const ConditionVerStatusConcepts: readonly [{
    readonly code: "unconfirmed";
    readonly system: "http://terminology.hl7.org/CodeSystem/condition-ver-status";
    readonly display: "Unconfirmed";
}, {
    readonly code: "confirmed";
    readonly system: "http://terminology.hl7.org/CodeSystem/condition-ver-status";
    readonly display: "Confirmed";
}, {
    readonly code: "refuted";
    readonly system: "http://terminology.hl7.org/CodeSystem/condition-ver-status";
    readonly display: "Refuted";
}, {
    readonly code: "entered-in-error";
    readonly system: "http://terminology.hl7.org/CodeSystem/condition-ver-status";
    readonly display: "Entered in Error";
}];
/** Union type of all valid codes in this ValueSet */
export type ConditionVerStatusCode = "unconfirmed" | "confirmed" | "refuted" | "entered-in-error";
/** Type representing a concept from this ValueSet */
export type ConditionVerStatusConcept = typeof ConditionVerStatusConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidConditionVerStatusCode(code: string): code is ConditionVerStatusCode;
/**
 * Get concept details by code
 */
export declare function getConditionVerStatusConcept(code: string): ConditionVerStatusConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ConditionVerStatusCodes: ("confirmed" | "entered-in-error" | "unconfirmed" | "refuted")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomConditionVerStatusCode(): ConditionVerStatusCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomConditionVerStatusConcept(): ConditionVerStatusConcept;
