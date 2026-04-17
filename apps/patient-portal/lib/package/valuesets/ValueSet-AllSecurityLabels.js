/**
 * ValueSet: All Security Labels
 * URL: http://hl7.org/fhir/ValueSet/security-labels
 * Size: 100 concepts
 */
export const AllSecurityLabelsConcepts = [
    { code: "U", system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality", display: "unrestricted" },
    { code: "L", system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality", display: "low" },
    { code: "M", system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality", display: "moderate" },
    { code: "N", system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality", display: "normal" },
    { code: "R", system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality", display: "restricted" },
    { code: "V", system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality", display: "very restricted" },
    { code: "_InformationSensitivityPolicy", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "InformationSensitivityPolicy" },
    { code: "_ActInformationSensitivityPolicy", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "ActInformationSensitivityPolicy" },
    { code: "ETH", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "substance abuse information sensitivity" },
    { code: "GDIS", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "genetic disease information sensitivity" },
    { code: "HIV", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "HIV/AIDS information sensitivity" },
    { code: "MST", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "military sexual trauma information sensitivity" },
    { code: "SCA", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "sickle cell anemia information sensitivity" },
    { code: "SDV", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "sexual assault, abuse, or domestic violence information sensitivity" },
    { code: "SEX", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "sexuality and reproductive health information sensitivity" },
    { code: "SPI", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "specially protected information sensitivity" },
    { code: "BH", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "behavioral health information sensitivity" },
    { code: "COGN", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "cognitive disability information sensitivity" },
    { code: "DVD", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "developmental disability information sensitivity" },
    { code: "EMOTDIS", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "emotional disturbance information sensitivity" },
    { code: "MH", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "mental health information sensitivity" },
    { code: "PSY", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "psychiatry disorder information sensitivity" },
    { code: "PSYTHPN", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "psychotherapy note information sensitivity" },
    { code: "SUD", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "substance use disorder information sensitivity" },
    { code: "ETHUD", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "alcohol use disorder information sensitivity" },
    { code: "OPIOIDUD", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "opioid use disorder information sensitivity" },
    { code: "STD", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "sexually transmitted disease information sensitivity" },
    { code: "TBOO", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "taboo" },
    { code: "VIO", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "violence information sensitivity" },
    { code: "SICKLE", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "sickle cell" },
    { code: "_EntitySensitivityPolicyType", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "EntityInformationSensitivityPolicy" },
    { code: "DEMO", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "all demographic information sensitivity" },
    { code: "DOB", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "date of birth information sensitivity" },
    { code: "GENDER", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "gender and sexual orientation information sensitivity" },
    { code: "LIVARG", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "living arrangement information sensitivity" },
    { code: "MARST", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "marital status information sensitivity" },
    { code: "RACE", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "race information sensitivity" },
    { code: "REL", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "religion information sensitivity" },
    { code: "_RoleInformationSensitivityPolicy", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "RoleInformationSensitivityPolicy" },
    { code: "B", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "business information sensitivity" },
    { code: "EMPL", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "employer information sensitivity" },
    { code: "LOCIS", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "location information sensitivity" },
    { code: "SSP", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "sensitive service provider information sensitivity" },
    { code: "ADOL", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "adolescent information sensitivity" },
    { code: "CEL", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "celebrity information sensitivity" },
    { code: "DIA", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "diagnosis information sensitivity" },
    { code: "DRGIS", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "drug information sensitivity" },
    { code: "EMP", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "employee information sensitivity" },
    { code: "PDS", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "patient default information sensitivity" },
    { code: "PHY", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "physician requested information sensitivity" },
    { code: "PRS", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "patient requested information sensitivity" },
    { code: "COMPT", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "compartment" },
    { code: "ACOCOMPT", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "accountable care organization compartment" },
    { code: "CTCOMPT", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "care team compartment" },
    { code: "FMCOMPT", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "financial management compartment" },
    { code: "HRCOMPT", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "human resource compartment" },
    { code: "LRCOMPT", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "legitimate relationship compartment" },
    { code: "PACOMPT", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "patient administration compartment" },
    { code: "RESCOMPT", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "research project compartment" },
    { code: "RMGTCOMPT", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "records management compartment" },
    { code: "_SECALTINTOBV", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "alteration integrity" },
    { code: "ABSTRED", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "abstracted" },
    { code: "AGGRED", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "aggregated" },
    { code: "ANONYED", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "anonymized" },
    { code: "MAPPED", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "mapped" },
    { code: "MASKED", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "masked" },
    { code: "PSEUDED", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "pseudonymized" },
    { code: "REDACTED", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "redacted" },
    { code: "SUBSETTED", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "subsetted" },
    { code: "SYNTAC", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "syntactic transform" },
    { code: "TRSLT", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "translated" },
    { code: "VERSIONED", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "versioned" },
    { code: "_SECDATINTOBV", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "data integrity" },
    { code: "CRYTOHASH", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "cryptographic hash function" },
    { code: "DIGSIG", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "digital signature" },
    { code: "_SECINTCONOBV", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "integrity confidence" },
    { code: "HRELIABLE", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "highly reliable" },
    { code: "RELIABLE", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "reliable" },
    { code: "UNCERTREL", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "uncertain reliability" },
    { code: "UNRELIABLE", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "unreliable" },
    { code: "_SECINTPRVOBV", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "provenance" },
    { code: "_SECINTPRVABOBV", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "provenance asserted by" },
    { code: "CLINAST", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "clinician asserted" },
    { code: "DEVAST", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "device asserted" },
    { code: "HCPAST", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "healthcare professional asserted" },
    { code: "PACQAST", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "patient acquaintance asserted" },
    { code: "PATAST", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "patient asserted" },
    { code: "PAYAST", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "payer asserted" },
    { code: "PROAST", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "professional asserted" },
    { code: "SDMAST", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "substitute decision maker asserted" },
    { code: "_SECINTPRVRBOBV", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "provenance reported by" },
    { code: "CLINRPT", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "clinician reported" },
    { code: "DEVRPT", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "device reported" },
    { code: "HCPRPT", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "healthcare professional reported" },
    { code: "PACQRPT", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "patient acquaintance reported" },
    { code: "PATRPT", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "patient reported" },
    { code: "PAYRPT", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "payer reported" },
    { code: "PRORPT", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "professional reported" },
    { code: "SDMRPT", system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue", display: "substitute decision maker reported" },
    { code: "SecurityPolicy", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", display: "security policy" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidAllSecurityLabelsCode(code) {
    return AllSecurityLabelsConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getAllSecurityLabelsConcept(code) {
    return AllSecurityLabelsConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const AllSecurityLabelsCodes = AllSecurityLabelsConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomAllSecurityLabelsCode() {
    return AllSecurityLabelsCodes[Math.floor(Math.random() * AllSecurityLabelsCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomAllSecurityLabelsConcept() {
    return AllSecurityLabelsConcepts[Math.floor(Math.random() * AllSecurityLabelsConcepts.length)];
}
