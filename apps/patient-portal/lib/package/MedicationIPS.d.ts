import { CodeableConceptIPS } from "./CodeableConceptIPS";
import { Medication, MedicationIngredient, Ratio } from "fhir/r4";
export interface MedicationIPSIngredient extends Omit<MedicationIngredient, 'strength'> {
    /** Must Support */
    strength?: Ratio;
}
export interface MedicationIPS extends Omit<Medication, 'code' | 'form' | 'ingredient'> {
    /** Must Support */
    code: CodeableConceptIPS;
    /** Must Support | @see {@link ./valuesets/ValueSet-SNOMEDCTFormCodes.ts} for valid codes (1 codes) */
    form?: CodeableConceptIPS;
    /** Must Support */
    ingredient?: MedicationIPSIngredient[];
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateMedicationIPS(resource: MedicationIPS, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
