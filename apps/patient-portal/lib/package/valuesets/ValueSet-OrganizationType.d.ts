/**
 * ValueSet: organization-type
 * URL: http://hl7.org/fhir/ValueSet/organization-type
 * Size: 12 concepts
 */
export declare const OrganizationTypeConcepts: readonly [{
    readonly code: "prov";
    readonly system: "http://terminology.hl7.org/CodeSystem/organization-type";
    readonly display: "Healthcare Provider";
}, {
    readonly code: "dept";
    readonly system: "http://terminology.hl7.org/CodeSystem/organization-type";
    readonly display: "Hospital Department";
}, {
    readonly code: "team";
    readonly system: "http://terminology.hl7.org/CodeSystem/organization-type";
    readonly display: "Organizational team";
}, {
    readonly code: "govt";
    readonly system: "http://terminology.hl7.org/CodeSystem/organization-type";
    readonly display: "Government";
}, {
    readonly code: "ins";
    readonly system: "http://terminology.hl7.org/CodeSystem/organization-type";
    readonly display: "Insurance Company";
}, {
    readonly code: "pay";
    readonly system: "http://terminology.hl7.org/CodeSystem/organization-type";
    readonly display: "Payer";
}, {
    readonly code: "edu";
    readonly system: "http://terminology.hl7.org/CodeSystem/organization-type";
    readonly display: "Educational Institute";
}, {
    readonly code: "reli";
    readonly system: "http://terminology.hl7.org/CodeSystem/organization-type";
    readonly display: "Religious Institution";
}, {
    readonly code: "crs";
    readonly system: "http://terminology.hl7.org/CodeSystem/organization-type";
    readonly display: "Clinical Research Sponsor";
}, {
    readonly code: "cg";
    readonly system: "http://terminology.hl7.org/CodeSystem/organization-type";
    readonly display: "Community Group";
}, {
    readonly code: "bus";
    readonly system: "http://terminology.hl7.org/CodeSystem/organization-type";
    readonly display: "Non-Healthcare Business or Corporation";
}, {
    readonly code: "other";
    readonly system: "http://terminology.hl7.org/CodeSystem/organization-type";
    readonly display: "Other";
}];
/** Union type of all valid codes in this ValueSet */
export type OrganizationTypeCode = "prov" | "dept" | "team" | "govt" | "ins" | "pay" | "edu" | "reli" | "crs" | "cg" | "bus" | "other";
/** Type representing a concept from this ValueSet */
export type OrganizationTypeConcept = typeof OrganizationTypeConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidOrganizationTypeCode(code: string): code is OrganizationTypeCode;
/**
 * Get concept details by code
 */
export declare function getOrganizationTypeConcept(code: string): OrganizationTypeConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const OrganizationTypeCodes: ("other" | "prov" | "dept" | "team" | "govt" | "ins" | "pay" | "edu" | "reli" | "crs" | "cg" | "bus")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomOrganizationTypeCode(): OrganizationTypeCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomOrganizationTypeConcept(): OrganizationTypeConcept;
