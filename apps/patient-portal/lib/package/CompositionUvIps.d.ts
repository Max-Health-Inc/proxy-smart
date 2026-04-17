import { Note } from "./Note";
import { CodeableConcept, Coding, Composition, CompositionAttester, CompositionSection, Extension, Identifier, Narrative, Reference } from "fhir/r4";
export interface CompositionUvIpsTypeCoding extends Omit<Coding, 'system' | 'code'> {
    system: "http://loinc.org";
    code: "60591-5";
}
export interface CompositionUvIpsSection extends Omit<CompositionSection, 'code' | 'text' | 'extension'> {
    /** Must Support */
    code: CodeableConcept;
    /** Must Support */
    text: Narrative;
    extension?: (Extension | Note | Note | Note | Note | Note | Note | Note | Note | Note | Note | Note | Note | Note | Note | Note | Note | Note)[];
}
export interface CompositionUvIps extends Omit<Composition, 'text' | 'identifier' | 'type' | 'subject' | 'author' | 'attester' | 'custodian' | 'section'> {
    /** Must Support */
    text?: Narrative;
    /** Must Support */
    identifier?: Identifier;
    type: {
        coding: CompositionUvIpsTypeCoding[];
    };
    /** Must Support */
    subject: Reference;
    /** Must Support */
    author: Reference[];
    /** Must Support */
    attester?: CompositionAttester[];
    /** Must Support */
    custodian?: Reference;
    /** Must Support */
    section: CompositionUvIpsSection[];
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validateCompositionUvIps(resource: CompositionUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;
