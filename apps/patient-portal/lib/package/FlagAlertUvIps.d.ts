import { CodeableConceptIPS } from "./CodeableConceptIPS";
import { Priority } from "./Priority";
import { Extension, Flag, Reference } from "fhir/r4";
export interface FlagAlertUvIps extends Omit<Flag, 'status' | 'category' | 'code' | 'subject' | 'extension'> {
    status: "active";
    /** Must Support */
    category?: CodeableConceptIPS[];
    /** Must Support */
    code: CodeableConceptIPS;
    /** Must Support */
    subject: Reference;
    extension?: (Extension | Priority)[];
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateFlagAlertUvIps(resource: FlagAlertUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
