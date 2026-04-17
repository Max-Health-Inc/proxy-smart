/**
 * ValueSet: series-performer-function
 * URL: http://hl7.org/fhir/ValueSet/series-performer-function
 * Size: 5 concepts
 */
export declare const SeriesPerformerFunctionConcepts: readonly [{
    readonly code: "CON";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType";
    readonly display: "consultant";
}, {
    readonly code: "VRF";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType";
    readonly display: "verifier";
}, {
    readonly code: "PRF";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType";
    readonly display: "performer";
}, {
    readonly code: "SPRF";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType";
    readonly display: "secondary performer";
}, {
    readonly code: "REF";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType";
    readonly display: "referrer";
}];
/** Union type of all valid codes in this ValueSet */
export type SeriesPerformerFunctionCode = "CON" | "VRF" | "PRF" | "SPRF" | "REF";
/** Type representing a concept from this ValueSet */
export type SeriesPerformerFunctionConcept = typeof SeriesPerformerFunctionConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidSeriesPerformerFunctionCode(code: string): code is SeriesPerformerFunctionCode;
/**
 * Get concept details by code
 */
export declare function getSeriesPerformerFunctionConcept(code: string): SeriesPerformerFunctionConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const SeriesPerformerFunctionCodes: ("REF" | "CON" | "VRF" | "PRF" | "SPRF")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomSeriesPerformerFunctionCode(): SeriesPerformerFunctionCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomSeriesPerformerFunctionConcept(): SeriesPerformerFunctionConcept;
