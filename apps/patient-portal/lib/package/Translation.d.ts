import { Extension } from "fhir/r4";
export interface Translation extends Omit<Extension, 'url'> {
    url: "http://hl7.org/fhir/StructureDefinition/translation";
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateTranslation(resource: Translation, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
