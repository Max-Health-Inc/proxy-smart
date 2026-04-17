import { randomId, randomUUID } from './randomUtilities.js';
import { enrichResource } from './enrichResource.js';
/** Core resource handlers: generic passes + Patient, Condition, Observation, etc. */
export function enrichCoreHandlers(ctx) {
    // ── Generic enrichment pass ─────────────────────────────────────────────
    // Resolve primitive code fields (status, intent) from ValueSet bindings
    // BEFORE resource-specific blocks. CodeableConcept fields are NOT resolved
    // generically because the enrichment function doesn't have type metadata
    // to distinguish code vs CodeableConcept vs array fields.
    // ── Apply fixed primitive patterns from the profile ────────────────────
    // When a profile fixes a primitive field (e.g., status: 'active'), honour it
    // before any generic enrichment or ValueSet resolution can override it.
    const statusFixedPattern = ctx.getPrimitivePattern('status');
    if (statusFixedPattern !== undefined) {
        ctx.base.status = statusFixedPattern;
    }
    // Generic status resolution via ValueSet binding
    // Also override generic default 'active' when it's not valid for this resource's ValueSet
    // Skip when status was already set by a fixed pattern above.
    if (statusFixedPattern === undefined && !ctx.isForbidden('status')) {
        const resolved = ctx.resolveBindingCodePrimitive('status');
        if (resolved) {
            if (!('status' in ctx.base)) {
                ctx.base.status = resolved;
            }
            else if (ctx.base.status === 'active' && resolved !== 'active') {
                // Generic 'active' default may not be valid for all resource types (e.g., ChargeItem)
                ctx.base.status = resolved;
            }
        }
    }
    // Generic intent resolution via ValueSet binding
    if (!ctx.isForbidden('intent') && !('intent' in ctx.base)) {
        const resolved = ctx.resolveBindingCodePrimitive('intent');
        if (resolved)
            ctx.base.intent = resolved;
    }
    // Generic meta.lastUpdated — many profiles require it (NDH, SMART, etc.)
    // Adding it to all resources is safe since it's always a valid optional field.
    // For resource profiles, ensureProfile() already sets meta.profile before this runs.
    if ('meta' in ctx.base && typeof ctx.base.meta === 'object' && ctx.base.meta !== null) {
        const metaObj = ctx.base.meta;
        if (!('lastUpdated' in metaObj)) {
            metaObj.lastUpdated = new Date().toISOString();
        }
    }
    // Extension profiles with required sub-extensions (e.g., Translation, USCoreRace)
    // Sub-extension URLs are identified by "*.url" primitive patterns in ctx.fieldPatterns
    if (/Extension/i.test(ctx.baseResource) && !ctx.isForbidden('extension') && !('extension' in ctx.base)) {
        const subExtUrls = [];
        if (ctx.fieldPatterns) {
            for (const key of Object.keys(ctx.fieldPatterns)) {
                if (key.endsWith('.url') && !key.startsWith('_') && typeof ctx.fieldPatterns[key] === 'string') {
                    subExtUrls.push(ctx.fieldPatterns[key]);
                }
            }
        }
        if (subExtUrls.length > 0) {
            ctx.base.extension = subExtUrls.map(u => ({ url: u, valueString: randomId() }));
        }
    }
    // Identifier-like profile
    if (/Identifier/i.test(ctx.baseResource)) {
        if (!ctx.isForbidden('system') && !('system' in ctx.base))
            ctx.base.system = 'urn:ietf:rfc:3986';
        if (!ctx.isForbidden('value') && !('value' in ctx.base))
            ctx.base.value = 'urn:uuid:' + randomUUID();
        if (!ctx.isForbidden('type') && !('type' in ctx.base)) {
            const typePattern = ctx.getPatternValue('type');
            ctx.base.type = typePattern || { text: 'Primary Identifier' };
        }
    }
    // Patient / Practitioner
    if (/Patient|Practitioner/i.test(ctx.baseResource)) {
        if (!ctx.isForbidden('identifier') && !('identifier' in ctx.base))
            ctx.base.identifier = [{ system: 'urn:ietf:rfc:3986', value: 'urn:uuid:' + randomUUID() }];
        // Ensure identifier is always an array (FHIR 0..*)
        if ('identifier' in ctx.base && !Array.isArray(ctx.base.identifier) && typeof ctx.base.identifier === 'object' && ctx.base.identifier !== null) {
            ctx.base.identifier = [ctx.base.identifier];
        }
        if (!ctx.isForbidden('name') && !('name' in ctx.base))
            ctx.base.name = [{ family: randomId(), given: [randomId()] }];
        if (!ctx.isForbidden('gender') && !('gender' in ctx.base))
            ctx.base.gender = 'unknown';
        if (!ctx.isForbidden('birthDate') && !('birthDate' in ctx.base))
            ctx.base.birthDate = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
        if (!ctx.isForbidden('address') && !('address' in ctx.base))
            ctx.base.address = [{ city: 'Example City', postalCode: '12345', country: 'XX' }];
    }
    // Condition
    if (/Condition/i.test(ctx.baseResource)) {
        // For code field: ADD missing pattern codings to existing codings
        // Never remove existing codings - classGenerator's random() already includes required slice codings
        // We only add any pattern codings that might be missing (by system+code pair)
        const patternCode = ctx.getCompleteCodePatternValue('code');
        if (!ctx.isForbidden('code')) {
            if (patternCode && 'code' in ctx.base && ctx.base.code && typeof ctx.base.code === 'object') {
                const existingCode = ctx.base.code;
                const patternCodeObj = patternCode;
                if (existingCode.coding && patternCodeObj.coding) {
                    // Build a set of existing coding keys (system|code pairs)
                    const existingCodingKeys = new Set();
                    for (const existing of existingCode.coding) {
                        const key = String(existing.system || '') + '|' + String(existing.code || '');
                        existingCodingKeys.add(key);
                    }
                    // Only ADD pattern codings that aren't already present (by system+code)
                    for (const patternCoding of patternCodeObj.coding) {
                        const key = String(patternCoding.system || '') + '|' + String(patternCoding.code || '');
                        if (!existingCodingKeys.has(key)) {
                            existingCode.coding.push(patternCoding);
                            existingCodingKeys.add(key);
                        }
                    }
                }
                else if (!existingCode.coding && patternCodeObj.coding) {
                    existingCode.coding = patternCodeObj.coding;
                }
            }
            else if (patternCode) {
                ctx.base.code = patternCode;
            }
            else if (!('code' in ctx.base)) {
                // Try to resolve from ValueSet binding first, fall back to hardcoded default
                const resolved = ctx.resolveBindingCode('code', 'http://snomed.info/sct', '64572001', 'Condition');
                ctx.base.code = resolved || { coding: [{ system: 'http://snomed.info/sct', code: '64572001', display: 'Condition' }], text: 'Example condition' };
            }
            // Also merge in pattern fields (like version) that don't require a complete pattern (system+code)
            // This handles cases where the pattern specifies additional fields like version for ICD-10-GM coding profiles
            const rawPattern = ctx.getRawCodeableConceptPattern('code');
            if (rawPattern?.coding && 'code' in ctx.base && ctx.base.code && typeof ctx.base.code === 'object') {
                const existingCode = ctx.base.code;
                if (existingCode.coding) {
                    ctx.mergeCodingPatterns(existingCode.coding, rawPattern.coding);
                }
            }
        }
        if (!ctx.isForbidden('clinicalStatus') && !('clinicalStatus' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('clinicalStatus', 'http://terminology.hl7.org/CodeSystem/condition-clinical', 'active');
            ctx.base.clinicalStatus = resolved || { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] };
        }
        if (!ctx.isForbidden('verificationStatus') && !('verificationStatus' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('verificationStatus', 'http://terminology.hl7.org/CodeSystem/condition-ver-status', 'confirmed');
            ctx.base.verificationStatus = resolved || { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }] };
        }
        // con-5: clinicalStatus SHALL NOT be present if verificationStatus is entered-in-error
        if ('verificationStatus' in ctx.base && 'clinicalStatus' in ctx.base) {
            const vs = ctx.base.verificationStatus;
            if (vs?.coding?.some(c => c.code === 'entered-in-error')) {
                delete ctx.base.clinicalStatus;
            }
        }
        if (!ctx.isForbidden('subject') && !('subject' in ctx.base))
            ctx.base.subject = { reference: 'Patient/' + randomId() };
        // If code is present and encounter is required (via _refReq_encounter), add encounter
        // This is needed for constraints like ISiK's isik-con1 ("wenn code vorhanden, dann encounter")
        if ('code' in ctx.base && ctx.getRefRequirements('encounter') && !('encounter' in ctx.base)) {
            ctx.base.encounter = { reference: 'Encounter/' + randomId() };
        }
        // Merge pattern category into existing array — split multi-coding patterns into separate
        // elements so each slice gets its own array element (prevents 'matches multiple slices')
        const patternCategory = ctx.getPatternValue('category');
        if (patternCategory) {
            const patternObj = patternCategory;
            const sliceElements = [];
            if (patternObj.coding && patternObj.coding.length > 1) {
                for (const c of patternObj.coding) {
                    sliceElements.push({ coding: [c] });
                }
            }
            else {
                sliceElements.push(patternCategory);
            }
            if (Array.isArray(ctx.base.category) && ctx.base.category.length > 0) {
                const existingCodingKeys = new Set();
                for (const cat of ctx.base.category) {
                    for (const c of cat.coding || []) {
                        existingCodingKeys.add(String(c.system || '') + '|' + String(c.code || ''));
                    }
                }
                for (const sliceEl of sliceElements) {
                    const sliceKey = String(sliceEl.coding?.[0]?.system || '') + '|' + String(sliceEl.coding?.[0]?.code || '');
                    if (!existingCodingKeys.has(sliceKey)) {
                        ctx.base.category.push(sliceEl);
                        existingCodingKeys.add(sliceKey);
                    }
                }
            }
            else {
                ctx.base.category = sliceElements;
            }
        }
        else if (!('category' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('category', 'http://terminology.hl7.org/CodeSystem/condition-category', 'encounter-diagnosis');
            ctx.base.category = [resolved || { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis' }] }];
        }
    }
    // Observation
    if (/Observation/i.test(ctx.baseResource)) {
        if (!('status' in ctx.base))
            ctx.base.status = 'final';
        // For code field: ADD missing pattern codings to existing codings
        // Never remove existing codings - classGenerator's random() already includes required slice codings
        // We only add any pattern codings that might be missing (by system+code pair)
        const patternCode = ctx.getCompleteCodePatternValue('code');
        if (patternCode && 'code' in ctx.base && ctx.base.code && typeof ctx.base.code === 'object') {
            const existingCode = ctx.base.code;
            const patternCodeObj = patternCode;
            if (existingCode.coding && patternCodeObj.coding) {
                // Build a set of existing coding keys (system|code pairs)
                const existingCodingKeys = new Set();
                for (const existing of existingCode.coding) {
                    const key = String(existing.system || '') + '|' + String(existing.code || '');
                    existingCodingKeys.add(key);
                }
                // Merge pattern codings: add missing ones, and replace existing codings
                // from the same system when pattern specifies a required code (e.g., LOINC slice)
                for (const patternCoding of patternCodeObj.coding) {
                    const key = String(patternCoding.system || '') + '|' + String(patternCoding.code || '');
                    if (!existingCodingKeys.has(key)) {
                        // Check if there's an existing coding from the same system with a different code
                        // (from resolveSliceCode random selection). If so, replace it with the required pattern code.
                        const sameSystemIdx = patternCoding.code ? existingCode.coding.findIndex(c => c.system === patternCoding.system && c.code !== patternCoding.code) : -1;
                        if (sameSystemIdx >= 0) {
                            // Remove stale display from the random coding when the pattern
                            // overrides the code but doesn't specify its own display.
                            if (!('display' in patternCoding)) {
                                delete existingCode.coding[sameSystemIdx].display;
                            }
                            existingCode.coding[sameSystemIdx] = { ...existingCode.coding[sameSystemIdx], ...patternCoding };
                        }
                        else {
                            existingCode.coding.push(patternCoding);
                        }
                        existingCodingKeys.add(key);
                    }
                }
            }
            else if (!existingCode.coding && patternCodeObj.coding) {
                existingCode.coding = patternCodeObj.coding;
            }
        }
        else if (patternCode) {
            ctx.base.code = patternCode;
        }
        else if (!('code' in ctx.base)) {
            // Try to resolve from ValueSet binding first, fall back to hardcoded default
            const resolved = ctx.resolveBindingCode('code', 'http://loinc.org', '8867-4', 'Heart rate');
            ctx.base.code = resolved || { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }], text: 'Heart rate' };
        }
        if (!('subject' in ctx.base))
            ctx.base.subject = { reference: 'Patient/' + randomId() };
        // Respect effective[x] type constraints from the profile
        const hasEffective = Object.keys(ctx.base).some(k => k.startsWith('effective'));
        if (!hasEffective) {
            const effectiveTypeConstraint = ctx.fieldPatterns['_choiceType_effective[x]'];
            const effectiveType = effectiveTypeConstraint && effectiveTypeConstraint.length === 1 ? effectiveTypeConstraint[0] : undefined;
            if (effectiveType === 'Period') {
                ctx.base.effectivePeriod = { start: new Date().toISOString() };
            }
            else {
                ctx.base.effectiveDateTime = new Date().toISOString();
            }
        }
        // Add performer if not present and no derivedFrom — satisfies SDOH-Obs-3 and similar constraints
        if (!('performer' in ctx.base) && !('derivedFrom' in ctx.base)) {
            ctx.base.performer = [{ reference: 'Practitioner/' + randomId() }];
        }
        // Merge pattern category into existing category array (don't replace — random() may have
        // set multiple required slice categories that must all be preserved)
        const patternCategory = ctx.getPatternValue('category');
        if (patternCategory) {
            // Split multi-coding patterns into separate elements: when a pattern has codings from
            // different systems (e.g., labCategory + geCategory), each is a separate slice and
            // should be its own array element. Merging them into one element causes HL7 to report
            // "matches more than one slice" and coding max=1 violations.
            const patternObj = patternCategory;
            const sliceElements = [];
            if (patternObj.coding && patternObj.coding.length > 1) {
                for (const c of patternObj.coding) {
                    sliceElements.push({ coding: [c] });
                }
            }
            else {
                sliceElements.push(patternCategory);
            }
            if (Array.isArray(ctx.base.category) && ctx.base.category.length > 0) {
                // Merge: add each slice element only if not already present (by system+code)
                const existingCodingKeys = new Set();
                for (const cat of ctx.base.category) {
                    for (const c of cat.coding || []) {
                        existingCodingKeys.add(String(c.system || '') + '|' + String(c.code || ''));
                    }
                }
                for (const sliceEl of sliceElements) {
                    const sliceKey = String(sliceEl.coding?.[0]?.system || '') + '|' + String(sliceEl.coding?.[0]?.code || '');
                    if (!existingCodingKeys.has(sliceKey)) {
                        ctx.base.category.push(sliceEl);
                        existingCodingKeys.add(sliceKey);
                    }
                }
            }
            else {
                ctx.base.category = sliceElements;
            }
        }
        else if (!('category' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('category', 'http://terminology.hl7.org/CodeSystem/observation-category', 'vital-signs');
            ctx.base.category = [resolved || { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }];
        }
        // Observations MUST have value[x], dataAbsentReason, component, or hasMember
        const hasValue = Object.keys(ctx.base).some(k => k.startsWith('value'));
        const hasComponent = 'component' in ctx.base;
        const hasHasMember = 'hasMember' in ctx.base;
        const hasDataAbsentReason = 'dataAbsentReason' in ctx.base;
        if (!hasValue && !hasComponent && !hasHasMember && !hasDataAbsentReason) {
            // When value[x] is forbidden (max=0), don't try to generate a value —
            // add dataAbsentReason instead. The fixers step would remove any generated
            // value[x] anyway, leaving the resource without value or dataAbsentReason.
            if (ctx.isForbidden('value[x]')) {
                ctx.base.dataAbsentReason = { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/data-absent-reason', code: 'unknown' }] };
            }
            else {
                // Check for patterns from the StructureDefinition for valueQuantity fields
                const codePattern = ctx.getPrimitivePattern('valueQuantity.code');
                const unitPattern = ctx.getPrimitivePattern('valueQuantity.unit');
                const systemPattern = ctx.getPrimitivePattern('valueQuantity.system');
                // Check if there are nested requirements for value[x] (indicates required binding)
                const valueReqs = ctx.getRefRequirements('value[x]');
                const codeRequired = valueReqs?.code;
                // Check if value[x] is constrained to specific types (e.g., only CodeableConcept, integer, boolean)
                const valueTypeConstraint = ctx.fieldPatterns['_choiceType_value[x]'];
                const constrainedType = valueTypeConstraint && valueTypeConstraint.length === 1 ? valueTypeConstraint[0] : undefined;
                if (constrainedType === 'CodeableConcept') {
                    const valuePattern = ctx.getPatternValue('valueCodeableConcept');
                    if (valuePattern) {
                        ctx.base.valueCodeableConcept = valuePattern;
                    }
                    else {
                        ctx.base.valueCodeableConcept = { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/data-absent-reason', code: 'unknown', display: 'Unknown' }], text: 'Unknown' };
                    }
                }
                else if (constrainedType === 'integer' || constrainedType === 'positiveInt' || constrainedType === 'unsignedInt') {
                    ctx.base.valueInteger = 0;
                }
                else if (constrainedType === 'boolean') {
                    ctx.base.valueBoolean = true;
                }
                else if (constrainedType === 'string' || constrainedType === 'markdown') {
                    ctx.base.valueString = 'Example value';
                }
                else if (constrainedType === 'Quantity') {
                    // Check value[x] pattern for UCUM code/system (profile-specific units)
                    const vxPattern = ctx.fieldPatterns['value[x]'];
                    const vxCode = vxPattern?.code || codePattern || '1';
                    const vxUnit = vxPattern?.unit || unitPattern || vxCode;
                    const vxSystem = vxPattern?.system || systemPattern || 'http://unitsofmeasure.org';
                    ctx.base.valueQuantity = { value: 72, unit: vxUnit, system: vxSystem, code: vxCode };
                }
                else if (constrainedType === 'Ratio') {
                    ctx.base.valueRatio = { numerator: { value: 1 }, denominator: { value: 1 } };
                }
                else if (constrainedType === 'dateTime' || constrainedType === 'instant') {
                    ctx.base.valueDateTime = new Date().toISOString();
                }
                else if (constrainedType === 'Period') {
                    ctx.base.valuePeriod = { start: new Date().toISOString() };
                }
                else if (constrainedType === 'Range') {
                    ctx.base.valueRange = { low: { value: 0 }, high: { value: 100 } };
                }
                else if (constrainedType) {
                    // For any other single-type constraint, use dataAbsentReason to avoid wrong type
                    ctx.base.dataAbsentReason = { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/data-absent-reason', code: 'unknown' }] };
                }
                else if (codeRequired && codePattern === undefined) {
                    // If code is required but we don't have a pattern, use dataAbsentReason instead
                    // This avoids required binding violations when we don't know the valid codes
                    ctx.base.dataAbsentReason = { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/data-absent-reason', code: 'unknown' }] };
                }
                else {
                    // Use patterns if available, otherwise derive UCUM unit from observation code
                    let defaultUnit = '1';
                    let defaultCode = '1';
                    if (unitPattern === undefined && codePattern === undefined) {
                        // Map well-known vital sign LOINC codes to correct UCUM units
                        const codeObj = ctx.base.code;
                        const loincCode = codeObj?.coding?.[0]?.code;
                        const vitalSignUnits = {
                            '8867-4': { unit: '/min', code: '/min', value: 72 }, // Heart rate
                            '9279-1': { unit: '/min', code: '/min', value: 16 }, // Respiratory rate
                            '8310-5': { unit: 'Cel', code: 'Cel', value: 37 }, // Body temperature
                            '29463-7': { unit: 'kg', code: 'kg', value: 70 }, // Body weight
                            '3141-9': { unit: 'kg', code: 'kg', value: 70 }, // Body weight Measured
                            '8302-2': { unit: 'cm', code: 'cm', value: 170 }, // Body height
                            '39156-5': { unit: 'kg/m2', code: 'kg/m2', value: 24 }, // BMI
                            '2708-6': { unit: '%', code: '%', value: 98 }, // Oxygen saturation
                            '59408-5': { unit: '%', code: '%', value: 97 }, // SpO2
                            '8480-6': { unit: 'mmHg', code: 'mm[Hg]', value: 120 }, // Systolic BP
                            '8462-4': { unit: 'mmHg', code: 'mm[Hg]', value: 80 }, // Diastolic BP
                        };
                        if (loincCode && vitalSignUnits[loincCode]) {
                            const vs = vitalSignUnits[loincCode];
                            defaultUnit = vs.unit;
                            defaultCode = vs.code;
                            ctx.base.valueQuantity = { value: vs.value, unit: vs.unit, system: 'http://unitsofmeasure.org', code: vs.code };
                        }
                        else {
                            ctx.base.valueQuantity = { value: 72, unit: defaultUnit, system: 'http://unitsofmeasure.org', code: defaultCode };
                        }
                    }
                    else {
                        ctx.base.valueQuantity = {
                            value: 72,
                            unit: unitPattern !== undefined ? unitPattern : defaultUnit,
                            system: systemPattern !== undefined ? systemPattern : 'http://unitsofmeasure.org',
                            code: codePattern !== undefined ? codePattern : defaultCode
                        };
                    }
                }
            } // end else (value[x] not forbidden)
        }
        // Apply nested primitive patterns to valueQuantity if present
        // These come from patternString/patternCode/patternUri on valueQuantity.unit, .code, .system
        if ('valueQuantity' in ctx.base && typeof ctx.base.valueQuantity === 'object' && ctx.base.valueQuantity !== null) {
            ctx.applyNestedPatterns('valueQuantity', ctx.base.valueQuantity);
        }
        // Ensure each component has a value or dataAbsentReason (vs-3 constraint)
        // This handles blood pressure and other vital signs with component slices
        if ('component' in ctx.base && Array.isArray(ctx.base.component)) {
            for (const comp of ctx.base.component) {
                const hasCompValue = Object.keys(comp).some(k => k.startsWith('value'));
                const hasCompDataAbsentReason = 'dataAbsentReason' in comp;
                if (!hasCompValue && !hasCompDataAbsentReason) {
                    // Add a generic valueQuantity - for blood pressure this will be overwritten
                    // by profile-specific logic if needed
                    comp.valueQuantity = { value: 120, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' };
                }
                // Correct UCUM units on existing component valueQuantity based on component LOINC code
                if ('valueQuantity' in comp && typeof comp.valueQuantity === 'object' && comp.valueQuantity !== null) {
                    const compCode = comp.code;
                    const compLoinc = compCode?.coding?.[0]?.code;
                    const compUnits = {
                        '8480-6': { unit: 'mmHg', code: 'mm[Hg]', value: 120 },
                        '8462-4': { unit: 'mmHg', code: 'mm[Hg]', value: 80 },
                        '8867-4': { unit: '/min', code: '/min', value: 72 },
                        '9279-1': { unit: '/min', code: '/min', value: 16 },
                        '2708-6': { unit: '%', code: '%', value: 98 },
                    };
                    if (compLoinc && compUnits[compLoinc]) {
                        const vs = compUnits[compLoinc];
                        const vq = comp.valueQuantity;
                        vq.value = vs.value;
                        vq.unit = vs.unit;
                        vq.code = vs.code;
                        vq.system = 'http://unitsofmeasure.org';
                    }
                }
            }
        }
    }
    // CarePlan
    if (/CarePlan/i.test(ctx.baseResource)) {
        if (!('status' in ctx.base))
            ctx.base.status = 'active';
        if (!('intent' in ctx.base))
            ctx.base.intent = 'order';
        if (!('subject' in ctx.base))
            ctx.base.subject = { reference: 'Patient/' + randomId() };
        // Merge pattern category into existing array — split multi-coding patterns into separate
        // elements so each slice gets its own array element (prevents 'matches multiple slices')
        const patternCategory = ctx.getPatternValue('category');
        if (patternCategory) {
            const patternObj = patternCategory;
            const sliceElements = [];
            if (patternObj.coding && patternObj.coding.length > 1) {
                for (const c of patternObj.coding) {
                    sliceElements.push({ coding: [c] });
                }
            }
            else {
                sliceElements.push(patternCategory);
            }
            if (Array.isArray(ctx.base.category) && ctx.base.category.length > 0) {
                const existingCodingKeys = new Set();
                for (const cat of ctx.base.category) {
                    for (const c of cat.coding || []) {
                        existingCodingKeys.add(String(c.system || '') + '|' + String(c.code || ''));
                    }
                }
                for (const sliceEl of sliceElements) {
                    const sliceKey = String(sliceEl.coding?.[0]?.system || '') + '|' + String(sliceEl.coding?.[0]?.code || '');
                    if (!existingCodingKeys.has(sliceKey)) {
                        ctx.base.category.push(sliceEl);
                        existingCodingKeys.add(sliceKey);
                    }
                }
            }
            else {
                ctx.base.category = sliceElements;
            }
        }
        else if (!('category' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('category', 'http://hl7.org/fhir/us/core/CodeSystem/careplan-category', 'assess-plan');
            ctx.base.category = [resolved || { coding: [{ system: 'http://hl7.org/fhir/us/core/CodeSystem/careplan-category', code: 'assess-plan' }] }];
        }
    }
    // Procedure
    if (/Procedure/i.test(ctx.baseResource)) {
        if (!('code' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('code', 'http://snomed.info/sct', '71388002', 'Procedure');
            ctx.base.code = resolved || { coding: [{ system: 'http://snomed.info/sct', code: '71388002', display: 'Procedure' }], text: 'Example procedure' };
        }
        if (!('status' in ctx.base))
            ctx.base.status = 'completed';
        if (!('subject' in ctx.base))
            ctx.base.subject = { reference: 'Patient/' + randomId() };
        if (!('performedDateTime' in ctx.base))
            ctx.base.performedDateTime = new Date().toISOString();
        if (!('category' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('category', 'http://snomed.info/sct', '387713003');
            ctx.base.category = resolved || { coding: [{ system: 'http://snomed.info/sct', code: '387713003' }] };
        }
    }
    // Encounter
    if (/Encounter/i.test(ctx.baseResource)) {
        // Force correct status - 'active' is NOT valid for Encounter.status
        // Use pattern value if the profile defines one (e.g., PAS requires 'planned')
        const encounterStatusPattern = ctx.getPrimitivePattern('status');
        ctx.base.status = encounterStatusPattern || 'finished';
        if (!('class' in ctx.base))
            ctx.base.class = { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP', display: 'inpatient encounter' };
        if (!('subject' in ctx.base))
            ctx.base.subject = { reference: 'Patient/' + randomId() };
        if (!('period' in ctx.base))
            ctx.base.period = { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() };
        if (!('type' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('type', 'http://terminology.hl7.org/CodeSystem/v3-ActCode', 'IMP');
            ctx.base.type = [resolved || { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP' }] }];
        }
        if (!('serviceProvider' in ctx.base))
            ctx.base.serviceProvider = { reference: 'Organization/' + randomId() };
    }
    // QuestionnaireResponse
    if (/QuestionnaireResponse/i.test(ctx.baseResource)) {
        // Force correct status - 'active' is NOT valid for QuestionnaireResponse.status
        ctx.base.status = 'completed';
        // questionnaire must be an absolute canonical URL, not a relative reference
        if (!('questionnaire' in ctx.base) || (typeof ctx.base.questionnaire === 'string' && !ctx.base.questionnaire.startsWith('http') && !ctx.base.questionnaire.startsWith('urn:'))) {
            ctx.base.questionnaire = 'urn:uuid:' + randomUUID();
        }
        if (!('subject' in ctx.base))
            ctx.base.subject = { reference: 'Patient/' + randomId() };
        if (!('authored' in ctx.base))
            ctx.base.authored = new Date().toISOString();
        if (!('author' in ctx.base))
            ctx.base.author = { reference: 'Practitioner/' + randomId() };
        if (!('item' in ctx.base))
            ctx.base.item = [{ linkId: '1', text: 'Example question', answer: [{ valueString: 'Example answer' }] }];
    }
    // Account
    if (/Account/i.test(ctx.baseResource)) {
        if (!('status' in ctx.base))
            ctx.base.status = 'active';
        if (!('type' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('type', 'http://terminology.hl7.org/CodeSystem/v3-ActCode', 'PBILLACCT');
            ctx.base.type = resolved || { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'PBILLACCT' }] };
        }
        if (!('identifier' in ctx.base))
            ctx.base.identifier = [{ system: 'urn:ietf:rfc:3986', value: 'urn:uuid:' + randomUUID() }];
        if (!('subject' in ctx.base))
            ctx.base.subject = [{ reference: 'Patient/' + randomId() }];
    }
    // Bundle
    if (/Bundle/i.test(ctx.baseResource)) {
        // Check for profile-specific type patterns (e.g., SMART user-access-brands-bundle requires 'collection')
        const typePattern = ctx.getPrimitivePattern('type');
        if (typePattern !== undefined) {
            ctx.base.type = typePattern;
        }
        else if (!('type' in ctx.base)) {
            ctx.base.type = 'document';
        }
        if (!('timestamp' in ctx.base))
            ctx.base.timestamp = new Date().toISOString();
        // Use proper UUIDs for identifier values (urn:uuid: requires valid UUID format)
        // Apply identifier.system pattern if available (e.g., CHCoreDocumentEPR requires urn:ietf:rfc:3986)
        const idSystemPattern = ctx.getPrimitivePattern('identifier.system');
        if (!('identifier' in ctx.base)) {
            const idSystem = (typeof idSystemPattern === 'string') ? idSystemPattern : 'urn:ietf:rfc:3986';
            ctx.base.identifier = { system: idSystem, value: 'urn:uuid:' + randomUUID() };
        }
        else if (typeof idSystemPattern === 'string' && typeof ctx.base.identifier === 'object' && ctx.base.identifier !== null) {
            ctx.base.identifier.system = idSystemPattern;
            // If system is urn:ietf:rfc:3986, value must be a valid URI
            if (idSystemPattern === 'urn:ietf:rfc:3986') {
                ctx.base.identifier.value = 'urn:uuid:' + randomUUID();
            }
        }
        // meta.lastUpdated is now handled generically above
        // Use proper UUIDs for fullUrl values
        // Only inject default Composition entry for document/message bundles that need one.
        // searchset/batch-response/transaction-response/history bundles should NOT get a default
        // Composition entry — these bundle types use closed slicing on entries with specific
        // resource types (e.g., List, DocumentReference) that are incompatible with Composition.
        const _bundleType = typeof ctx.base.type === 'string' ? ctx.base.type : '';
        if (!('entry' in ctx.base) && !['searchset', 'batch-response', 'transaction-response', 'history'].includes(_bundleType)) {
            ctx.base.entry = [{ fullUrl: 'urn:uuid:' + randomUUID(), resource: { resourceType: 'Composition', id: randomId(), status: 'final', type: { coding: [{ system: 'http://loinc.org', code: '60591-5' }] }, subject: { reference: 'Patient/' + randomId() }, date: new Date().toISOString(), author: [{ reference: 'Practitioner/' + randomId() }], title: 'Example Document', section: [{ title: 'Section', text: { status: 'generated', div: '<div xmlns="http://www.w3.org/1999/xhtml">Section content</div>' } }] } }];
        }
        // Fix existing entry fullUrls to use proper UUIDs and empty resources
        if (Array.isArray(ctx.base.entry)) {
            for (const entry of ctx.base.entry) {
                if (entry.fullUrl && entry.fullUrl.startsWith('urn:uuid:id-')) {
                    entry.fullUrl = 'urn:uuid:' + randomUUID();
                }
                // Fix empty resource objects — a resource must have at least a resourceType
                if (entry.resource && typeof entry.resource === 'object' && !('resourceType' in entry.resource)) {
                    entry.resource = { resourceType: 'Basic', id: randomId(), code: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/basic-resource-type', code: 'study' }] } };
                }
                // bdl-3/bdl-4: request/response handling per bundle type
                const bundleType = ctx.base.type;
                if (['collection', 'document', 'message', 'searchset'].includes(bundleType)) {
                    delete entry.request;
                    delete entry.response;
                }
                else if (['transaction', 'batch'].includes(bundleType)) {
                    // bdl-3: entry.request mandatory for batch/transaction
                    // bdl-3c: entries with POST/PUT/PATCH must also have a resource
                    delete entry.response;
                    const validHttpVerbs = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH'];
                    const hasResource = !!entry.resource;
                    const defaultMethod = hasResource ? 'POST' : 'GET';
                    if (!entry.request) {
                        entry.request = { method: defaultMethod, url: entry.resource?.resourceType || 'Resource' };
                    }
                    else {
                        const req = entry.request;
                        if (!req.method || !validHttpVerbs.includes(req.method))
                            req.method = defaultMethod;
                        // bdl-3c: if no resource, method must not be POST/PUT/PATCH
                        if (!hasResource && ['POST', 'PUT', 'PATCH'].includes(req.method))
                            req.method = 'GET';
                        if (!req.url)
                            req.url = entry.resource?.resourceType || 'Resource';
                    }
                }
                else if (['transaction-response', 'batch-response', 'history'].includes(bundleType)) {
                    // bdl-4: entry.response mandatory for batch-response/transaction-response/history
                    delete entry.request;
                    if (!entry.response) {
                        entry.response = { status: '200' };
                    }
                    else {
                        const resp = entry.response;
                        if (!resp.status)
                            resp.status = '200';
                    }
                }
            }
            // Recursively enrich each entry resource using the existing resource-type handlers.
            // This eliminates duplicated defaults (e.g., Claim, Patient, Practitioner) — each
            // entry resource gets the same enrichment as a top-level resource of that type.
            for (const entry of ctx.base.entry) {
                if (entry.resource && typeof entry.resource === 'object' && 'resourceType' in entry.resource) {
                    enrichResource(entry.resource, entry.resource.resourceType, '', {}, [], {}, ctx.codeResolver, []);
                }
            }
            // For document bundles: ensure referenced Patient/Practitioner are contained in the bundle
            // This satisfies constraints like ISiK-docBundle-1 ("All referenced Resources must be contained")
            if (ctx.base.type === 'document') {
                const entries = ctx.base.entry;
                const existingTypes = new Set(entries.map(e => e.resource?.resourceType).filter(Boolean));
                // Collect references from the Composition entry
                const comp = entries.find(e => e.resource?.resourceType === 'Composition');
                if (comp?.resource) {
                    // Ensure sections have code to prevent wrong slice matching
                    if (Array.isArray(comp.resource.section)) {
                        for (const section of comp.resource.section) {
                            if (!('code' in section)) {
                                section.code = { coding: [{ system: 'http://loinc.org', code: '48765-2', display: 'Allergies and adverse reactions Document' }] };
                            }
                        }
                    }
                    const refTargets = [];
                    const collectRefs = (obj) => {
                        if (!obj || typeof obj !== 'object')
                            return;
                        if (Array.isArray(obj)) {
                            obj.forEach(collectRefs);
                            return;
                        }
                        const rec = obj;
                        if (typeof rec.reference === 'string') {
                            const m = rec.reference.match(/^([A-Za-z]+)\/(.+)/);
                            if (m) {
                                let target = refTargets.find(t => t.type === m[1] && t.id === m[2]);
                                if (!target) {
                                    target = { type: m[1], id: m[2], refs: [] };
                                    refTargets.push(target);
                                }
                                target.refs.push(rec);
                            }
                        }
                        Object.values(rec).forEach(collectRefs);
                    };
                    collectRefs(comp.resource);
                    for (const ref of refTargets) {
                        if (!existingTypes.has(ref.type)) {
                            existingTypes.add(ref.type);
                            const entryUuid = randomUUID();
                            const refEntry = { resourceType: ref.type, id: ref.id };
                            // Recursively enrich the new entry resource to get proper defaults
                            enrichResource(refEntry, ref.type, '', {}, [], {}, ctx.codeResolver, []);
                            entries.push({ fullUrl: 'urn:uuid:' + entryUuid, resource: refEntry });
                            // Update all references in the Composition to use the fullUrl
                            for (const r of ref.refs) {
                                r.reference = 'urn:uuid:' + entryUuid;
                            }
                        }
                    }
                }
                // Inject entry meta.profile and required identifiers from _entryProfile:<RT> patterns.
                // Pattern value is { profile: string; identifiers?: Array<{ system: string }> }.
                // Extracted generically from Composition profile's reference targetProfile constraints
                // so any IG (IPS, CH Core EPR, ISiK, etc.) gets correct profiles without hardcoding.
                for (const entry of entries) {
                    const rt = entry.resource?.resourceType;
                    if (!rt)
                        continue;
                    const epKey = '_entryProfile:' + rt;
                    if (!ctx.fieldPatterns || !(epKey in ctx.fieldPatterns))
                        continue;
                    const epVal = ctx.fieldPatterns[epKey];
                    if (!epVal || typeof epVal !== 'object')
                        continue;
                    const profile = epVal.profile;
                    if (typeof profile === 'string') {
                        if (!entry.resource.meta)
                            entry.resource.meta = {};
                        entry.resource.meta.profile = [profile];
                    }
                    // Inject required identifiers from entry profile constraints
                    const idReqs = epVal.identifiers;
                    if (Array.isArray(idReqs)) {
                        const res = entry.resource;
                        if (!Array.isArray(res.identifier))
                            res.identifier = [];
                        const ids = res.identifier;
                        for (const req of idReqs) {
                            if (req.system && !ids.some(id => id.system === req.system)) {
                                ids.push({ system: req.system, value: randomId() });
                            }
                        }
                    }
                }
            }
            // For message bundles: first entry must be MessageHeader (bdl-12).
            // Also resolve all references across entries to use fullUrl URNs.
            if (ctx.base.type === 'message') {
                const entries = ctx.base.entry;
                // Ensure first entry is a MessageHeader. If not, replace or inject one.
                const firstRes = entries[0]?.resource;
                if (!firstRes || firstRes.resourceType !== 'MessageHeader') {
                    // Build a minimal MessageHeader. The class-level init may already have
                    // set eventCoding / source / focus via required field patterns; those
                    // will be enriched below when we recursively enrich the entry.
                    const mhUuid = randomUUID();
                    const mh = {
                        resourceType: 'MessageHeader',
                        id: randomId(),
                        eventCoding: { system: 'http://terminology.hl7.org/CodeSystem/v3-NullFlavor', code: 'UNK' },
                        source: { endpoint: 'https://babelfhir.dev/' + randomId() },
                    };
                    enrichResource(mh, 'MessageHeader', '', ctx.fieldPatterns || {}, ctx.forbiddenFields || [], {}, ctx.codeResolver, []);
                    // Replace wrong first entry or prepend
                    if (entries.length > 0 && firstRes?.resourceType !== 'MessageHeader') {
                        entries.unshift({ fullUrl: 'urn:uuid:' + mhUuid, resource: mh });
                    }
                    else {
                        entries[0] = { fullUrl: 'urn:uuid:' + mhUuid, resource: mh };
                    }
                }
                // Remove Composition entries from message bundles — they belong in
                // document bundles, not message bundles. The class-level random()
                // may have generated one from the generic Bundle entry template.
                for (let i = entries.length - 1; i >= 0; i--) {
                    if (entries[i]?.resource?.resourceType === 'Composition') {
                        entries.splice(i, 1);
                    }
                }
                // Iteratively collect references and inject missing resources.
                // Newly injected entries may have their own references, so repeat
                // until no new unresolved references are found (max 5 passes to avoid infinite loops).
                for (let _pass = 0; _pass < 5; _pass++) {
                    const existingFullUrls = new Set();
                    const existingResIds = new Set();
                    for (const e of entries) {
                        if (e.fullUrl)
                            existingFullUrls.add(e.fullUrl);
                        const r = e.resource;
                        if (r && r.resourceType && r.id) {
                            existingResIds.add(r.resourceType + '/' + r.id);
                        }
                    }
                    const refTargets = [];
                    const collectRefs = (obj) => {
                        if (!obj || typeof obj !== 'object')
                            return;
                        if (Array.isArray(obj)) {
                            obj.forEach(collectRefs);
                            return;
                        }
                        const rec = obj;
                        if (typeof rec.reference === 'string') {
                            const ref = rec.reference;
                            // Skip already-resolved urn:uuid: references
                            if (ref.startsWith('urn:uuid:'))
                                return;
                            const m = ref.match(/^([A-Za-z]+)\/(.+)/);
                            if (m) {
                                const key = m[1] + '/' + m[2];
                                if (!existingResIds.has(key)) {
                                    let target = refTargets.find(t => t.type === m[1] && t.id === m[2]);
                                    if (!target) {
                                        target = { type: m[1], id: m[2], refs: [] };
                                        refTargets.push(target);
                                    }
                                    target.refs.push(rec);
                                }
                            }
                        }
                        Object.values(rec).forEach(collectRefs);
                    };
                    for (const e of entries) {
                        if (e.resource)
                            collectRefs(e.resource);
                    }
                    if (refTargets.length === 0)
                        break; // All references resolved
                    // Inject missing referenced resources and rewrite references to urn:uuid:
                    for (const ref of refTargets) {
                        const entryUuid = randomUUID();
                        const refEntry = { resourceType: ref.type, id: ref.id };
                        enrichResource(refEntry, ref.type, '', {}, [], {}, ctx.codeResolver, []);
                        entries.push({ fullUrl: 'urn:uuid:' + entryUuid, resource: refEntry });
                        for (const r of ref.refs) {
                            r.reference = 'urn:uuid:' + entryUuid;
                        }
                    }
                }
            }
        }
    }
    // Composition
    if (/Composition/i.test(ctx.baseResource)) {
        // Force correct status - 'active' is NOT valid for Composition.status
        ctx.base.status = 'final';
        // Always use profile-specific type pattern if available, even if type already set
        // (class init may set type to NullFlavor skeleton — pattern overrides that)
        const typePattern = ctx.getPatternValue('type');
        if (typePattern) {
            ctx.base.type = typePattern;
        }
        else if (!('type' in ctx.base)) {
            ctx.base.type = { coding: [{ system: 'http://loinc.org', code: '60591-5', display: 'Patient summary Document' }] };
        }
        if (!('subject' in ctx.base))
            ctx.base.subject = { reference: 'Patient/' + randomId() };
        if (!('date' in ctx.base))
            ctx.base.date = new Date().toISOString();
        if (!('author' in ctx.base))
            ctx.base.author = [{ reference: 'Practitioner/' + randomId() }];
        if (!('title' in ctx.base))
            ctx.base.title = 'Patient Summary';
        // Section must have at least one element for many profiles
        // Add code to prevent unintended slice matching (e.g., originalRepresentation which has code 55108-5)
        if (!('section' in ctx.base) || (Array.isArray(ctx.base.section) && ctx.base.section.length === 0)) {
            ctx.base.section = [{
                    title: 'Section',
                    code: { coding: [{ system: 'http://loinc.org', code: '48765-2', display: 'Allergies and adverse reactions Document' }] },
                    text: { status: 'generated', div: '<div xmlns="http://www.w3.org/1999/xhtml">Section content</div>' }
                }];
        }
        // ips-comp-1: "Either section.entry or emptyReason are present"
        // Add emptyReason to any section that has no entry
        if (Array.isArray(ctx.base.section)) {
            for (const section of ctx.base.section) {
                const hasEntry = 'entry' in section && Array.isArray(section.entry) && section.entry.length > 0;
                if (!hasEntry && !('emptyReason' in section)) {
                    section.emptyReason = { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/list-empty-reason', code: 'unavailable', display: 'Unavailable' }] };
                }
            }
        }
        // EPR confidentiality handling removed - should be handled by pattern extraction
    }
}
