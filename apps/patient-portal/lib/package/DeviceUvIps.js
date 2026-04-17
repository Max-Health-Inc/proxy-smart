import fhirpath from "fhirpath";
import fhirpath_model from "fhirpath/fhir-context/r4/index.js";
import { isValidUdiEntryTypeCode } from './valuesets/ValueSet-UdiEntryType.js';
import { isValidDeviceStatusCode } from './valuesets/ValueSet-DeviceStatus.js';
import { isValidDeviceNametypeCode } from './valuesets/ValueSet-DeviceNametype.js';
import { validateCodeableConceptIPS } from './CodeableConceptIPS.js';
export async function validateDeviceUvIps(resource, options) {
    const errors = [];
    const warnings = [];
    const fhirpathOptions = {
        preciseMath: true,
        traceFn: options?.traceFn ?? (() => { }),
        ...(options?.signal ? { signal: options.signal } : {}),
        ...(options?.httpHeaders ? { httpHeaders: options.httpHeaders } : {}),
        async: true,
        ...(options?.terminologyUrl ? { terminologyUrl: options.terminologyUrl } : {}),
        ...(options?.fhirServerUrl ? { fhirServerUrl: options.fhirServerUrl } : {}),
    };
    const result0 = await fhirpath.evaluate(resource, "Device.all(contained.contained.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result0.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL NOT contain nested Resources");
    }
    const result1 = await fhirpath.evaluate(resource, "Device.all(contained.where((('#'+id in (%resource.descendants().reference | %resource.descendants().as(canonical) | %resource.descendants().as(uri) | %resource.descendants().as(url))) or descendants().where(reference = '#').exists() or descendants().where(as(canonical) = '#').exists() or descendants().where(as(canonical) = '#').exists()).not()).trace('unmatched', id).empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result1.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL be referred to from elsewhere in the resource or SHALL refer to the containing resource");
    }
    const result2 = await fhirpath.evaluate(resource, "Device.all(contained.meta.versionId.empty() and contained.meta.lastUpdated.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result2.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a meta.versionId or a meta.lastUpdated");
    }
    const result3 = await fhirpath.evaluate(resource, "Device.all(contained.meta.security.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result3.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a security label");
    }
    const result4 = await fhirpath.evaluate(resource, "Device.all(text.`div`.exists())", { resource }, fhirpath_model, fhirpathOptions);
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
    const result12 = await fhirpath.evaluate(resource, "definition.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result12.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result13 = await fhirpath.evaluate(resource, "udiCarrier.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result13.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result14 = await fhirpath.evaluate(resource, "status.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result14.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result15 = await fhirpath.evaluate(resource, "statusReason.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result15.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result16 = await fhirpath.evaluate(resource, "distinctIdentifier.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result16.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result17 = await fhirpath.evaluate(resource, "manufacturer.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result17.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result18 = await fhirpath.evaluate(resource, "manufactureDate.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result18.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result19 = await fhirpath.evaluate(resource, "expirationDate.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result19.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result20 = await fhirpath.evaluate(resource, "lotNumber.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result20.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result21 = await fhirpath.evaluate(resource, "serialNumber.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result21.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result22 = await fhirpath.evaluate(resource, "deviceName.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result22.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result23 = await fhirpath.evaluate(resource, "modelNumber.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result23.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result24 = await fhirpath.evaluate(resource, "partNumber.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result24.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result25 = await fhirpath.evaluate(resource, "type.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result25.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result26 = await fhirpath.evaluate(resource, "specialization.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result26.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result27 = await fhirpath.evaluate(resource, "version.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result27.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result28 = await fhirpath.evaluate(resource, "property.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result28.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result29 = await fhirpath.evaluate(resource, "patient.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result29.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result30 = await fhirpath.evaluate(resource, "owner.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result30.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result31 = await fhirpath.evaluate(resource, "contact.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result31.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result32 = await fhirpath.evaluate(resource, "location.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result32.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result33 = await fhirpath.evaluate(resource, "url.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result33.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result34 = await fhirpath.evaluate(resource, "note.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result34.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result35 = await fhirpath.evaluate(resource, "safety.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result35.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result36 = await fhirpath.evaluate(resource, "parent.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result36.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result37 = await fhirpath.evaluate(resource, "DomainResource.all(contained.contained.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result37.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL NOT contain nested Resources");
    }
    const result38 = await fhirpath.evaluate(resource, "DomainResource.all(contained.where((('#'+id in (%resource.descendants().reference | %resource.descendants().as(canonical) | %resource.descendants().as(uri) | %resource.descendants().as(url))) or descendants().where(reference = '#').exists() or descendants().where(as(canonical) = '#').exists() or descendants().where(as(canonical) = '#').exists()).not()).trace('unmatched', id).empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result38.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL be referred to from elsewhere in the resource or SHALL refer to the containing resource");
    }
    const result39 = await fhirpath.evaluate(resource, "DomainResource.all(contained.meta.versionId.empty() and contained.meta.lastUpdated.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result39.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a meta.versionId or a meta.lastUpdated");
    }
    const result40 = await fhirpath.evaluate(resource, "DomainResource.all(contained.meta.security.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result40.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a security label");
    }
    const result41 = await fhirpath.evaluate(resource, "DomainResource.all(text.`div`.exists())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result41.every(Boolean)) {
        warnings.push("Constraint violation: A resource should have narrative for robust management");
    }
    // Nested required field: deviceName.name (min=1)
    if (resource.deviceName && Array.isArray(resource.deviceName)) {
        for (const _el of resource.deviceName) {
            if ((_el.name === undefined || _el.name === null) || Array.isArray(_el.name)) {
                errors.push("Missing required member: 'name'");
            }
        }
    }
    // Nested required field: deviceName.type (min=1)
    if (resource.deviceName && Array.isArray(resource.deviceName)) {
        for (const _el of resource.deviceName) {
            if ((_el.type === undefined || _el.type === null) || Array.isArray(_el.type)) {
                errors.push("Missing required member: 'type'");
            }
        }
    }
    // Nested required field: specialization.systemType (min=1)
    if (resource.specialization && Array.isArray(resource.specialization)) {
        for (const _el of resource.specialization) {
            if ((_el.systemType === undefined || _el.systemType === null) || Array.isArray(_el.systemType)) {
                errors.push("Missing required member: 'systemType'");
            }
        }
    }
    // Nested required field: version.value (min=1)
    if (resource.version && Array.isArray(resource.version)) {
        for (const _el of resource.version) {
            if ((_el.value === undefined || _el.value === null) || Array.isArray(_el.value)) {
                errors.push("Missing required member: 'value'");
            }
        }
    }
    // Nested required field: property.type (min=1)
    if (resource.property && Array.isArray(resource.property)) {
        for (const _el of resource.property) {
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
    // Structural type check: definition must be an Object, not a Primitive
    if (_bRes.definition !== undefined && _bRes.definition !== null && typeof _bRes.definition !== 'object') {
        errors.push("The property definition must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".definition)");
    }
    // Structural type check: udiCarrier must be a JSON Array
    if (_bRes.udiCarrier !== undefined && _bRes.udiCarrier !== null && !Array.isArray(_bRes.udiCarrier)) {
        errors.push("The property udiCarrier must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: statusReason must be a JSON Array
    if (_bRes.statusReason !== undefined && _bRes.statusReason !== null && !Array.isArray(_bRes.statusReason)) {
        errors.push("The property statusReason must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: deviceName must be a JSON Array
    if (_bRes.deviceName !== undefined && _bRes.deviceName !== null && !Array.isArray(_bRes.deviceName)) {
        errors.push("The property deviceName must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: type must be an Object, not a Primitive
    if (_bRes.type !== undefined && _bRes.type !== null && typeof _bRes.type !== 'object') {
        errors.push("The property type must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".type)");
    }
    // Structural type check: specialization must be a JSON Array
    if (_bRes.specialization !== undefined && _bRes.specialization !== null && !Array.isArray(_bRes.specialization)) {
        errors.push("The property specialization must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: version must be a JSON Array
    if (_bRes.version !== undefined && _bRes.version !== null && !Array.isArray(_bRes.version)) {
        errors.push("The property version must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: property must be a JSON Array
    if (_bRes.property !== undefined && _bRes.property !== null && !Array.isArray(_bRes.property)) {
        errors.push("The property property must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: patient must be an Object, not a Primitive
    if (_bRes.patient !== undefined && _bRes.patient !== null && typeof _bRes.patient !== 'object') {
        errors.push("The property patient must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".patient)");
    }
    // Structural type check: owner must be an Object, not a Primitive
    if (_bRes.owner !== undefined && _bRes.owner !== null && typeof _bRes.owner !== 'object') {
        errors.push("The property owner must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".owner)");
    }
    // Structural type check: contact must be a JSON Array
    if (_bRes.contact !== undefined && _bRes.contact !== null && !Array.isArray(_bRes.contact)) {
        errors.push("The property contact must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: location must be an Object, not a Primitive
    if (_bRes.location !== undefined && _bRes.location !== null && typeof _bRes.location !== 'object') {
        errors.push("The property location must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".location)");
    }
    // Structural type check: note must be a JSON Array
    if (_bRes.note !== undefined && _bRes.note !== null && !Array.isArray(_bRes.note)) {
        errors.push("The property note must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: safety must be a JSON Array
    if (_bRes.safety !== undefined && _bRes.safety !== null && !Array.isArray(_bRes.safety)) {
        errors.push("The property safety must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: parent must be an Object, not a Primitive
    if (_bRes.parent !== undefined && _bRes.parent !== null && typeof _bRes.parent !== 'object') {
        errors.push("The property parent must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".parent)");
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
    // Required ValueSet binding validation for udiCarrier.entryType (nested)
    if (resource.udiCarrier && Array.isArray(resource.udiCarrier)) {
        for (const _nb0 of resource.udiCarrier) {
            if (_nb0.entryType !== undefined && !isValidUdiEntryTypeCode(_nb0.entryType)) {
                errors.push("Code '" + _nb0.entryType + "' does not exist in the value set 'udi-entry-type' (http://hl7.org/fhir/ValueSet/udi-entry-type), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for status
    if (_bRes.status !== undefined && !isValidDeviceStatusCode(_bRes.status)) {
        errors.push("Code '" + _bRes.status + "' does not exist in the value set 'device-status' (http://hl7.org/fhir/ValueSet/device-status), but the binding is of strength 'required'");
    }
    // Required ValueSet binding validation for deviceName.type (nested)
    if (resource.deviceName && Array.isArray(resource.deviceName)) {
        for (const _nb0 of resource.deviceName) {
            if (_nb0.type !== undefined && !isValidDeviceNametypeCode(_nb0.type)) {
                errors.push("Code '" + _nb0.type + "' does not exist in the value set 'device-nametype' (http://hl7.org/fhir/ValueSet/device-nametype), but the binding is of strength 'required'");
            }
        }
    }
    // dateTime format validation for manufactureDate
    if (typeof _bRes.manufactureDate === 'string' && !/^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?)?)?$/.test(_bRes.manufactureDate)) {
        errors.push("Not a valid date/time format: '" + _bRes.manufactureDate + "'");
    }
    // dateTime format validation for expirationDate
    if (typeof _bRes.expirationDate === 'string' && !/^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?)?)?$/.test(_bRes.expirationDate)) {
        errors.push("Not a valid date/time format: '" + _bRes.expirationDate + "'");
    }
    // Profiled datatype delegation: type → CodeableConceptIPS
    if (resource.type) {
        const _sub = await validateCodeableConceptIPS(resource.type, options);
        errors.push(..._sub.errors);
        warnings.push(..._sub.warnings);
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
