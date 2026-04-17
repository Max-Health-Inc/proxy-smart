/**
 * ValueSet: device-status-reason
 * URL: http://hl7.org/fhir/ValueSet/device-status-reason
 * Size: 8 concepts
 */
export const DeviceStatusReasonConcepts = [
    { code: "online", system: "http://terminology.hl7.org/CodeSystem/device-status-reason", display: "Online" },
    { code: "paused", system: "http://terminology.hl7.org/CodeSystem/device-status-reason", display: "Paused" },
    { code: "standby", system: "http://terminology.hl7.org/CodeSystem/device-status-reason", display: "Standby" },
    { code: "offline", system: "http://terminology.hl7.org/CodeSystem/device-status-reason", display: "Offline" },
    { code: "not-ready", system: "http://terminology.hl7.org/CodeSystem/device-status-reason", display: "Not Ready" },
    { code: "transduc-discon", system: "http://terminology.hl7.org/CodeSystem/device-status-reason", display: "Transducer Disconnected" },
    { code: "hw-discon", system: "http://terminology.hl7.org/CodeSystem/device-status-reason", display: "Hardware Disconnected" },
    { code: "off", system: "http://terminology.hl7.org/CodeSystem/device-status-reason", display: "Off" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidDeviceStatusReasonCode(code) {
    return DeviceStatusReasonConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getDeviceStatusReasonConcept(code) {
    return DeviceStatusReasonConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const DeviceStatusReasonCodes = DeviceStatusReasonConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomDeviceStatusReasonCode() {
    return DeviceStatusReasonCodes[Math.floor(Math.random() * DeviceStatusReasonCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomDeviceStatusReasonConcept() {
    return DeviceStatusReasonConcepts[Math.floor(Math.random() * DeviceStatusReasonConcepts.length)];
}
