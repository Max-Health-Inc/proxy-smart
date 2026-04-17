import { Annotation, Extension } from "fhir/r4";
export interface Note extends Omit<Extension, 'url' | 'value'> {
    url: "http://hl7.org/fhir/StructureDefinition/note";
    value: Annotation;
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateNote(resource: Note, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
