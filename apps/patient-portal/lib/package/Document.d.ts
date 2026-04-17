export interface Document {
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateDocument(resource: Document, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
