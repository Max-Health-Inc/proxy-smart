/**
 * ValueSet: reaction-event-severity
 * URL: http://hl7.org/fhir/ValueSet/reaction-event-severity
 * Size: 3 concepts
 */
export const ReactionEventSeverityConcepts = [
    { code: "mild", system: "http://hl7.org/fhir/reaction-event-severity", display: "Mild" },
    { code: "moderate", system: "http://hl7.org/fhir/reaction-event-severity", display: "Moderate" },
    { code: "severe", system: "http://hl7.org/fhir/reaction-event-severity", display: "Severe" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidReactionEventSeverityCode(code) {
    return ReactionEventSeverityConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getReactionEventSeverityConcept(code) {
    return ReactionEventSeverityConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ReactionEventSeverityCodes = ReactionEventSeverityConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomReactionEventSeverityCode() {
    return ReactionEventSeverityCodes[Math.floor(Math.random() * ReactionEventSeverityCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomReactionEventSeverityConcept() {
    return ReactionEventSeverityConcepts[Math.floor(Math.random() * ReactionEventSeverityConcepts.length)];
}
