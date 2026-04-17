/**
 * ValueSet: immunization-program-eligibility
 * URL: http://hl7.org/fhir/ValueSet/immunization-program-eligibility
 * Size: 2 concepts
 */
export declare const ImmunizationProgramEligibilityConcepts: readonly [{
    readonly code: "ineligible";
    readonly system: "http://terminology.hl7.org/CodeSystem/immunization-program-eligibility";
    readonly display: "Not Eligible";
}, {
    readonly code: "uninsured";
    readonly system: "http://terminology.hl7.org/CodeSystem/immunization-program-eligibility";
    readonly display: "Uninsured";
}];
/** Union type of all valid codes in this ValueSet */
export type ImmunizationProgramEligibilityCode = "ineligible" | "uninsured";
/** Type representing a concept from this ValueSet */
export type ImmunizationProgramEligibilityConcept = typeof ImmunizationProgramEligibilityConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidImmunizationProgramEligibilityCode(code: string): code is ImmunizationProgramEligibilityCode;
/**
 * Get concept details by code
 */
export declare function getImmunizationProgramEligibilityConcept(code: string): ImmunizationProgramEligibilityConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ImmunizationProgramEligibilityCodes: ("ineligible" | "uninsured")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomImmunizationProgramEligibilityCode(): ImmunizationProgramEligibilityCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomImmunizationProgramEligibilityConcept(): ImmunizationProgramEligibilityConcept;
