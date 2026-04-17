import { Address, ContactPoint, Organization } from "fhir/r4";
export interface OrganizationUvIps extends Omit<Organization, 'telecom' | 'address'> {
    /** Must Support */
    telecom?: ContactPoint[];
    /** Must Support */
    address?: Address[];
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateOrganizationUvIps(resource: OrganizationUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
