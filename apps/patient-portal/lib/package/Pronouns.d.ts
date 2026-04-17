import { Extension } from "fhir/r4";
export interface Pronouns extends Omit<Extension, 'extension' | 'url'> {
    extension: Extension[];
    url: "http://hl7.org/fhir/StructureDefinition/individual-pronouns";
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validatePronouns(resource: Pronouns, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
