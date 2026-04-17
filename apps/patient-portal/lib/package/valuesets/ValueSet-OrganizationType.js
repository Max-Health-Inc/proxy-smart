/**
 * ValueSet: organization-type
 * URL: http://hl7.org/fhir/ValueSet/organization-type
 * Size: 12 concepts
 */
export const OrganizationTypeConcepts = [
    { code: "prov", system: "http://terminology.hl7.org/CodeSystem/organization-type", display: "Healthcare Provider" },
    { code: "dept", system: "http://terminology.hl7.org/CodeSystem/organization-type", display: "Hospital Department" },
    { code: "team", system: "http://terminology.hl7.org/CodeSystem/organization-type", display: "Organizational team" },
    { code: "govt", system: "http://terminology.hl7.org/CodeSystem/organization-type", display: "Government" },
    { code: "ins", system: "http://terminology.hl7.org/CodeSystem/organization-type", display: "Insurance Company" },
    { code: "pay", system: "http://terminology.hl7.org/CodeSystem/organization-type", display: "Payer" },
    { code: "edu", system: "http://terminology.hl7.org/CodeSystem/organization-type", display: "Educational Institute" },
    { code: "reli", system: "http://terminology.hl7.org/CodeSystem/organization-type", display: "Religious Institution" },
    { code: "crs", system: "http://terminology.hl7.org/CodeSystem/organization-type", display: "Clinical Research Sponsor" },
    { code: "cg", system: "http://terminology.hl7.org/CodeSystem/organization-type", display: "Community Group" },
    { code: "bus", system: "http://terminology.hl7.org/CodeSystem/organization-type", display: "Non-Healthcare Business or Corporation" },
    { code: "other", system: "http://terminology.hl7.org/CodeSystem/organization-type", display: "Other" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidOrganizationTypeCode(code) {
    return OrganizationTypeConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getOrganizationTypeConcept(code) {
    return OrganizationTypeConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const OrganizationTypeCodes = OrganizationTypeConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomOrganizationTypeCode() {
    return OrganizationTypeCodes[Math.floor(Math.random() * OrganizationTypeCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomOrganizationTypeConcept() {
    return OrganizationTypeConcepts[Math.floor(Math.random() * OrganizationTypeConcepts.length)];
}
