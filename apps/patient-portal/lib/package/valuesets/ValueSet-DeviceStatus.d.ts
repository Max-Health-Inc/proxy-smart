/**
 * ValueSet: device-status
 * URL: http://hl7.org/fhir/ValueSet/device-status
 * Size: 4 concepts
 */
export declare const DeviceStatusConcepts: readonly [{
    readonly code: "active";
    readonly system: "http://hl7.org/fhir/device-status";
    readonly display: "Active";
}, {
    readonly code: "inactive";
    readonly system: "http://hl7.org/fhir/device-status";
    readonly display: "Inactive";
}, {
    readonly code: "entered-in-error";
    readonly system: "http://hl7.org/fhir/device-status";
    readonly display: "Entered in Error";
}, {
    readonly code: "unknown";
    readonly system: "http://hl7.org/fhir/device-status";
    readonly display: "Unknown";
}];
/** Union type of all valid codes in this ValueSet */
export type DeviceStatusCode = "active" | "inactive" | "entered-in-error" | "unknown";
/** Type representing a concept from this ValueSet */
export type DeviceStatusConcept = typeof DeviceStatusConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidDeviceStatusCode(code: string): code is DeviceStatusCode;
/**
 * Get concept details by code
 */
export declare function getDeviceStatusConcept(code: string): DeviceStatusConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const DeviceStatusCodes: ("active" | "unknown" | "entered-in-error" | "inactive")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomDeviceStatusCode(): DeviceStatusCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomDeviceStatusConcept(): DeviceStatusConcept;
