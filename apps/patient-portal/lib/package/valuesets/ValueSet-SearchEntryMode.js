/**
 * ValueSet: search-entry-mode
 * URL: http://hl7.org/fhir/ValueSet/search-entry-mode
 * Size: 3 concepts
 */
export const SearchEntryModeConcepts = [
    { code: "match", system: "http://hl7.org/fhir/search-entry-mode", display: "Match" },
    { code: "include", system: "http://hl7.org/fhir/search-entry-mode", display: "Include" },
    { code: "outcome", system: "http://hl7.org/fhir/search-entry-mode", display: "Outcome" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidSearchEntryModeCode(code) {
    return SearchEntryModeConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getSearchEntryModeConcept(code) {
    return SearchEntryModeConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const SearchEntryModeCodes = SearchEntryModeConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomSearchEntryModeCode() {
    return SearchEntryModeCodes[Math.floor(Math.random() * SearchEntryModeCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomSearchEntryModeConcept() {
    return SearchEntryModeConcepts[Math.floor(Math.random() * SearchEntryModeConcepts.length)];
}
