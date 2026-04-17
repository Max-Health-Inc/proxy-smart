import { CodeableConceptIPS } from "./CodeableConceptIPS";
import { Identifier, ImagingStudy, ImagingStudySeries, Reference } from "fhir/r4";
export interface ImagingStudyUvIps extends Omit<ImagingStudy, 'identifier' | 'subject' | 'procedureCode' | 'reasonCode' | 'series'> {
    /** Must Support */
    identifier?: Identifier[];
    /** Must Support */
    subject: Reference;
    /** Must Support */
    procedureCode?: CodeableConceptIPS[];
    /** Must Support */
    reasonCode?: CodeableConceptIPS[];
    /** Must Support */
    series?: ImagingStudySeries[];
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateImagingStudyUvIps(resource: ImagingStudyUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
