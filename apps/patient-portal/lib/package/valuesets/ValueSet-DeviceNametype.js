/**
 * ValueSet: device-nametype
 * URL: http://hl7.org/fhir/ValueSet/device-nametype
 * Size: 6 concepts
 */
export const DeviceNametypeConcepts = [
    { code: "udi-label-name", system: "http://hl7.org/fhir/device-nametype", display: "UDI Label name" },
    { code: "user-friendly-name", system: "http://hl7.org/fhir/device-nametype", display: "User Friendly name" },
    { code: "patient-reported-name", system: "http://hl7.org/fhir/device-nametype", display: "Patient Reported name" },
    { code: "manufacturer-name", system: "http://hl7.org/fhir/device-nametype", display: "Manufacturer name" },
    { code: "model-name", system: "http://hl7.org/fhir/device-nametype", display: "Model name" },
    { code: "other", system: "http://hl7.org/fhir/device-nametype", display: "other" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidDeviceNametypeCode(code) {
    return DeviceNametypeConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getDeviceNametypeConcept(code) {
    return DeviceNametypeConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const DeviceNametypeCodes = DeviceNametypeConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomDeviceNametypeCode() {
    return DeviceNametypeCodes[Math.floor(Math.random() * DeviceNametypeCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomDeviceNametypeConcept() {
    return DeviceNametypeConcepts[Math.floor(Math.random() * DeviceNametypeConcepts.length)];
}
