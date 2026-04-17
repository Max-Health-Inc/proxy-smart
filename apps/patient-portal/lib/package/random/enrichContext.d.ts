/** Shared context passed to all enrich resource handlers and fixers. */
export interface EnrichContext {
    base: Record<string, unknown>;
    baseResource: string;
    profileUrl: string;
    fieldPatterns: Record<string, unknown>;
    forbiddenFields: string[];
    valueSetBindings: Record<string, string>;
    codeResolver?: (valueSetUrl: string) => {
        code: string;
        system: string;
        display?: string;
    } | undefined;
    fieldOrder: string[];
    isForbidden: (fieldName: string) => boolean;
    resolveBindingCode: (fieldName: string, fallbackSystem?: string, fallbackCode?: string, fallbackDisplay?: string) => {
        coding: Array<{
            system: string;
            code: string;
            display?: string;
        }>;
        text?: string;
    } | undefined;
    resolveBindingCodePrimitive: (fieldName: string, fallbackCode?: string) => string | undefined;
    getPatternValue: (fieldName: string) => unknown | undefined;
    getRawCodeableConceptPattern: (fieldName: string) => {
        coding?: Array<Record<string, unknown>>;
    } | undefined;
    mergeCodingPatterns: (existingCodings: Array<Record<string, unknown>>, patternCodings: Array<Record<string, unknown>>) => void;
    getCompleteCodePatternValue: (fieldName: string) => unknown | undefined;
    getPrimitivePattern: (nestedPath: string) => string | number | boolean | undefined;
    applyNestedPatterns: (targetField: string, target: Record<string, unknown>) => void;
    getRefRequirements: (fieldName: string) => Record<string, boolean> | undefined;
}
/** Build an EnrichContext from the enrichResource parameters. */
export declare function createEnrichContext(base: Record<string, unknown>, baseResource: string, profileUrl: string, fieldPatterns: Record<string, unknown>, forbiddenFields: string[], valueSetBindings: Record<string, string>, codeResolver: ((valueSetUrl: string) => {
    code: string;
    system: string;
    display?: string;
} | undefined) | undefined, fieldOrder: string[]): EnrichContext;
