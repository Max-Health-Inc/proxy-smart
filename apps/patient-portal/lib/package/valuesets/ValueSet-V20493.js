/**
 * ValueSet: v2-0493
 * URL: http://terminology.hl7.org/ValueSet/v2-0493
 * Size: 10 concepts
 */
export const V20493Concepts = [
    { code: "AUT", system: "http://terminology.hl7.org/CodeSystem/v2-0493", display: "Autolyzed" },
    { code: "CLOT", system: "http://terminology.hl7.org/CodeSystem/v2-0493", display: "Clotted" },
    { code: "CON", system: "http://terminology.hl7.org/CodeSystem/v2-0493", display: "Contaminated" },
    { code: "COOL", system: "http://terminology.hl7.org/CodeSystem/v2-0493", display: "Cool" },
    { code: "FROZ", system: "http://terminology.hl7.org/CodeSystem/v2-0493", display: "Frozen" },
    { code: "HEM", system: "http://terminology.hl7.org/CodeSystem/v2-0493", display: "Hemolyzed" },
    { code: "LIVE", system: "http://terminology.hl7.org/CodeSystem/v2-0493", display: "Live" },
    { code: "ROOM", system: "http://terminology.hl7.org/CodeSystem/v2-0493", display: "Room temperature" },
    { code: "SNR", system: "http://terminology.hl7.org/CodeSystem/v2-0493", display: "Sample not received" },
    { code: "CFU", system: "http://terminology.hl7.org/CodeSystem/v2-0493", display: "Centrifuged" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidV20493Code(code) {
    return V20493Concepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getV20493Concept(code) {
    return V20493Concepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const V20493Codes = V20493Concepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomV20493Code() {
    return V20493Codes[Math.floor(Math.random() * V20493Codes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomV20493Concept() {
    return V20493Concepts[Math.floor(Math.random() * V20493Concepts.length)];
}
