/**
 * ValueSet: v2-0916
 * URL: http://terminology.hl7.org/ValueSet/v2-0916
 * Size: 4 concepts
 */
export declare const V20916Concepts: readonly [{
    readonly code: "F";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0916";
    readonly display: "Patient was fasting prior to the procedure.";
}, {
    readonly code: "NF";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0916";
    readonly display: "The patient indicated they did not fast prior to the procedure.";
}, {
    readonly code: "NG";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0916";
    readonly display: "Not Given - Patient was not asked at the time of the procedure.";
}, {
    readonly code: "FNA";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0916";
    readonly display: "Fasting not asked of the patient at time of procedure.";
}];
/** Union type of all valid codes in this ValueSet */
export type V20916Code = "F" | "NF" | "NG" | "FNA";
/** Type representing a concept from this ValueSet */
export type V20916Concept = typeof V20916Concepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidV20916Code(code: string): code is V20916Code;
/**
 * Get concept details by code
 */
export declare function getV20916Concept(code: string): V20916Concept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const V20916Codes: ("F" | "NF" | "NG" | "FNA")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomV20916Code(): V20916Code;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomV20916Concept(): V20916Concept;
