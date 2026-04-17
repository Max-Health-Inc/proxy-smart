/**
 * ValueSet: medicationrequest-category
 * URL: http://hl7.org/fhir/ValueSet/medicationrequest-category
 * Size: 4 concepts
 */
export declare const MedicationrequestCategoryConcepts: readonly [{
    readonly code: "inpatient";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-category";
    readonly display: "Inpatient";
}, {
    readonly code: "outpatient";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-category";
    readonly display: "Outpatient";
}, {
    readonly code: "community";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-category";
    readonly display: "Community";
}, {
    readonly code: "discharge";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-category";
    readonly display: "Discharge";
}];
/** Union type of all valid codes in this ValueSet */
export type MedicationrequestCategoryCode = "inpatient" | "outpatient" | "community" | "discharge";
/** Type representing a concept from this ValueSet */
export type MedicationrequestCategoryConcept = typeof MedicationrequestCategoryConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidMedicationrequestCategoryCode(code: string): code is MedicationrequestCategoryCode;
/**
 * Get concept details by code
 */
export declare function getMedicationrequestCategoryConcept(code: string): MedicationrequestCategoryConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const MedicationrequestCategoryCodes: ("inpatient" | "outpatient" | "community" | "discharge")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomMedicationrequestCategoryCode(): MedicationrequestCategoryCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomMedicationrequestCategoryConcept(): MedicationrequestCategoryConcept;
