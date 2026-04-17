/**
 * ValueSet: reaction-event-severity
 * URL: http://hl7.org/fhir/ValueSet/reaction-event-severity
 * Size: 3 concepts
 */
export declare const ReactionEventSeverityConcepts: readonly [{
    readonly code: "mild";
    readonly system: "http://hl7.org/fhir/reaction-event-severity";
    readonly display: "Mild";
}, {
    readonly code: "moderate";
    readonly system: "http://hl7.org/fhir/reaction-event-severity";
    readonly display: "Moderate";
}, {
    readonly code: "severe";
    readonly system: "http://hl7.org/fhir/reaction-event-severity";
    readonly display: "Severe";
}];
/** Union type of all valid codes in this ValueSet */
export type ReactionEventSeverityCode = "mild" | "moderate" | "severe";
/** Type representing a concept from this ValueSet */
export type ReactionEventSeverityConcept = typeof ReactionEventSeverityConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidReactionEventSeverityCode(code: string): code is ReactionEventSeverityCode;
/**
 * Get concept details by code
 */
export declare function getReactionEventSeverityConcept(code: string): ReactionEventSeverityConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ReactionEventSeverityCodes: ("mild" | "moderate" | "severe")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomReactionEventSeverityCode(): ReactionEventSeverityCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomReactionEventSeverityConcept(): ReactionEventSeverityConcept;
