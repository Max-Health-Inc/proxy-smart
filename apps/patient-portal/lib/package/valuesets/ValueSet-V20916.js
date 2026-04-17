/**
 * ValueSet: v2-0916
 * URL: http://terminology.hl7.org/ValueSet/v2-0916
 * Size: 4 concepts
 */
export const V20916Concepts = [
    { code: "F", system: "http://terminology.hl7.org/CodeSystem/v2-0916", display: "Patient was fasting prior to the procedure." },
    { code: "NF", system: "http://terminology.hl7.org/CodeSystem/v2-0916", display: "The patient indicated they did not fast prior to the procedure." },
    { code: "NG", system: "http://terminology.hl7.org/CodeSystem/v2-0916", display: "Not Given - Patient was not asked at the time of the procedure." },
    { code: "FNA", system: "http://terminology.hl7.org/CodeSystem/v2-0916", display: "Fasting not asked of the patient at time of procedure." },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidV20916Code(code) {
    return V20916Concepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getV20916Concept(code) {
    return V20916Concepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const V20916Codes = V20916Concepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomV20916Code() {
    return V20916Codes[Math.floor(Math.random() * V20916Codes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomV20916Concept() {
    return V20916Concepts[Math.floor(Math.random() * V20916Concepts.length)];
}
