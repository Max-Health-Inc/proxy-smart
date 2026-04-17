/**
 * ValueSet: PregnancyExpectedDeliveryDateMethodUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/edd-method-uv-ips
 * Size: 3 concepts
 */
export declare const PregnancyExpectedDeliveryDateMethodUvIpsConcepts: readonly [{
    readonly code: "11778-8";
    readonly system: "http://loinc.org";
    readonly display: "Delivery date Estimated";
}, {
    readonly code: "11779-6";
    readonly system: "http://loinc.org";
    readonly display: "Delivery date Estimated from last menstrual period";
}, {
    readonly code: "11780-4";
    readonly system: "http://loinc.org";
    readonly display: "Delivery date Estimated from ovulation date";
}];
/** Union type of all valid codes in this ValueSet */
export type PregnancyExpectedDeliveryDateMethodUvIpsCode = "11778-8" | "11779-6" | "11780-4";
/** Type representing a concept from this ValueSet */
export type PregnancyExpectedDeliveryDateMethodUvIpsConcept = typeof PregnancyExpectedDeliveryDateMethodUvIpsConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidPregnancyExpectedDeliveryDateMethodUvIpsCode(code: string): code is PregnancyExpectedDeliveryDateMethodUvIpsCode;
/**
 * Get concept details by code
 */
export declare function getPregnancyExpectedDeliveryDateMethodUvIpsConcept(code: string): PregnancyExpectedDeliveryDateMethodUvIpsConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const PregnancyExpectedDeliveryDateMethodUvIpsCodes: ("11778-8" | "11779-6" | "11780-4")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomPregnancyExpectedDeliveryDateMethodUvIpsCode(): PregnancyExpectedDeliveryDateMethodUvIpsCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomPregnancyExpectedDeliveryDateMethodUvIpsConcept(): PregnancyExpectedDeliveryDateMethodUvIpsConcept;
