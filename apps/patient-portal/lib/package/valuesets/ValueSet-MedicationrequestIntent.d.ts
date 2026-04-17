/**
 * ValueSet: medicationrequest-intent
 * URL: http://hl7.org/fhir/ValueSet/medicationrequest-intent
 * Size: 8 concepts
 */
export declare const MedicationrequestIntentConcepts: readonly [{
    readonly code: "proposal";
    readonly system: "http://hl7.org/fhir/CodeSystem/medicationrequest-intent";
    readonly display: "Proposal";
}, {
    readonly code: "plan";
    readonly system: "http://hl7.org/fhir/CodeSystem/medicationrequest-intent";
    readonly display: "Plan";
}, {
    readonly code: "order";
    readonly system: "http://hl7.org/fhir/CodeSystem/medicationrequest-intent";
    readonly display: "Order";
}, {
    readonly code: "original-order";
    readonly system: "http://hl7.org/fhir/CodeSystem/medicationrequest-intent";
    readonly display: "Original Order";
}, {
    readonly code: "reflex-order";
    readonly system: "http://hl7.org/fhir/CodeSystem/medicationrequest-intent";
    readonly display: "Reflex Order";
}, {
    readonly code: "filler-order";
    readonly system: "http://hl7.org/fhir/CodeSystem/medicationrequest-intent";
    readonly display: "Filler Order";
}, {
    readonly code: "instance-order";
    readonly system: "http://hl7.org/fhir/CodeSystem/medicationrequest-intent";
    readonly display: "Instance Order";
}, {
    readonly code: "option";
    readonly system: "http://hl7.org/fhir/CodeSystem/medicationrequest-intent";
    readonly display: "Option";
}];
/** Union type of all valid codes in this ValueSet */
export type MedicationrequestIntentCode = "proposal" | "plan" | "order" | "original-order" | "reflex-order" | "filler-order" | "instance-order" | "option";
/** Type representing a concept from this ValueSet */
export type MedicationrequestIntentConcept = typeof MedicationrequestIntentConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidMedicationrequestIntentCode(code: string): code is MedicationrequestIntentCode;
/**
 * Get concept details by code
 */
export declare function getMedicationrequestIntentConcept(code: string): MedicationrequestIntentConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const MedicationrequestIntentCodes: ("order" | "proposal" | "plan" | "original-order" | "reflex-order" | "filler-order" | "instance-order" | "option")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomMedicationrequestIntentCode(): MedicationrequestIntentCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomMedicationrequestIntentConcept(): MedicationrequestIntentConcept;
