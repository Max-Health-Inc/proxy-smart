/**
 * ValueSet: device-statement-status
 * URL: http://hl7.org/fhir/ValueSet/device-statement-status
 * Size: 6 concepts
 */
export const DeviceStatementStatusConcepts = [
    { code: "active", system: "http://hl7.org/fhir/device-statement-status", display: "Active" },
    { code: "completed", system: "http://hl7.org/fhir/device-statement-status", display: "Completed" },
    { code: "entered-in-error", system: "http://hl7.org/fhir/device-statement-status", display: "Entered in Error" },
    { code: "intended", system: "http://hl7.org/fhir/device-statement-status", display: "Intended" },
    { code: "stopped", system: "http://hl7.org/fhir/device-statement-status", display: "Stopped" },
    { code: "on-hold", system: "http://hl7.org/fhir/device-statement-status", display: "On Hold" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidDeviceStatementStatusCode(code) {
    return DeviceStatementStatusConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getDeviceStatementStatusConcept(code) {
    return DeviceStatementStatusConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const DeviceStatementStatusCodes = DeviceStatementStatusConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomDeviceStatementStatusCode() {
    return DeviceStatementStatusCodes[Math.floor(Math.random() * DeviceStatementStatusCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomDeviceStatementStatusConcept() {
    return DeviceStatementStatusConcepts[Math.floor(Math.random() * DeviceStatementStatusConcepts.length)];
}
