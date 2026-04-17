import { CodeableConceptIPS } from "./CodeableConceptIPS";
import { Observation, ObservationReferenceRange, Reference, SimpleQuantity } from "fhir/r4";
export interface ObservationPregnancyOutcomeUvIpsReferenceRange extends Omit<ObservationReferenceRange, 'low' | 'high'> {
    low?: SimpleQuantity;
    high?: SimpleQuantity;
}
export interface ObservationPregnancyOutcomeUvIps extends Omit<Observation, 'code' | 'subject' | 'referenceRange'> {
    /** Must Support | @see {@link ./valuesets/ValueSet-PregnanciesSummaryUvIps.ts} for valid codes (9 codes) */
    code: CodeableConceptIPS;
    /** Must Support */
    subject: Reference;
    referenceRange?: ObservationPregnancyOutcomeUvIpsReferenceRange[];
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateObservationPregnancyOutcomeUvIps(resource: ObservationPregnancyOutcomeUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
