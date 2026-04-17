/**
 * ValueSet: device-status-reason
 * URL: http://hl7.org/fhir/ValueSet/device-status-reason
 * Size: 8 concepts
 */
export declare const DeviceStatusReasonConcepts: readonly [{
    readonly code: "online";
    readonly system: "http://terminology.hl7.org/CodeSystem/device-status-reason";
    readonly display: "Online";
}, {
    readonly code: "paused";
    readonly system: "http://terminology.hl7.org/CodeSystem/device-status-reason";
    readonly display: "Paused";
}, {
    readonly code: "standby";
    readonly system: "http://terminology.hl7.org/CodeSystem/device-status-reason";
    readonly display: "Standby";
}, {
    readonly code: "offline";
    readonly system: "http://terminology.hl7.org/CodeSystem/device-status-reason";
    readonly display: "Offline";
}, {
    readonly code: "not-ready";
    readonly system: "http://terminology.hl7.org/CodeSystem/device-status-reason";
    readonly display: "Not Ready";
}, {
    readonly code: "transduc-discon";
    readonly system: "http://terminology.hl7.org/CodeSystem/device-status-reason";
    readonly display: "Transducer Disconnected";
}, {
    readonly code: "hw-discon";
    readonly system: "http://terminology.hl7.org/CodeSystem/device-status-reason";
    readonly display: "Hardware Disconnected";
}, {
    readonly code: "off";
    readonly system: "http://terminology.hl7.org/CodeSystem/device-status-reason";
    readonly display: "Off";
}];
/** Union type of all valid codes in this ValueSet */
export type DeviceStatusReasonCode = "online" | "paused" | "standby" | "offline" | "not-ready" | "transduc-discon" | "hw-discon" | "off";
/** Type representing a concept from this ValueSet */
export type DeviceStatusReasonConcept = typeof DeviceStatusReasonConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidDeviceStatusReasonCode(code: string): code is DeviceStatusReasonCode;
/**
 * Get concept details by code
 */
export declare function getDeviceStatusReasonConcept(code: string): DeviceStatusReasonConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const DeviceStatusReasonCodes: ("online" | "paused" | "standby" | "offline" | "not-ready" | "transduc-discon" | "hw-discon" | "off")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomDeviceStatusReasonCode(): DeviceStatusReasonCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomDeviceStatusReasonConcept(): DeviceStatusReasonConcept;
