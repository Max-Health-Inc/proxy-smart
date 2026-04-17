/** Resolved code from a ValueSet binding */
export type ResolvedCode = {
    code: string;
    system: string;
    display?: string;
};
/** Code resolver function type - looks up a random code by ValueSet URL */
export type CodeResolver = (valueSetUrl: string) => ResolvedCode | undefined;
/**
 * Centralized enrichment function used by all generated random() methods.
 */
export declare function enrichResource(base: Record<string, unknown>, baseResource: string, profileUrl: string, fieldPatterns: Record<string, unknown>, forbiddenFields?: string[], valueSetBindings?: Record<string, string>, codeResolver?: CodeResolver, fieldOrder?: string[]): void;
