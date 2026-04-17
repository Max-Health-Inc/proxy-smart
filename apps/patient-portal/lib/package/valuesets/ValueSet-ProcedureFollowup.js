/**
 * ValueSet: procedure-followup
 * URL: http://hl7.org/fhir/ValueSet/procedure-followup
 * Size: 10 concepts
 */
export const ProcedureFollowupConcepts = [
    { code: "18949003", system: "http://snomed.info/sct", display: "Change of dressing" },
    { code: "30549001", system: "http://snomed.info/sct", display: "Removal of suture" },
    { code: "241031001", system: "http://snomed.info/sct", display: "Removal of drain" },
    { code: "35963001", system: "http://snomed.info/sct", display: "Removal of staples" },
    { code: "225164002", system: "http://snomed.info/sct", display: "Removal of ligature" },
    { code: "447346005", system: "http://snomed.info/sct", display: "Cardiopulmonary exercise test (procedure)" },
    { code: "229506003", system: "http://snomed.info/sct", display: "Scar tissue massage" },
    { code: "274441001", system: "http://snomed.info/sct", display: "Suction drainage" },
    { code: "394725008", system: "http://snomed.info/sct", display: "Diabetes medication review (procedure)" },
    { code: "359825008", system: "http://snomed.info/sct", display: "Cytopathology, review of bronchioalveolar lavage specimen" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidProcedureFollowupCode(code) {
    return ProcedureFollowupConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getProcedureFollowupConcept(code) {
    return ProcedureFollowupConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ProcedureFollowupCodes = ProcedureFollowupConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomProcedureFollowupCode() {
    return ProcedureFollowupCodes[Math.floor(Math.random() * ProcedureFollowupCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomProcedureFollowupConcept() {
    return ProcedureFollowupConcepts[Math.floor(Math.random() * ProcedureFollowupConcepts.length)];
}
