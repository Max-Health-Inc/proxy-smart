/**
 * ValueSet: document-classcodes
 * URL: http://hl7.org/fhir/ValueSet/document-classcodes
 * Size: 45 concepts
 */
export declare const DocumentClasscodesConcepts: readonly [{
    readonly code: "11369-6";
    readonly system: "http://loinc.org";
    readonly display: "History of Immunization note";
}, {
    readonly code: "11485-0";
    readonly system: "http://loinc.org";
    readonly display: "Anesthesia records";
}, {
    readonly code: "11486-8";
    readonly system: "http://loinc.org";
    readonly display: "Chemotherapy records";
}, {
    readonly code: "11488-4";
    readonly system: "http://loinc.org";
    readonly display: "Consult note";
}, {
    readonly code: "11506-3";
    readonly system: "http://loinc.org";
    readonly display: "Progress note";
}, {
    readonly code: "11543-6";
    readonly system: "http://loinc.org";
    readonly display: "Nursery records";
}, {
    readonly code: "15508-5";
    readonly system: "http://loinc.org";
    readonly display: "Labor and delivery records";
}, {
    readonly code: "18726-0";
    readonly system: "http://loinc.org";
    readonly display: "Radiology studies (set)";
}, {
    readonly code: "18761-7";
    readonly system: "http://loinc.org";
    readonly display: "Transfer summary note";
}, {
    readonly code: "18842-5";
    readonly system: "http://loinc.org";
    readonly display: "Discharge summary";
}, {
    readonly code: "26436-6";
    readonly system: "http://loinc.org";
    readonly display: "Laboratory studies (set)";
}, {
    readonly code: "26441-6";
    readonly system: "http://loinc.org";
    readonly display: "Cardiology studies (set)";
}, {
    readonly code: "26442-4";
    readonly system: "http://loinc.org";
    readonly display: "Obstetrical studies (set)";
}, {
    readonly code: "27895-2";
    readonly system: "http://loinc.org";
    readonly display: "Gastroenterology endoscopy studies (set)";
}, {
    readonly code: "27896-0";
    readonly system: "http://loinc.org";
    readonly display: "Pulmonary studies (set)";
}, {
    readonly code: "27897-8";
    readonly system: "http://loinc.org";
    readonly display: "Neuromuscular electrophysiology studies (set)";
}, {
    readonly code: "27898-6";
    readonly system: "http://loinc.org";
    readonly display: "Pathology studies (set)";
}, {
    readonly code: "28570-0";
    readonly system: "http://loinc.org";
    readonly display: "Procedure note";
}, {
    readonly code: "28619-5";
    readonly system: "http://loinc.org";
    readonly display: "Ophthalmology/Optometry studies (set)";
}, {
    readonly code: "28634-4";
    readonly system: "http://loinc.org";
    readonly display: "Miscellaneous studies (set)";
}, {
    readonly code: "29749-9";
    readonly system: "http://loinc.org";
    readonly display: "Dialysis records";
}, {
    readonly code: "29750-7";
    readonly system: "http://loinc.org";
    readonly display: "Neonatal intensive care records";
}, {
    readonly code: "29751-5";
    readonly system: "http://loinc.org";
    readonly display: "Critical care records";
}, {
    readonly code: "29752-3";
    readonly system: "http://loinc.org";
    readonly display: "Perioperative records";
}, {
    readonly code: "34109-9";
    readonly system: "http://loinc.org";
    readonly display: "Note";
}, {
    readonly code: "34117-2";
    readonly system: "http://loinc.org";
    readonly display: "History and physical note";
}, {
    readonly code: "34121-4";
    readonly system: "http://loinc.org";
    readonly display: "Interventional procedure note";
}, {
    readonly code: "34122-2";
    readonly system: "http://loinc.org";
    readonly display: "Pathology procedure note";
}, {
    readonly code: "34133-9";
    readonly system: "http://loinc.org";
    readonly display: "Summary of episode note";
}, {
    readonly code: "34140-4";
    readonly system: "http://loinc.org";
    readonly display: "Deprecated Transfer of care referral note";
}, {
    readonly code: "34748-4";
    readonly system: "http://loinc.org";
    readonly display: "Telephone encounter Note";
}, {
    readonly code: "34775-7";
    readonly system: "http://loinc.org";
    readonly display: "Deprecated General surgery Pre-operative evaluation and management note";
}, {
    readonly code: "47039-3";
    readonly system: "http://loinc.org";
    readonly display: "Hospital Admission history and physical note";
}, {
    readonly code: "47042-7";
    readonly system: "http://loinc.org";
    readonly display: "Counseling note";
}, {
    readonly code: "47045-0";
    readonly system: "http://loinc.org";
    readonly display: "Study report";
}, {
    readonly code: "47046-8";
    readonly system: "http://loinc.org";
    readonly display: "Summary of death note";
}, {
    readonly code: "47049-2";
    readonly system: "http://loinc.org";
    readonly display: "Deprecated Non-patient Communication note";
}, {
    readonly code: "57017-6";
    readonly system: "http://loinc.org";
    readonly display: "Privacy policy Organization Document";
}, {
    readonly code: "57016-8";
    readonly system: "http://loinc.org";
    readonly display: "Privacy policy acknowledgment Document";
}, {
    readonly code: "56445-0";
    readonly system: "http://loinc.org";
    readonly display: "Medication summary Document";
}, {
    readonly code: "53576-5";
    readonly system: "http://loinc.org";
    readonly display: "Personal Health Monitoring Report";
}, {
    readonly code: "56447-6";
    readonly system: "http://loinc.org";
    readonly display: "Deprecated Plan of care note";
}, {
    readonly code: "18748-4";
    readonly system: "http://loinc.org";
    readonly display: "Diagnostic imaging study";
}, {
    readonly code: "11504-8";
    readonly system: "http://loinc.org";
    readonly display: "Surgical operation note";
}, {
    readonly code: "57133-1";
    readonly system: "http://loinc.org";
    readonly display: "Referral note";
}];
/** String type (ValueSet too large for union type) */
export type DocumentClasscodesCode = string;
/** Type representing a concept from this ValueSet */
export type DocumentClasscodesConcept = typeof DocumentClasscodesConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidDocumentClasscodesCode(code: string): code is DocumentClasscodesCode;
/**
 * Get concept details by code
 */
export declare function getDocumentClasscodesConcept(code: string): DocumentClasscodesConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const DocumentClasscodesCodes: ("34133-9" | "11369-6" | "26436-6" | "11485-0" | "11486-8" | "11488-4" | "11506-3" | "11543-6" | "15508-5" | "18726-0" | "18761-7" | "18842-5" | "26441-6" | "26442-4" | "27895-2" | "27896-0" | "27897-8" | "27898-6" | "28570-0" | "28619-5" | "28634-4" | "29749-9" | "29750-7" | "29751-5" | "29752-3" | "34109-9" | "34117-2" | "34121-4" | "34122-2" | "34140-4" | "34748-4" | "34775-7" | "47039-3" | "47042-7" | "47045-0" | "47046-8" | "47049-2" | "57017-6" | "57016-8" | "56445-0" | "53576-5" | "56447-6" | "18748-4" | "11504-8" | "57133-1")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomDocumentClasscodesCode(): DocumentClasscodesCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomDocumentClasscodesConcept(): DocumentClasscodesConcept;
/**
 * Multi-language display translations
 * Maps code → language → display string
 */
export declare const DocumentClasscodesDisplays: Record<string, Record<string, string>>;
/**
 * Get the display string for a code in a specific language
 */
export declare function getDocumentClasscodesDisplay(code: string, lang: string): string | undefined;
