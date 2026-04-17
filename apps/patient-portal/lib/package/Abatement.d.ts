import { Extension } from "fhir/r4";
export interface Abatement extends Omit<Extension, 'url'> {
    url: "http://hl7.org/fhir/StructureDefinition/allergyintolerance-abatement";
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateAbatement(resource: Abatement, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
