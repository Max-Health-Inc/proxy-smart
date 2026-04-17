import { Translation } from "./Translation";
import { Coding, Element, Extension } from "fhir/r4";
export interface CodingIPSDisplayElement extends Omit<Element, 'extension'> {
    extension?: (Extension | Translation)[];
}
export interface CodingIPS extends Omit<Coding, '_display' | 'display'> {
    _display?: CodingIPSDisplayElement;
    display?: string;
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateCodingIPS(resource: CodingIPS, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
