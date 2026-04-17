import { Coding, Observation, ObservationReferenceRange, Reference, SimpleQuantity } from "fhir/r4";
export interface ObservationPregnancyStatusUvIpsCodeCoding extends Omit<Coding, 'system' | 'code'> {
    system: "http://loinc.org";
    code: "82810-3";
}
export interface ObservationPregnancyStatusUvIpsReferenceRange extends Omit<ObservationReferenceRange, 'low' | 'high'> {
    low?: SimpleQuantity;
    high?: SimpleQuantity;
}
export interface ObservationPregnancyStatusUvIps extends Omit<Observation, 'code' | 'subject' | 'referenceRange' | 'hasMember'> {
    code: {
        coding: ObservationPregnancyStatusUvIpsCodeCoding[];
    };
    /** Must Support */
    subject: Reference;
    referenceRange?: ObservationPregnancyStatusUvIpsReferenceRange[];
    /** Must Support */
    hasMember?: Reference[];
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateObservationPregnancyStatusUvIps(resource: ObservationPregnancyStatusUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
