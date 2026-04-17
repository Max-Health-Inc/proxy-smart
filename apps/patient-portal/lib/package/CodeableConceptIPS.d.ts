import { CodingIPS } from "./CodingIPS";
import { CodeableConcept, Element, Extension } from "fhir/r4";
import { Translation } from "./Translation";
export interface CodeableConceptIPSTextElement extends Omit<Element, 'extension'> {
    extension?: (Extension | Translation)[];
}
export interface CodeableConceptIPS extends Omit<CodeableConcept, 'coding' | '_text' | 'text'> {
    /** Must Support */
    coding?: CodingIPS[];
    _text?: CodeableConceptIPSTextElement;
    /** Must Support */
    text?: string;
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateCodeableConceptIPS(resource: CodeableConceptIPS, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
