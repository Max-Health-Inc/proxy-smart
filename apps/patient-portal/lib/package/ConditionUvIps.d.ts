import { CodeableConceptIPS } from "./CodeableConceptIPS";
import { Condition, Reference } from "fhir/r4";
export interface ConditionUvIps extends Omit<Condition, 'clinicalStatus' | 'category' | 'severity' | 'code' | 'subject'> {
    /** Must Support */
    clinicalStatus?: CodeableConceptIPS;
    /** Must Support | @see {@link ./valuesets/ValueSet-ProblemTypeUvIps.ts} for valid codes (1 codes) */
    category?: CodeableConceptIPS[];
    /** Must Support | @see {@link ./valuesets/ValueSet-ConditionSeverity.ts} for valid codes (3 codes) */
    severity?: CodeableConceptIPS;
    /** Must Support */
    code: CodeableConceptIPS;
    /** Must Support */
    subject: Reference;
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateConditionUvIps(resource: ConditionUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
