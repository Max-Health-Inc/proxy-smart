/**
 * ValueSet: name-use
 * URL: http://hl7.org/fhir/ValueSet/name-use
 * Size: 6 concepts
 */
export const NameUseConcepts = [
    { code: "usual", system: "http://hl7.org/fhir/name-use", display: "Usual" },
    { code: "official", system: "http://hl7.org/fhir/name-use", display: "Official" },
    { code: "temp", system: "http://hl7.org/fhir/name-use", display: "Temp" },
    { code: "nickname", system: "http://hl7.org/fhir/name-use", display: "Nickname" },
    { code: "anonymous", system: "http://hl7.org/fhir/name-use", display: "Anonymous" },
    { code: "old", system: "http://hl7.org/fhir/name-use", display: "Old" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidNameUseCode(code) {
    return NameUseConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getNameUseConcept(code) {
    return NameUseConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const NameUseCodes = NameUseConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomNameUseCode() {
    return NameUseCodes[Math.floor(Math.random() * NameUseCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomNameUseConcept() {
    return NameUseConcepts[Math.floor(Math.random() * NameUseConcepts.length)];
}
