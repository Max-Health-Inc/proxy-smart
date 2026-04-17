import { CodeableConceptIPS } from "./CodeableConceptIPS";
import { Observation, ObservationReferenceRange, Reference, SimpleQuantity } from "fhir/r4";
export interface ObservationPregnancyEddUvIpsReferenceRange extends Omit<ObservationReferenceRange, 'low' | 'high'> {
    low?: SimpleQuantity;
    high?: SimpleQuantity;
}
export interface ObservationPregnancyEddUvIps extends Omit<Observation, 'code' | 'subject' | 'referenceRange'> {
    /** Must Support | @see {@link ./valuesets/ValueSet-PregnancyExpectedDeliveryDateMethodUvIps.ts} for valid codes (3 codes) */
    code: CodeableConceptIPS;
    /** Must Support */
    subject: Reference;
    referenceRange?: ObservationPregnancyEddUvIpsReferenceRange[];
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateObservationPregnancyEddUvIps(resource: ObservationPregnancyEddUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
