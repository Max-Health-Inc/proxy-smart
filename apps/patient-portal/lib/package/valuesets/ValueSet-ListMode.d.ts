/**
 * ValueSet: list-mode
 * URL: http://hl7.org/fhir/ValueSet/list-mode
 * Size: 3 concepts
 */
export declare const ListModeConcepts: readonly [{
    readonly code: "working";
    readonly system: "http://hl7.org/fhir/list-mode";
    readonly display: "Working List";
}, {
    readonly code: "snapshot";
    readonly system: "http://hl7.org/fhir/list-mode";
    readonly display: "Snapshot List";
}, {
    readonly code: "changes";
    readonly system: "http://hl7.org/fhir/list-mode";
    readonly display: "Change List";
}];
/** Union type of all valid codes in this ValueSet */
export type ListModeCode = "working" | "snapshot" | "changes";
/** Type representing a concept from this ValueSet */
export type ListModeConcept = typeof ListModeConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidListModeCode(code: string): code is ListModeCode;
/**
 * Get concept details by code
 */
export declare function getListModeConcept(code: string): ListModeConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ListModeCodes: ("working" | "snapshot" | "changes")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomListModeCode(): ListModeCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomListModeConcept(): ListModeConcept;
