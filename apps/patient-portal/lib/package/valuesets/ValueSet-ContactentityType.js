/**
 * ValueSet: contactentity-type
 * URL: http://hl7.org/fhir/ValueSet/contactentity-type
 * Size: 6 concepts
 */
export const ContactentityTypeConcepts = [
    { code: "BILL", system: "http://terminology.hl7.org/CodeSystem/contactentity-type", display: "Billing" },
    { code: "ADMIN", system: "http://terminology.hl7.org/CodeSystem/contactentity-type", display: "Administrative" },
    { code: "HR", system: "http://terminology.hl7.org/CodeSystem/contactentity-type", display: "Human Resource" },
    { code: "PAYOR", system: "http://terminology.hl7.org/CodeSystem/contactentity-type", display: "Payor" },
    { code: "PATINF", system: "http://terminology.hl7.org/CodeSystem/contactentity-type", display: "Patient" },
    { code: "PRESS", system: "http://terminology.hl7.org/CodeSystem/contactentity-type", display: "Press" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidContactentityTypeCode(code) {
    return ContactentityTypeConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getContactentityTypeConcept(code) {
    return ContactentityTypeConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ContactentityTypeCodes = ContactentityTypeConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomContactentityTypeCode() {
    return ContactentityTypeCodes[Math.floor(Math.random() * ContactentityTypeCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomContactentityTypeConcept() {
    return ContactentityTypeConcepts[Math.floor(Math.random() * ContactentityTypeConcepts.length)];
}
