/**
 * ValueSet: event-status
 * URL: http://hl7.org/fhir/ValueSet/event-status
 * Size: 8 concepts
 */
export const EventStatusConcepts = [
    { code: "preparation", system: "http://hl7.org/fhir/event-status", display: "Preparation" },
    { code: "in-progress", system: "http://hl7.org/fhir/event-status", display: "In Progress" },
    { code: "not-done", system: "http://hl7.org/fhir/event-status", display: "Not Done" },
    { code: "on-hold", system: "http://hl7.org/fhir/event-status", display: "On Hold" },
    { code: "stopped", system: "http://hl7.org/fhir/event-status", display: "Stopped" },
    { code: "completed", system: "http://hl7.org/fhir/event-status", display: "Completed" },
    { code: "entered-in-error", system: "http://hl7.org/fhir/event-status", display: "Entered in Error" },
    { code: "unknown", system: "http://hl7.org/fhir/event-status", display: "Unknown" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidEventStatusCode(code) {
    return EventStatusConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getEventStatusConcept(code) {
    return EventStatusConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const EventStatusCodes = EventStatusConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomEventStatusCode() {
    return EventStatusCodes[Math.floor(Math.random() * EventStatusCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomEventStatusConcept() {
    return EventStatusConcepts[Math.floor(Math.random() * EventStatusConcepts.length)];
}
