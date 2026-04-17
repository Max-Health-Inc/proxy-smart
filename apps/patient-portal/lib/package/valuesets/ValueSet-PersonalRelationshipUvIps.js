/**
 * ValueSet: PersonalRelationshipUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/personal-relationship-uv-ips
 * Size: 39 concepts
 */
export const PersonalRelationshipUvIpsConcepts = [
    { code: "AUNT", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "aunt" },
    { code: "CHILD", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "child" },
    { code: "CHLDADOPT", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "adopted child" },
    { code: "CHLDFOST", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "foster child" },
    { code: "CHLDINLAW", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "child in-law" },
    { code: "COUSN", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "cousin" },
    { code: "DAU", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "natural daughter" },
    { code: "DAUADOPT", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "adopted daughter" },
    { code: "DAUC", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "daughter" },
    { code: "DAUFOST", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "foster daughter" },
    { code: "DAUINLAW", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "daughter in-law" },
    { code: "DOMPART", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "domestic partner" },
    { code: "FAMMEMB", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "family member" },
    { code: "FRND", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "unrelated friend" },
    { code: "FTH", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "father" },
    { code: "FTHINLAW", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "father-in-law" },
    { code: "GGRPRN", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "great grandparent" },
    { code: "GRNDCHILD", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "grandchild" },
    { code: "GRPRN", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "grandparent" },
    { code: "MTH", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "mother" },
    { code: "MTHINLAW", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "mother-in-law" },
    { code: "NBOR", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "neighbor" },
    { code: "NCHILD", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "natural child" },
    { code: "NIENEPH", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "niece/nephew" },
    { code: "PRN", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "parent" },
    { code: "PRNINLAW", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "parent in-law" },
    { code: "ROOM", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "roomate" },
    { code: "SIB", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "sibling" },
    { code: "SIGOTHR", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "significant other" },
    { code: "SON", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "natural son" },
    { code: "SONADOPT", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "adopted son" },
    { code: "SONC", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "son" },
    { code: "SONFOST", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "foster son" },
    { code: "SONINLAW", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "son in-law" },
    { code: "SPS", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "spouse" },
    { code: "STPCHLD", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "step child" },
    { code: "STPDAU", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "stepdaughter" },
    { code: "STPSON", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "stepson" },
    { code: "UNCLE", system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode", display: "uncle" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidPersonalRelationshipUvIpsCode(code) {
    return PersonalRelationshipUvIpsConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getPersonalRelationshipUvIpsConcept(code) {
    return PersonalRelationshipUvIpsConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const PersonalRelationshipUvIpsCodes = PersonalRelationshipUvIpsConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomPersonalRelationshipUvIpsCode() {
    return PersonalRelationshipUvIpsCodes[Math.floor(Math.random() * PersonalRelationshipUvIpsCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomPersonalRelationshipUvIpsConcept() {
    return PersonalRelationshipUvIpsConcepts[Math.floor(Math.random() * PersonalRelationshipUvIpsConcepts.length)];
}
