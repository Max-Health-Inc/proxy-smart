/**
 * ValueSet: bodysite-laterality
 * URL: http://hl7.org/fhir/ValueSet/bodysite-laterality
 * Size: 3 concepts
 */
export const BodysiteLateralityConcepts = [
    { code: "419161000", system: "http://snomed.info/sct", display: "Unilateral left (qualifier value)" },
    { code: "419465000", system: "http://snomed.info/sct", display: "Unilateral right (qualifier value)" },
    { code: "51440002", system: "http://snomed.info/sct", display: "Right and left" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidBodysiteLateralityCode(code) {
    return BodysiteLateralityConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getBodysiteLateralityConcept(code) {
    return BodysiteLateralityConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const BodysiteLateralityCodes = BodysiteLateralityConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomBodysiteLateralityCode() {
    return BodysiteLateralityCodes[Math.floor(Math.random() * BodysiteLateralityCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomBodysiteLateralityConcept() {
    return BodysiteLateralityConcepts[Math.floor(Math.random() * BodysiteLateralityConcepts.length)];
}
