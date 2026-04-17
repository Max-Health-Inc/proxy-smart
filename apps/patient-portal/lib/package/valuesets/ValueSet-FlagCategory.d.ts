/**
 * ValueSet: flag-category
 * URL: http://hl7.org/fhir/ValueSet/flag-category
 * Size: 10 concepts
 */
export declare const FlagCategoryConcepts: readonly [{
    readonly code: "diet";
    readonly system: "http://terminology.hl7.org/CodeSystem/flag-category";
    readonly display: "Diet";
}, {
    readonly code: "drug";
    readonly system: "http://terminology.hl7.org/CodeSystem/flag-category";
    readonly display: "Drug";
}, {
    readonly code: "lab";
    readonly system: "http://terminology.hl7.org/CodeSystem/flag-category";
    readonly display: "Lab";
}, {
    readonly code: "admin";
    readonly system: "http://terminology.hl7.org/CodeSystem/flag-category";
    readonly display: "Administrative";
}, {
    readonly code: "contact";
    readonly system: "http://terminology.hl7.org/CodeSystem/flag-category";
    readonly display: "Subject Contact";
}, {
    readonly code: "clinical";
    readonly system: "http://terminology.hl7.org/CodeSystem/flag-category";
    readonly display: "Clinical";
}, {
    readonly code: "behavioral";
    readonly system: "http://terminology.hl7.org/CodeSystem/flag-category";
    readonly display: "Behavioral";
}, {
    readonly code: "research";
    readonly system: "http://terminology.hl7.org/CodeSystem/flag-category";
    readonly display: "Research";
}, {
    readonly code: "advance-directive";
    readonly system: "http://terminology.hl7.org/CodeSystem/flag-category";
    readonly display: "Advance Directive";
}, {
    readonly code: "safety";
    readonly system: "http://terminology.hl7.org/CodeSystem/flag-category";
    readonly display: "Safety";
}];
/** Union type of all valid codes in this ValueSet */
export type FlagCategoryCode = "diet" | "drug" | "lab" | "admin" | "contact" | "clinical" | "behavioral" | "research" | "advance-directive" | "safety";
/** Type representing a concept from this ValueSet */
export type FlagCategoryConcept = typeof FlagCategoryConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidFlagCategoryCode(code: string): code is FlagCategoryCode;
/**
 * Get concept details by code
 */
export declare function getFlagCategoryConcept(code: string): FlagCategoryConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const FlagCategoryCodes: ("contact" | "safety" | "diet" | "drug" | "lab" | "admin" | "clinical" | "behavioral" | "research" | "advance-directive")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomFlagCategoryCode(): FlagCategoryCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomFlagCategoryConcept(): FlagCategoryConcept;
