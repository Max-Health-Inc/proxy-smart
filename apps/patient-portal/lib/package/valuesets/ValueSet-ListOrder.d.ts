/**
 * ValueSet: list-order
 * URL: http://hl7.org/fhir/ValueSet/list-order
 * Size: 8 concepts
 */
export declare const ListOrderConcepts: readonly [{
    readonly code: "user";
    readonly system: "http://terminology.hl7.org/CodeSystem/list-order";
    readonly display: "Sorted by User";
}, {
    readonly code: "system";
    readonly system: "http://terminology.hl7.org/CodeSystem/list-order";
    readonly display: "Sorted by System";
}, {
    readonly code: "event-date";
    readonly system: "http://terminology.hl7.org/CodeSystem/list-order";
    readonly display: "Sorted by Event Date";
}, {
    readonly code: "entry-date";
    readonly system: "http://terminology.hl7.org/CodeSystem/list-order";
    readonly display: "Sorted by Item Date";
}, {
    readonly code: "priority";
    readonly system: "http://terminology.hl7.org/CodeSystem/list-order";
    readonly display: "Sorted by Priority";
}, {
    readonly code: "alphabetic";
    readonly system: "http://terminology.hl7.org/CodeSystem/list-order";
    readonly display: "Sorted Alphabetically";
}, {
    readonly code: "category";
    readonly system: "http://terminology.hl7.org/CodeSystem/list-order";
    readonly display: "Sorted by Category";
}, {
    readonly code: "patient";
    readonly system: "http://terminology.hl7.org/CodeSystem/list-order";
    readonly display: "Sorted by Patient";
}];
/** Union type of all valid codes in this ValueSet */
export type ListOrderCode = "user" | "system" | "event-date" | "entry-date" | "priority" | "alphabetic" | "category" | "patient";
/** Type representing a concept from this ValueSet */
export type ListOrderConcept = typeof ListOrderConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidListOrderCode(code: string): code is ListOrderCode;
/**
 * Get concept details by code
 */
export declare function getListOrderConcept(code: string): ListOrderConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ListOrderCodes: ("system" | "category" | "patient" | "priority" | "user" | "event-date" | "entry-date" | "alphabetic")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomListOrderCode(): ListOrderCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomListOrderConcept(): ListOrderConcept;
