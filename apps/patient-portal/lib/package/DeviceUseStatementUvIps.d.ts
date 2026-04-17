import { DeviceUseStatement, Reference } from "fhir/r4";
export interface DeviceUseStatementUvIps extends Omit<DeviceUseStatement, 'subject' | 'device'> {
    /** Must Support */
    subject: Reference;
    /** Must Support */
    device: Reference;
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateDeviceUseStatementUvIps(resource: DeviceUseStatementUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
