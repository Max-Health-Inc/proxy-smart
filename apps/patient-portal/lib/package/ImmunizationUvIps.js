import fhirpath from "fhirpath";
import fhirpath_model from "fhirpath/fhir-context/r4/index.js";
import { isValidImmunizationStatusCode } from './valuesets/ValueSet-ImmunizationStatus.js';
import { validateCodeableConceptIPS } from './CodeableConceptIPS.js';
export async function validateImmunizationUvIps(resource, options) {
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
    const result0 = await fhirpath.evaluate(resource, "Immunization.all(contained.contained.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result0.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL NOT contain nested Resources");
    }
    const result1 = await fhirpath.evaluate(resource, "Immunization.all(contained.where((('#'+id in (%resource.descendants().reference | %resource.descendants().as(canonical) | %resource.descendants().as(uri) | %resource.descendants().as(url))) or descendants().where(reference = '#').exists() or descendants().where(as(canonical) = '#').exists() or descendants().where(as(canonical) = '#').exists()).not()).trace('unmatched', id).empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result1.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL be referred to from elsewhere in the resource or SHALL refer to the containing resource");
    }
    const result2 = await fhirpath.evaluate(resource, "Immunization.all(contained.meta.versionId.empty() and contained.meta.lastUpdated.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result2.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a meta.versionId or a meta.lastUpdated");
    }
    const result3 = await fhirpath.evaluate(resource, "Immunization.all(contained.meta.security.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result3.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a security label");
    }
    const result4 = await fhirpath.evaluate(resource, "Immunization.all(text.`div`.exists())", { resource }, fhirpath_model, fhirpathOptions);
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
    const result12 = await fhirpath.evaluate(resource, "status.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result12.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result13 = await fhirpath.evaluate(resource, "statusReason.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result13.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result14 = await fhirpath.evaluate(resource, "vaccineCode.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result14.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result15 = await fhirpath.evaluate(resource, "patient.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result15.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result16 = await fhirpath.evaluate(resource, "encounter.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result16.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result17 = await fhirpath.evaluate(resource, "occurrence.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result17.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result18 = await fhirpath.evaluate(resource, "recorded.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result18.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result19 = await fhirpath.evaluate(resource, "primarySource.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result19.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result20 = await fhirpath.evaluate(resource, "reportOrigin.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result20.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result21 = await fhirpath.evaluate(resource, "location.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result21.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result22 = await fhirpath.evaluate(resource, "manufacturer.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result22.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result23 = await fhirpath.evaluate(resource, "lotNumber.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result23.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result24 = await fhirpath.evaluate(resource, "expirationDate.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result24.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result25 = await fhirpath.evaluate(resource, "site.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result25.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result26 = await fhirpath.evaluate(resource, "route.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result26.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result27 = await fhirpath.evaluate(resource, "doseQuantity.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result27.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result28 = await fhirpath.evaluate(resource, "performer.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result28.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result29 = await fhirpath.evaluate(resource, "note.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result29.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result30 = await fhirpath.evaluate(resource, "reasonCode.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result30.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result31 = await fhirpath.evaluate(resource, "reasonReference.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result31.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result32 = await fhirpath.evaluate(resource, "isSubpotent.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result32.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result33 = await fhirpath.evaluate(resource, "subpotentReason.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result33.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result34 = await fhirpath.evaluate(resource, "education.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result34.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result35 = await fhirpath.evaluate(resource, "education.all(documentType.exists() or reference.exists())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result35.every(Boolean)) {
        errors.push("Constraint violation: One of documentType or reference SHALL be present");
    }
    const result36 = await fhirpath.evaluate(resource, "programEligibility.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result36.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result37 = await fhirpath.evaluate(resource, "fundingSource.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result37.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result38 = await fhirpath.evaluate(resource, "reaction.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result38.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result39 = await fhirpath.evaluate(resource, "protocolApplied.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result39.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result40 = await fhirpath.evaluate(resource, "DomainResource.all(contained.contained.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result40.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL NOT contain nested Resources");
    }
    const result41 = await fhirpath.evaluate(resource, "DomainResource.all(contained.where((('#'+id in (%resource.descendants().reference | %resource.descendants().as(canonical) | %resource.descendants().as(uri) | %resource.descendants().as(url))) or descendants().where(reference = '#').exists() or descendants().where(as(canonical) = '#').exists() or descendants().where(as(canonical) = '#').exists()).not()).trace('unmatched', id).empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result41.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL be referred to from elsewhere in the resource or SHALL refer to the containing resource");
    }
    const result42 = await fhirpath.evaluate(resource, "DomainResource.all(contained.meta.versionId.empty() and contained.meta.lastUpdated.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result42.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a meta.versionId or a meta.lastUpdated");
    }
    const result43 = await fhirpath.evaluate(resource, "DomainResource.all(contained.meta.security.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result43.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a security label");
    }
    const result44 = await fhirpath.evaluate(resource, "DomainResource.all(text.`div`.exists())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result44.every(Boolean)) {
        warnings.push("Constraint violation: A resource should have narrative for robust management");
    }
    const result45 = await fhirpath.evaluate(resource, "occurrenceDateTime.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result45.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result46 = await fhirpath.evaluate(resource, "status.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result46.every(Boolean)) {
        errors.push("Constraint violation: status must be present");
    }
    const result47 = await fhirpath.evaluate(resource, "vaccineCode.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result47.every(Boolean)) {
        errors.push("Constraint violation: vaccineCode must be present");
    }
    const result48 = await fhirpath.evaluate(resource, "patient.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result48.every(Boolean)) {
        errors.push("Constraint violation: patient must be present");
    }
    const result49 = await fhirpath.evaluate(resource, "occurrence.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result49.every(Boolean)) {
        errors.push("Constraint violation: occurrence must be present");
    }
    // Nested required field: performer.actor (min=1)
    if (resource.performer && Array.isArray(resource.performer)) {
        for (const _el of resource.performer) {
            if ((_el.actor === undefined || _el.actor === null) || Array.isArray(_el.actor)) {
                errors.push("Missing required member: 'actor'");
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
    // Structural type check: statusReason must be an Object, not a Primitive
    if (_bRes.statusReason !== undefined && _bRes.statusReason !== null && typeof _bRes.statusReason !== 'object') {
        errors.push("The property statusReason must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".statusReason)");
    }
    // Structural type check: vaccineCode must be an Object, not a Primitive
    if (_bRes.vaccineCode !== undefined && _bRes.vaccineCode !== null && typeof _bRes.vaccineCode !== 'object') {
        errors.push("The property vaccineCode must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".vaccineCode)");
    }
    // Structural type check: patient must be an Object, not a Primitive
    if (_bRes.patient !== undefined && _bRes.patient !== null && typeof _bRes.patient !== 'object') {
        errors.push("The property patient must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".patient)");
    }
    // Structural type check: encounter must be an Object, not a Primitive
    if (_bRes.encounter !== undefined && _bRes.encounter !== null && typeof _bRes.encounter !== 'object') {
        errors.push("The property encounter must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".encounter)");
    }
    // Structural type check: reportOrigin must be an Object, not a Primitive
    if (_bRes.reportOrigin !== undefined && _bRes.reportOrigin !== null && typeof _bRes.reportOrigin !== 'object') {
        errors.push("The property reportOrigin must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".reportOrigin)");
    }
    // Structural type check: location must be an Object, not a Primitive
    if (_bRes.location !== undefined && _bRes.location !== null && typeof _bRes.location !== 'object') {
        errors.push("The property location must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".location)");
    }
    // Structural type check: manufacturer must be an Object, not a Primitive
    if (_bRes.manufacturer !== undefined && _bRes.manufacturer !== null && typeof _bRes.manufacturer !== 'object') {
        errors.push("The property manufacturer must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".manufacturer)");
    }
    // Structural type check: site must be an Object, not a Primitive
    if (_bRes.site !== undefined && _bRes.site !== null && typeof _bRes.site !== 'object') {
        errors.push("The property site must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".site)");
    }
    // Structural type check: route must be an Object, not a Primitive
    if (_bRes.route !== undefined && _bRes.route !== null && typeof _bRes.route !== 'object') {
        errors.push("The property route must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".route)");
    }
    // Structural type check: doseQuantity must be an Object, not a Primitive
    if (_bRes.doseQuantity !== undefined && _bRes.doseQuantity !== null && typeof _bRes.doseQuantity !== 'object') {
        errors.push("The property doseQuantity must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".doseQuantity)");
    }
    // Structural type check: performer must be a JSON Array
    if (_bRes.performer !== undefined && _bRes.performer !== null && !Array.isArray(_bRes.performer)) {
        errors.push("The property performer must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: note must be a JSON Array
    if (_bRes.note !== undefined && _bRes.note !== null && !Array.isArray(_bRes.note)) {
        errors.push("The property note must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: reasonCode must be a JSON Array
    if (_bRes.reasonCode !== undefined && _bRes.reasonCode !== null && !Array.isArray(_bRes.reasonCode)) {
        errors.push("The property reasonCode must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: reasonReference must be a JSON Array
    if (_bRes.reasonReference !== undefined && _bRes.reasonReference !== null && !Array.isArray(_bRes.reasonReference)) {
        errors.push("The property reasonReference must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: subpotentReason must be a JSON Array
    if (_bRes.subpotentReason !== undefined && _bRes.subpotentReason !== null && !Array.isArray(_bRes.subpotentReason)) {
        errors.push("The property subpotentReason must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: education must be a JSON Array
    if (_bRes.education !== undefined && _bRes.education !== null && !Array.isArray(_bRes.education)) {
        errors.push("The property education must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: programEligibility must be a JSON Array
    if (_bRes.programEligibility !== undefined && _bRes.programEligibility !== null && !Array.isArray(_bRes.programEligibility)) {
        errors.push("The property programEligibility must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: fundingSource must be an Object, not a Primitive
    if (_bRes.fundingSource !== undefined && _bRes.fundingSource !== null && typeof _bRes.fundingSource !== 'object') {
        errors.push("The property fundingSource must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".fundingSource)");
    }
    // Structural type check: reaction must be a JSON Array
    if (_bRes.reaction !== undefined && _bRes.reaction !== null && !Array.isArray(_bRes.reaction)) {
        errors.push("The property reaction must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: protocolApplied must be a JSON Array
    if (_bRes.protocolApplied !== undefined && _bRes.protocolApplied !== null && !Array.isArray(_bRes.protocolApplied)) {
        errors.push("The property protocolApplied must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
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
    if (_bRes.status !== undefined && !isValidImmunizationStatusCode(_bRes.status)) {
        errors.push("Code '" + _bRes.status + "' does not exist in the value set 'immunization-status' (http://hl7.org/fhir/ValueSet/immunization-status), but the binding is of strength 'required'");
    }
    // dateTime format validation for occurrenceDateTime (choice type)
    if (typeof _bRes.occurrenceDateTime === 'string' && !/^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?)?)?$/.test(_bRes.occurrenceDateTime)) {
        errors.push("Not a valid date/time format: '" + _bRes.occurrenceDateTime + "'");
    }
    // dateTime format validation for recorded
    if (typeof _bRes.recorded === 'string' && !/^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?)?)?$/.test(_bRes.recorded)) {
        errors.push("Not a valid date/time format: '" + _bRes.recorded + "'");
    }
    // date format validation for expirationDate
    if (typeof _bRes.expirationDate === 'string' && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(_bRes.expirationDate)) {
        errors.push("Not a valid date format: '" + _bRes.expirationDate + "'");
    }
    // dateTime format validation for occurrenceDateTime (choice type)
    if (typeof _bRes.occurrenceDateTime === 'string' && !/^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?)?)?$/.test(_bRes.occurrenceDateTime)) {
        errors.push("Not a valid date/time format: '" + _bRes.occurrenceDateTime + "'");
    }
    // Choice-type narrowing: occurrence[x] allows only: dateTime, string
    {
        const _ckAllowed = ['occurrenceDateTime', 'occurrenceString'];
        for (const _ckKey of Object.keys(_bRes)) {
            if (_ckKey.startsWith('occurrence') && _ckKey.length > 10 && _ckKey.charCodeAt(10) >= 65 && _ckKey.charCodeAt(10) <= 90 && !_ckAllowed.includes(_ckKey) && _bRes[_ckKey] !== undefined) {
                errors.push("The Profile 'http://hl7.org/fhir/uv/ips/StructureDefinition/Immunization-uv-ips' definition allows for the type dateTime, string but found type " + _ckKey.substring(10));
            }
        }
    }
    // Profiled datatype delegation: vaccineCode → CodeableConceptIPS
    if (resource.vaccineCode) {
        const _sub = await validateCodeableConceptIPS(resource.vaccineCode, options);
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
