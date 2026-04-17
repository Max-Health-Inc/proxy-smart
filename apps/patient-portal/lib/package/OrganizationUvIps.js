import fhirpath from "fhirpath";
import fhirpath_model from "fhirpath/fhir-context/r4/index.js";
export async function validateOrganizationUvIps(resource, options) {
    const errors = [];
    const warnings = [];
    const fhirpathOptions = {
        preciseMath: true,
        traceFn: options?.traceFn ?? (() => { }),
        ...(options?.signal ? { signal: options.signal } : {}),
        ...(options?.httpHeaders ? { httpHeaders: options.httpHeaders } : {}),
    };
    const result0 = await fhirpath.evaluate(resource, "Organization.all(contained.contained.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result0.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL NOT contain nested Resources");
    }
    const result1 = await fhirpath.evaluate(resource, "Organization.all(contained.where((('#'+id in (%resource.descendants().reference | %resource.descendants().as(canonical) | %resource.descendants().as(uri) | %resource.descendants().as(url))) or descendants().where(reference = '#').exists() or descendants().where(as(canonical) = '#').exists() or descendants().where(as(canonical) = '#').exists()).not()).trace('unmatched', id).empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result1.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL be referred to from elsewhere in the resource or SHALL refer to the containing resource");
    }
    const result2 = await fhirpath.evaluate(resource, "Organization.all(contained.meta.versionId.empty() and contained.meta.lastUpdated.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result2.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a meta.versionId or a meta.lastUpdated");
    }
    const result3 = await fhirpath.evaluate(resource, "Organization.all(contained.meta.security.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result3.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a security label");
    }
    const result4 = await fhirpath.evaluate(resource, "Organization.all(text.`div`.exists())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result4.every(Boolean)) {
        warnings.push("Constraint violation: A resource should have narrative for robust management");
    }
    const result5 = await fhirpath.evaluate(resource, "Organization.all((identifier.count() + name.count()) > 0)", { resource }, fhirpath_model, fhirpathOptions);
    if (!result5.every(Boolean)) {
        errors.push("Constraint violation: The organization SHALL at least have a name or an identifier, and possibly more than one");
    }
    const result6 = await fhirpath.evaluate(resource, "meta.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result6.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result7 = await fhirpath.evaluate(resource, "implicitRules.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result7.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result8 = await fhirpath.evaluate(resource, "language.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result8.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result9 = await fhirpath.evaluate(resource, "text.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result9.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result10 = await fhirpath.evaluate(resource, "extension.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result10.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result11 = await fhirpath.evaluate(resource, "modifierExtension.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result11.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result12 = await fhirpath.evaluate(resource, "identifier.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result12.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result13 = await fhirpath.evaluate(resource, "active.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result13.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result14 = await fhirpath.evaluate(resource, "type.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result14.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result15 = await fhirpath.evaluate(resource, "name.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result15.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result16 = await fhirpath.evaluate(resource, "alias.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result16.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result17 = await fhirpath.evaluate(resource, "telecom.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result17.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result18 = await fhirpath.evaluate(resource, "telecom.all(where(use = 'home').empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result18.every(Boolean)) {
        errors.push("Constraint violation: The telecom of an organization can never be of use 'home'");
    }
    const result19 = await fhirpath.evaluate(resource, "address.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result19.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result20 = await fhirpath.evaluate(resource, "address.all(where(use = 'home').empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result20.every(Boolean)) {
        errors.push("Constraint violation: An address of an organization can never be of use 'home'");
    }
    const result21 = await fhirpath.evaluate(resource, "partOf.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result21.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result22 = await fhirpath.evaluate(resource, "contact.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result22.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result23 = await fhirpath.evaluate(resource, "endpoint.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result23.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result24 = await fhirpath.evaluate(resource, "DomainResource.all(contained.contained.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result24.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL NOT contain nested Resources");
    }
    const result25 = await fhirpath.evaluate(resource, "DomainResource.all(contained.where((('#'+id in (%resource.descendants().reference | %resource.descendants().as(canonical) | %resource.descendants().as(uri) | %resource.descendants().as(url))) or descendants().where(reference = '#').exists() or descendants().where(as(canonical) = '#').exists() or descendants().where(as(canonical) = '#').exists()).not()).trace('unmatched', id).empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result25.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL be referred to from elsewhere in the resource or SHALL refer to the containing resource");
    }
    const result26 = await fhirpath.evaluate(resource, "DomainResource.all(contained.meta.versionId.empty() and contained.meta.lastUpdated.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result26.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a meta.versionId or a meta.lastUpdated");
    }
    const result27 = await fhirpath.evaluate(resource, "DomainResource.all(contained.meta.security.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result27.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a security label");
    }
    const result28 = await fhirpath.evaluate(resource, "DomainResource.all(text.`div`.exists())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result28.every(Boolean)) {
        warnings.push("Constraint violation: A resource should have narrative for robust management");
    }
    const result29 = await fhirpath.evaluate(resource, "name.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result29.every(Boolean)) {
        errors.push("Constraint violation: name must be present");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _bRes = resource;
    // Structural type check: meta must be an Object, not a Primitive
    if (_bRes.meta !== undefined && _bRes.meta !== null && typeof _bRes.meta !== 'object') {
        errors.push("The property meta must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".meta)");
    }
    // Structural type check: text must be an Object, not a Primitive
    if (_bRes.text !== undefined && _bRes.text !== null && typeof _bRes.text !== 'object') {
        errors.push("The property text must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".text)");
    }
    // Structural type check: contained must be a JSON Array
    if (_bRes.contained !== undefined && _bRes.contained !== null && !Array.isArray(_bRes.contained)) {
        errors.push("The property contained must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: extension must be a JSON Array
    if (_bRes.extension !== undefined && _bRes.extension !== null && !Array.isArray(_bRes.extension)) {
        errors.push("The property extension must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: modifierExtension must be a JSON Array
    if (_bRes.modifierExtension !== undefined && _bRes.modifierExtension !== null && !Array.isArray(_bRes.modifierExtension)) {
        errors.push("The property modifierExtension must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: identifier must be a JSON Array
    if (_bRes.identifier !== undefined && _bRes.identifier !== null && !Array.isArray(_bRes.identifier)) {
        errors.push("The property identifier must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: type must be a JSON Array
    if (_bRes.type !== undefined && _bRes.type !== null && !Array.isArray(_bRes.type)) {
        errors.push("The property type must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: alias must be a JSON Array
    if (_bRes.alias !== undefined && _bRes.alias !== null && !Array.isArray(_bRes.alias)) {
        errors.push("The property alias must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: telecom must be a JSON Array
    if (_bRes.telecom !== undefined && _bRes.telecom !== null && !Array.isArray(_bRes.telecom)) {
        errors.push("The property telecom must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: address must be a JSON Array
    if (_bRes.address !== undefined && _bRes.address !== null && !Array.isArray(_bRes.address)) {
        errors.push("The property address must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: partOf must be an Object, not a Primitive
    if (_bRes.partOf !== undefined && _bRes.partOf !== null && typeof _bRes.partOf !== 'object') {
        errors.push("The property partOf must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".partOf)");
    }
    // Structural type check: contact must be a JSON Array
    if (_bRes.contact !== undefined && _bRes.contact !== null && !Array.isArray(_bRes.contact)) {
        errors.push("The property contact must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: endpoint must be a JSON Array
    if (_bRes.endpoint !== undefined && _bRes.endpoint !== null && !Array.isArray(_bRes.endpoint)) {
        errors.push("The property endpoint must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: meta must be an Object, not a Primitive
    if (_bRes.meta !== undefined && _bRes.meta !== null && typeof _bRes.meta !== 'object') {
        errors.push("The property meta must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".meta)");
    }
    // Structural type check: text must be an Object, not a Primitive
    if (_bRes.text !== undefined && _bRes.text !== null && typeof _bRes.text !== 'object') {
        errors.push("The property text must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".text)");
    }
    // Structural type check: contained must be a JSON Array
    if (_bRes.contained !== undefined && _bRes.contained !== null && !Array.isArray(_bRes.contained)) {
        errors.push("The property contained must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: extension must be a JSON Array
    if (_bRes.extension !== undefined && _bRes.extension !== null && !Array.isArray(_bRes.extension)) {
        errors.push("The property extension must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: modifierExtension must be a JSON Array
    if (_bRes.modifierExtension !== undefined && _bRes.modifierExtension !== null && !Array.isArray(_bRes.modifierExtension)) {
        errors.push("The property modifierExtension must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: meta must be an Object, not a Primitive
    if (_bRes.meta !== undefined && _bRes.meta !== null && typeof _bRes.meta !== 'object') {
        errors.push("The property meta must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".meta)");
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
