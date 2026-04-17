/** Build an EnrichContext from the enrichResource parameters. */
export function createEnrichContext(base, baseResource, profileUrl, fieldPatterns, forbiddenFields, valueSetBindings, codeResolver, fieldOrder) {
    const isForbidden = (fieldName) => forbiddenFields.includes(fieldName);
    const resolveBindingCode = (fieldName, fallbackSystem, fallbackCode, fallbackDisplay) => {
        const bindingUrl = valueSetBindings[fieldName];
        if (bindingUrl && codeResolver) {
            const resolved = codeResolver(bindingUrl);
            if (resolved) {
                return {
                    coding: [{ system: resolved.system, code: resolved.code, display: resolved.display }],
                    text: resolved.display || resolved.code
                };
            }
        }
        if (fallbackSystem && fallbackCode) {
            return {
                coding: [{ system: fallbackSystem, code: fallbackCode, display: fallbackDisplay }],
                text: fallbackDisplay || fallbackCode
            };
        }
        return undefined;
    };
    const resolveBindingCodePrimitive = (fieldName, fallbackCode) => {
        const bindingUrl = valueSetBindings[fieldName];
        if (bindingUrl && codeResolver) {
            const resolved = codeResolver(bindingUrl);
            if (resolved)
                return resolved.code;
        }
        return fallbackCode;
    };
    const getPatternValue = (fieldName) => {
        if (!fieldPatterns || Object.keys(fieldPatterns).length === 0 || !(fieldName in fieldPatterns))
            return undefined;
        const pattern = fieldPatterns[fieldName];
        if (!pattern || typeof pattern !== 'object')
            return undefined;
        const obj = pattern;
        if ('coding' in obj && Array.isArray(obj.coding) && obj.coding.length > 0) {
            const complete = obj.coding
                .filter(c => c.system && c.code)
                .map(c => ({ ...c }));
            return complete.length > 0 ? { coding: complete } : undefined;
        }
        return undefined;
    };
    const getRawCodeableConceptPattern = (fieldName) => {
        if (!fieldPatterns || Object.keys(fieldPatterns).length === 0 || !(fieldName in fieldPatterns))
            return undefined;
        const pattern = fieldPatterns[fieldName];
        if (!pattern || typeof pattern !== 'object')
            return undefined;
        const obj = pattern;
        if ('coding' in obj && Array.isArray(obj.coding) && obj.coding.length > 0) {
            return { coding: obj.coding };
        }
        return undefined;
    };
    const mergeCodingPatterns = (existingCodings, patternCodings) => {
        const patternBySystem = new Map();
        for (const patternCoding of patternCodings) {
            patternBySystem.set(patternCoding.system, patternCoding);
        }
        for (const existing of existingCodings) {
            const patternCoding = patternBySystem.get(existing.system);
            if (patternCoding) {
                for (const [key, value] of Object.entries(patternCoding)) {
                    if (key !== 'system' && !(key in existing)) {
                        existing[key] = value;
                    }
                }
            }
        }
    };
    const getCompleteCodePatternValue = (fieldName) => {
        if (!fieldPatterns || Object.keys(fieldPatterns).length === 0 || !(fieldName in fieldPatterns))
            return undefined;
        const pattern = fieldPatterns[fieldName];
        if (!pattern || typeof pattern !== 'object')
            return undefined;
        const obj = pattern;
        if ('coding' in obj && Array.isArray(obj.coding) && obj.coding.length > 0) {
            const firstCoding = obj.coding[0];
            if (firstCoding && 'system' in firstCoding && 'code' in firstCoding) {
                return { coding: obj.coding };
            }
        }
        return undefined;
    };
    const getPrimitivePattern = (nestedPath) => {
        if (!fieldPatterns || !(nestedPath in fieldPatterns))
            return undefined;
        const value = fieldPatterns[nestedPath];
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
            return value;
        return undefined;
    };
    const applyNestedPatterns = (targetField, target) => {
        if (!fieldPatterns)
            return;
        for (const key of Object.keys(fieldPatterns)) {
            if (key.startsWith(targetField + '.')) {
                const nestedKey = key.slice(targetField.length + 1);
                const patternValue = fieldPatterns[key];
                if (typeof patternValue === 'string' || typeof patternValue === 'number' || typeof patternValue === 'boolean') {
                    target[nestedKey] = patternValue;
                }
            }
        }
    };
    const getRefRequirements = (fieldName) => {
        if (!fieldPatterns)
            return undefined;
        const reqKey = '_refReq_' + fieldName;
        const reqs = fieldPatterns[reqKey];
        if (reqs && typeof reqs === 'object' && !Array.isArray(reqs)) {
            return reqs;
        }
        return undefined;
    };
    return {
        base, baseResource, profileUrl, fieldPatterns, forbiddenFields,
        valueSetBindings, codeResolver, fieldOrder,
        isForbidden, resolveBindingCode, resolveBindingCodePrimitive,
        getPatternValue, getRawCodeableConceptPattern, mergeCodingPatterns,
        getCompleteCodePatternValue, getPrimitivePattern, applyNestedPatterns,
        getRefRequirements,
    };
}
