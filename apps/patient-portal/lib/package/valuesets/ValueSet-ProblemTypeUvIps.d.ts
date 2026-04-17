/**
 * ValueSet: ProblemTypeUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/problem-type-uv-ips
 * Size: 1 concepts
 */
export declare const ProblemTypeUvIpsConcepts: readonly [{
    readonly code: "problem-list-item";
    readonly system: "http://terminology.hl7.org/CodeSystem/condition-category";
    readonly display: "Problem List Item";
}];
/** Union type of all valid codes in this ValueSet */
export type ProblemTypeUvIpsCode = "problem-list-item";
/** Type representing a concept from this ValueSet */
export type ProblemTypeUvIpsConcept = typeof ProblemTypeUvIpsConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidProblemTypeUvIpsCode(code: string): code is ProblemTypeUvIpsCode;
/**
 * Get concept details by code
 */
export declare function getProblemTypeUvIpsConcept(code: string): ProblemTypeUvIpsConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ProblemTypeUvIpsCodes: "problem-list-item"[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomProblemTypeUvIpsCode(): ProblemTypeUvIpsCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomProblemTypeUvIpsConcept(): ProblemTypeUvIpsConcept;
