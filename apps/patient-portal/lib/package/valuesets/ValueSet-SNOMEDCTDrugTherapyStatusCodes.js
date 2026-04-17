/**
 * ValueSet: SNOMEDCTDrugTherapyStatusCodes
 * URL: http://hl7.org/fhir/ValueSet/reason-medication-status-codes
 * Size: 19 concepts
 */
export const SNOMEDCTDrugTherapyStatusCodesConcepts = [
    { code: "266710000", system: "http://snomed.info/sct", display: "Drugs not taken/completed" },
    { code: "182862001", system: "http://snomed.info/sct", display: "Drug not taken - dislike taste" },
    { code: "182863006", system: "http://snomed.info/sct", display: "Drug not taken - dislike form" },
    { code: "182864000", system: "http://snomed.info/sct", display: "Drug not taken - side-effects" },
    { code: "182865004", system: "http://snomed.info/sct", display: "Drug not taken - inconvenient" },
    { code: "182868002", system: "http://snomed.info/sct", display: "Treatment stopped - alternative therapy undertaken" },
    { code: "182869005", system: "http://snomed.info/sct", display: "Drug not taken - patient lost tablets" },
    { code: "182870006", system: "http://snomed.info/sct", display: "Drug discontinued - reason unknown" },
    { code: "182871005", system: "http://snomed.info/sct", display: "Drug discontinued - patient fear/risk" },
    { code: "182872003", system: "http://snomed.info/sct", display: "Drug discontinued - too expensive" },
    { code: "182873008", system: "http://snomed.info/sct", display: "Drug treatment stopped - patient ran out of tablets" },
    { code: "182874002", system: "http://snomed.info/sct", display: "Treatment stopped - patient unable to concentrate" },
    { code: "266711001", system: "http://snomed.info/sct", display: "Drug not taken - problem swallowing" },
    { code: "275929009", system: "http://snomed.info/sct", display: "Tablets too large to swallow" },
    { code: "315604002", system: "http://snomed.info/sct", display: "Missed contraceptive pill" },
    { code: "1269470004", system: "http://snomed.info/sct", display: "Individual dose of drug or medicament not taken (situation)" },
    { code: "12371000175103", system: "http://snomed.info/sct", display: "Drug treatment stopped patient ran out of medication" },
    { code: "152741000146103", system: "http://snomed.info/sct", display: "Medication spat out by patient" },
    { code: "410684002", system: "http://snomed.info/sct", display: "Drug therapy status (context-dependent category)" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidSNOMEDCTDrugTherapyStatusCodesCode(code) {
    return SNOMEDCTDrugTherapyStatusCodesConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getSNOMEDCTDrugTherapyStatusCodesConcept(code) {
    return SNOMEDCTDrugTherapyStatusCodesConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const SNOMEDCTDrugTherapyStatusCodesCodes = SNOMEDCTDrugTherapyStatusCodesConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomSNOMEDCTDrugTherapyStatusCodesCode() {
    return SNOMEDCTDrugTherapyStatusCodesCodes[Math.floor(Math.random() * SNOMEDCTDrugTherapyStatusCodesCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomSNOMEDCTDrugTherapyStatusCodesConcept() {
    return SNOMEDCTDrugTherapyStatusCodesConcepts[Math.floor(Math.random() * SNOMEDCTDrugTherapyStatusCodesConcepts.length)];
}
