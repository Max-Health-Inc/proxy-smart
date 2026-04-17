/**
 * ValueSet: PatientContactRelationship
 * URL: http://hl7.org/fhir/ValueSet/patient-contactrelationship
 * Size: 11 concepts
 */
export const PatientContactRelationshipConcepts = [
    { code: "BP", system: "http://terminology.hl7.org/CodeSystem/v2-0131", display: "Billing contact person" },
    { code: "CP", system: "http://terminology.hl7.org/CodeSystem/v2-0131", display: "Contact person" },
    { code: "EP", system: "http://terminology.hl7.org/CodeSystem/v2-0131", display: "Emergency contact person" },
    { code: "PR", system: "http://terminology.hl7.org/CodeSystem/v2-0131", display: "Person preparing referral" },
    { code: "E", system: "http://terminology.hl7.org/CodeSystem/v2-0131", display: "Employer" },
    { code: "C", system: "http://terminology.hl7.org/CodeSystem/v2-0131", display: "Emergency Contact" },
    { code: "F", system: "http://terminology.hl7.org/CodeSystem/v2-0131", display: "Federal Agency" },
    { code: "I", system: "http://terminology.hl7.org/CodeSystem/v2-0131", display: "Insurance Company" },
    { code: "N", system: "http://terminology.hl7.org/CodeSystem/v2-0131", display: "Next-of-Kin" },
    { code: "S", system: "http://terminology.hl7.org/CodeSystem/v2-0131", display: "State Agency" },
    { code: "U", system: "http://terminology.hl7.org/CodeSystem/v2-0131", display: "Unknown" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidPatientContactRelationshipCode(code) {
    return PatientContactRelationshipConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getPatientContactRelationshipConcept(code) {
    return PatientContactRelationshipConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const PatientContactRelationshipCodes = PatientContactRelationshipConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomPatientContactRelationshipCode() {
    return PatientContactRelationshipCodes[Math.floor(Math.random() * PatientContactRelationshipCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomPatientContactRelationshipConcept() {
    return PatientContactRelationshipConcepts[Math.floor(Math.random() * PatientContactRelationshipConcepts.length)];
}
/**
 * Multi-language display translations
 * Maps code → language → display string
 */
export const PatientContactRelationshipDisplays = {
    "BP": { "de": "Kontaktperson für Abrechnung" },
    "CP": { "de": "Kontaktperson" },
    "EP": { "de": "Kontaktperson für Notfälle" },
    "PR": { "de": "Person, die die Überweisung vorbereitet" },
    "E": { "de": "Arbeitgeber" },
    "C": { "de": "Ansprechpartner in Notfällen" },
    "F": { "de": "Bundesbehörde" },
    "I": { "de": "Versicherung" },
    "N": { "de": "Kontaktperson" },
    "S": { "de": "Landesbehörde" },
    "U": { "de": "unbekannt" },
};
/**
 * Get the display string for a code in a specific language
 */
export function getPatientContactRelationshipDisplay(code, lang) {
    return PatientContactRelationshipDisplays[code]?.[lang];
}
