import { CodeableConceptIPS } from "./CodeableConceptIPS";
import { Reference, Specimen } from "fhir/r4";
export interface SpecimenUvIps extends Omit<Specimen, 'type' | 'subject'> {
    /** Must Support */
    type: CodeableConceptIPS;
    /** Must Support */
    subject?: Reference;
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateSpecimenUvIps(resource: SpecimenUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
