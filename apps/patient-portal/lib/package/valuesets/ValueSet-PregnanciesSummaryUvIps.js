/**
 * ValueSet: PregnanciesSummaryUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/pregnancies-summary-uv-ips
 * Size: 9 concepts
 */
export const PregnanciesSummaryUvIpsConcepts = [
    { code: "11636-8", system: "http://loinc.org", display: "[#] Births.live" },
    { code: "11637-6", system: "http://loinc.org", display: "[#] Births.preterm" },
    { code: "11638-4", system: "http://loinc.org", display: "[#] Births.still living" },
    { code: "11639-2", system: "http://loinc.org", display: "[#] Births.term" },
    { code: "11640-0", system: "http://loinc.org", display: "[#] Births total" },
    { code: "11612-9", system: "http://loinc.org", display: "[#] Abortions" },
    { code: "11613-7", system: "http://loinc.org", display: "[#] Abortions.induced" },
    { code: "11614-5", system: "http://loinc.org", display: "[#] Abortions.spontaneous" },
    { code: "33065-4", system: "http://loinc.org", display: "[#] Ectopic pregnancy" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidPregnanciesSummaryUvIpsCode(code) {
    return PregnanciesSummaryUvIpsConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getPregnanciesSummaryUvIpsConcept(code) {
    return PregnanciesSummaryUvIpsConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const PregnanciesSummaryUvIpsCodes = PregnanciesSummaryUvIpsConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomPregnanciesSummaryUvIpsCode() {
    return PregnanciesSummaryUvIpsCodes[Math.floor(Math.random() * PregnanciesSummaryUvIpsCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomPregnanciesSummaryUvIpsConcept() {
    return PregnanciesSummaryUvIpsConcepts[Math.floor(Math.random() * PregnanciesSummaryUvIpsConcepts.length)];
}
