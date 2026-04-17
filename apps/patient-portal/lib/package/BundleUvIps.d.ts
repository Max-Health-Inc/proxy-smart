import { Bundle, BundleEntry, Identifier } from "fhir/r4";
export interface BundleUvIps extends Omit<Bundle, 'identifier' | 'type' | 'entry'> {
    /** Must Support */
    identifier: Identifier;
    type: "document";
    entry: BundleEntry[];
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateBundleUvIps(resource: BundleUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
