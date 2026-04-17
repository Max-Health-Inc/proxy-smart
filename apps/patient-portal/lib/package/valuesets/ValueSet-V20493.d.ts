/**
 * ValueSet: v2-0493
 * URL: http://terminology.hl7.org/ValueSet/v2-0493
 * Size: 10 concepts
 */
export declare const V20493Concepts: readonly [{
    readonly code: "AUT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0493";
    readonly display: "Autolyzed";
}, {
    readonly code: "CLOT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0493";
    readonly display: "Clotted";
}, {
    readonly code: "CON";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0493";
    readonly display: "Contaminated";
}, {
    readonly code: "COOL";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0493";
    readonly display: "Cool";
}, {
    readonly code: "FROZ";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0493";
    readonly display: "Frozen";
}, {
    readonly code: "HEM";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0493";
    readonly display: "Hemolyzed";
}, {
    readonly code: "LIVE";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0493";
    readonly display: "Live";
}, {
    readonly code: "ROOM";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0493";
    readonly display: "Room temperature";
}, {
    readonly code: "SNR";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0493";
    readonly display: "Sample not received";
}, {
    readonly code: "CFU";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0493";
    readonly display: "Centrifuged";
}];
/** Union type of all valid codes in this ValueSet */
export type V20493Code = "AUT" | "CLOT" | "CON" | "COOL" | "FROZ" | "HEM" | "LIVE" | "ROOM" | "SNR" | "CFU";
/** Type representing a concept from this ValueSet */
export type V20493Concept = typeof V20493Concepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidV20493Code(code: string): code is V20493Code;
/**
 * Get concept details by code
 */
export declare function getV20493Concept(code: string): V20493Concept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const V20493Codes: ("ROOM" | "CON" | "AUT" | "CLOT" | "COOL" | "FROZ" | "HEM" | "LIVE" | "SNR" | "CFU")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomV20493Code(): V20493Code;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomV20493Concept(): V20493Concept;
