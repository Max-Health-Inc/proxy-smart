/**
 * ValueSet: flag-category
 * URL: http://hl7.org/fhir/ValueSet/flag-category
 * Size: 10 concepts
 */
export const FlagCategoryConcepts = [
    { code: "diet", system: "http://terminology.hl7.org/CodeSystem/flag-category", display: "Diet" },
    { code: "drug", system: "http://terminology.hl7.org/CodeSystem/flag-category", display: "Drug" },
    { code: "lab", system: "http://terminology.hl7.org/CodeSystem/flag-category", display: "Lab" },
    { code: "admin", system: "http://terminology.hl7.org/CodeSystem/flag-category", display: "Administrative" },
    { code: "contact", system: "http://terminology.hl7.org/CodeSystem/flag-category", display: "Subject Contact" },
    { code: "clinical", system: "http://terminology.hl7.org/CodeSystem/flag-category", display: "Clinical" },
    { code: "behavioral", system: "http://terminology.hl7.org/CodeSystem/flag-category", display: "Behavioral" },
    { code: "research", system: "http://terminology.hl7.org/CodeSystem/flag-category", display: "Research" },
    { code: "advance-directive", system: "http://terminology.hl7.org/CodeSystem/flag-category", display: "Advance Directive" },
    { code: "safety", system: "http://terminology.hl7.org/CodeSystem/flag-category", display: "Safety" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidFlagCategoryCode(code) {
    return FlagCategoryConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getFlagCategoryConcept(code) {
    return FlagCategoryConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const FlagCategoryCodes = FlagCategoryConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomFlagCategoryCode() {
    return FlagCategoryCodes[Math.floor(Math.random() * FlagCategoryCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomFlagCategoryConcept() {
    return FlagCategoryConcepts[Math.floor(Math.random() * FlagCategoryConcepts.length)];
}
