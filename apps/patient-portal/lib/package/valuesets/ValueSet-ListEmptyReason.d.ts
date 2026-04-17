/**
 * ValueSet: list-empty-reason
 * URL: http://hl7.org/fhir/ValueSet/list-empty-reason
 * Size: 6 concepts
 */
export declare const ListEmptyReasonConcepts: readonly [{
    readonly code: "nilknown";
    readonly system: "http://terminology.hl7.org/CodeSystem/list-empty-reason";
    readonly display: "Nil Known";
}, {
    readonly code: "notasked";
    readonly system: "http://terminology.hl7.org/CodeSystem/list-empty-reason";
    readonly display: "Not Asked";
}, {
    readonly code: "withheld";
    readonly system: "http://terminology.hl7.org/CodeSystem/list-empty-reason";
    readonly display: "Information Withheld";
}, {
    readonly code: "unavailable";
    readonly system: "http://terminology.hl7.org/CodeSystem/list-empty-reason";
    readonly display: "Unavailable";
}, {
    readonly code: "notstarted";
    readonly system: "http://terminology.hl7.org/CodeSystem/list-empty-reason";
    readonly display: "Not Started";
}, {
    readonly code: "closed";
    readonly system: "http://terminology.hl7.org/CodeSystem/list-empty-reason";
    readonly display: "Closed";
}];
/** Union type of all valid codes in this ValueSet */
export type ListEmptyReasonCode = "nilknown" | "notasked" | "withheld" | "unavailable" | "notstarted" | "closed";
/** Type representing a concept from this ValueSet */
export type ListEmptyReasonConcept = typeof ListEmptyReasonConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidListEmptyReasonCode(code: string): code is ListEmptyReasonCode;
/**
 * Get concept details by code
 */
export declare function getListEmptyReasonConcept(code: string): ListEmptyReasonConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ListEmptyReasonCodes: ("unavailable" | "nilknown" | "notasked" | "withheld" | "notstarted" | "closed")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomListEmptyReasonCode(): ListEmptyReasonCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomListEmptyReasonConcept(): ListEmptyReasonConcept;
