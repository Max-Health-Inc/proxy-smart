import { CodeableConceptIPS } from "./CodeableConceptIPS";
import { Procedure, Reference } from "fhir/r4";
export interface ProcedureUvIps extends Omit<Procedure, 'code' | 'subject'> {
    /** Must Support */
    code: CodeableConceptIPS;
    /** Must Support */
    subject: Reference;
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateProcedureUvIps(resource: ProcedureUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
