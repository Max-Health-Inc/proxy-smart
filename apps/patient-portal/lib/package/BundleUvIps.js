import fhirpath from "fhirpath";
import fhirpath_model from "fhirpath/fhir-context/r4/index.js";
import { isValidBundleTypeCode } from './valuesets/ValueSet-BundleType.js';
import { isValidSearchEntryModeCode } from './valuesets/ValueSet-SearchEntryMode.js';
import { isValidHttpVerbCode } from './valuesets/ValueSet-HttpVerb.js';
import { validateCompositionUvIps } from './CompositionUvIps.js';
import { validatePatientUvIps } from './PatientUvIps.js';
export async function validateBundleUvIps(resource, options) {
    const errors = [];
    const warnings = [];
    const fhirpathOptions = {
        preciseMath: true,
        traceFn: options?.traceFn ?? (() => { }),
        ...(options?.signal ? { signal: options.signal } : {}),
        ...(options?.httpHeaders ? { httpHeaders: options.httpHeaders } : {}),
    };
    const result0 = await fhirpath.evaluate(resource, "Bundle.all(total.empty() or (type = 'searchset') or (type = 'history'))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result0.every(Boolean)) {
        errors.push("Constraint violation: total only when a search or history");
    }
    const result1 = await fhirpath.evaluate(resource, "Bundle.all(entry.search.empty() or (type = 'searchset'))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result1.every(Boolean)) {
        errors.push("Constraint violation: entry.search only when a search");
    }
    const result2 = await fhirpath.evaluate(resource, "Bundle.all(entry.all(request.exists() = (%resource.type = 'batch' or %resource.type = 'transaction' or %resource.type = 'history')))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result2.every(Boolean)) {
        errors.push("Constraint violation: entry.request mandatory for batch/transaction/history, otherwise prohibited");
    }
    const result3 = await fhirpath.evaluate(resource, "Bundle.all(entry.all(response.exists() = (%resource.type = 'batch-response' or %resource.type = 'transaction-response' or %resource.type = 'history')))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result3.every(Boolean)) {
        errors.push("Constraint violation: entry.response mandatory for batch-response/transaction-response/history, otherwise prohibited");
    }
    const result4 = await fhirpath.evaluate(resource, "Bundle.all((type = 'history') or entry.where(fullUrl.exists()).select(fullUrl&resource.meta.versionId).isDistinct())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result4.every(Boolean)) {
        errors.push("Constraint violation: FullUrl must be unique in a bundle, or else entries with the same fullUrl must have different meta.versionId (except in history bundles)");
    }
    const result5 = await fhirpath.evaluate(resource, "Bundle.all(type = 'document' implies (timestamp.hasValue()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result5.every(Boolean)) {
        errors.push("Constraint violation: A document must have a date");
    }
    const result6 = await fhirpath.evaluate(resource, "Bundle.all(type = 'document' implies entry.first().resource.is(Composition))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result6.every(Boolean)) {
        errors.push("Constraint violation: A document must have a Composition as the first resource");
    }
    const result7 = await fhirpath.evaluate(resource, "Bundle.all(type = 'message' implies entry.first().resource.is(MessageHeader))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result7.every(Boolean)) {
        errors.push("Constraint violation: A message must have a MessageHeader as the first resource");
    }
    const result8 = await fhirpath.evaluate(resource, "Bundle.all(entry.tail().where(resource is Composition).empty())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result8.every(Boolean)) {
        errors.push("Constraint violation: An IPS document must have no additional Composition (including Composition subclass) resources besides the first.");
    }
    const result9 = await fhirpath.evaluate(resource, "meta.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result9.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result10 = await fhirpath.evaluate(resource, "implicitRules.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result10.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result11 = await fhirpath.evaluate(resource, "language.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result11.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result12 = await fhirpath.evaluate(resource, "identifier.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result12.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result13 = await fhirpath.evaluate(resource, "type.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result13.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result14 = await fhirpath.evaluate(resource, "timestamp.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result14.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result15 = await fhirpath.evaluate(resource, "total.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result15.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result16 = await fhirpath.evaluate(resource, "link.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result16.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result17 = await fhirpath.evaluate(resource, "entry.all(resource.exists() or request.exists() or response.exists())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result17.every(Boolean)) {
        errors.push("Constraint violation: must be a resource unless there's a request or response");
    }
    const result18 = await fhirpath.evaluate(resource, "entry.all(fullUrl.contains('/_history/').not())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result18.every(Boolean)) {
        errors.push("Constraint violation: fullUrl cannot be a version specific reference");
    }
    const result19 = await fhirpath.evaluate(resource, "entry.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result19.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result20 = await fhirpath.evaluate(resource, "signature.all(hasValue() or (children().count() > id.count()))", { resource }, fhirpath_model, fhirpathOptions);
    if (!result20.every(Boolean)) {
        errors.push("Constraint violation: All FHIR elements must have a @value or children");
    }
    const result21 = await fhirpath.evaluate(resource, "identifier.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result21.every(Boolean)) {
        errors.push("Constraint violation: identifier must be present");
    }
    const result22 = await fhirpath.evaluate(resource, "type.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result22.every(Boolean)) {
        errors.push("Constraint violation: type must be present");
    }
    const result23 = await fhirpath.evaluate(resource, "timestamp.exists()", { resource }, fhirpath_model, fhirpathOptions);
    if (!result23.every(Boolean)) {
        errors.push("Constraint violation: timestamp must be present");
    }
    const result24 = await fhirpath.evaluate(resource, "entry.count() >= 2", { resource }, fhirpath_model, fhirpathOptions);
    if (!result24.every(Boolean)) {
        errors.push("Constraint violation: entry must contain at least 2 elements");
    }
    const result25 = await fhirpath.evaluate(resource, "entry.count() >= 1", { resource }, fhirpath_model, fhirpathOptions);
    if (!result25.every(Boolean)) {
        errors.push("Constraint violation: entry must contain at least one element");
    }
    const result26 = await fhirpath.evaluate(resource, "search.all(entry.search.exists().not())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result26.every(Boolean)) {
        errors.push("Constraint violation: entry.search: max allowed = 0, but found 1");
    }
    const result27 = await fhirpath.evaluate(resource, "request.all(entry.request.exists().not())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result27.every(Boolean)) {
        errors.push("Constraint violation: entry.request: max allowed = 0, but found 1");
    }
    const result28 = await fhirpath.evaluate(resource, "response.all(entry.response.exists().not())", { resource }, fhirpath_model, fhirpathOptions);
    if (!result28.every(Boolean)) {
        errors.push("Constraint violation: entry.response: max allowed = 0, but found 1");
    }
    // Nested required field: link.relation (min=1)
    if (resource.link && Array.isArray(resource.link)) {
        for (const _el of resource.link) {
            if ((_el.relation === undefined || _el.relation === null) || Array.isArray(_el.relation)) {
                errors.push("Missing required member: 'relation'");
            }
        }
    }
    // Nested required field: link.url (min=1)
    if (resource.link && Array.isArray(resource.link)) {
        for (const _el of resource.link) {
            if ((_el.url === undefined || _el.url === null) || Array.isArray(_el.url)) {
                errors.push("Missing required member: 'url'");
            }
        }
    }
    // Nested required field: entry.fullUrl (min=1)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _el of resource.entry) {
            if ((_el.fullUrl === undefined || _el.fullUrl === null) || Array.isArray(_el.fullUrl)) {
                errors.push("Missing required member: 'fullUrl'");
            }
        }
    }
    // Deeply nested required field: entry.request.method (min=1)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _el of resource.entry) {
            const _e = _el;
            if (_e?.request && ((_e.request.method === undefined || _e.request.method === null) || Array.isArray(_e.request.method))) {
                errors.push("Missing required member: 'method'");
            }
        }
    }
    // Deeply nested required field: entry.request.url (min=1)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _el of resource.entry) {
            const _e = _el;
            if (_e?.request && ((_e.request.url === undefined || _e.request.url === null) || Array.isArray(_e.request.url))) {
                errors.push("Missing required member: 'url'");
            }
        }
    }
    // Deeply nested required field: entry.response.status (min=1)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _el of resource.entry) {
            const _e = _el;
            if (_e?.response && ((_e.response.status === undefined || _e.response.status === null) || Array.isArray(_e.response.status))) {
                errors.push("Missing required member: 'status'");
            }
        }
    }
    // Fixed value constraint for type
    if (resource.type !== undefined && resource.type !== "document") {
        errors.push("type must have the fixed value 'document'");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _bRes = resource;
    // Structural type check: meta must be an Object, not a Primitive
    if (_bRes.meta !== undefined && _bRes.meta !== null && typeof _bRes.meta !== 'object') {
        errors.push("The property meta must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".meta)");
    }
    // Structural type check: identifier must be an Object, not a Primitive
    if (_bRes.identifier !== undefined && _bRes.identifier !== null && typeof _bRes.identifier !== 'object') {
        errors.push("The property identifier must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".identifier)");
    }
    // Structural type check: link must be a JSON Array
    if (_bRes.link !== undefined && _bRes.link !== null && !Array.isArray(_bRes.link)) {
        errors.push("The property link must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: entry must be a JSON Array
    if (_bRes.entry !== undefined && _bRes.entry !== null && !Array.isArray(_bRes.entry)) {
        errors.push("The property entry must be a JSON Array, not an Object (at " + (_bRes.resourceType || "Resource") + ")");
    }
    // Structural type check: signature must be an Object, not a Primitive
    if (_bRes.signature !== undefined && _bRes.signature !== null && typeof _bRes.signature !== 'object') {
        errors.push("The property signature must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".signature)");
    }
    // Structural type check: meta must be an Object, not a Primitive
    if (_bRes.meta !== undefined && _bRes.meta !== null && typeof _bRes.meta !== 'object') {
        errors.push("The property meta must be an Object, not a Primitive property (at " + (_bRes.resourceType || "Resource") + ".meta)");
    }
    // Prohibited field: Bundle.entry.search (max=0)
    if (_bRes.entry && Array.isArray(_bRes.entry)) {
        for (const _el of _bRes.entry) {
            const _e = _el;
            if (_e?.search !== undefined) {
                errors.push("Bundle.entry.search: max allowed = 0, but found 1");
            }
        }
    }
    // Prohibited field: Bundle.entry.request (max=0)
    if (_bRes.entry && Array.isArray(_bRes.entry)) {
        for (const _el of _bRes.entry) {
            const _e = _el;
            if (_e?.request !== undefined) {
                errors.push("Bundle.entry.request: max allowed = 0, but found 1");
            }
        }
    }
    // Prohibited field: Bundle.entry.response (max=0)
    if (_bRes.entry && Array.isArray(_bRes.entry)) {
        for (const _el of _bRes.entry) {
            const _e = _el;
            if (_e?.response !== undefined) {
                errors.push("Bundle.entry.response: max allowed = 0, but found 1");
            }
        }
    }
    // Required ValueSet binding validation for type
    if (_bRes.type !== undefined && !isValidBundleTypeCode(_bRes.type)) {
        errors.push("Code '" + _bRes.type + "' does not exist in the value set 'bundle-type' (http://hl7.org/fhir/ValueSet/bundle-type), but the binding is of strength 'required'");
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.search.mode (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.search !== undefined) {
                if (_nb0.search.mode !== undefined && !isValidSearchEntryModeCode(_nb0.search.mode)) {
                    errors.push("Code '" + _nb0.search.mode + "' does not exist in the value set 'search-entry-mode' (http://hl7.org/fhir/ValueSet/search-entry-mode), but the binding is of strength 'required'");
                }
            }
        }
    }
    // Required ValueSet binding validation for entry.request.method (nested)
    if (resource.entry && Array.isArray(resource.entry)) {
        for (const _nb0 of resource.entry) {
            if (_nb0.request !== undefined) {
                if (_nb0.request.method !== undefined && !isValidHttpVerbCode(_nb0.request.method)) {
                    errors.push("Code '" + _nb0.request.method + "' does not exist in the value set 'http-verb' (http://hl7.org/fhir/ValueSet/http-verb), but the binding is of strength 'required'");
                }
            }
        }
    }
    // instant format validation for timestamp
    if (typeof _bRes.timestamp === 'string' && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(_bRes.timestamp)) {
        errors.push("Not a valid instant format: '" + _bRes.timestamp + "'");
    }
    // Required slice validation for entry:composition (profile discriminator → Composition)
    {
        const _compositionEntries = (Array.isArray(resource.entry) ? resource.entry : []).filter((e) => e?.resource?.resourceType === 'Composition');
        if (_compositionEntries.length < 1) {
            errors.push("Slice 'entry:composition': a matching slice is required, but not found");
        }
        if (_compositionEntries.length > 1) {
            errors.push("entry:composition: max allowed = 1, but found " + _compositionEntries.length);
        }
        for (const _e of _compositionEntries) {
            if (_e.resource) {
                const _sub = await validateCompositionUvIps(_e.resource, options);
                errors.push(..._sub.errors);
                warnings.push(..._sub.warnings);
            }
        }
    }
    // Required slice validation for entry:patient (profile discriminator → Patient)
    {
        const _patientEntries = (Array.isArray(resource.entry) ? resource.entry : []).filter((e) => e?.resource?.resourceType === 'Patient');
        if (_patientEntries.length < 1) {
            errors.push("Slice 'entry:patient': a matching slice is required, but not found");
        }
        if (_patientEntries.length > 1) {
            errors.push("entry:patient: max allowed = 1, but found " + _patientEntries.length);
        }
        for (const _e of _patientEntries) {
            if (_e.resource) {
                const _sub = await validatePatientUvIps(_e.resource, options);
                errors.push(..._sub.errors);
                warnings.push(..._sub.warnings);
            }
        }
    }
    // Non-DomainResource: text is not a valid property
    if (resource.text !== undefined) {
        errors.push("Unrecognized property 'text'");
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
    // Bundle reference resolution: verify all references within entries are resolvable
    // Only enforce for document/message/transaction bundles — collection/batch/searchset/history
    // bundles are not required to have resolvable internal references per the FHIR spec.
    {
        const _res = resource;
        const _bType = typeof _res.type === 'string' ? _res.type : '';
        if ((_bType === 'document' || _bType === 'message' || _bType === 'transaction') && Array.isArray(_res.entry)) {
            const _entries = _res.entry;
            const _fullUrls = new Set();
            const _resIds = new Set();
            for (const _e of _entries) {
                if (_e.fullUrl)
                    _fullUrls.add(_e.fullUrl);
                const _r = _e.resource;
                if (_r && _r.resourceType && _r.id) {
                    _resIds.add(_r.resourceType + '/' + _r.id);
                }
            }
            const _checkRef = (obj) => {
                if (!obj || typeof obj !== 'object')
                    return;
                if (Array.isArray(obj)) {
                    obj.forEach(_checkRef);
                    return;
                }
                const rec = obj;
                if (typeof rec.reference === 'string') {
                    const ref = rec.reference;
                    if (ref.startsWith('urn:uuid:') || ref.startsWith('urn:oid:')) {
                        if (!_fullUrls.has(ref)) {
                            errors.push('Bundle reference not found: ' + ref);
                        }
                    }
                    else if (/^[A-Za-z]+\//.test(ref)) {
                        if (!_resIds.has(ref)) {
                            let _found = false;
                            for (const _fu of _fullUrls) {
                                if (_fu.endsWith('/' + ref) || _fu.endsWith(ref)) {
                                    _found = true;
                                    break;
                                }
                            }
                            if (!_found) {
                                errors.push('Bundle reference not found: ' + ref);
                            }
                        }
                    }
                }
                for (const [_key, _val] of Object.entries(rec)) {
                    if (_key !== 'resource')
                        _checkRef(_val);
                }
            };
            for (const _e of _entries) {
                if (_e.resource)
                    _checkRef(_e.resource);
            }
        }
    }
    return { errors, warnings };
}
