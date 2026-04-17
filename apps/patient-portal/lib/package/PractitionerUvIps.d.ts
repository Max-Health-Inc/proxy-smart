import { Address, ContactPoint, HumanName, Practitioner } from "fhir/r4";
export interface PractitionerUvIps extends Omit<Practitioner, 'name' | 'telecom' | 'address'> {
    /** Must Support */
    name: HumanName[];
    /** Must Support */
    telecom?: ContactPoint[];
    /** Must Support */
    address?: Address[];
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validatePractitionerUvIps(resource: PractitionerUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
