/**
 * ValueSet: PregnancyStatusUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/pregnancy-status-uv-ips
 * Size: 4 concepts
 */
export declare const PregnancyStatusUvIpsConcepts: readonly [{
    readonly code: "77386006";
    readonly system: "http://snomed.info/sct";
    readonly display: "Pregnant";
}, {
    readonly code: "60001007";
    readonly system: "http://snomed.info/sct";
    readonly display: "Not pregnant";
}, {
    readonly code: "152231000119106";
    readonly system: "http://snomed.info/sct";
    readonly display: "Pregnancy not yet confirmed";
}, {
    readonly code: "146799005";
    readonly system: "http://snomed.info/sct";
    readonly display: "Possible pregnancy";
}];
/** Union type of all valid codes in this ValueSet */
export type PregnancyStatusUvIpsCode = "77386006" | "60001007" | "152231000119106" | "146799005";
/** Type representing a concept from this ValueSet */
export type PregnancyStatusUvIpsConcept = typeof PregnancyStatusUvIpsConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidPregnancyStatusUvIpsCode(code: string): code is PregnancyStatusUvIpsCode;
/**
 * Get concept details by code
 */
export declare function getPregnancyStatusUvIpsConcept(code: string): PregnancyStatusUvIpsConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const PregnancyStatusUvIpsCodes: ("77386006" | "60001007" | "152231000119106" | "146799005")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomPregnancyStatusUvIpsCode(): PregnancyStatusUvIpsCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomPregnancyStatusUvIpsConcept(): PregnancyStatusUvIpsConcept;
