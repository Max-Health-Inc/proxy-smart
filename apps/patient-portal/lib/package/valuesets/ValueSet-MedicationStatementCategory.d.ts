/**
 * ValueSet: medication-statement-category
 * URL: http://hl7.org/fhir/ValueSet/medication-statement-category
 * Size: 4 concepts
 */
export declare const MedicationStatementCategoryConcepts: readonly [{
    readonly code: "inpatient";
    readonly system: "http://terminology.hl7.org/CodeSystem/medication-statement-category";
    readonly display: "Inpatient";
}, {
    readonly code: "outpatient";
    readonly system: "http://terminology.hl7.org/CodeSystem/medication-statement-category";
    readonly display: "Outpatient";
}, {
    readonly code: "community";
    readonly system: "http://terminology.hl7.org/CodeSystem/medication-statement-category";
    readonly display: "Community";
}, {
    readonly code: "patientspecified";
    readonly system: "http://terminology.hl7.org/CodeSystem/medication-statement-category";
    readonly display: "Patient Specified";
}];
/** Union type of all valid codes in this ValueSet */
export type MedicationStatementCategoryCode = "inpatient" | "outpatient" | "community" | "patientspecified";
/** Type representing a concept from this ValueSet */
export type MedicationStatementCategoryConcept = typeof MedicationStatementCategoryConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidMedicationStatementCategoryCode(code: string): code is MedicationStatementCategoryCode;
/**
 * Get concept details by code
 */
export declare function getMedicationStatementCategoryConcept(code: string): MedicationStatementCategoryConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const MedicationStatementCategoryCodes: ("inpatient" | "outpatient" | "community" | "patientspecified")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomMedicationStatementCategoryCode(): MedicationStatementCategoryCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomMedicationStatementCategoryConcept(): MedicationStatementCategoryConcept;
