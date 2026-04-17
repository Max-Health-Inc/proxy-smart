/**
 * ValueSet: name-use
 * URL: http://hl7.org/fhir/ValueSet/name-use
 * Size: 6 concepts
 */
export declare const NameUseConcepts: readonly [{
    readonly code: "usual";
    readonly system: "http://hl7.org/fhir/name-use";
    readonly display: "Usual";
}, {
    readonly code: "official";
    readonly system: "http://hl7.org/fhir/name-use";
    readonly display: "Official";
}, {
    readonly code: "temp";
    readonly system: "http://hl7.org/fhir/name-use";
    readonly display: "Temp";
}, {
    readonly code: "nickname";
    readonly system: "http://hl7.org/fhir/name-use";
    readonly display: "Nickname";
}, {
    readonly code: "anonymous";
    readonly system: "http://hl7.org/fhir/name-use";
    readonly display: "Anonymous";
}, {
    readonly code: "old";
    readonly system: "http://hl7.org/fhir/name-use";
    readonly display: "Old";
}];
/** Union type of all valid codes in this ValueSet */
export type NameUseCode = "usual" | "official" | "temp" | "nickname" | "anonymous" | "old";
/** Type representing a concept from this ValueSet */
export type NameUseConcept = typeof NameUseConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidNameUseCode(code: string): code is NameUseCode;
/**
 * Get concept details by code
 */
export declare function getNameUseConcept(code: string): NameUseConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const NameUseCodes: ("official" | "usual" | "temp" | "nickname" | "anonymous" | "old")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomNameUseCode(): NameUseCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomNameUseConcept(): NameUseConcept;
