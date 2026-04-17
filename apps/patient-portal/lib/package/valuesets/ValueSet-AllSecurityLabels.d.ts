/**
 * ValueSet: All Security Labels
 * URL: http://hl7.org/fhir/ValueSet/security-labels
 * Size: 100 concepts
 */
export declare const AllSecurityLabelsConcepts: readonly [{
    readonly code: "U";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality";
    readonly display: "unrestricted";
}, {
    readonly code: "L";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality";
    readonly display: "low";
}, {
    readonly code: "M";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality";
    readonly display: "moderate";
}, {
    readonly code: "N";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality";
    readonly display: "normal";
}, {
    readonly code: "R";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality";
    readonly display: "restricted";
}, {
    readonly code: "V";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality";
    readonly display: "very restricted";
}, {
    readonly code: "_InformationSensitivityPolicy";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "InformationSensitivityPolicy";
}, {
    readonly code: "_ActInformationSensitivityPolicy";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "ActInformationSensitivityPolicy";
}, {
    readonly code: "ETH";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "substance abuse information sensitivity";
}, {
    readonly code: "GDIS";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "genetic disease information sensitivity";
}, {
    readonly code: "HIV";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "HIV/AIDS information sensitivity";
}, {
    readonly code: "MST";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "military sexual trauma information sensitivity";
}, {
    readonly code: "SCA";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "sickle cell anemia information sensitivity";
}, {
    readonly code: "SDV";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "sexual assault, abuse, or domestic violence information sensitivity";
}, {
    readonly code: "SEX";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "sexuality and reproductive health information sensitivity";
}, {
    readonly code: "SPI";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "specially protected information sensitivity";
}, {
    readonly code: "BH";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "behavioral health information sensitivity";
}, {
    readonly code: "COGN";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "cognitive disability information sensitivity";
}, {
    readonly code: "DVD";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "developmental disability information sensitivity";
}, {
    readonly code: "EMOTDIS";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "emotional disturbance information sensitivity";
}, {
    readonly code: "MH";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "mental health information sensitivity";
}, {
    readonly code: "PSY";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "psychiatry disorder information sensitivity";
}, {
    readonly code: "PSYTHPN";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "psychotherapy note information sensitivity";
}, {
    readonly code: "SUD";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "substance use disorder information sensitivity";
}, {
    readonly code: "ETHUD";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "alcohol use disorder information sensitivity";
}, {
    readonly code: "OPIOIDUD";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "opioid use disorder information sensitivity";
}, {
    readonly code: "STD";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "sexually transmitted disease information sensitivity";
}, {
    readonly code: "TBOO";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "taboo";
}, {
    readonly code: "VIO";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "violence information sensitivity";
}, {
    readonly code: "SICKLE";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "sickle cell";
}, {
    readonly code: "_EntitySensitivityPolicyType";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "EntityInformationSensitivityPolicy";
}, {
    readonly code: "DEMO";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "all demographic information sensitivity";
}, {
    readonly code: "DOB";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "date of birth information sensitivity";
}, {
    readonly code: "GENDER";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "gender and sexual orientation information sensitivity";
}, {
    readonly code: "LIVARG";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "living arrangement information sensitivity";
}, {
    readonly code: "MARST";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "marital status information sensitivity";
}, {
    readonly code: "RACE";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "race information sensitivity";
}, {
    readonly code: "REL";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "religion information sensitivity";
}, {
    readonly code: "_RoleInformationSensitivityPolicy";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "RoleInformationSensitivityPolicy";
}, {
    readonly code: "B";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "business information sensitivity";
}, {
    readonly code: "EMPL";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "employer information sensitivity";
}, {
    readonly code: "LOCIS";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "location information sensitivity";
}, {
    readonly code: "SSP";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "sensitive service provider information sensitivity";
}, {
    readonly code: "ADOL";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "adolescent information sensitivity";
}, {
    readonly code: "CEL";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "celebrity information sensitivity";
}, {
    readonly code: "DIA";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "diagnosis information sensitivity";
}, {
    readonly code: "DRGIS";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "drug information sensitivity";
}, {
    readonly code: "EMP";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "employee information sensitivity";
}, {
    readonly code: "PDS";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "patient default information sensitivity";
}, {
    readonly code: "PHY";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "physician requested information sensitivity";
}, {
    readonly code: "PRS";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "patient requested information sensitivity";
}, {
    readonly code: "COMPT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "compartment";
}, {
    readonly code: "ACOCOMPT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "accountable care organization compartment";
}, {
    readonly code: "CTCOMPT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "care team compartment";
}, {
    readonly code: "FMCOMPT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "financial management compartment";
}, {
    readonly code: "HRCOMPT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "human resource compartment";
}, {
    readonly code: "LRCOMPT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "legitimate relationship compartment";
}, {
    readonly code: "PACOMPT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "patient administration compartment";
}, {
    readonly code: "RESCOMPT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "research project compartment";
}, {
    readonly code: "RMGTCOMPT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "records management compartment";
}, {
    readonly code: "_SECALTINTOBV";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "alteration integrity";
}, {
    readonly code: "ABSTRED";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "abstracted";
}, {
    readonly code: "AGGRED";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "aggregated";
}, {
    readonly code: "ANONYED";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "anonymized";
}, {
    readonly code: "MAPPED";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "mapped";
}, {
    readonly code: "MASKED";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "masked";
}, {
    readonly code: "PSEUDED";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "pseudonymized";
}, {
    readonly code: "REDACTED";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "redacted";
}, {
    readonly code: "SUBSETTED";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "subsetted";
}, {
    readonly code: "SYNTAC";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "syntactic transform";
}, {
    readonly code: "TRSLT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "translated";
}, {
    readonly code: "VERSIONED";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "versioned";
}, {
    readonly code: "_SECDATINTOBV";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "data integrity";
}, {
    readonly code: "CRYTOHASH";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "cryptographic hash function";
}, {
    readonly code: "DIGSIG";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "digital signature";
}, {
    readonly code: "_SECINTCONOBV";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "integrity confidence";
}, {
    readonly code: "HRELIABLE";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "highly reliable";
}, {
    readonly code: "RELIABLE";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "reliable";
}, {
    readonly code: "UNCERTREL";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "uncertain reliability";
}, {
    readonly code: "UNRELIABLE";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "unreliable";
}, {
    readonly code: "_SECINTPRVOBV";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "provenance";
}, {
    readonly code: "_SECINTPRVABOBV";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "provenance asserted by";
}, {
    readonly code: "CLINAST";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "clinician asserted";
}, {
    readonly code: "DEVAST";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "device asserted";
}, {
    readonly code: "HCPAST";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "healthcare professional asserted";
}, {
    readonly code: "PACQAST";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "patient acquaintance asserted";
}, {
    readonly code: "PATAST";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "patient asserted";
}, {
    readonly code: "PAYAST";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "payer asserted";
}, {
    readonly code: "PROAST";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "professional asserted";
}, {
    readonly code: "SDMAST";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "substitute decision maker asserted";
}, {
    readonly code: "_SECINTPRVRBOBV";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "provenance reported by";
}, {
    readonly code: "CLINRPT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "clinician reported";
}, {
    readonly code: "DEVRPT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "device reported";
}, {
    readonly code: "HCPRPT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "healthcare professional reported";
}, {
    readonly code: "PACQRPT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "patient acquaintance reported";
}, {
    readonly code: "PATRPT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "patient reported";
}, {
    readonly code: "PAYRPT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "payer reported";
}, {
    readonly code: "PRORPT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "professional reported";
}, {
    readonly code: "SDMRPT";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue";
    readonly display: "substitute decision maker reported";
}, {
    readonly code: "SecurityPolicy";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActCode";
    readonly display: "security policy";
}];
/** String type (ValueSet too large for union type) */
export type AllSecurityLabelsCode = string;
/** Type representing a concept from this ValueSet */
export type AllSecurityLabelsConcept = typeof AllSecurityLabelsConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidAllSecurityLabelsCode(code: string): code is AllSecurityLabelsCode;
/**
 * Get concept details by code
 */
export declare function getAllSecurityLabelsConcept(code: string): AllSecurityLabelsConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const AllSecurityLabelsCodes: ("N" | "U" | "L" | "M" | "R" | "V" | "CLINRPT" | "_InformationSensitivityPolicy" | "_ActInformationSensitivityPolicy" | "ETH" | "GDIS" | "HIV" | "MST" | "SCA" | "SDV" | "SEX" | "SPI" | "BH" | "COGN" | "DVD" | "EMOTDIS" | "MH" | "PSY" | "PSYTHPN" | "SUD" | "ETHUD" | "OPIOIDUD" | "STD" | "TBOO" | "VIO" | "SICKLE" | "_EntitySensitivityPolicyType" | "DEMO" | "DOB" | "GENDER" | "LIVARG" | "MARST" | "RACE" | "REL" | "_RoleInformationSensitivityPolicy" | "B" | "EMPL" | "LOCIS" | "SSP" | "ADOL" | "CEL" | "DIA" | "DRGIS" | "EMP" | "PDS" | "PHY" | "PRS" | "COMPT" | "ACOCOMPT" | "CTCOMPT" | "FMCOMPT" | "HRCOMPT" | "LRCOMPT" | "PACOMPT" | "RESCOMPT" | "RMGTCOMPT" | "_SECALTINTOBV" | "ABSTRED" | "AGGRED" | "ANONYED" | "MAPPED" | "MASKED" | "PSEUDED" | "REDACTED" | "SUBSETTED" | "SYNTAC" | "TRSLT" | "VERSIONED" | "_SECDATINTOBV" | "CRYTOHASH" | "DIGSIG" | "_SECINTCONOBV" | "HRELIABLE" | "RELIABLE" | "UNCERTREL" | "UNRELIABLE" | "_SECINTPRVOBV" | "_SECINTPRVABOBV" | "CLINAST" | "DEVAST" | "HCPAST" | "PACQAST" | "PATAST" | "PAYAST" | "PROAST" | "SDMAST" | "_SECINTPRVRBOBV" | "DEVRPT" | "HCPRPT" | "PACQRPT" | "PATRPT" | "PAYRPT" | "PRORPT" | "SDMRPT" | "SecurityPolicy")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomAllSecurityLabelsCode(): AllSecurityLabelsCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomAllSecurityLabelsConcept(): AllSecurityLabelsConcept;
