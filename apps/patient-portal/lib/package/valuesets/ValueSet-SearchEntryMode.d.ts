/**
 * ValueSet: search-entry-mode
 * URL: http://hl7.org/fhir/ValueSet/search-entry-mode
 * Size: 3 concepts
 */
export declare const SearchEntryModeConcepts: readonly [{
    readonly code: "match";
    readonly system: "http://hl7.org/fhir/search-entry-mode";
    readonly display: "Match";
}, {
    readonly code: "include";
    readonly system: "http://hl7.org/fhir/search-entry-mode";
    readonly display: "Include";
}, {
    readonly code: "outcome";
    readonly system: "http://hl7.org/fhir/search-entry-mode";
    readonly display: "Outcome";
}];
/** Union type of all valid codes in this ValueSet */
export type SearchEntryModeCode = "match" | "include" | "outcome";
/** Type representing a concept from this ValueSet */
export type SearchEntryModeConcept = typeof SearchEntryModeConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidSearchEntryModeCode(code: string): code is SearchEntryModeCode;
/**
 * Get concept details by code
 */
export declare function getSearchEntryModeConcept(code: string): SearchEntryModeConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const SearchEntryModeCodes: ("match" | "include" | "outcome")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomSearchEntryModeCode(): SearchEntryModeCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomSearchEntryModeConcept(): SearchEntryModeConcept;
