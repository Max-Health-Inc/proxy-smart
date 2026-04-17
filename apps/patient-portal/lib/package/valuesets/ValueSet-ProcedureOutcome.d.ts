/**
 * ValueSet: procedure-outcome
 * URL: http://hl7.org/fhir/ValueSet/procedure-outcome
 * Size: 3 concepts
 */
export declare const ProcedureOutcomeConcepts: readonly [{
    readonly code: "385669000";
    readonly system: "http://snomed.info/sct";
    readonly display: "Successful (qualifier value)";
}, {
    readonly code: "385671000";
    readonly system: "http://snomed.info/sct";
    readonly display: "Unsuccessful (qualifier value)";
}, {
    readonly code: "385670004";
    readonly system: "http://snomed.info/sct";
    readonly display: "Partially successful (qualifier value)";
}];
/** Union type of all valid codes in this ValueSet */
export type ProcedureOutcomeCode = "385669000" | "385671000" | "385670004";
/** Type representing a concept from this ValueSet */
export type ProcedureOutcomeConcept = typeof ProcedureOutcomeConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidProcedureOutcomeCode(code: string): code is ProcedureOutcomeCode;
/**
 * Get concept details by code
 */
export declare function getProcedureOutcomeConcept(code: string): ProcedureOutcomeConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ProcedureOutcomeCodes: ("385669000" | "385671000" | "385670004")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomProcedureOutcomeCode(): ProcedureOutcomeCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomProcedureOutcomeConcept(): ProcedureOutcomeConcept;
