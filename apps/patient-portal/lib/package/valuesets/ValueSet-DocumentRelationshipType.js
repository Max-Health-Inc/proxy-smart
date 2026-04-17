/**
 * ValueSet: document-relationship-type
 * URL: http://hl7.org/fhir/ValueSet/document-relationship-type
 * Size: 4 concepts
 */
export const DocumentRelationshipTypeConcepts = [
    { code: "replaces", system: "http://hl7.org/fhir/document-relationship-type", display: "Replaces" },
    { code: "transforms", system: "http://hl7.org/fhir/document-relationship-type", display: "Transforms" },
    { code: "signs", system: "http://hl7.org/fhir/document-relationship-type", display: "Signs" },
    { code: "appends", system: "http://hl7.org/fhir/document-relationship-type", display: "Appends" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidDocumentRelationshipTypeCode(code) {
    return DocumentRelationshipTypeConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getDocumentRelationshipTypeConcept(code) {
    return DocumentRelationshipTypeConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const DocumentRelationshipTypeCodes = DocumentRelationshipTypeConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomDocumentRelationshipTypeCode() {
    return DocumentRelationshipTypeCodes[Math.floor(Math.random() * DocumentRelationshipTypeCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomDocumentRelationshipTypeConcept() {
    return DocumentRelationshipTypeConcepts[Math.floor(Math.random() * DocumentRelationshipTypeConcepts.length)];
}
