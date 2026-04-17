/**
 * ValueSet: specimen-processing-procedure
 * URL: http://hl7.org/fhir/ValueSet/specimen-processing-procedure
 * Size: 8 concepts
 */
export declare const SpecimenProcessingProcedureConcepts: readonly [{
    readonly code: "LDLP";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0373";
    readonly display: "LDL Precipitation";
}, {
    readonly code: "RECA";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0373";
    readonly display: "Recalification";
}, {
    readonly code: "DEFB";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0373";
    readonly display: "Defibrination";
}, {
    readonly code: "ACID";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0373";
    readonly display: "Acidification";
}, {
    readonly code: "NEUT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0373";
    readonly display: "Neutralization";
}, {
    readonly code: "ALK";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0373";
    readonly display: "Alkalization";
}, {
    readonly code: "FILT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0373";
    readonly display: "Filtration";
}, {
    readonly code: "UFIL";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0373";
    readonly display: "Ultrafiltration";
}];
/** Union type of all valid codes in this ValueSet */
export type SpecimenProcessingProcedureCode = "LDLP" | "RECA" | "DEFB" | "ACID" | "NEUT" | "ALK" | "FILT" | "UFIL";
/** Type representing a concept from this ValueSet */
export type SpecimenProcessingProcedureConcept = typeof SpecimenProcessingProcedureConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidSpecimenProcessingProcedureCode(code: string): code is SpecimenProcessingProcedureCode;
/**
 * Get concept details by code
 */
export declare function getSpecimenProcessingProcedureConcept(code: string): SpecimenProcessingProcedureConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const SpecimenProcessingProcedureCodes: ("ALK" | "LDLP" | "RECA" | "DEFB" | "ACID" | "NEUT" | "FILT" | "UFIL")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomSpecimenProcessingProcedureCode(): SpecimenProcessingProcedureCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomSpecimenProcessingProcedureConcept(): SpecimenProcessingProcedureConcept;
