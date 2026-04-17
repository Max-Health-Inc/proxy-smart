/**
 * ValueSet: device-status
 * URL: http://hl7.org/fhir/ValueSet/device-status
 * Size: 4 concepts
 */
export const DeviceStatusConcepts = [
    { code: "active", system: "http://hl7.org/fhir/device-status", display: "Active" },
    { code: "inactive", system: "http://hl7.org/fhir/device-status", display: "Inactive" },
    { code: "entered-in-error", system: "http://hl7.org/fhir/device-status", display: "Entered in Error" },
    { code: "unknown", system: "http://hl7.org/fhir/device-status", display: "Unknown" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidDeviceStatusCode(code) {
    return DeviceStatusConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getDeviceStatusConcept(code) {
    return DeviceStatusConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const DeviceStatusCodes = DeviceStatusConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomDeviceStatusCode() {
    return DeviceStatusCodes[Math.floor(Math.random() * DeviceStatusCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomDeviceStatusConcept() {
    return DeviceStatusConcepts[Math.floor(Math.random() * DeviceStatusConcepts.length)];
}
