import { createEnrichContext } from './enrichContext.js';
import { enrichCoreHandlers } from './enrichHandlersCore.js';
import { enrichExtendedHandlers } from './enrichHandlersExt.js';
import { enrichFixers } from './enrichFixers.js';
/**
 * Centralized enrichment function used by all generated random() methods.
 */
export function enrichResource(base, baseResource, profileUrl, fieldPatterns, forbiddenFields = [], valueSetBindings = {}, codeResolver, fieldOrder = []) {
    try {
        const ctx = createEnrichContext(base, baseResource, profileUrl, fieldPatterns, forbiddenFields, valueSetBindings, codeResolver, fieldOrder);
        enrichCoreHandlers(ctx);
        enrichExtendedHandlers(ctx);
        enrichFixers(ctx);
    }
    catch { /* enrichment is best-effort */ }
}
