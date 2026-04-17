/**
 * ValueSet: udi-entry-type
 * URL: http://hl7.org/fhir/ValueSet/udi-entry-type
 * Size: 6 concepts
 */
export declare const UdiEntryTypeConcepts: readonly [{
    readonly code: "barcode";
    readonly system: "http://hl7.org/fhir/udi-entry-type";
    readonly display: "Barcode";
}, {
    readonly code: "rfid";
    readonly system: "http://hl7.org/fhir/udi-entry-type";
    readonly display: "RFID";
}, {
    readonly code: "manual";
    readonly system: "http://hl7.org/fhir/udi-entry-type";
    readonly display: "Manual";
}, {
    readonly code: "card";
    readonly system: "http://hl7.org/fhir/udi-entry-type";
    readonly display: "Card";
}, {
    readonly code: "self-reported";
    readonly system: "http://hl7.org/fhir/udi-entry-type";
    readonly display: "Self Reported";
}, {
    readonly code: "unknown";
    readonly system: "http://hl7.org/fhir/udi-entry-type";
    readonly display: "Unknown";
}];
/** Union type of all valid codes in this ValueSet */
export type UdiEntryTypeCode = "barcode" | "rfid" | "manual" | "card" | "self-reported" | "unknown";
/** Type representing a concept from this ValueSet */
export type UdiEntryTypeConcept = typeof UdiEntryTypeConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidUdiEntryTypeCode(code: string): code is UdiEntryTypeCode;
/**
 * Get concept details by code
 */
export declare function getUdiEntryTypeConcept(code: string): UdiEntryTypeConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const UdiEntryTypeCodes: ("unknown" | "barcode" | "rfid" | "manual" | "card" | "self-reported")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomUdiEntryTypeCode(): UdiEntryTypeCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomUdiEntryTypeConcept(): UdiEntryTypeConcept;
