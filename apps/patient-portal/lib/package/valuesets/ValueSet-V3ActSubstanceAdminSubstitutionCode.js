/**
 * ValueSet: v3.ActSubstanceAdminSubstitutionCode
 * URL: http://terminology.hl7.org/ValueSet/v3-ActSubstanceAdminSubstitutionCode
 * Size: 9 concepts
 */
export const V3ActSubstanceAdminSubstitutionCodeConcepts = [
    { code: "E", system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution", display: "equivalent" },
    { code: "EC", system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution", display: "equivalent composition" },
    { code: "BC", system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution", display: "brand composition" },
    { code: "G", system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution", display: "generic composition" },
    { code: "TE", system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution", display: "therapeutic alternative" },
    { code: "TB", system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution", display: "therapeutic brand" },
    { code: "TG", system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution", display: "therapeutic generic" },
    { code: "F", system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution", display: "formulary" },
    { code: "N", system: "http://terminology.hl7.org/CodeSystem/v3-substanceAdminSubstitution", display: "none" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidV3ActSubstanceAdminSubstitutionCodeCode(code) {
    return V3ActSubstanceAdminSubstitutionCodeConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getV3ActSubstanceAdminSubstitutionCodeConcept(code) {
    return V3ActSubstanceAdminSubstitutionCodeConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const V3ActSubstanceAdminSubstitutionCodeCodes = V3ActSubstanceAdminSubstitutionCodeConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomV3ActSubstanceAdminSubstitutionCodeCode() {
    return V3ActSubstanceAdminSubstitutionCodeCodes[Math.floor(Math.random() * V3ActSubstanceAdminSubstitutionCodeCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomV3ActSubstanceAdminSubstitutionCodeConcept() {
    return V3ActSubstanceAdminSubstitutionCodeConcepts[Math.floor(Math.random() * V3ActSubstanceAdminSubstitutionCodeConcepts.length)];
}
