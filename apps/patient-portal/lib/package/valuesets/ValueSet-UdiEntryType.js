/**
 * ValueSet: udi-entry-type
 * URL: http://hl7.org/fhir/ValueSet/udi-entry-type
 * Size: 6 concepts
 */
export const UdiEntryTypeConcepts = [
    { code: "barcode", system: "http://hl7.org/fhir/udi-entry-type", display: "Barcode" },
    { code: "rfid", system: "http://hl7.org/fhir/udi-entry-type", display: "RFID" },
    { code: "manual", system: "http://hl7.org/fhir/udi-entry-type", display: "Manual" },
    { code: "card", system: "http://hl7.org/fhir/udi-entry-type", display: "Card" },
    { code: "self-reported", system: "http://hl7.org/fhir/udi-entry-type", display: "Self Reported" },
    { code: "unknown", system: "http://hl7.org/fhir/udi-entry-type", display: "Unknown" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidUdiEntryTypeCode(code) {
    return UdiEntryTypeConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getUdiEntryTypeConcept(code) {
    return UdiEntryTypeConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const UdiEntryTypeCodes = UdiEntryTypeConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomUdiEntryTypeCode() {
    return UdiEntryTypeCodes[Math.floor(Math.random() * UdiEntryTypeCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomUdiEntryTypeConcept() {
    return UdiEntryTypeConcepts[Math.floor(Math.random() * UdiEntryTypeConcepts.length)];
}
