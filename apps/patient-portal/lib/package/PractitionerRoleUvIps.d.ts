import { PractitionerRole, Reference } from "fhir/r4";
export interface PractitionerRoleUvIps extends Omit<PractitionerRole, 'organization'> {
    /** Must Support */
    organization?: Reference;
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validatePractitionerRoleUvIps(resource: PractitionerRoleUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
