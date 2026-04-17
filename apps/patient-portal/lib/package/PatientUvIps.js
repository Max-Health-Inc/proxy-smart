import fhirpath from "fhirpath";
import fhirpath_model from "fhirpath/fhir-context/r4/index.js";
import { isValidAdministrativeGenderCode } from './valuesets/ValueSet-AdministrativeGender.js';
import { isValidLinkTypeCode } from './valuesets/ValueSet-LinkType.js';
import { isValidNameUseCode } from './valuesets/ValueSet-NameUse.js';
export async function validatePatientUvIps(resource, options) {
    const errors = [];
    const warnings = [];
    const fhirpathOptions = {
        preciseMath: true,
        traceFn: options?.traceFn ?? (() => { }),
        ...(options?.signal ? { signal: options.signal } : {}),
        ...(options?.httpHeaders ? { httpHeaders: options.httpHeaders } : {}),
    };
    const result0 = await fhirpath.evaluate(resource, "Patient.all(contained.contained.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result0.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL NOT contain nested Resources");
    }
    const result1 = await fhirpath.evaluate(resource, "Patient.all(contained.where((('#'+id in (%resource.descendants().reference | %resource.descendants().as(canonical) | %resource.descendants().as(uri) | %resource.descendants().as(url))) or descendants().where(reference = '#').exists() or descendants().where(as(canonical) = '#').exists() or descendants().where(as(canonical) = '#').exists()).not()).trace('unmatched', id).empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result1.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL be referred to from elsewhere in the resource or SHALL refer to the containing resource");
    }
    const result2 = await fhirpath.evaluate(resource, "Patient.all(contained.meta.versionId.empty() and contained.meta.lastUpdated.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result2.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a meta.versionId or a meta.lastUpdated");
    }
    const result3 = await fhirpath.evaluate(resource, "Patient.all(contained.meta.security.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result3.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a security label");
    }
    const result4 = await fhirpath.evaluate(resource, "Patient.all(text.`div`.exists())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result4.every(Boolean)) {
        warnings.push("Constraint violation: A resource should have narrative for robust management");
    }
    const result5 = await fhirpath.evaluate(resource, "meta.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result5.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result6 = await fhirpath.evaluate(resource, "implicitRules.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result6.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result7 = await fhirpath.evaluate(resource, "language.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result7.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result8 = await fhirpath.evaluate(resource, "text.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result8.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result9 = await fhirpath.evaluate(resource, "extension.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result9.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result10 = await fhirpath.evaluate(resource, "modifierExtension.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result10.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result11 = await fhirpath.evaluate(resource, "identifier.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result11.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result12 = await fhirpath.evaluate(resource, "active.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result12.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result13 = await fhirpath.evaluate(resource, "name.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result13.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result14 = await fhirpath.evaluate(resource, "name.all(family.exists() or given.exists() or text.exists())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result14.every(Boolean)) {
        errors.push("Constraint violation: Patient.name.given, Patient.name.family or Patient.name.text SHALL be present");
    }
    const result15 = await fhirpath.evaluate(resource, "telecom.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result15.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result16 = await fhirpath.evaluate(resource, "gender.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result16.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result17 = await fhirpath.evaluate(resource, "birthDate.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result17.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result18 = await fhirpath.evaluate(resource, "deceased.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result18.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result19 = await fhirpath.evaluate(resource, "address.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result19.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result20 = await fhirpath.evaluate(resource, "maritalStatus.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result20.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result21 = await fhirpath.evaluate(resource, "multipleBirth.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result21.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result22 = await fhirpath.evaluate(resource, "photo.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result22.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result23 = await fhirpath.evaluate(resource, "contact.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result23.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result24 = await fhirpath.evaluate(resource, "contact.all(name.exists() or telecom.exists() or address.exists() or organization.exists())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result24.every(Boolean)) {
        errors.push("Constraint violation: SHALL at least contain a contact's details or a reference to an organization");
    }
    const result25 = await fhirpath.evaluate(resource, "communication.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result25.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result26 = await fhirpath.evaluate(resource, "generalPractitioner.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result26.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result27 = await fhirpath.evaluate(resource, "managingOrganization.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result27.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result28 = await fhirpath.evaluate(resource, "link.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result28.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result29 = await fhirpath.evaluate(resource, "DomainResource.all(contained.contained.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result29.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL NOT contain nested Resources");
    }
    const result30 = await fhirpath.evaluate(resource, "DomainResource.all(contained.where((('#'+id in (%resource.descendants().reference | %resource.descendants().as(canonical) | %resource.descendants().as(uri) | %resource.descendants().as(url))) or descendants().where(reference = '#').exists() or descendants().where(as(canonical) = '#').exists() or descendants().where(as(canonical) = '#').exists()).not()).trace('unmatched', id).empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result30.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL be referred to from elsewhere in the resource or SHALL refer to the containing resource");
    }
    const result31 = await fhirpath.evaluate(resource, "DomainResource.all(contained.meta.versionId.empty() and contained.meta.lastUpdated.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result31.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a meta.versionId or a meta.lastUpdated");
    }
    const result32 = await fhirpath.evaluate(resource, "DomainResource.all(contained.meta.security.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result32.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a security label");
    }
    const result33 = await fhirpath.evaluate(resource, "DomainResource.all(text.`div`.exists())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result33.every(Boolean)) {
        warnings.push("Constraint violation: A resource should have narrative for robust management");
    }
    const result34 = await fhirpath.evaluate(resource, "name.count() >= 1", { resource }, fhirpath_model, fhirpathOptions);
    if (!result34.every(Boolean)) {
        errors.push("Constraint violation: name must contain at least one element");
    }
    const result35 = await fhirpath.evaluate(resource, "birthDate.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result35.every(Boolean)) {
        errors.push("Constraint violation: birthDate must be present");
    }
    // Nested required field: communication.language (min=1)
    if (resource.communication && Array.isArray(resource.communication)) {
        for (const _el of resource.communication) {
            if ((_el.language === undefined || _el.language === null) || Array.isArray(_el.language)) {
                errors.push("Missing required member: 'language'");
            }
        }
    }
    // Nested required field: link.other (min=1)
    if (resource.link && Array.isArray(resource.link)) {
        for (const _el of resource.link) {
            if ((_el.other === undefined || _el.other === null) || Array.isArray(_el.other)) {
                errors.push("Missing required member: 'other'");
            }
        }
    }
    // Nested required field: link.type (min=1)
    if (resource.link && Array.isArray(resource.link)) {
        for (const _el of resource.link) {
            if ((_el.type === undefined || _el.type === null) || Array.isArray(_el.type)) {
                errors.push("Missing required member: 'type'");
            }
        }
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
    // Structural type check: name must be a JSON Array
    if (_bRes.name !== undefined && _bRes.name !== null && !Array.isArray(_bRes.name)) {
        errors.push("The property name must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: telecom must be a JSON Array
    if (_bRes.telecom !== undefined && _bRes.telecom !== null && !Array.isArray(_bRes.telecom)) {
        errors.push("The property telecom must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: address must be a JSON Array
    if (_bRes.address !== undefined && _bRes.address !== null && !Array.isArray(_bRes.address)) {
        errors.push("The property address must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: maritalStatus must be an Object, not a Primitive
    if (_bRes.maritalStatus !== undefined && _bRes.maritalStatus !== null && typeof _bRes.maritalStatus !== 'object') {
        errors.push("The property maritalStatus must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".maritalStatus)");
    }
    // Structural type check: photo must be a JSON Array
    if (_bRes.photo !== undefined && _bRes.photo !== null && !Array.isArray(_bRes.photo)) {
        errors.push("The property photo must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: contact must be a JSON Array
    if (_bRes.contact !== undefined && _bRes.contact !== null && !Array.isArray(_bRes.contact)) {
        errors.push("The property contact must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: communication must be a JSON Array
    if (_bRes.communication !== undefined && _bRes.communication !== null && !Array.isArray(_bRes.communication)) {
        errors.push("The property communication must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: generalPractitioner must be a JSON Array
    if (_bRes.generalPractitioner !== undefined && _bRes.generalPractitioner !== null && !Array.isArray(_bRes.generalPractitioner)) {
        errors.push("The property generalPractitioner must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: managingOrganization must be an Object, not a Primitive
    if (_bRes.managingOrganization !== undefined && _bRes.managingOrganization !== null && typeof _bRes.managingOrganization !== 'object') {
        errors.push("The property managingOrganization must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".managingOrganization)");
    }
    // Structural type check: link must be a JSON Array
    if (_bRes.link !== undefined && _bRes.link !== null && !Array.isArray(_bRes.link)) {
        errors.push("The property link must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
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
    // Required ValueSet binding validation for gender
    if (_bRes.gender !== undefined && !isValidAdministrativeGenderCode(_bRes.gender)) {
        errors.push("Code '" + _bRes.gender + "' does not exist in the value set 'administrative-gender' (http://hl7.org/fhir/ValueSet/administrative-gender), but the binding is of strength 'required'");
    }
    // Required ValueSet binding validation for contact.gender (nested)
    if (resource.contact && Array.isArray(resource.contact)) {
        for (const _nb0 of resource.contact) {
            if (_nb0.gender !== undefined && !isValidAdministrativeGenderCode(_nb0.gender)) {
                errors.push("Code '" + _nb0.gender + "' does not exist in the value set 'administrative-gender' (http://hl7.org/fhir/ValueSet/administrative-gender), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for link.type (nested)
    if (resource.link && Array.isArray(resource.link)) {
        for (const _nb0 of resource.link) {
            if (_nb0.type !== undefined && !isValidLinkTypeCode(_nb0.type)) {
                errors.push("Code '" + _nb0.type + "' does not exist in the value set 'link-type' (http://hl7.org/fhir/ValueSet/link-type), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for name.use (nested)
    if (resource.name && Array.isArray(resource.name)) {
        for (const _nb0 of resource.name) {
            if (_nb0.use !== undefined && !isValidNameUseCode(_nb0.use)) {
                errors.push("Code '" + _nb0.use + "' does not exist in the value set 'name-use' (http://hl7.org/fhir/ValueSet/name-use), but the binding is of strength 'required'");
            }
        }
    }
    // date format validation for birthDate
    if (typeof _bRes.birthDate === 'string' && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(_bRes.birthDate)) {
        errors.push("Not a valid date format: '" + _bRes.birthDate + "'");
    }
    // dateTime format validation for deceasedDateTime (choice type)
    if (typeof _bRes.deceasedDateTime === 'string' && !/^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?)?)?$/.test(_bRes.deceasedDateTime)) {
        errors.push("Not a valid date/time format: '" + _bRes.deceasedDateTime + "'");
    }
    // Choice-type narrowing: deceased[x] allows only: boolean, dateTime
    {
        const _ckAllowed = ['deceasedBoolean', 'deceasedDateTime'];
        for (const _ckKey of Object.keys(_bRes)) {
            if (_ckKey.startsWith('deceased') && _ckKey.length > 8 && _ckKey.charCodeAt(8) >= 65 && _ckKey.charCodeAt(8) <= 90 && !_ckAllowed.includes(_ckKey) && _bRes[_ckKey] !== undefined) {
                errors.push("The Profile 'http://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips' definition allows for the type boolean, dateTime but found type " + _ckKey.substring(8));
            }
        }
    }
    // Choice-type narrowing: multipleBirth[x] allows only: boolean, integer
    {
        const _ckAllowed = ['multipleBirthBoolean', 'multipleBirthInteger'];
        for (const _ckKey of Object.keys(_bRes)) {
            if (_ckKey.startsWith('multipleBirth') && _ckKey.length > 13 && _ckKey.charCodeAt(13) >= 65 && _ckKey.charCodeAt(13) <= 90 && !_ckAllowed.includes(_ckKey) && _bRes[_ckKey] !== undefined) {
                errors.push("The Profile 'http://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips' definition allows for the type boolean, integer but found type " + _ckKey.substring(13));
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
