import { Abatement } from "./Abatement";
import { AllergyIntolerance, AllergyIntoleranceReaction, Extension, Reference } from "fhir/r4";
import { CodeableConceptIPS } from "./CodeableConceptIPS";
export interface AllergyIntoleranceUvIpsReaction extends Omit<AllergyIntoleranceReaction, 'manifestation'> {
    /** Must Support */
    manifestation: CodeableConceptIPS[];
}
export interface AllergyIntoleranceUvIps extends Omit<AllergyIntolerance, 'clinicalStatus' | 'code' | 'patient' | 'reaction' | 'extension'> {
    /** Must Support */
    clinicalStatus?: CodeableConceptIPS;
    /** Must Support */
    code: CodeableConceptIPS;
    /** Must Support */
    patient: Reference;
    /** Must Support */
    reaction?: AllergyIntoleranceUvIpsReaction[];
    extension?: (Extension | Abatement)[];
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateAllergyIntoleranceUvIps(resource: AllergyIntoleranceUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
