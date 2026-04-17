/**
 * ValueSet: device-statement-status
 * URL: http://hl7.org/fhir/ValueSet/device-statement-status
 * Size: 6 concepts
 */
export declare const DeviceStatementStatusConcepts: readonly [{
    readonly code: "active";
    readonly system: "http://hl7.org/fhir/device-statement-status";
    readonly display: "Active";
}, {
    readonly code: "completed";
    readonly system: "http://hl7.org/fhir/device-statement-status";
    readonly display: "Completed";
}, {
    readonly code: "entered-in-error";
    readonly system: "http://hl7.org/fhir/device-statement-status";
    readonly display: "Entered in Error";
}, {
    readonly code: "intended";
    readonly system: "http://hl7.org/fhir/device-statement-status";
    readonly display: "Intended";
}, {
    readonly code: "stopped";
    readonly system: "http://hl7.org/fhir/device-statement-status";
    readonly display: "Stopped";
}, {
    readonly code: "on-hold";
    readonly system: "http://hl7.org/fhir/device-statement-status";
    readonly display: "On Hold";
}];
/** Union type of all valid codes in this ValueSet */
export type DeviceStatementStatusCode = "active" | "completed" | "entered-in-error" | "intended" | "stopped" | "on-hold";
/** Type representing a concept from this ValueSet */
export type DeviceStatementStatusConcept = typeof DeviceStatementStatusConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidDeviceStatementStatusCode(code: string): code is DeviceStatementStatusCode;
/**
 * Get concept details by code
 */
export declare function getDeviceStatementStatusConcept(code: string): DeviceStatementStatusConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const DeviceStatementStatusCodes: ("active" | "entered-in-error" | "completed" | "intended" | "stopped" | "on-hold")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomDeviceStatementStatusCode(): DeviceStatementStatusCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomDeviceStatementStatusConcept(): DeviceStatementStatusConcept;
