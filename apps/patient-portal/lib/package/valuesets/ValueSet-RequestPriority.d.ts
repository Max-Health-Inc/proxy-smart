/**
 * ValueSet: request-priority
 * URL: http://hl7.org/fhir/ValueSet/request-priority
 * Size: 4 concepts
 */
export declare const RequestPriorityConcepts: readonly [{
    readonly code: "routine";
    readonly system: "http://hl7.org/fhir/request-priority";
    readonly display: "Routine";
}, {
    readonly code: "urgent";
    readonly system: "http://hl7.org/fhir/request-priority";
    readonly display: "Urgent";
}, {
    readonly code: "asap";
    readonly system: "http://hl7.org/fhir/request-priority";
    readonly display: "ASAP";
}, {
    readonly code: "stat";
    readonly system: "http://hl7.org/fhir/request-priority";
    readonly display: "STAT";
}];
/** Union type of all valid codes in this ValueSet */
export type RequestPriorityCode = "routine" | "urgent" | "asap" | "stat";
/** Type representing a concept from this ValueSet */
export type RequestPriorityConcept = typeof RequestPriorityConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidRequestPriorityCode(code: string): code is RequestPriorityCode;
/**
 * Get concept details by code
 */
export declare function getRequestPriorityConcept(code: string): RequestPriorityConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const RequestPriorityCodes: ("routine" | "urgent" | "asap" | "stat")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomRequestPriorityCode(): RequestPriorityCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomRequestPriorityConcept(): RequestPriorityConcept;
