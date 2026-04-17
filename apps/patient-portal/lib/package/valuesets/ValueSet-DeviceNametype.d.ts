/**
 * ValueSet: device-nametype
 * URL: http://hl7.org/fhir/ValueSet/device-nametype
 * Size: 6 concepts
 */
export declare const DeviceNametypeConcepts: readonly [{
    readonly code: "udi-label-name";
    readonly system: "http://hl7.org/fhir/device-nametype";
    readonly display: "UDI Label name";
}, {
    readonly code: "user-friendly-name";
    readonly system: "http://hl7.org/fhir/device-nametype";
    readonly display: "User Friendly name";
}, {
    readonly code: "patient-reported-name";
    readonly system: "http://hl7.org/fhir/device-nametype";
    readonly display: "Patient Reported name";
}, {
    readonly code: "manufacturer-name";
    readonly system: "http://hl7.org/fhir/device-nametype";
    readonly display: "Manufacturer name";
}, {
    readonly code: "model-name";
    readonly system: "http://hl7.org/fhir/device-nametype";
    readonly display: "Model name";
}, {
    readonly code: "other";
    readonly system: "http://hl7.org/fhir/device-nametype";
    readonly display: "other";
}];
/** Union type of all valid codes in this ValueSet */
export type DeviceNametypeCode = "udi-label-name" | "user-friendly-name" | "patient-reported-name" | "manufacturer-name" | "model-name" | "other";
/** Type representing a concept from this ValueSet */
export type DeviceNametypeConcept = typeof DeviceNametypeConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidDeviceNametypeCode(code: string): code is DeviceNametypeCode;
/**
 * Get concept details by code
 */
export declare function getDeviceNametypeConcept(code: string): DeviceNametypeConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const DeviceNametypeCodes: ("user-friendly-name" | "other" | "udi-label-name" | "patient-reported-name" | "manufacturer-name" | "model-name")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomDeviceNametypeCode(): DeviceNametypeCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomDeviceNametypeConcept(): DeviceNametypeConcept;
