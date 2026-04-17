/**
 * ValueSet: procedure-category
 * URL: http://hl7.org/fhir/ValueSet/procedure-category
 * Size: 7 concepts
 */
export declare const ProcedureCategoryConcepts: readonly [{
    readonly code: "24642003";
    readonly system: "http://snomed.info/sct";
    readonly display: "Psychiatry procedure or service";
}, {
    readonly code: "409063005";
    readonly system: "http://snomed.info/sct";
    readonly display: "Counseling (regime/therapy)";
}, {
    readonly code: "409073007";
    readonly system: "http://snomed.info/sct";
    readonly display: "Education (regime/therapy)";
}, {
    readonly code: "387713003";
    readonly system: "http://snomed.info/sct";
    readonly display: "Surgical procedure (procedure)";
}, {
    readonly code: "103693007";
    readonly system: "http://snomed.info/sct";
    readonly display: "Diagnostic procedure";
}, {
    readonly code: "46947000";
    readonly system: "http://snomed.info/sct";
    readonly display: "Chiropractic manipulation";
}, {
    readonly code: "410606002";
    readonly system: "http://snomed.info/sct";
    readonly display: "Social service procedure (procedure)";
}];
/** Union type of all valid codes in this ValueSet */
export type ProcedureCategoryCode = "24642003" | "409063005" | "409073007" | "387713003" | "103693007" | "46947000" | "410606002";
/** Type representing a concept from this ValueSet */
export type ProcedureCategoryConcept = typeof ProcedureCategoryConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidProcedureCategoryCode(code: string): code is ProcedureCategoryCode;
/**
 * Get concept details by code
 */
export declare function getProcedureCategoryConcept(code: string): ProcedureCategoryConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ProcedureCategoryCodes: ("387713003" | "24642003" | "409063005" | "409073007" | "103693007" | "46947000" | "410606002")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomProcedureCategoryCode(): ProcedureCategoryCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomProcedureCategoryConcept(): ProcedureCategoryConcept;
