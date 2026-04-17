/**
 * ValueSet: observation-category
 * URL: http://hl7.org/fhir/ValueSet/observation-category
 * Size: 9 concepts
 */
export declare const ObservationCategoryConcepts: readonly [{
    readonly code: "social-history";
    readonly system: "http://terminology.hl7.org/CodeSystem/observation-category";
    readonly display: "Social History";
}, {
    readonly code: "vital-signs";
    readonly system: "http://terminology.hl7.org/CodeSystem/observation-category";
    readonly display: "Vital Signs";
}, {
    readonly code: "imaging";
    readonly system: "http://terminology.hl7.org/CodeSystem/observation-category";
    readonly display: "Imaging";
}, {
    readonly code: "laboratory";
    readonly system: "http://terminology.hl7.org/CodeSystem/observation-category";
    readonly display: "Laboratory";
}, {
    readonly code: "procedure";
    readonly system: "http://terminology.hl7.org/CodeSystem/observation-category";
    readonly display: "Procedure";
}, {
    readonly code: "survey";
    readonly system: "http://terminology.hl7.org/CodeSystem/observation-category";
    readonly display: "Survey";
}, {
    readonly code: "exam";
    readonly system: "http://terminology.hl7.org/CodeSystem/observation-category";
    readonly display: "Exam";
}, {
    readonly code: "therapy";
    readonly system: "http://terminology.hl7.org/CodeSystem/observation-category";
    readonly display: "Therapy";
}, {
    readonly code: "activity";
    readonly system: "http://terminology.hl7.org/CodeSystem/observation-category";
    readonly display: "Activity";
}];
/** Union type of all valid codes in this ValueSet */
export type ObservationCategoryCode = "social-history" | "vital-signs" | "imaging" | "laboratory" | "procedure" | "survey" | "exam" | "therapy" | "activity";
/** Type representing a concept from this ValueSet */
export type ObservationCategoryConcept = typeof ObservationCategoryConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidObservationCategoryCode(code: string): code is ObservationCategoryCode;
/**
 * Get concept details by code
 */
export declare function getObservationCategoryConcept(code: string): ObservationCategoryConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ObservationCategoryCodes: ("laboratory" | "vital-signs" | "imaging" | "social-history" | "procedure" | "survey" | "exam" | "therapy" | "activity")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomObservationCategoryCode(): ObservationCategoryCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomObservationCategoryConcept(): ObservationCategoryConcept;
