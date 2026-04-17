import { CodeableConceptIPS } from "./CodeableConceptIPS";
import { DiagnosticReport, Reference } from "fhir/r4";
export interface DiagnosticReportUvIps extends Omit<DiagnosticReport, 'code' | 'subject' | 'performer'> {
    /** Must Support */
    code: CodeableConceptIPS;
    /** Must Support */
    subject: Reference;
    /** Must Support */
    performer?: Reference[];
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateDiagnosticReportUvIps(resource: DiagnosticReportUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
