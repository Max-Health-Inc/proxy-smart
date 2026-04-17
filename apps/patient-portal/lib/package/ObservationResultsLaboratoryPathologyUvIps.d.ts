import { CodeableConceptIPS } from "./CodeableConceptIPS";
import { Observation, ObservationComponent, Reference } from "fhir/r4";
export interface ObservationResultsLaboratoryPathologyUvIps extends Omit<Observation, 'code' | 'subject' | 'performer' | 'component'> {
    /** Must Support */
    code: CodeableConceptIPS;
    /** Must Support */
    subject: Reference;
    /** Must Support */
    performer: Reference[];
    /** Must Support */
    component?: ObservationComponent[];
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateObservationResultsLaboratoryPathologyUvIps(resource: ObservationResultsLaboratoryPathologyUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
