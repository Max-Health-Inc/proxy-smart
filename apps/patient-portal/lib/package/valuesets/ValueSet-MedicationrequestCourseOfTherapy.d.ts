/**
 * ValueSet: medicationrequest-course-of-therapy
 * URL: http://hl7.org/fhir/ValueSet/medicationrequest-course-of-therapy
 * Size: 3 concepts
 */
export declare const MedicationrequestCourseOfTherapyConcepts: readonly [{
    readonly code: "continuous";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-course-of-therapy";
    readonly display: "Continuous long term therapy";
}, {
    readonly code: "acute";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-course-of-therapy";
    readonly display: "Short course (acute) therapy";
}, {
    readonly code: "seasonal";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-course-of-therapy";
    readonly display: "Seasonal";
}];
/** Union type of all valid codes in this ValueSet */
export type MedicationrequestCourseOfTherapyCode = "continuous" | "acute" | "seasonal";
/** Type representing a concept from this ValueSet */
export type MedicationrequestCourseOfTherapyConcept = typeof MedicationrequestCourseOfTherapyConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidMedicationrequestCourseOfTherapyCode(code: string): code is MedicationrequestCourseOfTherapyCode;
/**
 * Get concept details by code
 */
export declare function getMedicationrequestCourseOfTherapyConcept(code: string): MedicationrequestCourseOfTherapyConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const MedicationrequestCourseOfTherapyCodes: ("continuous" | "acute" | "seasonal")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomMedicationrequestCourseOfTherapyCode(): MedicationrequestCourseOfTherapyCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomMedicationrequestCourseOfTherapyConcept(): MedicationrequestCourseOfTherapyConcept;
