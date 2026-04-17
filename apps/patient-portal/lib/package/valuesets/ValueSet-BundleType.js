/**
 * ValueSet: bundle-type
 * URL: http://hl7.org/fhir/ValueSet/bundle-type
 * Size: 9 concepts
 */
export const BundleTypeConcepts = [
    { code: "document", system: "http://hl7.org/fhir/bundle-type", display: "Document" },
    { code: "message", system: "http://hl7.org/fhir/bundle-type", display: "Message" },
    { code: "transaction", system: "http://hl7.org/fhir/bundle-type", display: "Transaction" },
    { code: "transaction-response", system: "http://hl7.org/fhir/bundle-type", display: "Transaction Response" },
    { code: "batch", system: "http://hl7.org/fhir/bundle-type", display: "Batch" },
    { code: "batch-response", system: "http://hl7.org/fhir/bundle-type", display: "Batch Response" },
    { code: "history", system: "http://hl7.org/fhir/bundle-type", display: "History List" },
    { code: "searchset", system: "http://hl7.org/fhir/bundle-type", display: "Search Results" },
    { code: "collection", system: "http://hl7.org/fhir/bundle-type", display: "Collection" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidBundleTypeCode(code) {
    return BundleTypeConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getBundleTypeConcept(code) {
    return BundleTypeConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const BundleTypeCodes = BundleTypeConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomBundleTypeCode() {
    return BundleTypeCodes[Math.floor(Math.random() * BundleTypeCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomBundleTypeConcept() {
    return BundleTypeConcepts[Math.floor(Math.random() * BundleTypeConcepts.length)];
}
