/**
 * ValueSet: allergyintolerance-verification
 * URL: http://hl7.org/fhir/ValueSet/allergyintolerance-verification
 * Size: 4 concepts
 */
export declare const AllergyintoleranceVerificationConcepts: readonly [{
    readonly code: "unconfirmed";
    readonly system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification";
    readonly display: "Unconfirmed";
}, {
    readonly code: "confirmed";
    readonly system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification";
    readonly display: "Confirmed";
}, {
    readonly code: "refuted";
    readonly system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification";
    readonly display: "Refuted";
}, {
    readonly code: "entered-in-error";
    readonly system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification";
    readonly display: "Entered in Error";
}];
/** Union type of all valid codes in this ValueSet */
export type AllergyintoleranceVerificationCode = "unconfirmed" | "confirmed" | "refuted" | "entered-in-error";
/** Type representing a concept from this ValueSet */
export type AllergyintoleranceVerificationConcept = typeof AllergyintoleranceVerificationConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidAllergyintoleranceVerificationCode(code: string): code is AllergyintoleranceVerificationCode;
/**
 * Get concept details by code
 */
export declare function getAllergyintoleranceVerificationConcept(code: string): AllergyintoleranceVerificationConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const AllergyintoleranceVerificationCodes: ("confirmed" | "entered-in-error" | "unconfirmed" | "refuted")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomAllergyintoleranceVerificationCode(): AllergyintoleranceVerificationCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomAllergyintoleranceVerificationConcept(): AllergyintoleranceVerificationConcept;
