/**
 * ValueSet: medicationrequest-status-reason
 * URL: http://hl7.org/fhir/ValueSet/medicationrequest-status-reason
 * Size: 13 concepts
 */
export const MedicationrequestStatusReasonConcepts = [
    { code: "altchoice", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason", display: "Try another treatment first" },
    { code: "clarif", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason", display: "Prescription requires clarification" },
    { code: "drughigh", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason", display: "Drug level too high" },
    { code: "hospadm", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason", display: "Admission to hospital" },
    { code: "labint", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason", display: "Lab interference issues" },
    { code: "non-avail", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason", display: "Patient not available" },
    { code: "preg", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason", display: "Parent is pregnant/breast feeding" },
    { code: "salg", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason", display: "Allergy" },
    { code: "sddi", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason", display: "Drug interacts with another drug" },
    { code: "sdupther", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason", display: "Duplicate therapy" },
    { code: "sintol", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason", display: "Suspected intolerance" },
    { code: "surg", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason", display: "Patient scheduled for surgery." },
    { code: "washout", system: "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason", display: "Waiting for old drug to wash out" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidMedicationrequestStatusReasonCode(code) {
    return MedicationrequestStatusReasonConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getMedicationrequestStatusReasonConcept(code) {
    return MedicationrequestStatusReasonConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const MedicationrequestStatusReasonCodes = MedicationrequestStatusReasonConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomMedicationrequestStatusReasonCode() {
    return MedicationrequestStatusReasonCodes[Math.floor(Math.random() * MedicationrequestStatusReasonCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomMedicationrequestStatusReasonConcept() {
    return MedicationrequestStatusReasonConcepts[Math.floor(Math.random() * MedicationrequestStatusReasonConcepts.length)];
}
