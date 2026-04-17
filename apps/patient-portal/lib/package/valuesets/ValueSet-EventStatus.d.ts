/**
 * ValueSet: event-status
 * URL: http://hl7.org/fhir/ValueSet/event-status
 * Size: 8 concepts
 */
export declare const EventStatusConcepts: readonly [{
    readonly code: "preparation";
    readonly system: "http://hl7.org/fhir/event-status";
    readonly display: "Preparation";
}, {
    readonly code: "in-progress";
    readonly system: "http://hl7.org/fhir/event-status";
    readonly display: "In Progress";
}, {
    readonly code: "not-done";
    readonly system: "http://hl7.org/fhir/event-status";
    readonly display: "Not Done";
}, {
    readonly code: "on-hold";
    readonly system: "http://hl7.org/fhir/event-status";
    readonly display: "On Hold";
}, {
    readonly code: "stopped";
    readonly system: "http://hl7.org/fhir/event-status";
    readonly display: "Stopped";
}, {
    readonly code: "completed";
    readonly system: "http://hl7.org/fhir/event-status";
    readonly display: "Completed";
}, {
    readonly code: "entered-in-error";
    readonly system: "http://hl7.org/fhir/event-status";
    readonly display: "Entered in Error";
}, {
    readonly code: "unknown";
    readonly system: "http://hl7.org/fhir/event-status";
    readonly display: "Unknown";
}];
/** Union type of all valid codes in this ValueSet */
export type EventStatusCode = "preparation" | "in-progress" | "not-done" | "on-hold" | "stopped" | "completed" | "entered-in-error" | "unknown";
/** Type representing a concept from this ValueSet */
export type EventStatusConcept = typeof EventStatusConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidEventStatusCode(code: string): code is EventStatusCode;
/**
 * Get concept details by code
 */
export declare function getEventStatusConcept(code: string): EventStatusConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const EventStatusCodes: ("unknown" | "entered-in-error" | "completed" | "stopped" | "on-hold" | "not-done" | "preparation" | "in-progress")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomEventStatusCode(): EventStatusCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomEventStatusConcept(): EventStatusConcept;
