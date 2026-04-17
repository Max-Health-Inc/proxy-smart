import { Device, Identifier } from "fhir/r4";
export interface DeviceObserverUvIps extends Omit<Device, 'identifier'> {
    /** Must Support */
    identifier?: Identifier[];
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateDeviceObserverUvIps(resource: DeviceObserverUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
