import { Dosage, MedicationRequest, Reference, SimpleQuantity, Timing } from "fhir/r4";
export interface MedicationRequestIPSDosageInstruction extends Omit<Dosage, 'text' | 'timing' | 'maxDosePerAdministration' | 'maxDosePerLifetime'> {
    /** Must Support */
    text?: string;
    /** Must Support */
    timing?: Timing;
    maxDosePerAdministration?: SimpleQuantity;
    maxDosePerLifetime?: SimpleQuantity;
}
export interface MedicationRequestIPS extends Omit<MedicationRequest, 'subject' | 'dosageInstruction'> {
    /** Must Support */
    subject: Reference;
    /** Must Support */
    dosageInstruction?: MedicationRequestIPSDosageInstruction[];
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateMedicationRequestIPS(resource: MedicationRequestIPS, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
