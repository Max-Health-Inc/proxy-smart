/**
 * ValueSet: medication-statement-status
 * URL: http://hl7.org/fhir/ValueSet/medication-statement-status
 * Size: 8 concepts
 */
export declare const MedicationStatementStatusConcepts: readonly [{
    readonly code: "active";
    readonly system: "http://hl7.org/fhir/CodeSystem/medication-statement-status";
    readonly display: "Active";
}, {
    readonly code: "completed";
    readonly system: "http://hl7.org/fhir/CodeSystem/medication-statement-status";
    readonly display: "Completed";
}, {
    readonly code: "entered-in-error";
    readonly system: "http://hl7.org/fhir/CodeSystem/medication-statement-status";
    readonly display: "Entered in Error";
}, {
    readonly code: "intended";
    readonly system: "http://hl7.org/fhir/CodeSystem/medication-statement-status";
    readonly display: "Intended";
}, {
    readonly code: "stopped";
    readonly system: "http://hl7.org/fhir/CodeSystem/medication-statement-status";
    readonly display: "Stopped";
}, {
    readonly code: "on-hold";
    readonly system: "http://hl7.org/fhir/CodeSystem/medication-statement-status";
    readonly display: "On Hold";
}, {
    readonly code: "unknown";
    readonly system: "http://hl7.org/fhir/CodeSystem/medication-statement-status";
    readonly display: "Unknown";
}, {
    readonly code: "not-taken";
    readonly system: "http://hl7.org/fhir/CodeSystem/medication-statement-status";
    readonly display: "Not Taken";
}];
/** Union type of all valid codes in this ValueSet */
export type MedicationStatementStatusCode = "active" | "completed" | "entered-in-error" | "intended" | "stopped" | "on-hold" | "unknown" | "not-taken";
/** Type representing a concept from this ValueSet */
export type MedicationStatementStatusConcept = typeof MedicationStatementStatusConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidMedicationStatementStatusCode(code: string): code is MedicationStatementStatusCode;
/**
 * Get concept details by code
 */
export declare function getMedicationStatementStatusConcept(code: string): MedicationStatementStatusConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const MedicationStatementStatusCodes: ("active" | "unknown" | "entered-in-error" | "completed" | "intended" | "stopped" | "on-hold" | "not-taken")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomMedicationStatementStatusCode(): MedicationStatementStatusCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomMedicationStatementStatusConcept(): MedicationStatementStatusConcept;
