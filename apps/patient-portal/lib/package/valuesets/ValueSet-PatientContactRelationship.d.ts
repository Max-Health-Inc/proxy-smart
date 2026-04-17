/**
 * ValueSet: PatientContactRelationship
 * URL: http://hl7.org/fhir/ValueSet/patient-contactrelationship
 * Size: 11 concepts
 */
export declare const PatientContactRelationshipConcepts: readonly [{
    readonly code: "BP";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0131";
    readonly display: "Billing contact person";
}, {
    readonly code: "CP";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0131";
    readonly display: "Contact person";
}, {
    readonly code: "EP";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0131";
    readonly display: "Emergency contact person";
}, {
    readonly code: "PR";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0131";
    readonly display: "Person preparing referral";
}, {
    readonly code: "E";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0131";
    readonly display: "Employer";
}, {
    readonly code: "C";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0131";
    readonly display: "Emergency Contact";
}, {
    readonly code: "F";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0131";
    readonly display: "Federal Agency";
}, {
    readonly code: "I";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0131";
    readonly display: "Insurance Company";
}, {
    readonly code: "N";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0131";
    readonly display: "Next-of-Kin";
}, {
    readonly code: "S";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0131";
    readonly display: "State Agency";
}, {
    readonly code: "U";
    readonly system: "http://terminology.hl7.org/CodeSystem/v2-0131";
    readonly display: "Unknown";
}];
/** Union type of all valid codes in this ValueSet */
export type PatientContactRelationshipCode = "BP" | "CP" | "EP" | "PR" | "E" | "C" | "F" | "I" | "N" | "S" | "U";
/** Type representing a concept from this ValueSet */
export type PatientContactRelationshipConcept = typeof PatientContactRelationshipConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidPatientContactRelationshipCode(code: string): code is PatientContactRelationshipCode;
/**
 * Get concept details by code
 */
export declare function getPatientContactRelationshipConcept(code: string): PatientContactRelationshipConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const PatientContactRelationshipCodes: ("E" | "N" | "U" | "I" | "CP" | "S" | "BP" | "EP" | "PR" | "C" | "F")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomPatientContactRelationshipCode(): PatientContactRelationshipCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomPatientContactRelationshipConcept(): PatientContactRelationshipConcept;
/**
 * Multi-language display translations
 * Maps code → language → display string
 */
export declare const PatientContactRelationshipDisplays: Record<string, Record<string, string>>;
/**
 * Get the display string for a code in a specific language
 */
export declare function getPatientContactRelationshipDisplay(code: string, lang: string): string | undefined;
