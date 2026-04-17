/**
 * ValueSet: CurrentSmokingStatusUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/current-smoking-status-uv-ips
 * Size: 8 concepts
 */
export declare const CurrentSmokingStatusUvIpsConcepts: readonly [{
    readonly code: "449868002";
    readonly system: "http://snomed.info/sct";
    readonly display: "Smokes tobacco daily (finding)";
}, {
    readonly code: "428041000124106";
    readonly system: "http://snomed.info/sct";
    readonly display: "Occasional tobacco smoker (finding)";
}, {
    readonly code: "8517006";
    readonly system: "http://snomed.info/sct";
    readonly display: "Ex-smoker (finding)";
}, {
    readonly code: "266919005";
    readonly system: "http://snomed.info/sct";
    readonly display: "Never smoked tobacco (finding)";
}, {
    readonly code: "77176002";
    readonly system: "http://snomed.info/sct";
    readonly display: "Smoker (finding)";
}, {
    readonly code: "266927001";
    readonly system: "http://snomed.info/sct";
    readonly display: "Tobacco smoking consumption unknown (finding)";
}, {
    readonly code: "230063004";
    readonly system: "http://snomed.info/sct";
    readonly display: "Heavy cigarette smoker (finding)";
}, {
    readonly code: "230060001";
    readonly system: "http://snomed.info/sct";
    readonly display: "Light cigarette smoker (finding)";
}];
/** Union type of all valid codes in this ValueSet */
export type CurrentSmokingStatusUvIpsCode = "449868002" | "428041000124106" | "8517006" | "266919005" | "77176002" | "266927001" | "230063004" | "230060001";
/** Type representing a concept from this ValueSet */
export type CurrentSmokingStatusUvIpsConcept = typeof CurrentSmokingStatusUvIpsConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidCurrentSmokingStatusUvIpsCode(code: string): code is CurrentSmokingStatusUvIpsCode;
/**
 * Get concept details by code
 */
export declare function getCurrentSmokingStatusUvIpsConcept(code: string): CurrentSmokingStatusUvIpsConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const CurrentSmokingStatusUvIpsCodes: ("449868002" | "428041000124106" | "8517006" | "266919005" | "77176002" | "266927001" | "230063004" | "230060001")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomCurrentSmokingStatusUvIpsCode(): CurrentSmokingStatusUvIpsCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomCurrentSmokingStatusUvIpsConcept(): CurrentSmokingStatusUvIpsConcept;
