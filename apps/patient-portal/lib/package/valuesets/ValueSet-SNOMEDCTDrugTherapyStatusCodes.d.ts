/**
 * ValueSet: SNOMEDCTDrugTherapyStatusCodes
 * URL: http://hl7.org/fhir/ValueSet/reason-medication-status-codes
 * Size: 19 concepts
 */
export declare const SNOMEDCTDrugTherapyStatusCodesConcepts: readonly [{
    readonly code: "266710000";
    readonly system: "http://snomed.info/sct";
    readonly display: "Drugs not taken/completed";
}, {
    readonly code: "182862001";
    readonly system: "http://snomed.info/sct";
    readonly display: "Drug not taken - dislike taste";
}, {
    readonly code: "182863006";
    readonly system: "http://snomed.info/sct";
    readonly display: "Drug not taken - dislike form";
}, {
    readonly code: "182864000";
    readonly system: "http://snomed.info/sct";
    readonly display: "Drug not taken - side-effects";
}, {
    readonly code: "182865004";
    readonly system: "http://snomed.info/sct";
    readonly display: "Drug not taken - inconvenient";
}, {
    readonly code: "182868002";
    readonly system: "http://snomed.info/sct";
    readonly display: "Treatment stopped - alternative therapy undertaken";
}, {
    readonly code: "182869005";
    readonly system: "http://snomed.info/sct";
    readonly display: "Drug not taken - patient lost tablets";
}, {
    readonly code: "182870006";
    readonly system: "http://snomed.info/sct";
    readonly display: "Drug discontinued - reason unknown";
}, {
    readonly code: "182871005";
    readonly system: "http://snomed.info/sct";
    readonly display: "Drug discontinued - patient fear/risk";
}, {
    readonly code: "182872003";
    readonly system: "http://snomed.info/sct";
    readonly display: "Drug discontinued - too expensive";
}, {
    readonly code: "182873008";
    readonly system: "http://snomed.info/sct";
    readonly display: "Drug treatment stopped - patient ran out of tablets";
}, {
    readonly code: "182874002";
    readonly system: "http://snomed.info/sct";
    readonly display: "Treatment stopped - patient unable to concentrate";
}, {
    readonly code: "266711001";
    readonly system: "http://snomed.info/sct";
    readonly display: "Drug not taken - problem swallowing";
}, {
    readonly code: "275929009";
    readonly system: "http://snomed.info/sct";
    readonly display: "Tablets too large to swallow";
}, {
    readonly code: "315604002";
    readonly system: "http://snomed.info/sct";
    readonly display: "Missed contraceptive pill";
}, {
    readonly code: "1269470004";
    readonly system: "http://snomed.info/sct";
    readonly display: "Individual dose of drug or medicament not taken (situation)";
}, {
    readonly code: "12371000175103";
    readonly system: "http://snomed.info/sct";
    readonly display: "Drug treatment stopped patient ran out of medication";
}, {
    readonly code: "152741000146103";
    readonly system: "http://snomed.info/sct";
    readonly display: "Medication spat out by patient";
}, {
    readonly code: "410684002";
    readonly system: "http://snomed.info/sct";
    readonly display: "Drug therapy status (context-dependent category)";
}];
/** Union type of all valid codes in this ValueSet */
export type SNOMEDCTDrugTherapyStatusCodesCode = "266710000" | "182862001" | "182863006" | "182864000" | "182865004" | "182868002" | "182869005" | "182870006" | "182871005" | "182872003" | "182873008" | "182874002" | "266711001" | "275929009" | "315604002" | "1269470004" | "12371000175103" | "152741000146103" | "410684002";
/** Type representing a concept from this ValueSet */
export type SNOMEDCTDrugTherapyStatusCodesConcept = typeof SNOMEDCTDrugTherapyStatusCodesConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidSNOMEDCTDrugTherapyStatusCodesCode(code: string): code is SNOMEDCTDrugTherapyStatusCodesCode;
/**
 * Get concept details by code
 */
export declare function getSNOMEDCTDrugTherapyStatusCodesConcept(code: string): SNOMEDCTDrugTherapyStatusCodesConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const SNOMEDCTDrugTherapyStatusCodesCodes: ("266710000" | "182862001" | "182863006" | "182864000" | "182865004" | "182868002" | "182869005" | "182870006" | "182871005" | "182872003" | "182873008" | "182874002" | "266711001" | "275929009" | "315604002" | "1269470004" | "12371000175103" | "152741000146103" | "410684002")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomSNOMEDCTDrugTherapyStatusCodesCode(): SNOMEDCTDrugTherapyStatusCodesCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomSNOMEDCTDrugTherapyStatusCodesConcept(): SNOMEDCTDrugTherapyStatusCodesConcept;
