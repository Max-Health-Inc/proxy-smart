import { CodeableConcept, Extension } from "fhir/r4";
export interface Priority extends Omit<Extension, 'url' | 'value'> {
    url: "http://hl7.org/fhir/StructureDefinition/flag-priority";
    value: CodeableConcept;
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validatePriority(resource: Priority, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
