/**
 * ValueSet: PregnanciesSummaryUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/pregnancies-summary-uv-ips
 * Size: 9 concepts
 */
export declare const PregnanciesSummaryUvIpsConcepts: readonly [{
    readonly code: "11636-8";
    readonly system: "http://loinc.org";
    readonly display: "[#] Births.live";
}, {
    readonly code: "11637-6";
    readonly system: "http://loinc.org";
    readonly display: "[#] Births.preterm";
}, {
    readonly code: "11638-4";
    readonly system: "http://loinc.org";
    readonly display: "[#] Births.still living";
}, {
    readonly code: "11639-2";
    readonly system: "http://loinc.org";
    readonly display: "[#] Births.term";
}, {
    readonly code: "11640-0";
    readonly system: "http://loinc.org";
    readonly display: "[#] Births total";
}, {
    readonly code: "11612-9";
    readonly system: "http://loinc.org";
    readonly display: "[#] Abortions";
}, {
    readonly code: "11613-7";
    readonly system: "http://loinc.org";
    readonly display: "[#] Abortions.induced";
}, {
    readonly code: "11614-5";
    readonly system: "http://loinc.org";
    readonly display: "[#] Abortions.spontaneous";
}, {
    readonly code: "33065-4";
    readonly system: "http://loinc.org";
    readonly display: "[#] Ectopic pregnancy";
}];
/** Union type of all valid codes in this ValueSet */
export type PregnanciesSummaryUvIpsCode = "11636-8" | "11637-6" | "11638-4" | "11639-2" | "11640-0" | "11612-9" | "11613-7" | "11614-5" | "33065-4";
/** Type representing a concept from this ValueSet */
export type PregnanciesSummaryUvIpsConcept = typeof PregnanciesSummaryUvIpsConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidPregnanciesSummaryUvIpsCode(code: string): code is PregnanciesSummaryUvIpsCode;
/**
 * Get concept details by code
 */
export declare function getPregnanciesSummaryUvIpsConcept(code: string): PregnanciesSummaryUvIpsConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const PregnanciesSummaryUvIpsCodes: ("11636-8" | "11637-6" | "11638-4" | "11639-2" | "11640-0" | "11612-9" | "11613-7" | "11614-5" | "33065-4")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomPregnanciesSummaryUvIpsCode(): PregnanciesSummaryUvIpsCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomPregnanciesSummaryUvIpsConcept(): PregnanciesSummaryUvIpsConcept;
