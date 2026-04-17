/**
 * ValueSet: specimen-status
 * URL: http://hl7.org/fhir/ValueSet/specimen-status
 * Size: 4 concepts
 */
export declare const SpecimenStatusConcepts: readonly [{
    readonly code: "available";
    readonly system: "http://hl7.org/fhir/specimen-status";
    readonly display: "Available";
}, {
    readonly code: "unavailable";
    readonly system: "http://hl7.org/fhir/specimen-status";
    readonly display: "Unavailable";
}, {
    readonly code: "unsatisfactory";
    readonly system: "http://hl7.org/fhir/specimen-status";
    readonly display: "Unsatisfactory";
}, {
    readonly code: "entered-in-error";
    readonly system: "http://hl7.org/fhir/specimen-status";
    readonly display: "Entered in Error";
}];
/** Union type of all valid codes in this ValueSet */
export type SpecimenStatusCode = "available" | "unavailable" | "unsatisfactory" | "entered-in-error";
/** Type representing a concept from this ValueSet */
export type SpecimenStatusConcept = typeof SpecimenStatusConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidSpecimenStatusCode(code: string): code is SpecimenStatusCode;
/**
 * Get concept details by code
 */
export declare function getSpecimenStatusConcept(code: string): SpecimenStatusConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const SpecimenStatusCodes: ("entered-in-error" | "unavailable" | "available" | "unsatisfactory")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomSpecimenStatusCode(): SpecimenStatusCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomSpecimenStatusConcept(): SpecimenStatusConcept;
