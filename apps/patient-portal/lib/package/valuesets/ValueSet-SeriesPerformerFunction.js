/**
 * ValueSet: series-performer-function
 * URL: http://hl7.org/fhir/ValueSet/series-performer-function
 * Size: 5 concepts
 */
export const SeriesPerformerFunctionConcepts = [
    { code: "CON", system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType", display: "consultant" },
    { code: "VRF", system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType", display: "verifier" },
    { code: "PRF", system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType", display: "performer" },
    { code: "SPRF", system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType", display: "secondary performer" },
    { code: "REF", system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType", display: "referrer" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidSeriesPerformerFunctionCode(code) {
    return SeriesPerformerFunctionConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getSeriesPerformerFunctionConcept(code) {
    return SeriesPerformerFunctionConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const SeriesPerformerFunctionCodes = SeriesPerformerFunctionConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomSeriesPerformerFunctionCode() {
    return SeriesPerformerFunctionCodes[Math.floor(Math.random() * SeriesPerformerFunctionCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomSeriesPerformerFunctionConcept() {
    return SeriesPerformerFunctionConcepts[Math.floor(Math.random() * SeriesPerformerFunctionConcepts.length)];
}
