/**
 * ValueSet: document-relationship-type
 * URL: http://hl7.org/fhir/ValueSet/document-relationship-type
 * Size: 4 concepts
 */
export declare const DocumentRelationshipTypeConcepts: readonly [{
    readonly code: "replaces";
    readonly system: "http://hl7.org/fhir/document-relationship-type";
    readonly display: "Replaces";
}, {
    readonly code: "transforms";
    readonly system: "http://hl7.org/fhir/document-relationship-type";
    readonly display: "Transforms";
}, {
    readonly code: "signs";
    readonly system: "http://hl7.org/fhir/document-relationship-type";
    readonly display: "Signs";
}, {
    readonly code: "appends";
    readonly system: "http://hl7.org/fhir/document-relationship-type";
    readonly display: "Appends";
}];
/** Union type of all valid codes in this ValueSet */
export type DocumentRelationshipTypeCode = "replaces" | "transforms" | "signs" | "appends";
/** Type representing a concept from this ValueSet */
export type DocumentRelationshipTypeConcept = typeof DocumentRelationshipTypeConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidDocumentRelationshipTypeCode(code: string): code is DocumentRelationshipTypeCode;
/**
 * Get concept details by code
 */
export declare function getDocumentRelationshipTypeConcept(code: string): DocumentRelationshipTypeConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const DocumentRelationshipTypeCodes: ("replaces" | "transforms" | "signs" | "appends")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomDocumentRelationshipTypeCode(): DocumentRelationshipTypeCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomDocumentRelationshipTypeConcept(): DocumentRelationshipTypeConcept;
