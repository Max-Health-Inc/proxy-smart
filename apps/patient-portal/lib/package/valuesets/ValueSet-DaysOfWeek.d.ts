/**
 * ValueSet: days-of-week
 * URL: http://hl7.org/fhir/ValueSet/days-of-week
 * Size: 7 concepts
 */
export declare const DaysOfWeekConcepts: readonly [{
    readonly code: "mon";
    readonly system: "http://hl7.org/fhir/days-of-week";
    readonly display: "Monday";
}, {
    readonly code: "tue";
    readonly system: "http://hl7.org/fhir/days-of-week";
    readonly display: "Tuesday";
}, {
    readonly code: "wed";
    readonly system: "http://hl7.org/fhir/days-of-week";
    readonly display: "Wednesday";
}, {
    readonly code: "thu";
    readonly system: "http://hl7.org/fhir/days-of-week";
    readonly display: "Thursday";
}, {
    readonly code: "fri";
    readonly system: "http://hl7.org/fhir/days-of-week";
    readonly display: "Friday";
}, {
    readonly code: "sat";
    readonly system: "http://hl7.org/fhir/days-of-week";
    readonly display: "Saturday";
}, {
    readonly code: "sun";
    readonly system: "http://hl7.org/fhir/days-of-week";
    readonly display: "Sunday";
}];
/** Union type of all valid codes in this ValueSet */
export type DaysOfWeekCode = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
/** Type representing a concept from this ValueSet */
export type DaysOfWeekConcept = typeof DaysOfWeekConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidDaysOfWeekCode(code: string): code is DaysOfWeekCode;
/**
 * Get concept details by code
 */
export declare function getDaysOfWeekConcept(code: string): DaysOfWeekConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const DaysOfWeekCodes: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomDaysOfWeekCode(): DaysOfWeekCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomDaysOfWeekConcept(): DaysOfWeekConcept;
