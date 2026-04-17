/**
 * ValueSet: contactentity-type
 * URL: http://hl7.org/fhir/ValueSet/contactentity-type
 * Size: 6 concepts
 */
export declare const ContactentityTypeConcepts: readonly [{
    readonly code: "BILL";
    readonly system: "http://terminology.hl7.org/CodeSystem/contactentity-type";
    readonly display: "Billing";
}, {
    readonly code: "ADMIN";
    readonly system: "http://terminology.hl7.org/CodeSystem/contactentity-type";
    readonly display: "Administrative";
}, {
    readonly code: "HR";
    readonly system: "http://terminology.hl7.org/CodeSystem/contactentity-type";
    readonly display: "Human Resource";
}, {
    readonly code: "PAYOR";
    readonly system: "http://terminology.hl7.org/CodeSystem/contactentity-type";
    readonly display: "Payor";
}, {
    readonly code: "PATINF";
    readonly system: "http://terminology.hl7.org/CodeSystem/contactentity-type";
    readonly display: "Patient";
}, {
    readonly code: "PRESS";
    readonly system: "http://terminology.hl7.org/CodeSystem/contactentity-type";
    readonly display: "Press";
}];
/** Union type of all valid codes in this ValueSet */
export type ContactentityTypeCode = "BILL" | "ADMIN" | "HR" | "PAYOR" | "PATINF" | "PRESS";
/** Type representing a concept from this ValueSet */
export type ContactentityTypeConcept = typeof ContactentityTypeConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidContactentityTypeCode(code: string): code is ContactentityTypeCode;
/**
 * Get concept details by code
 */
export declare function getContactentityTypeConcept(code: string): ContactentityTypeConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ContactentityTypeCodes: ("PAYOR" | "BILL" | "ADMIN" | "HR" | "PATINF" | "PRESS")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomContactentityTypeCode(): ContactentityTypeCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomContactentityTypeConcept(): ContactentityTypeConcept;
