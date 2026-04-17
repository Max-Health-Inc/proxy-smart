/**
 * ValueSet: specimen-processing-procedure
 * URL: http://hl7.org/fhir/ValueSet/specimen-processing-procedure
 * Size: 8 concepts
 */
export const SpecimenProcessingProcedureConcepts = [
    { code: "LDLP", system: "http://terminology.hl7.org/CodeSystem/v2-0373", display: "LDL Precipitation" },
    { code: "RECA", system: "http://terminology.hl7.org/CodeSystem/v2-0373", display: "Recalification" },
    { code: "DEFB", system: "http://terminology.hl7.org/CodeSystem/v2-0373", display: "Defibrination" },
    { code: "ACID", system: "http://terminology.hl7.org/CodeSystem/v2-0373", display: "Acidification" },
    { code: "NEUT", system: "http://terminology.hl7.org/CodeSystem/v2-0373", display: "Neutralization" },
    { code: "ALK", system: "http://terminology.hl7.org/CodeSystem/v2-0373", display: "Alkalization" },
    { code: "FILT", system: "http://terminology.hl7.org/CodeSystem/v2-0373", display: "Filtration" },
    { code: "UFIL", system: "http://terminology.hl7.org/CodeSystem/v2-0373", display: "Ultrafiltration" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidSpecimenProcessingProcedureCode(code) {
    return SpecimenProcessingProcedureConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getSpecimenProcessingProcedureConcept(code) {
    return SpecimenProcessingProcedureConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const SpecimenProcessingProcedureCodes = SpecimenProcessingProcedureConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomSpecimenProcessingProcedureCode() {
    return SpecimenProcessingProcedureCodes[Math.floor(Math.random() * SpecimenProcessingProcedureCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomSpecimenProcessingProcedureConcept() {
    return SpecimenProcessingProcedureConcepts[Math.floor(Math.random() * SpecimenProcessingProcedureConcepts.length)];
}
