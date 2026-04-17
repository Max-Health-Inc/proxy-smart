import { Document } from "./Document";
import { DocumentSection } from "./DocumentSection";
export interface IPSSectionsLM extends Document {
    sectionProblems: DocumentSection;
    sectionAllergies: DocumentSection;
    sectionMedications: DocumentSection;
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateIPSSectionsLM(resource: IPSSectionsLM, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
