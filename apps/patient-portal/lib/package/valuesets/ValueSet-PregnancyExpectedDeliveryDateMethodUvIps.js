/**
 * ValueSet: PregnancyExpectedDeliveryDateMethodUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/edd-method-uv-ips
 * Size: 3 concepts
 */
export const PregnancyExpectedDeliveryDateMethodUvIpsConcepts = [
    { code: "11778-8", system: "http://loinc.org", display: "Delivery date Estimated" },
    { code: "11779-6", system: "http://loinc.org", display: "Delivery date Estimated from last menstrual period" },
    { code: "11780-4", system: "http://loinc.org", display: "Delivery date Estimated from ovulation date" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidPregnancyExpectedDeliveryDateMethodUvIpsCode(code) {
    return PregnancyExpectedDeliveryDateMethodUvIpsConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getPregnancyExpectedDeliveryDateMethodUvIpsConcept(code) {
    return PregnancyExpectedDeliveryDateMethodUvIpsConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const PregnancyExpectedDeliveryDateMethodUvIpsCodes = PregnancyExpectedDeliveryDateMethodUvIpsConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomPregnancyExpectedDeliveryDateMethodUvIpsCode() {
    return PregnancyExpectedDeliveryDateMethodUvIpsCodes[Math.floor(Math.random() * PregnancyExpectedDeliveryDateMethodUvIpsCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomPregnancyExpectedDeliveryDateMethodUvIpsConcept() {
    return PregnancyExpectedDeliveryDateMethodUvIpsConcepts[Math.floor(Math.random() * PregnancyExpectedDeliveryDateMethodUvIpsConcepts.length)];
}
