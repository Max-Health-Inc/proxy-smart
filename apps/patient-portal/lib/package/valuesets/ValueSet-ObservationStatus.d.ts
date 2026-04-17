/**
 * ValueSet: observation-status
 * URL: http://hl7.org/fhir/ValueSet/observation-status
 * Size: 7 concepts
 */
export declare const ObservationStatusConcepts: readonly [{
    readonly code: "registered";
    readonly system: "http://hl7.org/fhir/observation-status";
    readonly display: "Registered";
}, {
    readonly code: "preliminary";
    readonly system: "http://hl7.org/fhir/observation-status";
    readonly display: "Preliminary";
}, {
    readonly code: "final";
    readonly system: "http://hl7.org/fhir/observation-status";
    readonly display: "Final";
}, {
    readonly code: "amended";
    readonly system: "http://hl7.org/fhir/observation-status";
    readonly display: "Amended";
}, {
    readonly code: "cancelled";
    readonly system: "http://hl7.org/fhir/observation-status";
    readonly display: "Cancelled";
}, {
    readonly code: "entered-in-error";
    readonly system: "http://hl7.org/fhir/observation-status";
    readonly display: "Entered in Error";
}, {
    readonly code: "unknown";
    readonly system: "http://hl7.org/fhir/observation-status";
    readonly display: "Unknown";
}];
/** Union type of all valid codes in this ValueSet */
export type ObservationStatusCode = "registered" | "preliminary" | "final" | "amended" | "cancelled" | "entered-in-error" | "unknown";
/** Type representing a concept from this ValueSet */
export type ObservationStatusConcept = typeof ObservationStatusConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidObservationStatusCode(code: string): code is ObservationStatusCode;
/**
 * Get concept details by code
 */
export declare function getObservationStatusConcept(code: string): ObservationStatusConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ObservationStatusCodes: ("unknown" | "entered-in-error" | "final" | "preliminary" | "amended" | "registered" | "cancelled")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomObservationStatusCode(): ObservationStatusCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomObservationStatusConcept(): ObservationStatusConcept;
