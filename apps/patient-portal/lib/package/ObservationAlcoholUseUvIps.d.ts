import { Coding, Observation, Reference } from "fhir/r4";
export interface ObservationAlcoholUseUvIpsCodeCoding extends Omit<Coding, 'system' | 'code'> {
    system: "http://loinc.org";
    code: "74013-4";
}
export interface ObservationAlcoholUseUvIps extends Omit<Observation, 'code' | 'subject'> {
    code: {
        coding: ObservationAlcoholUseUvIpsCodeCoding[];
    };
    /** Must Support */
    subject: Reference;
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateObservationAlcoholUseUvIps(resource: ObservationAlcoholUseUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
