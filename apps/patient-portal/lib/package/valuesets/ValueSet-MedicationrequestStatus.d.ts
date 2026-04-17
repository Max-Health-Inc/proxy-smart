/**
 * ValueSet: medicationrequest-status
 * URL: http://hl7.org/fhir/ValueSet/medicationrequest-status
 * Size: 8 concepts
 */
export declare const MedicationrequestStatusConcepts: readonly [{
    readonly code: "active";
    readonly system: "http://hl7.org/fhir/CodeSystem/medicationrequest-status";
    readonly display: "Active";
}, {
    readonly code: "on-hold";
    readonly system: "http://hl7.org/fhir/CodeSystem/medicationrequest-status";
    readonly display: "On Hold";
}, {
    readonly code: "cancelled";
    readonly system: "http://hl7.org/fhir/CodeSystem/medicationrequest-status";
    readonly display: "Cancelled";
}, {
    readonly code: "completed";
    readonly system: "http://hl7.org/fhir/CodeSystem/medicationrequest-status";
    readonly display: "Completed";
}, {
    readonly code: "entered-in-error";
    readonly system: "http://hl7.org/fhir/CodeSystem/medicationrequest-status";
    readonly display: "Entered in Error";
}, {
    readonly code: "stopped";
    readonly system: "http://hl7.org/fhir/CodeSystem/medicationrequest-status";
    readonly display: "Stopped";
}, {
    readonly code: "draft";
    readonly system: "http://hl7.org/fhir/CodeSystem/medicationrequest-status";
    readonly display: "Draft";
}, {
    readonly code: "unknown";
    readonly system: "http://hl7.org/fhir/CodeSystem/medicationrequest-status";
    readonly display: "Unknown";
}];
/** Union type of all valid codes in this ValueSet */
export type MedicationrequestStatusCode = "active" | "on-hold" | "cancelled" | "completed" | "entered-in-error" | "stopped" | "draft" | "unknown";
/** Type representing a concept from this ValueSet */
export type MedicationrequestStatusConcept = typeof MedicationrequestStatusConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidMedicationrequestStatusCode(code: string): code is MedicationrequestStatusCode;
/**
 * Get concept details by code
 */
export declare function getMedicationrequestStatusConcept(code: string): MedicationrequestStatusConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const MedicationrequestStatusCodes: ("active" | "unknown" | "entered-in-error" | "completed" | "stopped" | "on-hold" | "cancelled" | "draft")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomMedicationrequestStatusCode(): MedicationrequestStatusCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomMedicationrequestStatusConcept(): MedicationrequestStatusConcept;
