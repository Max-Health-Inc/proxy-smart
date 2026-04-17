/**
 * ValueSet: procedure-followup
 * URL: http://hl7.org/fhir/ValueSet/procedure-followup
 * Size: 10 concepts
 */
export declare const ProcedureFollowupConcepts: readonly [{
    readonly code: "18949003";
    readonly system: "http://snomed.info/sct";
    readonly display: "Change of dressing";
}, {
    readonly code: "30549001";
    readonly system: "http://snomed.info/sct";
    readonly display: "Removal of suture";
}, {
    readonly code: "241031001";
    readonly system: "http://snomed.info/sct";
    readonly display: "Removal of drain";
}, {
    readonly code: "35963001";
    readonly system: "http://snomed.info/sct";
    readonly display: "Removal of staples";
}, {
    readonly code: "225164002";
    readonly system: "http://snomed.info/sct";
    readonly display: "Removal of ligature";
}, {
    readonly code: "447346005";
    readonly system: "http://snomed.info/sct";
    readonly display: "Cardiopulmonary exercise test (procedure)";
}, {
    readonly code: "229506003";
    readonly system: "http://snomed.info/sct";
    readonly display: "Scar tissue massage";
}, {
    readonly code: "274441001";
    readonly system: "http://snomed.info/sct";
    readonly display: "Suction drainage";
}, {
    readonly code: "394725008";
    readonly system: "http://snomed.info/sct";
    readonly display: "Diabetes medication review (procedure)";
}, {
    readonly code: "359825008";
    readonly system: "http://snomed.info/sct";
    readonly display: "Cytopathology, review of bronchioalveolar lavage specimen";
}];
/** Union type of all valid codes in this ValueSet */
export type ProcedureFollowupCode = "18949003" | "30549001" | "241031001" | "35963001" | "225164002" | "447346005" | "229506003" | "274441001" | "394725008" | "359825008";
/** Type representing a concept from this ValueSet */
export type ProcedureFollowupConcept = typeof ProcedureFollowupConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidProcedureFollowupCode(code: string): code is ProcedureFollowupCode;
/**
 * Get concept details by code
 */
export declare function getProcedureFollowupConcept(code: string): ProcedureFollowupConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ProcedureFollowupCodes: ("18949003" | "30549001" | "241031001" | "35963001" | "225164002" | "447346005" | "229506003" | "274441001" | "394725008" | "359825008")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomProcedureFollowupCode(): ProcedureFollowupCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomProcedureFollowupConcept(): ProcedureFollowupConcept;
