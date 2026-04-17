import { Extension } from "fhir/r4";
export interface PGenderIdentity extends Omit<Extension, 'extension' | 'url'> {
    extension: Extension[];
    url: "http://hl7.org/fhir/StructureDefinition/individual-genderIdentity";
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validatePGenderIdentity(resource: PGenderIdentity, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
