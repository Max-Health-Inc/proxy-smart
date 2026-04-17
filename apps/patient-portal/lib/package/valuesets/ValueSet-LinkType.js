/**
 * ValueSet: link-type
 * URL: http://hl7.org/fhir/ValueSet/link-type
 * Size: 4 concepts
 */
export const LinkTypeConcepts = [
    { code: "replaced-by", system: "http://hl7.org/fhir/link-type", display: "Replaced-by" },
    { code: "replaces", system: "http://hl7.org/fhir/link-type", display: "Replaces" },
    { code: "refer", system: "http://hl7.org/fhir/link-type", display: "Refer" },
    { code: "seealso", system: "http://hl7.org/fhir/link-type", display: "See also" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidLinkTypeCode(code) {
    return LinkTypeConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getLinkTypeConcept(code) {
    return LinkTypeConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const LinkTypeCodes = LinkTypeConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomLinkTypeCode() {
    return LinkTypeCodes[Math.floor(Math.random() * LinkTypeCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomLinkTypeConcept() {
    return LinkTypeConcepts[Math.floor(Math.random() * LinkTypeConcepts.length)];
}
