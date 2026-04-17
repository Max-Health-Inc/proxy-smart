import fhirpath from "fhirpath";
import fhirpath_model from "fhirpath/fhir-context/r4/index.js";
import { isValidEventStatusCode } from './valuesets/ValueSet-EventStatus.js';
import { validateCodeableConceptIPS } from './CodeableConceptIPS.js';
export async function validateProcedureUvIps(resource, options) {
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
    const result0 = await fhirpath.evaluate(resource, "Procedure.all(contained.contained.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result0.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL NOT contain nested Resources");
    }
    const result1 = await fhirpath.evaluate(resource, "Procedure.all(contained.where((('#'+id in (%resource.descendants().reference | %resource.descendants().as(canonical) | %resource.descendants().as(uri) | %resource.descendants().as(url))) or descendants().where(reference = '#').exists() or descendants().where(as(canonical) = '#').exists() or descendants().where(as(canonical) = '#').exists()).not()).trace('unmatched', id).empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result1.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL be referred to from elsewhere in the resource or SHALL refer to the containing resource");
    }
    const result2 = await fhirpath.evaluate(resource, "Procedure.all(contained.meta.versionId.empty() and contained.meta.lastUpdated.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result2.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a meta.versionId or a meta.lastUpdated");
    }
    const result3 = await fhirpath.evaluate(resource, "Procedure.all(contained.meta.security.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result3.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a security label");
    }
    const result4 = await fhirpath.evaluate(resource, "Procedure.all(text.`div`.exists())", { resource }, fhirpath_model, fhirpathOptions);
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
    const result12 = await fhirpath.evaluate(resource, "instantiatesCanonical.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result12.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result13 = await fhirpath.evaluate(resource, "instantiatesUri.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result13.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result14 = await fhirpath.evaluate(resource, "basedOn.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result14.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result15 = await fhirpath.evaluate(resource, "partOf.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result15.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result16 = await fhirpath.evaluate(resource, "status.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result16.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result17 = await fhirpath.evaluate(resource, "statusReason.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result17.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result18 = await fhirpath.evaluate(resource, "category.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result18.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result19 = await fhirpath.evaluate(resource, "code.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result19.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result20 = await fhirpath.evaluate(resource, "subject.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result20.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result21 = await fhirpath.evaluate(resource, "encounter.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result21.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result22 = await fhirpath.evaluate(resource, "performed.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result22.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result23 = await fhirpath.evaluate(resource, "recorder.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result23.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result24 = await fhirpath.evaluate(resource, "asserter.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result24.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result25 = await fhirpath.evaluate(resource, "performer.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result25.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result26 = await fhirpath.evaluate(resource, "location.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result26.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result27 = await fhirpath.evaluate(resource, "reasonCode.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result27.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result28 = await fhirpath.evaluate(resource, "reasonReference.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result28.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result29 = await fhirpath.evaluate(resource, "bodySite.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result29.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result30 = await fhirpath.evaluate(resource, "outcome.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result30.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result31 = await fhirpath.evaluate(resource, "report.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result31.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result32 = await fhirpath.evaluate(resource, "complication.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result32.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result33 = await fhirpath.evaluate(resource, "complicationDetail.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result33.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result34 = await fhirpath.evaluate(resource, "followUp.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result34.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result35 = await fhirpath.evaluate(resource, "note.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result35.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result36 = await fhirpath.evaluate(resource, "focalDevice.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result36.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result37 = await fhirpath.evaluate(resource, "usedReference.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result37.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result38 = await fhirpath.evaluate(resource, "usedCode.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result38.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result39 = await fhirpath.evaluate(resource, "DomainResource.all(contained.contained.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result39.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL NOT contain nested Resources");
    }
    const result40 = await fhirpath.evaluate(resource, "DomainResource.all(contained.where((('#'+id in (%resource.descendants().reference | %resource.descendants().as(canonical) | %resource.descendants().as(uri) | %resource.descendants().as(url))) or descendants().where(reference = '#').exists() or descendants().where(as(canonical) = '#').exists() or descendants().where(as(canonical) = '#').exists()).not()).trace('unmatched', id).empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result40.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL be referred to from elsewhere in the resource or SHALL refer to the containing resource");
    }
    const result41 = await fhirpath.evaluate(resource, "DomainResource.all(contained.meta.versionId.empty() and contained.meta.lastUpdated.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result41.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a meta.versionId or a meta.lastUpdated");
    }
    const result42 = await fhirpath.evaluate(resource, "DomainResource.all(contained.meta.security.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result42.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a security label");
    }
    const result43 = await fhirpath.evaluate(resource, "DomainResource.all(text.`div`.exists())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result43.every(Boolean)) {
        warnings.push("Constraint violation: A resource should have narrative for robust management");
    }
    const result44 = await fhirpath.evaluate(resource, "performedDateTime.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result44.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result45 = await fhirpath.evaluate(resource, "status.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result45.every(Boolean)) {
        errors.push("Constraint violation: status must be present");
    }
    const result46 = await fhirpath.evaluate(resource, "code.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result46.every(Boolean)) {
        errors.push("Constraint violation: code must be present");
    }
    const result47 = await fhirpath.evaluate(resource, "subject.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result47.every(Boolean)) {
        errors.push("Constraint violation: subject must be present");
    }
    const result48 = await fhirpath.evaluate(resource, "performed.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result48.every(Boolean)) {
        errors.push("Constraint violation: performed must be present");
    }
    // Nested required field: performer.actor (min=1)
    if (resource.performer && Array.isArray(resource.performer)) {
        for (const _el of resource.performer) {
            if ((_el.actor === undefined || _el.actor === null) || Array.isArray(_el.actor)) {
                errors.push("Missing required member: 'actor'");
            }
        }
    }
    // Nested required field: focalDevice.manipulated (min=1)
    if (resource.focalDevice && Array.isArray(resource.focalDevice)) {
        for (const _el of resource.focalDevice) {
            if ((_el.manipulated === undefined || _el.manipulated === null) || Array.isArray(_el.manipulated)) {
                errors.push("Missing required member: 'manipulated'");
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
    // Structural type check: instantiatesCanonical must be a JSON Array
    if (_bRes.instantiatesCanonical !== undefined && _bRes.instantiatesCanonical !== null && !Array.isArray(_bRes.instantiatesCanonical)) {
        errors.push("The property instantiatesCanonical must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: instantiatesUri must be a JSON Array
    if (_bRes.instantiatesUri !== undefined && _bRes.instantiatesUri !== null && !Array.isArray(_bRes.instantiatesUri)) {
        errors.push("The property instantiatesUri must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: basedOn must be a JSON Array
    if (_bRes.basedOn !== undefined && _bRes.basedOn !== null && !Array.isArray(_bRes.basedOn)) {
        errors.push("The property basedOn must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: partOf must be a JSON Array
    if (_bRes.partOf !== undefined && _bRes.partOf !== null && !Array.isArray(_bRes.partOf)) {
        errors.push("The property partOf must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: statusReason must be an Object, not a Primitive
    if (_bRes.statusReason !== undefined && _bRes.statusReason !== null && typeof _bRes.statusReason !== 'object') {
        errors.push("The property statusReason must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".statusReason)");
    }
    // Structural type check: category must be an Object, not a Primitive
    if (_bRes.category !== undefined && _bRes.category !== null && typeof _bRes.category !== 'object') {
        errors.push("The property category must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".category)");
    }
    // Structural type check: code must be an Object, not a Primitive
    if (_bRes.code !== undefined && _bRes.code !== null && typeof _bRes.code !== 'object') {
        errors.push("The property code must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".code)");
    }
    // Structural type check: subject must be an Object, not a Primitive
    if (_bRes.subject !== undefined && _bRes.subject !== null && typeof _bRes.subject !== 'object') {
        errors.push("The property subject must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".subject)");
    }
    // Structural type check: encounter must be an Object, not a Primitive
    if (_bRes.encounter !== undefined && _bRes.encounter !== null && typeof _bRes.encounter !== 'object') {
        errors.push("The property encounter must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".encounter)");
    }
    // Structural type check: recorder must be an Object, not a Primitive
    if (_bRes.recorder !== undefined && _bRes.recorder !== null && typeof _bRes.recorder !== 'object') {
        errors.push("The property recorder must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".recorder)");
    }
    // Structural type check: asserter must be an Object, not a Primitive
    if (_bRes.asserter !== undefined && _bRes.asserter !== null && typeof _bRes.asserter !== 'object') {
        errors.push("The property asserter must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".asserter)");
    }
    // Structural type check: performer must be a JSON Array
    if (_bRes.performer !== undefined && _bRes.performer !== null && !Array.isArray(_bRes.performer)) {
        errors.push("The property performer must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: location must be an Object, not a Primitive
    if (_bRes.location !== undefined && _bRes.location !== null && typeof _bRes.location !== 'object') {
        errors.push("The property location must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".location)");
    }
    // Structural type check: reasonCode must be a JSON Array
    if (_bRes.reasonCode !== undefined && _bRes.reasonCode !== null && !Array.isArray(_bRes.reasonCode)) {
        errors.push("The property reasonCode must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: reasonReference must be a JSON Array
    if (_bRes.reasonReference !== undefined && _bRes.reasonReference !== null && !Array.isArray(_bRes.reasonReference)) {
        errors.push("The property reasonReference must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: bodySite must be a JSON Array
    if (_bRes.bodySite !== undefined && _bRes.bodySite !== null && !Array.isArray(_bRes.bodySite)) {
        errors.push("The property bodySite must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: outcome must be an Object, not a Primitive
    if (_bRes.outcome !== undefined && _bRes.outcome !== null && typeof _bRes.outcome !== 'object') {
        errors.push("The property outcome must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".outcome)");
    }
    // Structural type check: report must be a JSON Array
    if (_bRes.report !== undefined && _bRes.report !== null && !Array.isArray(_bRes.report)) {
        errors.push("The property report must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: complication must be a JSON Array
    if (_bRes.complication !== undefined && _bRes.complication !== null && !Array.isArray(_bRes.complication)) {
        errors.push("The property complication must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: complicationDetail must be a JSON Array
    if (_bRes.complicationDetail !== undefined && _bRes.complicationDetail !== null && !Array.isArray(_bRes.complicationDetail)) {
        errors.push("The property complicationDetail must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: followUp must be a JSON Array
    if (_bRes.followUp !== undefined && _bRes.followUp !== null && !Array.isArray(_bRes.followUp)) {
        errors.push("The property followUp must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: note must be a JSON Array
    if (_bRes.note !== undefined && _bRes.note !== null && !Array.isArray(_bRes.note)) {
        errors.push("The property note must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: focalDevice must be a JSON Array
    if (_bRes.focalDevice !== undefined && _bRes.focalDevice !== null && !Array.isArray(_bRes.focalDevice)) {
        errors.push("The property focalDevice must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: usedReference must be a JSON Array
    if (_bRes.usedReference !== undefined && _bRes.usedReference !== null && !Array.isArray(_bRes.usedReference)) {
        errors.push("The property usedReference must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: usedCode must be a JSON Array
    if (_bRes.usedCode !== undefined && _bRes.usedCode !== null && !Array.isArray(_bRes.usedCode)) {
        errors.push("The property usedCode must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
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
    // Required ValueSet binding validation for status
    if (_bRes.status !== undefined && !isValidEventStatusCode(_bRes.status)) {
        errors.push("Code '" + _bRes.status + "' does not exist in the value set 'event-status' (http://hl7.org/fhir/ValueSet/event-status), but the binding is of strength 'required'");
    }
    // dateTime format validation for performedDateTime (choice type)
    if (typeof _bRes.performedDateTime === 'string' && !/^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?)?)?$/.test(_bRes.performedDateTime)) {
        errors.push("Not a valid date/time format: '" + _bRes.performedDateTime + "'");
    }
    // dateTime format validation for performedDateTime (choice type)
    if (typeof _bRes.performedDateTime === 'string' && !/^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?)?)?$/.test(_bRes.performedDateTime)) {
        errors.push("Not a valid date/time format: '" + _bRes.performedDateTime + "'");
    }
    // Choice-type narrowing: performed[x] allows only: dateTime, Period, string, Age, Range
    {
        const _ckAllowed = ['performedDateTime', 'performedPeriod', 'performedString', 'performedAge', 'performedRange'];
        for (const _ckKey of Object.keys(_bRes)) {
            if (_ckKey.startsWith('performed') && _ckKey.length > 9 && _ckKey.charCodeAt(9) >= 65 && _ckKey.charCodeAt(9) <= 90 && !_ckAllowed.includes(_ckKey) && _bRes[_ckKey] !== undefined) {
                errors.push("The Profile 'http://hl7.org/fhir/uv/ips/StructureDefinition/Procedure-uv-ips' definition allows for the type dateTime, Period, string, Age, Range but found type " + _ckKey.substring(9));
            }
        }
    }
    // Profiled datatype delegation: code → CodeableConceptIPS
    if (resource.code) {
        const _sub = await validateCodeableConceptIPS(resource.code, options);
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
