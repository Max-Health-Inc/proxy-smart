/**
 * ValueSet: immunization-status-reason
 * URL: http://hl7.org/fhir/ValueSet/immunization-status-reason
 * Size: 28 concepts
 */
export const ImmunizationStatusReasonConcepts = [
    { code: "IMMUNE", system: "http://terminology.hl7.org/CodeSystem/v3-ActReason", display: "immunity" },
    { code: "MEDPREC", system: "http://terminology.hl7.org/CodeSystem/v3-ActReason", display: "medical precaution" },
    { code: "OSTOCK", system: "http://terminology.hl7.org/CodeSystem/v3-ActReason", display: "product out of stock" },
    { code: "PATOBJ", system: "http://terminology.hl7.org/CodeSystem/v3-ActReason", display: "patient objection" },
    { code: "310376006", system: "http://snomed.info/sct", display: "Immunization consent not given" },
    { code: "171257003", system: "http://snomed.info/sct", display: "No consent - Tetanus/low dose diptheria vaccine" },
    { code: "171265000", system: "http://snomed.info/sct", display: "Pertussis vaccine refused" },
    { code: "171266004", system: "http://snomed.info/sct", display: "No consent - diphtheria immunisation" },
    { code: "171267008", system: "http://snomed.info/sct", display: "No consent - tetanus immunization" },
    { code: "171268003", system: "http://snomed.info/sct", display: "Polio immunisation refused" },
    { code: "171269006", system: "http://snomed.info/sct", display: "No consent - measles immunization" },
    { code: "171270007", system: "http://snomed.info/sct", display: "No consent - rubella immunisation" },
    { code: "171271006", system: "http://snomed.info/sct", display: "No consent - BCG" },
    { code: "171272004", system: "http://snomed.info/sct", display: "No consent - influenza immunization" },
    { code: "171280006", system: "http://snomed.info/sct", display: "No consent for MMR" },
    { code: "171283008", system: "http://snomed.info/sct", display: "No consent for any primary imm" },
    { code: "171285001", system: "http://snomed.info/sct", display: "No consent - pre-school vaccinations" },
    { code: "171286000", system: "http://snomed.info/sct", display: "No consent - school exit vaccinations" },
    { code: "171291004", system: "http://snomed.info/sct", display: "No consent - Hemophilus influenzae type B immunization" },
    { code: "171292006", system: "http://snomed.info/sct", display: "No consent pneumococcal immunisation" },
    { code: "171293001", system: "http://snomed.info/sct", display: "No consent for MR - Measles/rubella vaccine" },
    { code: "268559007", system: "http://snomed.info/sct", display: "No consent for any immunization" },
    { code: "310839003", system: "http://snomed.info/sct", display: "No consent for MMR1" },
    { code: "310840001", system: "http://snomed.info/sct", display: "No consent for measles/mumps/rubella two" },
    { code: "314768003", system: "http://snomed.info/sct", display: "No consent DTP immunisation" },
    { code: "314769006", system: "http://snomed.info/sct", display: "No consent DT immunization" },
    { code: "314936001", system: "http://snomed.info/sct", display: "No consent for meningitis C immunisation" },
    { code: "407598009", system: "http://snomed.info/sct", display: "No consent for 3rd HIB booster (finding)" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidImmunizationStatusReasonCode(code) {
    return ImmunizationStatusReasonConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getImmunizationStatusReasonConcept(code) {
    return ImmunizationStatusReasonConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ImmunizationStatusReasonCodes = ImmunizationStatusReasonConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomImmunizationStatusReasonCode() {
    return ImmunizationStatusReasonCodes[Math.floor(Math.random() * ImmunizationStatusReasonCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomImmunizationStatusReasonConcept() {
    return ImmunizationStatusReasonConcepts[Math.floor(Math.random() * ImmunizationStatusReasonConcepts.length)];
}
