/**
 * ValueSet: medication-status
 * URL: http://hl7.org/fhir/ValueSet/medication-status
 * Size: 3 concepts
 */
export declare const MedicationStatusConcepts: readonly [{
    readonly code: "active";
    readonly system: "http://hl7.org/fhir/CodeSystem/medication-status";
    readonly display: "Active";
}, {
    readonly code: "inactive";
    readonly system: "http://hl7.org/fhir/CodeSystem/medication-status";
    readonly display: "Inactive";
}, {
    readonly code: "entered-in-error";
    readonly system: "http://hl7.org/fhir/CodeSystem/medication-status";
    readonly display: "Entered in Error";
}];
/** Union type of all valid codes in this ValueSet */
export type MedicationStatusCode = "active" | "inactive" | "entered-in-error";
/** Type representing a concept from this ValueSet */
export type MedicationStatusConcept = typeof MedicationStatusConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidMedicationStatusCode(code: string): code is MedicationStatusCode;
/**
 * Get concept details by code
 */
export declare function getMedicationStatusConcept(code: string): MedicationStatusConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const MedicationStatusCodes: ("active" | "entered-in-error" | "inactive")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomMedicationStatusCode(): MedicationStatusCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomMedicationStatusConcept(): MedicationStatusConcept;
