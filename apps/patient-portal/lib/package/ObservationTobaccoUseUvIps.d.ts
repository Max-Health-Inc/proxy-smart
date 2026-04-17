import { Coding, Observation, Reference } from "fhir/r4";
export interface ObservationTobaccoUseUvIpsCodeCoding extends Omit<Coding, 'system' | 'code'> {
    system: "http://loinc.org";
    code: "72166-2";
}
export interface ObservationTobaccoUseUvIps extends Omit<Observation, 'code' | 'subject'> {
    code: {
        coding: ObservationTobaccoUseUvIpsCodeCoding[];
    };
    /** Must Support */
    subject: Reference;
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateObservationTobaccoUseUvIps(resource: ObservationTobaccoUseUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
