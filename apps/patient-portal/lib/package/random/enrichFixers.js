import { randomUUID } from './randomUtilities.js';
/** Post-processing fixers: URI, extension, reordering, forbidden field cleanup */
export function enrichFixers(ctx) {
    // Generic identifier URI fix: when system is 'urn:ietf:rfc:3986', value must be a valid URI
    const fixIdentifierURIs = (obj) => {
        if (!obj || typeof obj !== 'object')
            return;
        if (Array.isArray(obj)) {
            obj.forEach(fixIdentifierURIs);
            return;
        }
        const rec = obj;
        if (rec.system === 'urn:ietf:rfc:3986' && typeof rec.value === 'string' && !/^(urn:|https?:\/\/)/.test(rec.value)) {
            rec.value = 'urn:uuid:' + randomUUID();
        }
        for (const val of Object.values(rec)) {
            if (val && typeof val === 'object')
                fixIdentifierURIs(val);
        }
    };
    fixIdentifierURIs(ctx.base);
    // Generic extension value fix: simple extensions must have value[x], not nested extensions
    // ext-1: "Must have either extensions or value[x], not both"
    // Only applies to objects within 'extension' arrays, not every object with 'url'
    const fixExtensionValues = (obj, isInExtensionArray) => {
        if (!obj || typeof obj !== 'object')
            return;
        if (Array.isArray(obj)) {
            obj.forEach(item => fixExtensionValues(item, isInExtensionArray));
            return;
        }
        const rec = obj;
        // Only fix objects that are inside an extension array and have a url property
        if (isInExtensionArray && 'url' in rec && typeof rec.url === 'string') {
            const hasValue = Object.keys(rec).some(k => k.startsWith('value'));
            const hasNestedExt = 'extension' in rec && Array.isArray(rec.extension) && rec.extension.length > 0;
            if (hasNestedExt && hasValue) {
                // ext-1 violation: has both extension and value — remove nested extensions
                delete rec.extension;
            }
            else if (!hasValue && !hasNestedExt) {
                // Simple extension with no value — infer type from URL pattern
                const extUrl = rec.url;
                if (/recorded|date|time|when|period|instant/i.test(extUrl) && !/code|concept|status/i.test(extUrl)) {
                    rec.valueDateTime = new Date().toISOString();
                }
                else if (/boolean|indicator|flag/i.test(extUrl) && !/code|concept/i.test(extUrl)) {
                    rec.valueBoolean = true;
                }
                else {
                    rec.valueCodeableConcept = { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/data-absent-reason', code: 'unknown', display: 'Unknown' }] };
                }
            }
        }
        // Recurse: mark children of 'extension' arrays
        for (const [key, val] of Object.entries(rec)) {
            if (val && typeof val === 'object') {
                fixExtensionValues(val, key === 'extension' || key === 'modifierExtension');
            }
        }
    };
    fixExtensionValues(ctx.base, false);
    // Fix integer-typed extensions: paLineNumber and similar must use valueInteger
    const fixIntegerTypedExtensions = (obj) => {
        if (!obj || typeof obj !== 'object')
            return;
        if (Array.isArray(obj)) {
            obj.forEach(fixIntegerTypedExtensions);
            return;
        }
        const rec = obj;
        if ('url' in rec && typeof rec.url === 'string' && /lineNumber|integer|count|sequence/i.test(rec.url)) {
            // Replace any non-integer value with valueInteger
            for (const k of Object.keys(rec)) {
                if (k.startsWith('value') && k !== 'valueInteger') {
                    delete rec[k];
                }
            }
            if (!('valueInteger' in rec))
                rec.valueInteger = 1;
        }
        for (const val of Object.values(rec)) {
            if (val && typeof val === 'object')
                fixIntegerTypedExtensions(val);
        }
    };
    fixIntegerTypedExtensions(ctx.base);
    // Reorder fields to match FHIR element ordering.
    // FHIR ctx.base Resource/DomainResource fields always come first, then domain-specific fields
    // in the order defined by the StructureDefinition (passed via ctx.fieldOrder).
    // Firely (and HL7) validators enforce this ordering.
    const fhirBaseFieldOrder = [
        'resourceType', 'id', 'meta', 'implicitRules', 'language',
        'text', 'contained', 'extension', 'modifierExtension'
    ];
    const reordered = {};
    // 1. Add ctx.base FHIR fields in canonical order
    for (const key of fhirBaseFieldOrder) {
        if (key in ctx.base) {
            reordered[key] = ctx.base[key];
            delete ctx.base[key];
        }
    }
    // 2. If ctx.fieldOrder is provided, add domain-specific fields in SD element order
    if (ctx.fieldOrder.length > 0) {
        for (const key of ctx.fieldOrder) {
            if (key in ctx.base) {
                reordered[key] = ctx.base[key];
                delete ctx.base[key];
            }
        }
    }
    // 3. Copy any remaining fields not covered by either ordering
    for (const key of Object.keys(ctx.base)) {
        reordered[key] = ctx.base[key];
    }
    // Overwrite ctx.base in-place
    for (const key of Object.keys(ctx.base)) {
        delete ctx.base[key];
    }
    Object.assign(ctx.base, reordered);
    // Reorder CodeableConcept child fields: FHIR requires 'coding' before 'text'.
    // Firely and HL7 validators both enforce this element ordering within CodeableConcept.
    // Recursively walks the entire object tree to fix nested CodeableConcepts.
    const reorderCodeableConcept = (obj) => {
        if ('coding' in obj && 'text' in obj) {
            const keys = Object.keys(obj);
            const codingIdx = keys.indexOf('coding');
            const textIdx = keys.indexOf('text');
            if (textIdx < codingIdx) {
                // text appears before coding — rebuild with correct order
                const entries = Object.entries(obj);
                for (const k of keys)
                    delete obj[k];
                // coding first, then everything else preserving order
                const codingEntry = entries.find(([k]) => k === 'coding');
                const rest = entries.filter(([k]) => k !== 'coding');
                obj[codingEntry[0]] = codingEntry[1];
                for (const [k, v] of rest)
                    obj[k] = v;
            }
        }
        // Recurse into child objects and arrays
        for (const val of Object.values(obj)) {
            if (val && typeof val === 'object' && !Array.isArray(val)) {
                reorderCodeableConcept(val);
            }
            else if (Array.isArray(val)) {
                for (const item of val) {
                    if (item && typeof item === 'object' && !Array.isArray(item)) {
                        reorderCodeableConcept(item);
                    }
                }
            }
        }
    };
    reorderCodeableConcept(ctx.base);
    // Final cleanup: remove any forbidden fields (max=0 in profile) that may have been
    // set by the constructor's requiredInits from the ctx.base resource type.
    // This handles cases like value[x] being required in Observation but forbidden (max=0)
    // in genomics-reporting profiles where value is carried by components instead.
    for (const field of ctx.forbiddenFields) {
        // Handle nested forbidden fields (e.g., 'valueQuantity.comparator' → delete ctx.base.valueQuantity.comparator)
        if (field.includes('.')) {
            const parts = field.split('.');
            let target = ctx.base;
            for (let i = 0; i < parts.length - 1; i++) {
                const nested = target[parts[i]];
                if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
                    target = nested;
                }
                else {
                    target = undefined;
                    break;
                }
            }
            if (target) {
                delete target[parts[parts.length - 1]];
            }
            continue;
        }
        // Handle both exact field names and choice-type variants (e.g., 'value[x]' → valueString, valueQuantity, etc.)
        if (field.endsWith('[x]')) {
            const prefix = field.slice(0, -3);
            for (const key of Object.keys(ctx.base)) {
                if (key.startsWith(prefix) && key !== prefix) {
                    delete ctx.base[key];
                }
            }
        }
        else {
            delete ctx.base[field];
        }
    }
}
