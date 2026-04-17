import fhirpath from "fhirpath";
import fhirpath_model from "fhirpath/fhir-context/r4/index.js";
export async function validateIPSSectionsLM(resource, options) {
    const errors = [];
    const warnings = [];
    const fhirpathOptions = {
        preciseMath: true,
        traceFn: options?.traceFn ?? (() => { }),
        ...(options?.signal ? { signal: options.signal } : {}),
        ...(options?.httpHeaders ? { httpHeaders: options.httpHeaders } : {}),
    };
    const result0 = await fhirpath.evaluate(resource, "sectionProblems.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result0.every(Boolean)) {
        errors.push("Constraint violation: sectionProblems must be present");
    }
    const result1 = await fhirpath.evaluate(resource, "sectionAllergies.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result1.every(Boolean)) {
        errors.push("Constraint violation: sectionAllergies must be present");
    }
    const result2 = await fhirpath.evaluate(resource, "sectionMedications.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result2.every(Boolean)) {
        errors.push("Constraint violation: sectionMedications must be present");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _bRes = resource;
    // Structural type check: sectionProblems must be an Object, not a Primitive
    if (_bRes.sectionProblems !== undefined && _bRes.sectionProblems !== null && typeof _bRes.sectionProblems !== 'object') {
        errors.push("The property sectionProblems must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".sectionProblems)");
    }
    // Structural type check: sectionAllergies must be an Object, not a Primitive
    if (_bRes.sectionAllergies !== undefined && _bRes.sectionAllergies !== null && typeof _bRes.sectionAllergies !== 'object') {
        errors.push("The property sectionAllergies must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".sectionAllergies)");
    }
    // Structural type check: sectionMedications must be an Object, not a Primitive
    if (_bRes.sectionMedications !== undefined && _bRes.sectionMedications !== null && typeof _bRes.sectionMedications !== 'object') {
        errors.push("The property sectionMedications must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".sectionMedications)");
    }
    // Structural type check: sectionImmunizations must be an Object, not a Primitive
    if (_bRes.sectionImmunizations !== undefined && _bRes.sectionImmunizations !== null && typeof _bRes.sectionImmunizations !== 'object') {
        errors.push("The property sectionImmunizations must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".sectionImmunizations)");
    }
    // Structural type check: sectionResults must be an Object, not a Primitive
    if (_bRes.sectionResults !== undefined && _bRes.sectionResults !== null && typeof _bRes.sectionResults !== 'object') {
        errors.push("The property sectionResults must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".sectionResults)");
    }
    // Structural type check: sectionProceduresHx must be an Object, not a Primitive
    if (_bRes.sectionProceduresHx !== undefined && _bRes.sectionProceduresHx !== null && typeof _bRes.sectionProceduresHx !== 'object') {
        errors.push("The property sectionProceduresHx must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".sectionProceduresHx)");
    }
    // Structural type check: sectionMedicalDevices must be an Object, not a Primitive
    if (_bRes.sectionMedicalDevices !== undefined && _bRes.sectionMedicalDevices !== null && typeof _bRes.sectionMedicalDevices !== 'object') {
        errors.push("The property sectionMedicalDevices must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".sectionMedicalDevices)");
    }
    // Structural type check: sectionAdvanceDirectives must be an Object, not a Primitive
    if (_bRes.sectionAdvanceDirectives !== undefined && _bRes.sectionAdvanceDirectives !== null && typeof _bRes.sectionAdvanceDirectives !== 'object') {
        errors.push("The property sectionAdvanceDirectives must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".sectionAdvanceDirectives)");
    }
    // Structural type check: sectionAlerts must be an Object, not a Primitive
    if (_bRes.sectionAlerts !== undefined && _bRes.sectionAlerts !== null && typeof _bRes.sectionAlerts !== 'object') {
        errors.push("The property sectionAlerts must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".sectionAlerts)");
    }
    // Structural type check: sectionFunctionalStatus must be an Object, not a Primitive
    if (_bRes.sectionFunctionalStatus !== undefined && _bRes.sectionFunctionalStatus !== null && typeof _bRes.sectionFunctionalStatus !== 'object') {
        errors.push("The property sectionFunctionalStatus must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".sectionFunctionalStatus)");
    }
    // Structural type check: sectionPastProblems must be an Object, not a Primitive
    if (_bRes.sectionPastProblems !== undefined && _bRes.sectionPastProblems !== null && typeof _bRes.sectionPastProblems !== 'object') {
        errors.push("The property sectionPastProblems must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".sectionPastProblems)");
    }
    // Structural type check: sectionPregnancyHx must be an Object, not a Primitive
    if (_bRes.sectionPregnancyHx !== undefined && _bRes.sectionPregnancyHx !== null && typeof _bRes.sectionPregnancyHx !== 'object') {
        errors.push("The property sectionPregnancyHx must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".sectionPregnancyHx)");
    }
    // Structural type check: sectionPatientStory must be an Object, not a Primitive
    if (_bRes.sectionPatientStory !== undefined && _bRes.sectionPatientStory !== null && typeof _bRes.sectionPatientStory !== 'object') {
        errors.push("The property sectionPatientStory must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".sectionPatientStory)");
    }
    // Structural type check: sectionPlanOfCare must be an Object, not a Primitive
    if (_bRes.sectionPlanOfCare !== undefined && _bRes.sectionPlanOfCare !== null && typeof _bRes.sectionPlanOfCare !== 'object') {
        errors.push("The property sectionPlanOfCare must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".sectionPlanOfCare)");
    }
    // Structural type check: sectionSocialHistory must be an Object, not a Primitive
    if (_bRes.sectionSocialHistory !== undefined && _bRes.sectionSocialHistory !== null && typeof _bRes.sectionSocialHistory !== 'object') {
        errors.push("The property sectionSocialHistory must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".sectionSocialHistory)");
    }
    // Structural type check: sectionVitalSigns must be an Object, not a Primitive
    if (_bRes.sectionVitalSigns !== undefined && _bRes.sectionVitalSigns !== null && typeof _bRes.sectionVitalSigns !== 'object') {
        errors.push("The property sectionVitalSigns must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".sectionVitalSigns)");
    }
    // Base FHIR structural validation: extension.url required, ext-1 constraint, empty objects
    {
        const _checkExtensions = (obj, path, depth) => {
            if (!obj || typeof obj !== 'object')
                return;
            if (Array.isArray(obj)) {
                obj.forEach((item, i) => _checkExtensions(item, path + '[' + i + ']', depth + 1));
                return;
            }
            const rec = obj;
            // Empty object check — HL7 validates all FHIR elements must have content
            if (depth > 0 && Object.keys(rec).length === 0) {
                errors.push('Object must have some content');
            }
            // per-1: If present, start SHALL have a lower value than end (Period structural check)
            if (typeof rec.start === 'string' && typeof rec.end === 'string' && rec.start > rec.end) {
                errors.push('If present, start SHALL have a lower value than end');
            }
            // Validate extension arrays
            for (const extKey of ['extension', 'modifierExtension']) {
                const exts = rec[extKey];
                if (Array.isArray(exts)) {
                    for (const ext of exts) {
                        if (ext && typeof ext === 'object' && !Array.isArray(ext)) {
                            const e = ext;
                            if (typeof e.url !== 'string' || !e.url) {
                                errors.push('Extension.url is required in order to identify, use and validate the extension');
                            }
                            // ext-1: Must have either extensions or value[x], not both
                            const hasNestedExt = Array.isArray(e.extension) && e.extension.length > 0;
                            const hasValue = Object.keys(e).some(k => k.startsWith('value') && k !== 'value' && k.length > 5);
                            if (hasNestedExt && hasValue) {
                                errors.push('Must have either extensions or value[x], not both');
                            }
                        }
                    }
                }
            }
            // Recurse into child objects (skip primitive values)
            for (const [_key, _val] of Object.entries(rec)) {
                if (_val && typeof _val === 'object') {
                    _checkExtensions(_val, path + '.' + _key, depth + 1);
                }
            }
        };
        _checkExtensions(resource, '', 0);
    }
    // Standalone contained reference resolution: verify #id references resolve to contained[] entries
    {
        const _res = resource;
        const _containedIds = new Set();
        if (Array.isArray(_res.contained)) {
            for (const _c of _res.contained) {
                if (_c && typeof _c.id === 'string')
                    _containedIds.add(_c.id);
            }
        }
        const _checkContainedRef = (obj) => {
            if (!obj || typeof obj !== 'object')
                return;
            if (Array.isArray(obj)) {
                obj.forEach(_checkContainedRef);
                return;
            }
            const _rec = obj;
            if (typeof _rec.reference === 'string') {
                const _ref = _rec.reference;
                if (_ref.startsWith('#')) {
                    const _id = _ref.substring(1);
                    if (_id && !_containedIds.has(_id)) {
                        errors.push('Contained reference not found: ' + _ref);
                    }
                }
            }
            for (const [_k, _v] of Object.entries(_rec)) {
                if (_k !== 'contained')
                    _checkContainedRef(_v);
            }
        };
        _checkContainedRef(_res);
    }
    return { errors, warnings };
}
