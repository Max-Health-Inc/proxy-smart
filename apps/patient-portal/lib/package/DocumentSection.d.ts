export interface DocumentSection {
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateDocumentSection(resource: DocumentSection, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
