import fhirpath from "fhirpath";
import fhirpath_model from "fhirpath/fhir-context/r4/index.js";
import { isValidCompositionStatusCode } from './valuesets/ValueSet-CompositionStatus.js';
import { isValidV3ConfidentialityClassificationCode } from './valuesets/ValueSet-V3ConfidentialityClassification.js';
import { isValidCompositionAttestationModeCode } from './valuesets/ValueSet-CompositionAttestationMode.js';
import { isValidDocumentRelationshipTypeCode } from './valuesets/ValueSet-DocumentRelationshipType.js';
import { isValidListModeCode } from './valuesets/ValueSet-ListMode.js';
import { validateCodeableConceptIPS } from './CodeableConceptIPS.js';
export async function validateCompositionUvIps(resource, options) {
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
    const result0 = await fhirpath.evaluate(resource, "Composition.all(contained.contained.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result0.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL NOT contain nested Resources");
    }
    const result1 = await fhirpath.evaluate(resource, "Composition.all(contained.where((('#'+id in (%resource.descendants().reference | %resource.descendants().as(canonical) | %resource.descendants().as(uri) | %resource.descendants().as(url))) or descendants().where(reference = '#').exists() or descendants().where(as(canonical) = '#').exists() or descendants().where(as(canonical) = '#').exists()).not()).trace('unmatched', id).empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result1.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL be referred to from elsewhere in the resource or SHALL refer to the containing resource");
    }
    const result2 = await fhirpath.evaluate(resource, "Composition.all(contained.meta.versionId.empty() and contained.meta.lastUpdated.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result2.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a meta.versionId or a meta.lastUpdated");
    }
    const result3 = await fhirpath.evaluate(resource, "Composition.all(contained.meta.security.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result3.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a security label");
    }
    const result4 = await fhirpath.evaluate(resource, "Composition.all(text.`div`.exists())", { resource }, fhirpath_model, fhirpathOptions);
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
    const result13 = await fhirpath.evaluate(resource, "type.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result13.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result14 = await fhirpath.evaluate(resource, "category.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result14.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result15 = await fhirpath.evaluate(resource, "subject.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result15.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result16 = await fhirpath.evaluate(resource, "encounter.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result16.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result17 = await fhirpath.evaluate(resource, "date.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result17.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result18 = await fhirpath.evaluate(resource, "author.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result18.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result19 = await fhirpath.evaluate(resource, "title.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result19.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result20 = await fhirpath.evaluate(resource, "confidentiality.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result20.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result21 = await fhirpath.evaluate(resource, "attester.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result21.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result22 = await fhirpath.evaluate(resource, "custodian.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result22.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result23 = await fhirpath.evaluate(resource, "relatesTo.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result23.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result24 = await fhirpath.evaluate(resource, "event.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result24.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result25 = await fhirpath.evaluate(resource, "section.all(text.exists() or entry.exists() or section.exists())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result25.every(Boolean)) {
        errors.push("Constraint violation: A section must contain at least one of text, entries, or sub-sections");
    }
    const result26 = await fhirpath.evaluate(resource, "section.all(emptyReason.empty() or entry.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result26.every(Boolean)) {
        errors.push("Constraint violation: A section can only have an emptyReason if it is empty");
    }
    const result27 = await fhirpath.evaluate(resource, "section.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result27.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result28 = await fhirpath.evaluate(resource, "DomainResource.all(contained.contained.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result28.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL NOT contain nested Resources");
    }
    const result29 = await fhirpath.evaluate(resource, "DomainResource.all(contained.where((('#'+id in (%resource.descendants().reference | %resource.descendants().as(canonical) | %resource.descendants().as(uri) | %resource.descendants().as(url))) or descendants().where(reference = '#').exists() or descendants().where(as(canonical) = '#').exists() or descendants().where(as(canonical) = '#').exists()).not()).trace('unmatched', id).empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result29.every(Boolean)) {
        errors.push("Constraint violation: If the resource is contained in another resource, it SHALL be referred to from elsewhere in the resource or SHALL refer to the containing resource");
    }
    const result30 = await fhirpath.evaluate(resource, "DomainResource.all(contained.meta.versionId.empty() and contained.meta.lastUpdated.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result30.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a meta.versionId or a meta.lastUpdated");
    }
    const result31 = await fhirpath.evaluate(resource, "DomainResource.all(contained.meta.security.empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result31.every(Boolean)) {
        errors.push("Constraint violation: If a resource is contained in another resource, it SHALL NOT have a security label");
    }
    const result32 = await fhirpath.evaluate(resource, "DomainResource.all(text.`div`.exists())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result32.every(Boolean)) {
        warnings.push("Constraint violation: A resource should have narrative for robust management");
    }
    const result33 = await fhirpath.evaluate(resource, "section.all((entry.reference.exists() or emptyReason.exists()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result33.every(Boolean)) {
        errors.push("Constraint violation: Either section.entry or emptyReason are present");
    }
    const result34 = await fhirpath.evaluate(resource, "status.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result34.every(Boolean)) {
        errors.push("Constraint violation: status must be present");
    }
    const result35 = await fhirpath.evaluate(resource, "type.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result35.every(Boolean)) {
        errors.push("Constraint violation: type must be present");
    }
    const result36 = await fhirpath.evaluate(resource, "subject.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result36.every(Boolean)) {
        errors.push("Constraint violation: subject must be present");
    }
    const result37 = await fhirpath.evaluate(resource, "date.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result37.every(Boolean)) {
        errors.push("Constraint violation: date must be present");
    }
    const result38 = await fhirpath.evaluate(resource, "author.count() >= 1", { resource }, fhirpath_model, fhirpathOptions);
    if (!result38.every(Boolean)) {
        errors.push("Constraint violation: author must contain at least one element");
    }
    const result39 = await fhirpath.evaluate(resource, "title.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result39.every(Boolean)) {
        errors.push("Constraint violation: title must be present");
    }
    const result40 = await fhirpath.evaluate(resource, "section.count() >= 3", { resource }, fhirpath_model, fhirpathOptions);
    if (!result40.every(Boolean)) {
        errors.push("Constraint violation: section must contain at least 3 elements");
    }
    const result41 = await fhirpath.evaluate(resource, "section.count() >= 1", { resource }, fhirpath_model, fhirpathOptions);
    if (!result41.every(Boolean)) {
        errors.push("Constraint violation: section must contain at least one element");
    }
    const result42 = await fhirpath.evaluate(resource, "section.section.exists().not()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result42.every(Boolean)) {
        errors.push("Constraint violation: section.section: max allowed = 0, but found 1");
    }
    // Pattern constraint for type: must include coding with system="http://loinc.org" and code="60591-5"
    if (resource.type) {
        const type_pattern0Valid = resource.type.coding?.some((coding) => coding?.system === "http://loinc.org" && coding?.code === "60591-5");
        if (!type_pattern0Valid) {
            errors.push("type must include a coding with system 'http://loinc.org' and code '60591-5'");
        }
    }
    // Nested required field: attester.mode (min=1)
    if (resource.attester && Array.isArray(resource.attester)) {
        for (const _el of resource.attester) {
            if ((_el.mode === undefined || _el.mode === null) || Array.isArray(_el.mode)) {
                errors.push("Missing required member: 'mode'");
            }
        }
    }
    // Nested required field: relatesTo.code (min=1)
    if (resource.relatesTo && Array.isArray(resource.relatesTo)) {
        for (const _el of resource.relatesTo) {
            if ((_el.code === undefined || _el.code === null) || Array.isArray(_el.code)) {
                errors.push("Missing required member: 'code'");
            }
        }
    }
    // Nested required field: section.title (min=1)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _el of resource.section) {
            if ((_el.title === undefined || _el.title === null) || Array.isArray(_el.title)) {
                errors.push("Missing required member: 'title'");
            }
        }
    }
    // Nested required field: section.code (min=1)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _el of resource.section) {
            if ((_el.code === undefined || _el.code === null) || Array.isArray(_el.code)) {
                errors.push("Missing required member: 'code'");
            }
        }
    }
    // Nested required field: section.text (min=1)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _el of resource.section) {
            if ((_el.text === undefined || _el.text === null) || Array.isArray(_el.text)) {
                errors.push("Missing required member: 'text'");
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
    // Structural type check: identifier must be an Object, not a Primitive
    if (_bRes.identifier !== undefined && _bRes.identifier !== null && typeof _bRes.identifier !== 'object') {
        errors.push("The property identifier must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".identifier)");
    }
    // Structural type check: type must be an Object, not a Primitive
    if (_bRes.type !== undefined && _bRes.type !== null && typeof _bRes.type !== 'object') {
        errors.push("The property type must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".type)");
    }
    // Structural type check: category must be a JSON Array
    if (_bRes.category !== undefined && _bRes.category !== null && !Array.isArray(_bRes.category)) {
        errors.push("The property category must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: subject must be an Object, not a Primitive
    if (_bRes.subject !== undefined && _bRes.subject !== null && typeof _bRes.subject !== 'object') {
        errors.push("The property subject must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".subject)");
    }
    // Structural type check: encounter must be an Object, not a Primitive
    if (_bRes.encounter !== undefined && _bRes.encounter !== null && typeof _bRes.encounter !== 'object') {
        errors.push("The property encounter must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".encounter)");
    }
    // Structural type check: author must be a JSON Array
    if (_bRes.author !== undefined && _bRes.author !== null && !Array.isArray(_bRes.author)) {
        errors.push("The property author must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: attester must be a JSON Array
    if (_bRes.attester !== undefined && _bRes.attester !== null && !Array.isArray(_bRes.attester)) {
        errors.push("The property attester must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: custodian must be an Object, not a Primitive
    if (_bRes.custodian !== undefined && _bRes.custodian !== null && typeof _bRes.custodian !== 'object') {
        errors.push("The property custodian must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".custodian)");
    }
    // Structural type check: relatesTo must be a JSON Array
    if (_bRes.relatesTo !== undefined && _bRes.relatesTo !== null && !Array.isArray(_bRes.relatesTo)) {
        errors.push("The property relatesTo must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: event must be a JSON Array
    if (_bRes.event !== undefined && _bRes.event !== null && !Array.isArray(_bRes.event)) {
        errors.push("The property event must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: section must be a JSON Array
    if (_bRes.section !== undefined && _bRes.section !== null && !Array.isArray(_bRes.section)) {
        errors.push("The property section must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
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
    // Prohibited field: Composition.section.section (max=0)
    if (_bRes.section && Array.isArray(_bRes.section)) {
        for (const _el of _bRes.section) {
            const _e = _el;
            if (_e?.section !== undefined) {
                errors.push("Composition.section.section: max allowed = 0, but found 1");
            }
        }
    }
    // Required ValueSet binding validation for status
    if (_bRes.status !== undefined && !isValidCompositionStatusCode(_bRes.status)) {
        errors.push("Code '" + _bRes.status + "' does not exist in the value set 'composition-status' (http://hl7.org/fhir/ValueSet/composition-status), but the binding is of strength 'required'");
    }
    // Required ValueSet binding validation for confidentiality
    if (_bRes.confidentiality !== undefined && !isValidV3ConfidentialityClassificationCode(_bRes.confidentiality)) {
        errors.push("Code '" + _bRes.confidentiality + "' does not exist in the value set 'v3-ConfidentialityClassification' (http://terminology.hl7.org/ValueSet/v3-ConfidentialityClassification), but the binding is of strength 'required'");
    }
    // Required ValueSet binding validation for attester.mode (nested)
    if (resource.attester && Array.isArray(resource.attester)) {
        for (const _nb0 of resource.attester) {
            if (_nb0.mode !== undefined && !isValidCompositionAttestationModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'composition-attestation-mode' (http://hl7.org/fhir/ValueSet/composition-attestation-mode), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for relatesTo.code (nested)
    if (resource.relatesTo && Array.isArray(resource.relatesTo)) {
        for (const _nb0 of resource.relatesTo) {
            if (_nb0.code !== undefined && !isValidDocumentRelationshipTypeCode(_nb0.code)) {
                errors.push("Code '" + _nb0.code + "' does not exist in the value set 'document-relationship-type' (http://hl7.org/fhir/ValueSet/document-relationship-type), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for section.mode (nested)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _nb0 of resource.section) {
            if (_nb0.mode !== undefined && !isValidListModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'list-mode' (http://hl7.org/fhir/ValueSet/list-mode), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for section.mode (nested)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _nb0 of resource.section) {
            if (_nb0.mode !== undefined && !isValidListModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'list-mode' (http://hl7.org/fhir/ValueSet/list-mode), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for section.mode (nested)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _nb0 of resource.section) {
            if (_nb0.mode !== undefined && !isValidListModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'list-mode' (http://hl7.org/fhir/ValueSet/list-mode), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for section.mode (nested)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _nb0 of resource.section) {
            if (_nb0.mode !== undefined && !isValidListModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'list-mode' (http://hl7.org/fhir/ValueSet/list-mode), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for section.mode (nested)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _nb0 of resource.section) {
            if (_nb0.mode !== undefined && !isValidListModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'list-mode' (http://hl7.org/fhir/ValueSet/list-mode), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for section.mode (nested)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _nb0 of resource.section) {
            if (_nb0.mode !== undefined && !isValidListModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'list-mode' (http://hl7.org/fhir/ValueSet/list-mode), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for section.mode (nested)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _nb0 of resource.section) {
            if (_nb0.mode !== undefined && !isValidListModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'list-mode' (http://hl7.org/fhir/ValueSet/list-mode), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for section.mode (nested)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _nb0 of resource.section) {
            if (_nb0.mode !== undefined && !isValidListModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'list-mode' (http://hl7.org/fhir/ValueSet/list-mode), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for section.mode (nested)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _nb0 of resource.section) {
            if (_nb0.mode !== undefined && !isValidListModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'list-mode' (http://hl7.org/fhir/ValueSet/list-mode), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for section.mode (nested)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _nb0 of resource.section) {
            if (_nb0.mode !== undefined && !isValidListModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'list-mode' (http://hl7.org/fhir/ValueSet/list-mode), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for section.mode (nested)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _nb0 of resource.section) {
            if (_nb0.mode !== undefined && !isValidListModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'list-mode' (http://hl7.org/fhir/ValueSet/list-mode), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for section.mode (nested)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _nb0 of resource.section) {
            if (_nb0.mode !== undefined && !isValidListModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'list-mode' (http://hl7.org/fhir/ValueSet/list-mode), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for section.mode (nested)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _nb0 of resource.section) {
            if (_nb0.mode !== undefined && !isValidListModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'list-mode' (http://hl7.org/fhir/ValueSet/list-mode), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for section.mode (nested)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _nb0 of resource.section) {
            if (_nb0.mode !== undefined && !isValidListModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'list-mode' (http://hl7.org/fhir/ValueSet/list-mode), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for section.mode (nested)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _nb0 of resource.section) {
            if (_nb0.mode !== undefined && !isValidListModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'list-mode' (http://hl7.org/fhir/ValueSet/list-mode), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for section.mode (nested)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _nb0 of resource.section) {
            if (_nb0.mode !== undefined && !isValidListModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'list-mode' (http://hl7.org/fhir/ValueSet/list-mode), but the binding is of strength 'required'");
            }
        }
    }
    // Required ValueSet binding validation for section.mode (nested)
    if (resource.section && Array.isArray(resource.section)) {
        for (const _nb0 of resource.section) {
            if (_nb0.mode !== undefined && !isValidListModeCode(_nb0.mode)) {
                errors.push("Code '" + _nb0.mode + "' does not exist in the value set 'list-mode' (http://hl7.org/fhir/ValueSet/list-mode), but the binding is of strength 'required'");
            }
        }
    }
    // dateTime format validation for date
    if (typeof _bRes.date === 'string' && !/^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?)?)?$/.test(_bRes.date)) {
        errors.push("Not a valid date/time format: '" + _bRes.date + "'");
    }
    // Required BackboneElement slice validation for section:sectionProblems (discriminated by code)
    if (resource.section && Array.isArray(resource.section)) {
        const sectionProblemsElements = resource.section.filter((item) => item.code?.coding?.some((c) => c.system === "http://loinc.org" && c.code === "11450-4"));
        if (sectionProblemsElements.length < 1) {
            errors.push("No elements matched required slice: 'section:sectionProblems'");
        }
        for (const _matched of sectionProblemsElements) {
            const _m = _matched;
            if (_m.title === undefined || _m.title === null) {
                errors.push("Composition.section.title: minimum required = 1, but only found 0");
            }
            if (_m.text === undefined || _m.text === null) {
                errors.push("Composition.section.text: minimum required = 1, but only found 0");
            }
        }
        for (const _wsElem of sectionProblemsElements) {
            const _wsVal = _wsElem.section;
            if (_wsVal !== undefined && _wsVal !== null) {
                errors.push("Composition.section:sectionProblems.section: max allowed = 0, but found " + (Array.isArray(_wsVal) ? _wsVal.length : 1));
            }
        }
    }
    else {
        errors.push("No elements matched required slice: 'section:sectionProblems'");
    }
    // Required BackboneElement slice validation for section:sectionAllergies (discriminated by code)
    if (resource.section && Array.isArray(resource.section)) {
        const sectionAllergiesElements = resource.section.filter((item) => item.code?.coding?.some((c) => c.system === "http://loinc.org" && c.code === "48765-2"));
        if (sectionAllergiesElements.length < 1) {
            errors.push("No elements matched required slice: 'section:sectionAllergies'");
        }
        for (const _matched of sectionAllergiesElements) {
            const _m = _matched;
            if (_m.title === undefined || _m.title === null) {
                errors.push("Composition.section.title: minimum required = 1, but only found 0");
            }
            if (_m.text === undefined || _m.text === null) {
                errors.push("Composition.section.text: minimum required = 1, but only found 0");
            }
        }
        for (const _wsElem of sectionAllergiesElements) {
            const _wsVal = _wsElem.section;
            if (_wsVal !== undefined && _wsVal !== null) {
                errors.push("Composition.section:sectionAllergies.section: max allowed = 0, but found " + (Array.isArray(_wsVal) ? _wsVal.length : 1));
            }
        }
    }
    else {
        errors.push("No elements matched required slice: 'section:sectionAllergies'");
    }
    // Required BackboneElement slice validation for section:sectionMedications (discriminated by code)
    if (resource.section && Array.isArray(resource.section)) {
        const sectionMedicationsElements = resource.section.filter((item) => item.code?.coding?.some((c) => c.system === "http://loinc.org" && c.code === "10160-0"));
        if (sectionMedicationsElements.length < 1) {
            errors.push("No elements matched required slice: 'section:sectionMedications'");
        }
        for (const _matched of sectionMedicationsElements) {
            const _m = _matched;
            if (_m.title === undefined || _m.title === null) {
                errors.push("Composition.section.title: minimum required = 1, but only found 0");
            }
            if (_m.text === undefined || _m.text === null) {
                errors.push("Composition.section.text: minimum required = 1, but only found 0");
            }
        }
        for (const _wsElem of sectionMedicationsElements) {
            const _wsVal = _wsElem.section;
            if (_wsVal !== undefined && _wsVal !== null) {
                errors.push("Composition.section:sectionMedications.section: max allowed = 0, but found " + (Array.isArray(_wsVal) ? _wsVal.length : 1));
            }
        }
    }
    else {
        errors.push("No elements matched required slice: 'section:sectionMedications'");
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
