/**
 * ValueSet: medicationrequest-status-reason
 * URL: http://hl7.org/fhir/ValueSet/medicationrequest-status-reason
 * Size: 13 concepts
 */
export declare const MedicationrequestStatusReasonConcepts: readonly [{
    readonly code: "altchoice";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason";
    readonly display: "Try another treatment first";
}, {
    readonly code: "clarif";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason";
    readonly display: "Prescription requires clarification";
}, {
    readonly code: "drughigh";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason";
    readonly display: "Drug level too high";
}, {
    readonly code: "hospadm";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason";
    readonly display: "Admission to hospital";
}, {
    readonly code: "labint";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason";
    readonly display: "Lab interference issues";
}, {
    readonly code: "non-avail";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason";
    readonly display: "Patient not available";
}, {
    readonly code: "preg";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason";
    readonly display: "Parent is pregnant/breast feeding";
}, {
    readonly code: "salg";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason";
    readonly display: "Allergy";
}, {
    readonly code: "sddi";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason";
    readonly display: "Drug interacts with another drug";
}, {
    readonly code: "sdupther";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason";
    readonly display: "Duplicate therapy";
}, {
    readonly code: "sintol";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason";
    readonly display: "Suspected intolerance";
}, {
    readonly code: "surg";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason";
    readonly display: "Patient scheduled for surgery.";
}, {
    readonly code: "washout";
    readonly system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason";
    readonly display: "Waiting for old drug to wash out";
}];
/** Union type of all valid codes in this ValueSet */
export type MedicationrequestStatusReasonCode = "altchoice" | "clarif" | "drughigh" | "hospadm" | "labint" | "non-avail" | "preg" | "salg" | "sddi" | "sdupther" | "sintol" | "surg" | "washout";
/** Type representing a concept from this ValueSet */
export type MedicationrequestStatusReasonConcept = typeof MedicationrequestStatusReasonConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidMedicationrequestStatusReasonCode(code: string): code is MedicationrequestStatusReasonCode;
/**
 * Get concept details by code
 */
export declare function getMedicationrequestStatusReasonConcept(code: string): MedicationrequestStatusReasonConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const MedicationrequestStatusReasonCodes: ("altchoice" | "clarif" | "drughigh" | "hospadm" | "labint" | "non-avail" | "preg" | "salg" | "sddi" | "sdupther" | "sintol" | "surg" | "washout")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomMedicationrequestStatusReasonCode(): MedicationrequestStatusReasonCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomMedicationrequestStatusReasonConcept(): MedicationrequestStatusReasonConcept;
