/**
 * ValueSet: http-verb
 * URL: http://hl7.org/fhir/ValueSet/http-verb
 * Size: 6 concepts
 */
export declare const HttpVerbConcepts: readonly [{
    readonly code: "GET";
    readonly system: "http://hl7.org/fhir/http-verb";
    readonly display: "GET";
}, {
    readonly code: "HEAD";
    readonly system: "http://hl7.org/fhir/http-verb";
    readonly display: "HEAD";
}, {
    readonly code: "POST";
    readonly system: "http://hl7.org/fhir/http-verb";
    readonly display: "POST";
}, {
    readonly code: "PUT";
    readonly system: "http://hl7.org/fhir/http-verb";
    readonly display: "PUT";
}, {
    readonly code: "DELETE";
    readonly system: "http://hl7.org/fhir/http-verb";
    readonly display: "DELETE";
}, {
    readonly code: "PATCH";
    readonly system: "http://hl7.org/fhir/http-verb";
    readonly display: "PATCH";
}];
/** Union type of all valid codes in this ValueSet */
export type HttpVerbCode = "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "PATCH";
/** Type representing a concept from this ValueSet */
export type HttpVerbConcept = typeof HttpVerbConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidHttpVerbCode(code: string): code is HttpVerbCode;
/**
 * Get concept details by code
 */
export declare function getHttpVerbConcept(code: string): HttpVerbConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const HttpVerbCodes: ("GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "PATCH")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomHttpVerbCode(): HttpVerbCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomHttpVerbConcept(): HttpVerbConcept;
