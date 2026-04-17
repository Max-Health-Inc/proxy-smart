import fhirpath from "fhirpath";
import fhirpath_model from "fhirpath/fhir-context/r4/index.js";
export async function validateAbatement(resource, options) {
    const errors = [];
    const warnings = [];
    const fhirpathOptions = {
        preciseMath: true,
        traceFn: options?.traceFn ?? (() => { }),
        ...(options?.signal ? { signal: options.signal } : {}),
        ...(options?.httpHeaders ? { httpHeaders: options.httpHeaders } : {}),
    };
    const result0 = await fhirpath.evaluate(resource, "Extension.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result0.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result1 = await fhirpath.evaluate(resource, "extension.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result1.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result2 = await fhirpath.evaluate(resource, "value.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result2.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result3 = await fhirpath.evaluate(resource, "DataType.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result3.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result4 = await fhirpath.evaluate(resource, "Element.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result4.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result5 = await fhirpath.evaluate(resource, "url.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result5.every(Boolean)) {
        errors.push("Constraint violation: url must be present");
    }
    const result6 = await fhirpath.evaluate(resource, "value.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result6.every(Boolean)) {
        errors.push("Constraint violation: value must be present");
    }
    const result7 = await fhirpath.evaluate(resource, "Extension.count() <= 1", { resource }, fhirpath_model, fhirpathOptions);
    if (!result7.every(Boolean)) {
        errors.push("Constraint violation: Extension must contain at most one element");
    }
    const result8 = await fhirpath.evaluate(resource, "extension.count() <= 0", { resource }, fhirpath_model, fhirpathOptions);
    if (!result8.every(Boolean)) {
        errors.push("Constraint violation: extension must contain at most 0 elements");
    }
    const result9 = await fhirpath.evaluate(resource, "extension.exists().not()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result9.every(Boolean)) {
        errors.push("Constraint violation: extension: max allowed = 0, but found 1");
    }
    // Fixed value constraint for url
    if (resource.url !== undefined && resource.url !== "http://hl7.org/fhir/StructureDefinition/allergyintolerance-abatement") {
        errors.push("url must have the fixed value 'http://hl7.org/fhir/StructureDefinition/allergyintolerance-abatement'");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _bRes = resource;
    // Structural type check: extension must be a JSON Array
    if (_bRes.extension !== undefined && _bRes.extension !== null && !Array.isArray(_bRes.extension)) {
        errors.push("The property extension must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: extension must be a JSON Array
    if (_bRes.extension !== undefined && _bRes.extension !== null && !Array.isArray(_bRes.extension)) {
        errors.push("The property extension must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: extension must be a JSON Array
    if (_bRes.extension !== undefined && _bRes.extension !== null && !Array.isArray(_bRes.extension)) {
        errors.push("The property extension must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Prohibited field: Extension.extension (max=0)
    if (_bRes.extension !== undefined) {
        errors.push("Extension.extension: max allowed = 0, but found 1");
    }
    // dateTime format validation for valueDateTime (choice type)
    if (typeof _bRes.valueDateTime === 'string' && !/^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?)?)?$/.test(_bRes.valueDateTime)) {
        errors.push("Not a valid date/time format: '" + _bRes.valueDateTime + "'");
    }
    // Choice-type narrowing: value[x] allows only: dateTime, Age, Period, Range, string
    {
        const _ckAllowed = ['valueDateTime', 'valueAge', 'valuePeriod', 'valueRange', 'valueString'];
        for (const _ckKey of Object.keys(_bRes)) {
            if (_ckKey.startsWith('value') && _ckKey.length > 5 && _ckKey.charCodeAt(5) >= 65 && _ckKey.charCodeAt(5) <= 90 && !_ckAllowed.includes(_ckKey) && _bRes[_ckKey] !== undefined) {
                errors.push("The Profile 'http://hl7.org/fhir/StructureDefinition/allergyintolerance-abatement' definition allows for the type dateTime, Age, Period, Range, string but found type " + _ckKey.substring(5));
            }
        }
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
