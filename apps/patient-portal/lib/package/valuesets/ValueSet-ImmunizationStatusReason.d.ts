/**
 * ValueSet: immunization-status-reason
 * URL: http://hl7.org/fhir/ValueSet/immunization-status-reason
 * Size: 28 concepts
 */
export declare const ImmunizationStatusReasonConcepts: readonly [{
    readonly code: "IMMUNE";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActReason";
    readonly display: "immunity";
}, {
    readonly code: "MEDPREC";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActReason";
    readonly display: "medical precaution";
}, {
    readonly code: "OSTOCK";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActReason";
    readonly display: "product out of stock";
}, {
    readonly code: "PATOBJ";
    readonly system: "http://terminology.hl7.org/CodeSystem/v3-ActReason";
    readonly display: "patient objection";
}, {
    readonly code: "310376006";
    readonly system: "http://snomed.info/sct";
    readonly display: "Immunization consent not given";
}, {
    readonly code: "171257003";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent - Tetanus/low dose diptheria vaccine";
}, {
    readonly code: "171265000";
    readonly system: "http://snomed.info/sct";
    readonly display: "Pertussis vaccine refused";
}, {
    readonly code: "171266004";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent - diphtheria immunisation";
}, {
    readonly code: "171267008";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent - tetanus immunization";
}, {
    readonly code: "171268003";
    readonly system: "http://snomed.info/sct";
    readonly display: "Polio immunisation refused";
}, {
    readonly code: "171269006";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent - measles immunization";
}, {
    readonly code: "171270007";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent - rubella immunisation";
}, {
    readonly code: "171271006";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent - BCG";
}, {
    readonly code: "171272004";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent - influenza immunization";
}, {
    readonly code: "171280006";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent for MMR";
}, {
    readonly code: "171283008";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent for any primary imm";
}, {
    readonly code: "171285001";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent - pre-school vaccinations";
}, {
    readonly code: "171286000";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent - school exit vaccinations";
}, {
    readonly code: "171291004";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent - Hemophilus influenzae type B immunization";
}, {
    readonly code: "171292006";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent pneumococcal immunisation";
}, {
    readonly code: "171293001";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent for MR - Measles/rubella vaccine";
}, {
    readonly code: "268559007";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent for any immunization";
}, {
    readonly code: "310839003";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent for MMR1";
}, {
    readonly code: "310840001";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent for measles/mumps/rubella two";
}, {
    readonly code: "314768003";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent DTP immunisation";
}, {
    readonly code: "314769006";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent DT immunization";
}, {
    readonly code: "314936001";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent for meningitis C immunisation";
}, {
    readonly code: "407598009";
    readonly system: "http://snomed.info/sct";
    readonly display: "No consent for 3rd HIB booster (finding)";
}];
/** String type (ValueSet too large for union type) */
export type ImmunizationStatusReasonCode = string;
/** Type representing a concept from this ValueSet */
export type ImmunizationStatusReasonConcept = typeof ImmunizationStatusReasonConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidImmunizationStatusReasonCode(code: string): code is ImmunizationStatusReasonCode;
/**
 * Get concept details by code
 */
export declare function getImmunizationStatusReasonConcept(code: string): ImmunizationStatusReasonConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ImmunizationStatusReasonCodes: ("IMMUNE" | "MEDPREC" | "OSTOCK" | "PATOBJ" | "310376006" | "171257003" | "171265000" | "171266004" | "171267008" | "171268003" | "171269006" | "171270007" | "171271006" | "171272004" | "171280006" | "171283008" | "171285001" | "171286000" | "171291004" | "171292006" | "171293001" | "268559007" | "310839003" | "310840001" | "314768003" | "314769006" | "314936001" | "407598009")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomImmunizationStatusReasonCode(): ImmunizationStatusReasonCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomImmunizationStatusReasonConcept(): ImmunizationStatusReasonConcept;
