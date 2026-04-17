import { randomId, randomUUID } from './randomUtilities.js';
/** Extended resource handlers: Device, ValueSet, CodeSystem, Coverage, etc. */
export function enrichExtendedHandlers(ctx) {
    // Device (exact match — not DeviceRequest)
    if (/^Device$/i.test(ctx.baseResource)) {
        if (!('deviceName' in ctx.base))
            ctx.base.deviceName = [{ name: 'Example Device', type: 'user-friendly-name' }];
        if (!('type' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('type', 'http://snomed.info/sct', '49062001', 'Device');
            ctx.base.type = resolved || { coding: [{ system: 'http://snomed.info/sct', code: '49062001', display: 'Device' }] };
        }
        if (!('status' in ctx.base))
            ctx.base.status = 'active';
        // Apply nested primitive patterns to manufacturer if present
        const manufacturerPattern = ctx.getPrimitivePattern('manufacturer');
        if (manufacturerPattern !== undefined) {
            ctx.base.manufacturer = manufacturerPattern;
        }
        // Apply nested primitive patterns to deviceName entries if present
        if ('deviceName' in ctx.base && Array.isArray(ctx.base.deviceName) && ctx.base.deviceName.length > 0) {
            const namePattern = ctx.getPrimitivePattern('deviceName.name');
            const typePattern = ctx.getPrimitivePattern('deviceName.type');
            for (const deviceNameEntry of ctx.base.deviceName) {
                if (namePattern !== undefined)
                    deviceNameEntry.name = namePattern;
                if (typePattern !== undefined)
                    deviceNameEntry.type = typePattern;
            }
        }
    }
    // ValueSet - url must be a valid absolute URI (HTTP URL or proper URN)
    if (/ValueSet/i.test(ctx.baseResource)) {
        if (!('status' in ctx.base))
            ctx.base.status = 'active';
        if (!('url' in ctx.base) || (typeof ctx.base.url === 'string' && !ctx.base.url.startsWith('http') && !ctx.base.url.startsWith('urn:'))) {
            ctx.base.url = 'https://babelfhir.dev/fhir/ValueSet/' + randomId();
        }
        // name must be machine-readable identifier (no spaces, starts with letter)
        if (!('name' in ctx.base))
            ctx.base.name = 'ExampleValueSet' + randomId().replace(/-/g, '');
        else if (typeof ctx.base.name === 'string' && /^[0-9a-f-]+$/i.test(ctx.base.name)) {
            // If name looks like a UUID/randomId, make it a valid identifier
            ctx.base.name = 'ValueSet' + ctx.base.name.replace(/-/g, '').substring(0, 10);
        }
        if (!('version' in ctx.base))
            ctx.base.version = '1.0.0';
        if (!('compose' in ctx.base))
            ctx.base.compose = { include: [{ system: 'http://loinc.org', concept: [{ code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' }] }] };
        // Handle useContext when pattern for useContext.code is present (ISiK ValueSet)
        // The pattern key 'useContext.code' refers to useContext.code
        if (ctx.fieldPatterns && ('useContext.code' in ctx.fieldPatterns || 'code' in ctx.fieldPatterns)) {
            const codePattern = (ctx.fieldPatterns['useContext.code'] || ctx.fieldPatterns['code']);
            const validUseContext = {
                code: {
                    system: codePattern.system || 'http://terminology.hl7.org/CodeSystem/usage-context-type',
                    code: codePattern.code || 'focus'
                },
                valueCodeableConcept: {
                    coding: [{ system: 'http://hl7.org/fhir/resource-types', code: 'ValueSet' }]
                }
            };
            if (!('useContext' in ctx.base)) {
                ctx.base.useContext = [validUseContext];
            }
            else if (Array.isArray(ctx.base.useContext)) {
                // Replace useContext entries with the valid pattern (skeleton entries
                // may have incorrect valueCodeableConcept from skeletonUsageContext)
                for (let i = 0; i < ctx.base.useContext.length; i++) {
                    ctx.base.useContext[i] = validUseContext;
                }
            }
        }
    }
    // CodeSystem - url must be a valid absolute URI (HTTP URL or proper URN)
    if (/CodeSystem/i.test(ctx.baseResource)) {
        if (!('status' in ctx.base))
            ctx.base.status = 'active';
        // Check for fixed content pattern from the profile
        const contentPattern = ctx.getPrimitivePattern('content');
        if (contentPattern !== undefined) {
            ctx.base.content = contentPattern;
        }
        else if (!('content' in ctx.base)) {
            ctx.base.content = 'complete';
        }
        if (!('url' in ctx.base) || (typeof ctx.base.url === 'string' && !ctx.base.url.startsWith('http') && !ctx.base.url.startsWith('urn:'))) {
            ctx.base.url = 'https://babelfhir.dev/fhir/CodeSystem/' + randomId();
        }
        if (!('name' in ctx.base))
            ctx.base.name = 'ExampleCodeSystem';
        if (!('version' in ctx.base))
            ctx.base.version = '1.0.0';
        // Only add concepts when content is 'complete' — adding concepts when
        // content is 'not-present' or 'example' would violate csd-2/CodeSystem constraints.
        const currentContent = ctx.base.content;
        if (currentContent === 'complete' && !('concept' in ctx.base)) {
            ctx.base.concept = [{ code: 'example', display: 'Example Code' }];
        }
        else if (currentContent !== 'complete' && 'concept' in ctx.base) {
            delete ctx.base.concept;
        }
    }
    // RelatedPerson
    if (/RelatedPerson/i.test(ctx.baseResource)) {
        if (!('patient' in ctx.base))
            ctx.base.patient = { reference: 'Patient/' + randomId() };
        if (!('identifier' in ctx.base))
            ctx.base.identifier = [{ system: 'urn:ietf:rfc:3986', value: 'urn:uuid:' + randomUUID() }];
        if (!('name' in ctx.base))
            ctx.base.name = [{ family: randomId(), given: [randomId()] }];
        if (!('relationship' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('relationship', 'http://terminology.hl7.org/CodeSystem/v3-RoleCode', 'FTH', 'father');
            ctx.base.relationship = [resolved || { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode', code: 'FTH', display: 'father' }] }];
        }
        if (!('address' in ctx.base))
            ctx.base.address = [{ city: 'Example City', postalCode: '12345', country: 'XX' }];
    }
    // DocumentReference
    if (/DocumentReference/i.test(ctx.baseResource)) {
        // Force correct status - 'active' is NOT valid for DocumentReference.status
        ctx.base.status = 'current';
        if (!('type' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('type', 'http://loinc.org', '34133-9');
            ctx.base.type = resolved || { coding: [{ system: 'http://loinc.org', code: '34133-9' }] };
        }
        // Always use pattern if available for category, even if category already exists
        const patternCategory = ctx.getPatternValue('category');
        if (patternCategory) {
            ctx.base.category = [patternCategory];
        }
        else if (!('category' in ctx.base)) {
            ctx.base.category = [{ coding: [{ system: 'http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category', code: 'clinical-note' }] }];
        }
        if (!('subject' in ctx.base))
            ctx.base.subject = { reference: 'Patient/' + randomId() };
        if (!('content' in ctx.base)) {
            ctx.base.content = [{ attachment: { contentType: 'application/pdf', data: 'ZXhhbXBsZQ==', url: 'urn:uuid:' + randomUUID() } }];
        }
        else if (Array.isArray(ctx.base.content) && ctx.base.content.length > 0) {
            for (const c of ctx.base.content) {
                if (c.attachment) {
                    if (!c.attachment.data)
                        c.attachment.data = 'ZXhhbXBsZQ==';
                    if (!c.attachment.url)
                        c.attachment.url = 'urn:uuid:' + randomUUID();
                    if (!c.attachment.contentType)
                        c.attachment.contentType = 'application/pdf';
                }
                else {
                    c.attachment = { contentType: 'application/pdf', data: 'ZXhhbXBsZQ==', url: 'urn:uuid:' + randomUUID() };
                }
            }
        }
        // EPR format handling removed - should be handled by pattern extraction
    }
    // Specimen
    if (/Specimen/i.test(ctx.baseResource)) {
        // IPS Specimen requires type
        if (!ctx.isForbidden('type') && !('type' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('type', 'http://snomed.info/sct', '119297000', 'Blood specimen');
            ctx.base.type = resolved || { coding: [{ system: 'http://snomed.info/sct', code: '119297000', display: 'Blood specimen' }] };
        }
        if (!ctx.isForbidden('subject') && !('subject' in ctx.base)) {
            ctx.base.subject = { reference: 'Patient/' + randomId() };
        }
    }
    // Binary
    if (/^Binary$/i.test(ctx.baseResource)) {
        if (!('contentType' in ctx.base))
            ctx.base.contentType = 'application/pdf';
        if (!('data' in ctx.base)) {
            ctx.base.data = 'SGVsbG8gV29ybGQ=';
        }
        else if (typeof ctx.base.data === 'string' && !/^[A-Za-z0-9+/=\s]+$/.test(ctx.base.data)) {
            // data must be valid base64 — replace if skeleton generated a non-base64 value
            ctx.base.data = 'SGVsbG8gV29ybGQ=';
        }
    }
    // Coverage
    if (/Coverage/i.test(ctx.baseResource)) {
        if (!ctx.isForbidden('status') && !('status' in ctx.base))
            ctx.base.status = 'active';
        if (!ctx.isForbidden('type') && !('type' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('type', 'http://terminology.hl7.org/CodeSystem/v3-ActCode', 'EHCPOL', 'extended healthcare');
            ctx.base.type = resolved || { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'EHCPOL', display: 'extended healthcare' }] };
        }
        if (!ctx.isForbidden('subscriberId') && !('subscriberId' in ctx.base))
            ctx.base.subscriberId = randomId();
        if (!ctx.isForbidden('beneficiary') && !('beneficiary' in ctx.base))
            ctx.base.beneficiary = { reference: 'Patient/' + randomId() };
        if (!ctx.isForbidden('payor') && !('payor' in ctx.base))
            ctx.base.payor = [{ reference: 'Organization/' + randomId() }];
    }
    // ImmunizationRecommendation
    if (/ImmunizationRecommendation/i.test(ctx.baseResource)) {
        // imr-1: one of vaccineCode or targetDisease SHALL be present in each recommendation
        if ('recommendation' in ctx.base && Array.isArray(ctx.base.recommendation)) {
            for (const rec of ctx.base.recommendation) {
                if (!('vaccineCode' in rec) && !('targetDisease' in rec)) {
                    rec.vaccineCode = [{ coding: [{ system: 'http://snomed.info/sct', code: '787859002', display: 'Vaccine product' }], text: 'Vaccine product' }];
                }
            }
        }
    }
    // Consent
    if (/Consent/i.test(ctx.baseResource)) {
        // ppc-1: Either a Policy or PolicyRule SHALL be present
        if (!('policy' in ctx.base) && !('policyRule' in ctx.base)) {
            const patternPolicyRule = ctx.getCompleteCodePatternValue('policyRule');
            if (patternPolicyRule) {
                ctx.base.policyRule = patternPolicyRule;
            }
            else {
                ctx.base.policyRule = { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/consentpolicycodes', code: 'hipaa-auth' }] };
            }
        }
    }
    // Subscription - apply channel nested patterns
    if (/Subscription/i.test(ctx.baseResource)) {
        if ('channel' in ctx.base && typeof ctx.base.channel === 'object' && ctx.base.channel !== null) {
            const channel = ctx.base.channel;
            const typePattern = ctx.getPrimitivePattern('channel.type');
            if (typePattern !== undefined)
                channel.type = typePattern;
            const payloadPattern = ctx.getPrimitivePattern('channel.payload');
            if (payloadPattern !== undefined)
                channel.payload = payloadPattern;
            // Add _payload extension for backport payload content if required
            const refReqs = ctx.getRefRequirements('channel');
            if (refReqs && refReqs['payload.extension'] && !('_payload' in channel)) {
                channel._payload = { extension: [{
                            url: 'http://hl7.org/fhir/uv/subscriptions-backport/StructureDefinition/backport-payload-content',
                            valueCode: 'full-resource'
                        }] };
            }
        }
        // Add top-level extension if the profile requires it and it's empty/missing
        if (!ctx.base.extension || (Array.isArray(ctx.base.extension) && ctx.base.extension.length === 0)) {
            // Subscription profiles may require extensions — add a placeholder to avoid "missing required member: extension"
            // ISiK defines extension:content at Subscription.channel.payload.extension, not top-level
            // If Firely reports missing 'extension' at top-level, add empty array
        }
    }
    // Endpoint - address required, connectionType required, fix malformed extensions
    if (/Endpoint/i.test(ctx.baseResource)) {
        if (!('address' in ctx.base))
            ctx.base.address = 'https://babelfhir.dev/fhir';
        // connectionType is required 1..1 Coding; SMART profiles require 'hl7-fhir-rest'
        if (!('connectionType' in ctx.base) || (typeof ctx.base.connectionType === 'object' && ctx.base.connectionType !== null &&
            ctx.base.connectionType.code !== 'hl7-fhir-rest')) {
            ctx.base.connectionType = { system: 'http://terminology.hl7.org/CodeSystem/endpoint-connection-type', code: 'hl7-fhir-rest', display: 'HL7 FHIR' };
        }
        // Fix malformed extensions that have fullUrl instead of proper url + value[x]
        if (Array.isArray(ctx.base.extension)) {
            const validExtensions = ctx.base.extension
                .filter(ext => ext && typeof ext === 'object' && 'url' in ext && typeof ext.url === 'string');
            // If no valid extensions remain, add a placeholder FHIR version extension
            if (validExtensions.length === 0) {
                validExtensions.push({ url: 'http://hl7.org/fhir/StructureDefinition/endpoint-fhir-version', valueCode: '4.0.1' });
            }
            ctx.base.extension = validExtensions;
        }
    }
    // Task - handle input cardinality, integer types, attachment constraints, and code
    if (/Task/i.test(ctx.baseResource)) {
        // For PAS Task profiles, ensure code is from PASTaskCodes ValueSet
        if (ctx.profileUrl && /davinci-pas/i.test(ctx.profileUrl)) {
            ctx.base.code = { coding: [{ system: 'http://hl7.org/fhir/us/davinci-pas/CodeSystem/PASTempCodes', code: 'attachment-request-code', display: 'Attach Request Code' }] };
        }
        if (!('status' in ctx.base))
            ctx.base.status = 'requested';
        if (!('intent' in ctx.base))
            ctx.base.intent = 'order';
        if (!('requester' in ctx.base))
            ctx.base.requester = { reference: 'Organization/' + randomId() };
        if (!('owner' in ctx.base))
            ctx.base.owner = { reference: 'Organization/' + randomId() };
        if (!('for' in ctx.base))
            ctx.base['for'] = { reference: 'Patient/' + randomId() };
        // Fix paLineNumber extensions across ALL inputs — must be valueInteger, not valueString
        // Also fix any other integer-typed extension values
        const fixIntegerExtensions = (inputs) => {
            for (const inp of inputs) {
                if (Array.isArray(inp.extension)) {
                    for (const ext of inp.extension) {
                        if (ext.url && String(ext.url).includes('paLineNumber')) {
                            if ('valueString' in ext) {
                                ext.valueInteger = 1;
                                delete ext.valueString;
                            }
                            if (!('valueInteger' in ext))
                                ext.valueInteger = 1;
                        }
                    }
                }
            }
        };
        if (Array.isArray(ctx.base.input))
            fixIntegerExtensions(ctx.base.input);
        if ('code' in ctx.base && typeof ctx.base.code === 'object' && ctx.base.code !== null) {
            const codeObj = ctx.base.code;
            const isAttachmentRequest = codeObj.coding?.some(c => c.code === 'attachment-request-code');
            if (isAttachmentRequest && Array.isArray(ctx.base.input)) {
                const inputs = ctx.base.input;
                // AttachmentNeeded: add AttachmentsNeeded input if not present
                const hasAttachmentsNeeded = inputs.some(i => {
                    const t = i.type;
                    return t?.coding?.some(c => c.code === 'attachments-needed');
                });
                if (!hasAttachmentsNeeded) {
                    // Resolve code from AttachmentRequestCodes VS (LOINC CLASS=ATTACH or X12/755 codes)
                    // Fallback uses X12 PWK01 code '09' (Progress Notes) from the 005010/755 system,
                    // which is always valid since all codes from that system are included in AttachmentRequestCodes
                    const attachCode = ctx.resolveBindingCode('input.value[x]', 'https://codesystem.x12.org/005010/755', '09', 'Progress Notes');
                    inputs.push({
                        type: { coding: [{ system: 'http://hl7.org/fhir/us/davinci-pas/CodeSystem/PASTempCodes', code: 'attachments-needed' }] },
                        valueCodeableConcept: attachCode || { coding: [{ system: 'https://codesystem.x12.org/005010/755', code: '09', display: 'Progress Notes' }] }
                    });
                }
            }
        }
    }
    // AllergyIntolerance - clinicalStatus required when verificationStatus != entered-in-error
    if (/AllergyIntolerance/i.test(ctx.baseResource)) {
        if (!('patient' in ctx.base))
            ctx.base.patient = { reference: 'Patient/' + randomId() };
        if (!('code' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('code', 'http://snomed.info/sct', '387517004', 'Paracetamol');
            ctx.base.code = resolved || { coding: [{ system: 'http://snomed.info/sct', code: '387517004', display: 'Paracetamol' }] };
        }
        // Always include clinicalStatus to satisfy ait-1 constraint
        if (!('clinicalStatus' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('clinicalStatus', 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', 'active');
            ctx.base.clinicalStatus = resolved || { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }] };
        }
        if (!('verificationStatus' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('verificationStatus', 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', 'confirmed');
            ctx.base.verificationStatus = resolved || { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'confirmed' }] };
        }
        // ait-2: clinicalStatus SHALL NOT be present if verificationStatus is entered-in-error
        if ('verificationStatus' in ctx.base && 'clinicalStatus' in ctx.base) {
            const vs = ctx.base.verificationStatus;
            if (vs?.coding?.some(c => c.code === 'entered-in-error')) {
                delete ctx.base.clinicalStatus;
            }
        }
    }
    // Medication — isik-med-1: code.exists() or ingredient.exists()
    if (/^Medication$/i.test(ctx.baseResource)) {
        if (!('code' in ctx.base) && !('ingredient' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('code', 'http://www.nlm.nih.gov/research/umls/rxnorm', '1049502', 'Amoxicillin 250mg');
            ctx.base.code = resolved || { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '1049502', display: 'Amoxicillin 250mg' }] };
        }
    }
    // MedicationRequest - requester required when intent='order'
    if (/MedicationRequest/i.test(ctx.baseResource)) {
        if (!('status' in ctx.base))
            ctx.base.status = 'active';
        if (!('intent' in ctx.base))
            ctx.base.intent = 'order';
        if (!('medicationCodeableConcept' in ctx.base) && !('medicationReference' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('medicationCodeableConcept', 'http://www.nlm.nih.gov/research/umls/rxnorm', '1049502', 'Amoxicillin 250mg');
            ctx.base.medicationCodeableConcept = resolved || { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '1049502', display: 'Amoxicillin 250mg' }] };
        }
        if (!('subject' in ctx.base))
            ctx.base.subject = { reference: 'Patient/' + randomId() };
        // requester required when intent='order' (us-core-21 constraint)
        if (!('requester' in ctx.base))
            ctx.base.requester = { reference: 'Practitioner/' + randomId() };
    }
    // MedicationDispense
    if (/MedicationDispense/i.test(ctx.baseResource)) {
        if (!('status' in ctx.base))
            ctx.base.status = 'completed';
        if (!('medicationCodeableConcept' in ctx.base) && !('medicationReference' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('medicationCodeableConcept', 'http://www.nlm.nih.gov/research/umls/rxnorm', '1049502', 'Amoxicillin 250mg');
            ctx.base.medicationCodeableConcept = resolved || { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '1049502', display: 'Amoxicillin 250mg' }] };
        }
        if (!('subject' in ctx.base))
            ctx.base.subject = { reference: 'Patient/' + randomId() };
        if (!('performer' in ctx.base))
            ctx.base.performer = [{ actor: { reference: 'Practitioner/' + randomId() } }];
        // us-core-20: whenHandedOver SHALL be present if status is 'completed'
        if (ctx.base.status === 'completed' && !('whenHandedOver' in ctx.base)) {
            ctx.base.whenHandedOver = new Date().toISOString();
        }
    }
    // Claim / ClaimResponse - insurer, item, identifier required by PAS profiles
    if (/^Claim$/i.test(ctx.baseResource)) {
        if (!('status' in ctx.base))
            ctx.base.status = 'active';
        if (!('type' in ctx.base))
            ctx.base.type = { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/claim-type', code: 'professional' }] };
        if (!('use' in ctx.base))
            ctx.base.use = 'preauthorization';
        if (!('patient' in ctx.base))
            ctx.base.patient = { reference: 'Patient/' + randomId() };
        if (!('created' in ctx.base))
            ctx.base.created = new Date().toISOString().substring(0, 10);
        if (!('provider' in ctx.base))
            ctx.base.provider = { reference: 'Practitioner/' + randomId() };
        if (!('insurer' in ctx.base))
            ctx.base.insurer = { reference: 'Organization/' + randomId() };
        if (!('priority' in ctx.base))
            ctx.base.priority = { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/processpriority', code: 'normal' }] };
        if (!('insurance' in ctx.base))
            ctx.base.insurance = [{ sequence: 1, focal: true, coverage: { reference: 'Coverage/' + randomId() } }];
        if (!('identifier' in ctx.base))
            ctx.base.identifier = [{ system: 'urn:ietf:rfc:3986', value: 'urn:uuid:' + randomUUID() }];
        if (!('item' in ctx.base))
            ctx.base.item = [{ sequence: 1, category: { coding: [{ system: 'https://x12.org/codes/service-type-codes', code: '3', display: 'Consultation' }] }, productOrService: { coding: [{ system: 'http://www.ama-assn.org/go/cpt', code: '99213' }] } }];
        // Ensure all items have category (required by PAS profiles)
        if (Array.isArray(ctx.base.item)) {
            for (const itm of ctx.base.item) {
                if (!('category' in itm))
                    itm.category = { coding: [{ system: 'https://x12.org/codes/service-type-codes', code: '3', display: 'Consultation' }] };
            }
        }
    }
    // DeviceRequest - distinct from Device
    if (/^DeviceRequest$/i.test(ctx.baseResource)) {
        if (!('status' in ctx.base))
            ctx.base.status = 'active';
        if (!('intent' in ctx.base))
            ctx.base.intent = 'order';
        if (!('codeCodeableConcept' in ctx.base) && !('codeReference' in ctx.base)) {
            ctx.base.codeCodeableConcept = { coding: [{ system: 'http://snomed.info/sct', code: '360006', display: 'Device' }] };
        }
        if (!('subject' in ctx.base))
            ctx.base.subject = { reference: 'Patient/' + randomId() };
        // Remove Device-specific properties not valid on DeviceRequest
        delete ctx.base.deviceName;
    }
    // PractitionerRole - needs practitioner/organization/location/healthcareService AND telecom/endpoint
    if (/PractitionerRole/i.test(ctx.baseResource)) {
        // Remove any Patient-like fields that don't belong
        delete ctx.base.name;
        delete ctx.base.gender;
        delete ctx.base.birthDate;
        delete ctx.base.address;
        // Required fields for us-core-13: practitioner, organization, location, or healthcareService
        if (!('practitioner' in ctx.base))
            ctx.base.practitioner = { reference: 'Practitioner/' + randomId() };
        if (!('organization' in ctx.base))
            ctx.base.organization = { reference: 'Organization/' + randomId() };
        // Required for pd-1: telecom or endpoint
        if (!('telecom' in ctx.base) && !('endpoint' in ctx.base)) {
            ctx.base.telecom = [{ system: 'phone', value: '+1-555-555-5555', use: 'work' }];
        }
        if (!('code' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('code', 'http://terminology.hl7.org/CodeSystem/practitioner-role', 'doctor');
            ctx.base.code = [resolved || { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/practitioner-role', code: 'doctor' }] }];
        }
    }
    // DiagnosticReport - needs effective[x]
    if (/DiagnosticReport/i.test(ctx.baseResource)) {
        if (!('status' in ctx.base))
            ctx.base.status = 'final';
        if (!('code' in ctx.base)) {
            const resolved = ctx.resolveBindingCode('code', 'http://loinc.org', '58410-2', 'Complete blood count');
            ctx.base.code = resolved || { coding: [{ system: 'http://loinc.org', code: '58410-2', display: 'Complete blood count' }] };
        }
        if (!('subject' in ctx.base))
            ctx.base.subject = { reference: 'Patient/' + randomId() };
        if (!('effectiveDateTime' in ctx.base) && !('effectivePeriod' in ctx.base)) {
            ctx.base.effectiveDateTime = new Date().toISOString();
        }
        if (!('issued' in ctx.base))
            ctx.base.issued = new Date().toISOString();
        // Category for laboratory reports
        if (ctx.profileUrl.includes('laboratory')) {
            if (!('category' in ctx.base)) {
                const resolved = ctx.resolveBindingCode('category', 'http://terminology.hl7.org/CodeSystem/v2-0074', 'LAB');
                ctx.base.category = [resolved || { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'LAB' }] }];
            }
        }
        // presentedForm for note-exchange
        if (ctx.profileUrl.includes('note-exchange')) {
            if (!('presentedForm' in ctx.base))
                ctx.base.presentedForm = [{ contentType: 'application/pdf', data: 'ZXhhbXBsZQ==' }];
        }
    }
    // MessageHeader
    if (/MessageHeader/i.test(ctx.baseResource)) {
        // source is required (1..1) with required child endpoint
        if (!('source' in ctx.base)) {
            ctx.base.source = { endpoint: 'https://babelfhir.dev/' + randomId() };
        }
        else if (typeof ctx.base.source === 'object' && ctx.base.source !== null) {
            const src = ctx.base.source;
            if (!src.endpoint)
                src.endpoint = 'https://babelfhir.dev/' + randomId();
        }
        // eventCoding — prefer profile pattern, else default to notification event
        const eventPattern = ctx.getPatternValue('eventCoding');
        if (eventPattern) {
            ctx.base.eventCoding = eventPattern;
        }
        else if (!('eventCoding' in ctx.base) && !('eventUri' in ctx.base)) {
            ctx.base.eventCoding = { system: 'http://terminology.hl7.org/CodeSystem/v3-NullFlavor', code: 'UNK' };
        }
        // Fix placeholder focus references — replace with proper resource references
        if (Array.isArray(ctx.base.focus)) {
            for (const f of ctx.base.focus) {
                if (f && typeof f === 'object') {
                    if (!f.reference || f.reference === 'placeholder' || f.reference === 'Resource/' + 'undefined') {
                        // Use the .type hint if available, or default to Encounter
                        const focusType = (typeof f.type === 'string' && f.type !== 'ImmunizationRecommendation')
                            ? f.type : 'Encounter';
                        f.reference = focusType + '/' + randomId();
                        if (!f.type || f.type === 'ImmunizationRecommendation')
                            f.type = focusType;
                    }
                }
            }
        }
        else if (!('focus' in ctx.base)) {
            ctx.base.focus = [{ reference: 'Encounter/' + randomId(), type: 'Encounter' }];
        }
    }
    // Organization (org-1: SHALL have name or identifier)
    // Use negative lookahead to avoid matching OrganizationAffiliation (different resource type without 'name')
    if (/Organization(?!Affiliation)/i.test(ctx.baseResource)) {
        if (!('name' in ctx.base) && !(Array.isArray(ctx.base.identifier) && ctx.base.identifier.length > 0)) {
            ctx.base.name = 'Example Organization';
        }
    }
    // Generic narrative for DomainResource derivatives
    // Bundle, Binary, and Parameters are pure Resource (not DomainResource) and do NOT support text/narrative
    // Data types (CodeableConcept, Identifier, etc.) do NOT have resourceType and must be excluded
    if ('resourceType' in ctx.base && !/^(Bundle|Binary|Parameters)$/.test(ctx.baseResource)) {
        if (!('text' in ctx.base)) {
            // Check if there's a pattern constraint for text.status
            const textStatusPattern = ctx.getPrimitivePattern('text.status');
            const status = textStatusPattern !== undefined ? textStatusPattern : 'generated';
            ctx.base.text = { status: status, div: '<div xmlns="http://www.w3.org/1999/xhtml">Generated</div>' };
        }
        else if (typeof ctx.base.text === 'object' && ctx.base.text !== null) {
            const textObj = ctx.base.text;
            // Apply text.status pattern to existing text object
            const textStatusPattern = ctx.getPrimitivePattern('text.status');
            if (textStatusPattern !== undefined) {
                textObj.status = textStatusPattern;
            }
            // Backfill div if missing or invalid — Narrative.div is required (1..1) and must be valid XHTML
            if (!('div' in textObj) || (typeof textObj.div === 'string' && !String(textObj.div).startsWith('<'))) {
                textObj.div = '<div xmlns="http://www.w3.org/1999/xhtml">Generated</div>';
            }
            // Backfill status if missing — Narrative.status is required (1..1)
            if (!('status' in textObj)) {
                textObj.status = 'generated';
            }
        }
    }
    // Extension value fallback
    if (/Extension/.test(ctx.baseResource)) {
        const hasValue = Object.keys(ctx.base).some(k => k.startsWith('value'));
        if (!hasValue)
            ctx.base['valueString'] = 'value';
        if (!('url' in ctx.base))
            ctx.base.url = ctx.profileUrl || 'urn:uuid:extension';
    }
    // Generic Reference enrichment: apply nested requirements to all Reference fields
    // This handles profile-level constraints that require identifier/display on References
    // like Encounter.serviceProvider.identifier and Encounter.serviceProvider.display
    if (ctx.fieldPatterns) {
        for (const key of Object.keys(ctx.fieldPatterns)) {
            if (key.startsWith('_refReq_')) {
                const refFieldName = key.slice('_refReq_'.length);
                // Check if the field exists in ctx.base (could be a Reference or array of References)
                const fieldValue = ctx.base[refFieldName];
                const reqs = ctx.fieldPatterns[key];
                // Handle primitive element extensions (e.g., confidentiality with _confidentiality.extension)
                // FHIR uses _<fieldName> prefix for extensions on primitive elements only.
                // Complex types (BackboneElement, arrays) should have extensions inside each element.
                // Known FHIR complex type field names that must NEVER get _prefix (not primitives)
                const KNOWN_COMPLEX_FIELDS = ['identifier', 'name', 'address', 'telecom', 'contact', 'coding',
                    'qualification', 'communication', 'link', 'photo', 'endpoint', 'type', 'specialty',
                    'location', 'healthcareService', 'category', 'code', 'subject', 'performer'];
                const extReq = reqs['extension'];
                const reqKeys = Object.keys(reqs);
                const isComplexField = reqKeys.some(k => k !== 'extension') || Array.isArray(fieldValue) || (fieldValue !== null && typeof fieldValue === 'object') || KNOWN_COMPLEX_FIELDS.includes(refFieldName);
                if (extReq && !isComplexField) {
                    // This is a primitive field that needs an extension on the underscore-prefixed element
                    // First ensure the primitive field has a value
                    if (!fieldValue) {
                        // Generate a default value for common primitive fields
                        if (refFieldName === 'confidentiality') {
                            ctx.base[refFieldName] = 'N'; // Normal confidentiality
                        }
                    }
                    // Add the _<fieldName> with extension
                    const underscoreFieldName = '_' + refFieldName;
                    if (!ctx.base[underscoreFieldName]) {
                        const extProfile = typeof extReq === 'object' && extReq.profile
                            ? String(extReq.profile)
                            : undefined;
                        // Create extension with the profile URL if available
                        const ext = { url: extProfile || 'https://babelfhir.dev/extension' };
                        // For known CH Core extension profiles, add a valueCodeableConcept with sample data
                        if (extProfile && extProfile.includes('ch-ext-epr-confidentialitycode')) {
                            ext.valueCodeableConcept = {
                                coding: [{
                                        system: 'http://snomed.info/sct',
                                        code: '17621005'
                                    }]
                            };
                        }
                        else {
                            // Generic fallback: add a string value
                            ext.valueString = 'Example extension value';
                        }
                        ctx.base[underscoreFieldName] = {
                            extension: [ext]
                        };
                    }
                    continue; // Skip the rest of the _refReq processing for this field
                }
                // For complex types (BackboneElement arrays) with extension requirements,
                // inject extension into each array element rather than using _fieldName sidecar
                if (extReq && isComplexField && Array.isArray(fieldValue)) {
                    const extProfile = typeof extReq === 'object' && extReq.profile
                        ? String(extReq.profile)
                        : undefined;
                    for (const elem of fieldValue) {
                        if (elem && typeof elem === 'object' && !('extension' in elem)) {
                            const ext = { url: extProfile || 'https://babelfhir.dev/extension' };
                            // Use valueInteger for known integer-typed extensions (e.g., paLineNumber)
                            if (extProfile && /lineNumber|integer|count|sequence/i.test(extProfile)) {
                                ext.valueInteger = 1;
                            }
                            else {
                                ext.valueString = 'Example';
                            }
                            elem.extension = [ext];
                        }
                    }
                }
                if (fieldValue) {
                    // Determine target resource type from the reference
                    let targetType = 'Resource';
                    if (Array.isArray(fieldValue)) {
                        // Array of References or CodeableConcepts
                        for (const ref of fieldValue) {
                            if (ref && typeof ref === 'object') {
                                const refObj = ref;
                                if (typeof refObj.reference === 'string') {
                                    const match = refObj.reference.match(/^([A-Za-z]+)\//);
                                    if (match)
                                        targetType = match[1];
                                }
                                // Add required nested properties
                                if ((reqs['identifier'] || reqs['identifier.system'] || reqs['identifier.value']) && !('identifier' in refObj)) {
                                    refObj.identifier = { system: 'urn:ietf:rfc:3986', value: 'urn:uuid:' + randomUUID() };
                                }
                                if (reqs['display'] && !('display' in refObj)) {
                                    refObj.display = 'Example ' + targetType;
                                }
                                // Handle CodeableConcept.text requirement
                                if (reqs['text'] && !('text' in refObj)) {
                                    if ('coding' in refObj && Array.isArray(refObj.coding)) {
                                        const firstCoding = refObj.coding[0];
                                        const displayText = (firstCoding && firstCoding.display) || (firstCoding && firstCoding.code) || 'Example text';
                                        refObj.text = String(displayText);
                                    }
                                }
                            }
                        }
                    }
                    else if (typeof fieldValue === 'object') {
                        // Single Reference
                        const refObj = fieldValue;
                        if (typeof refObj.reference === 'string') {
                            const match = refObj.reference.match(/^([A-Za-z]+)\//);
                            if (match)
                                targetType = match[1];
                        }
                        // Add required nested properties
                        if ((reqs['identifier'] || reqs['identifier.system'] || reqs['identifier.value']) && !('identifier' in refObj)) {
                            refObj.identifier = { system: 'urn:ietf:rfc:3986', value: 'urn:uuid:' + randomUUID() };
                        }
                        if (reqs['display'] && !('display' in refObj)) {
                            refObj.display = 'Example ' + targetType;
                        }
                        // Handle CodeableConcept nested requirements (e.g., type.text for ISiKBerichtSubSysteme)
                        // CodeableConcept has: coding (array), text (string)
                        if (reqs['text'] && !('text' in refObj)) {
                            // Check if this looks like a CodeableConcept (has coding array)
                            if ('coding' in refObj && Array.isArray(refObj.coding)) {
                                // Get display from first coding if available
                                const firstCoding = refObj.coding[0];
                                const displayText = firstCoding?.display || firstCoding?.code || 'Example text';
                                refObj.text = String(displayText);
                            }
                        }
                    }
                }
            }
        }
    }
}
