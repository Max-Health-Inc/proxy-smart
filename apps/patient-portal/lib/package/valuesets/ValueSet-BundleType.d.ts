/**
 * ValueSet: bundle-type
 * URL: http://hl7.org/fhir/ValueSet/bundle-type
 * Size: 9 concepts
 */
export declare const BundleTypeConcepts: readonly [{
    readonly code: "document";
    readonly system: "http://hl7.org/fhir/bundle-type";
    readonly display: "Document";
}, {
    readonly code: "message";
    readonly system: "http://hl7.org/fhir/bundle-type";
    readonly display: "Message";
}, {
    readonly code: "transaction";
    readonly system: "http://hl7.org/fhir/bundle-type";
    readonly display: "Transaction";
}, {
    readonly code: "transaction-response";
    readonly system: "http://hl7.org/fhir/bundle-type";
    readonly display: "Transaction Response";
}, {
    readonly code: "batch";
    readonly system: "http://hl7.org/fhir/bundle-type";
    readonly display: "Batch";
}, {
    readonly code: "batch-response";
    readonly system: "http://hl7.org/fhir/bundle-type";
    readonly display: "Batch Response";
}, {
    readonly code: "history";
    readonly system: "http://hl7.org/fhir/bundle-type";
    readonly display: "History List";
}, {
    readonly code: "searchset";
    readonly system: "http://hl7.org/fhir/bundle-type";
    readonly display: "Search Results";
}, {
    readonly code: "collection";
    readonly system: "http://hl7.org/fhir/bundle-type";
    readonly display: "Collection";
}];
/** Union type of all valid codes in this ValueSet */
export type BundleTypeCode = "document" | "message" | "transaction" | "transaction-response" | "batch" | "batch-response" | "history" | "searchset" | "collection";
/** Type representing a concept from this ValueSet */
export type BundleTypeConcept = typeof BundleTypeConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidBundleTypeCode(code: string): code is BundleTypeCode;
/**
 * Get concept details by code
 */
export declare function getBundleTypeConcept(code: string): BundleTypeConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const BundleTypeCodes: ("document" | "searchset" | "batch-response" | "transaction-response" | "history" | "collection" | "message" | "transaction" | "batch")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomBundleTypeCode(): BundleTypeCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomBundleTypeConcept(): BundleTypeConcept;
