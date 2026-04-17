import { Dosage, MedicationStatement, Reference, SimpleQuantity, Timing } from "fhir/r4";
export interface MedicationStatementIPSDosage extends Omit<Dosage, 'text' | 'timing' | 'maxDosePerAdministration' | 'maxDosePerLifetime'> {
    /** Must Support */
    text?: string;
    /** Must Support */
    timing?: Timing;
    maxDosePerAdministration?: SimpleQuantity;
    maxDosePerLifetime?: SimpleQuantity;
}
export interface MedicationStatementIPS extends Omit<MedicationStatement, 'subject' | 'dosage'> {
    /** Must Support */
    subject: Reference;
    /** Must Support */
    dosage?: MedicationStatementIPSDosage[];
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateMedicationStatementIPS(resource: MedicationStatementIPS, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
