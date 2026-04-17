/**
 * ValueSet: bodysite-laterality
 * URL: http://hl7.org/fhir/ValueSet/bodysite-laterality
 * Size: 3 concepts
 */
export declare const BodysiteLateralityConcepts: readonly [{
    readonly code: "419161000";
    readonly system: "http://snomed.info/sct";
    readonly display: "Unilateral left (qualifier value)";
}, {
    readonly code: "419465000";
    readonly system: "http://snomed.info/sct";
    readonly display: "Unilateral right (qualifier value)";
}, {
    readonly code: "51440002";
    readonly system: "http://snomed.info/sct";
    readonly display: "Right and left";
}];
/** Union type of all valid codes in this ValueSet */
export type BodysiteLateralityCode = "419161000" | "419465000" | "51440002";
/** Type representing a concept from this ValueSet */
export type BodysiteLateralityConcept = typeof BodysiteLateralityConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidBodysiteLateralityCode(code: string): code is BodysiteLateralityCode;
/**
 * Get concept details by code
 */
export declare function getBodysiteLateralityConcept(code: string): BodysiteLateralityConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const BodysiteLateralityCodes: ("419161000" | "419465000" | "51440002")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomBodysiteLateralityCode(): BodysiteLateralityCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomBodysiteLateralityConcept(): BodysiteLateralityConcept;
