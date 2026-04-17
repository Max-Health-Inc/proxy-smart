import { CodeableConceptIPS } from "./CodeableConceptIPS";
import { Device } from "fhir/r4";
export interface DeviceUvIps extends Omit<Device, 'type'> {
    /** Must Support */
    type?: CodeableConceptIPS;
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateDeviceUvIps(resource: DeviceUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
