import { CodeableConceptIPS } from "./CodeableConceptIPS";
import { Immunization, Reference } from "fhir/r4";
export interface ImmunizationUvIps extends Omit<Immunization, 'vaccineCode' | 'patient'> {
    /** Must Support */
    vaccineCode: CodeableConceptIPS;
    /** Must Support */
    patient: Reference;
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateImmunizationUvIps(resource: ImmunizationUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
