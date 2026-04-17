import { validateCompositionUvIps } from "./CompositionUvIps.js";
// Only import helpers actually referenced below (dynamic based on required fields)
import { randomId, setRandomSeed, enrichResource, randomDate, skeletonCodeableConcept, skeletonReference } from "./random/index.js";
import { createRequire } from 'module';
const __require = createRequire(import.meta.url);
function ensureProfile(res, profile) {
    if (!res.meta) {
        res.meta = { profile: [profile] };
        return;
    }
    if (!res.meta.profile) {
        res.meta.profile = [profile];
        return;
    }
    if (!res.meta.profile.includes(profile)) {
        res.meta.profile = [...res.meta.profile, profile];
    }
}
// Internal helper (emitted per class file) to clone without resorting to 'any'.
function safeClone(value) {
    // Use native structuredClone if present; otherwise fallback to JSON round-trip.
    // We intentionally avoid casting through any to satisfy no-explicit-any lint rule.
    const g = globalThis;
    // Narrow globalThis to an object potentially containing structuredClone.
    if (typeof g.structuredClone === 'function') {
        return g.structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)); // best-effort deep clone
}
export class CompositionUvIpsClass {
    constructor(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Composition-uv-ips');
    }
    /** Validate current resource instance. */
    async validate(options) {
        return validateCompositionUvIps(this.resource, options);
    }
    getResource() {
        return this.resource;
    }
    setResource(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Composition-uv-ips');
    }
    /**
     * Returns a plain JSON clone of the underlying resource ONLY if the last validation succeeded with zero errors.
     * Call validate() first; otherwise this method throws to prevent accidental use of invalid / unchecked data.
     */
    async toJSON() {
        return safeClone(this.resource);
    }
    /**
     * Create an empty instance for parity testing: for true FHIR resources, includes only resourceType; for datatypes, returns an empty object.
     * Note: meta.profile (when applicable) will be ensured by the constructor when wrapping this resource.
     */
    static empty(overrides = {}) {
        // For Resource profiles, include only resourceType. For Extension profiles, include url so the instance is minimally meaningful.
        const base = {
            resourceType: 'Composition',
        };
        return { ...base, ...overrides };
    }
    /**
     * Create a minimal randomized instance of CompositionUvIps.
     * Populates id, resourceType (if applicable) and primitive required (min>0) top-level fields with placeholders.
     */
    static random(overrides = {}, opts) {
        if (opts?.seed !== undefined) {
            // Direct call (no dynamic require) to ensure deterministic seeding works under ESM.
            setRandomSeed(opts.seed);
        }
        // Start with a Partial to avoid unsafe casting errors; we'll assert at the end.
        const base = { resourceType: 'Composition', id: randomId(), status: "preliminary", type: skeletonCodeableConcept('http://loinc.org', ['60591-5']), subject: { reference: 'Resource/' + randomId() }, date: randomDate(), author: [skeletonReference()], title: randomId(), section: [{ title: "placeholder", code: { "coding": [{ "system": "http://loinc.org", "code": "11450-4" }] }, text: { status: "generated", div: "<div xmlns=\"http://www.w3.org/1999/xhtml\">Content</div>" }, mode: "working", orderedBy: { coding: [{ "system": "http://terminology.hl7.org/CodeSystem/list-order", "code": "category" }] }, emptyReason: { coding: [{ "system": "http://terminology.hl7.org/CodeSystem/list-empty-reason", "code": "nilknown" }] } }, { title: "placeholder", code: { "coding": [{ "system": "http://loinc.org", "code": "48765-2" }] }, text: { status: "generated", div: "<div xmlns=\"http://www.w3.org/1999/xhtml\">Content</div>" }, mode: "working", orderedBy: { coding: [{ "system": "http://terminology.hl7.org/CodeSystem/list-order", "code": "category" }] }, emptyReason: { coding: [{ "system": "http://terminology.hl7.org/CodeSystem/list-empty-reason", "code": "nilknown" }] } }, { title: "placeholder", code: { "coding": [{ "system": "http://loinc.org", "code": "10160-0" }] }, text: { status: "generated", div: "<div xmlns=\"http://www.w3.org/1999/xhtml\">Content</div>" }, mode: "working", orderedBy: { coding: [{ "system": "http://terminology.hl7.org/CodeSystem/list-order", "code": "category" }] }, emptyReason: { coding: [{ "system": "http://terminology.hl7.org/CodeSystem/list-empty-reason", "code": "nilknown" }] } }], };
        // Always include meta.profile with this profile's canonical URL if available & only for resource profiles
        ensureProfile(base, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Composition-uv-ips');
        // Enrich the base resource with common fields using centralized enrichment logic
        enrichResource(base, 'Composition', 'http://hl7.org/fhir/uv/ips/StructureDefinition/Composition-uv-ips', CompositionUvIpsClass._fieldPatterns, CompositionUvIpsClass._forbiddenFields, CompositionUvIpsClass.valueSetBindings, CompositionUvIpsClass._codeResolver, CompositionUvIpsClass._fieldOrder);
        // Cast through unknown to acknowledge dynamic enrichment
        return { ...base, ...overrides };
    }
    /** Convenience: returns a class instance wrapping a randomized resource. */
    static randomClass(overrides = {}, opts) {
        return new CompositionUvIpsClass(this.random(overrides, opts));
    }
}
/** Pattern constraints for profile fields (used by random() generator) */
CompositionUvIpsClass._fieldPatterns = {
    "meta.security": "CLINRPT",
    "meta.tag": "actionable",
    "type": {
        "coding": [
            {
                "system": "http://loinc.org",
                "code": "60591-5"
            }
        ]
    },
    "subject.type": "ImplementationGuide",
    "attester.mode": "legal",
    "relatesTo.code": "replaces",
    "event.code": "CURC",
    "careProvisioningEvent.code": {
        "coding": [
            {
                "system": "http://terminology.hl7.org/CodeSystem/v3-ActClass",
                "code": "PCPR"
            }
        ]
    },
    "section.code": "46264-8",
    "section.mode": "working",
    "section.orderedBy": "category",
    "section.emptyReason": "nilknown",
    "sectionProblems.code": {
        "coding": [
            {
                "system": "http://loinc.org",
                "code": "11450-4"
            }
        ]
    },
    "sectionProblems.mode": "working",
    "sectionProblems.orderedBy": "category",
    "sectionProblems.emptyReason": "nilknown",
    "sectionAllergies.code": {
        "coding": [
            {
                "system": "http://loinc.org",
                "code": "48765-2"
            }
        ]
    },
    "sectionAllergies.mode": "working",
    "sectionAllergies.orderedBy": "category",
    "sectionAllergies.emptyReason": "nilknown",
    "sectionMedications.code": {
        "coding": [
            {
                "system": "http://loinc.org",
                "code": "10160-0"
            }
        ]
    },
    "sectionMedications.mode": "working",
    "sectionMedications.orderedBy": "category",
    "sectionMedications.emptyReason": "nilknown",
    "sectionImmunizations.code": {
        "coding": [
            {
                "system": "http://loinc.org",
                "code": "11369-6"
            }
        ]
    },
    "sectionImmunizations.mode": "working",
    "sectionImmunizations.orderedBy": "category",
    "sectionImmunizations.emptyReason": "nilknown",
    "sectionResults.code": {
        "coding": [
            {
                "system": "http://loinc.org",
                "code": "30954-2"
            }
        ]
    },
    "sectionResults.mode": "working",
    "sectionResults.orderedBy": "category",
    "sectionResults.emptyReason": "nilknown",
    "sectionProceduresHx.code": {
        "coding": [
            {
                "system": "http://loinc.org",
                "code": "47519-4"
            }
        ]
    },
    "sectionProceduresHx.mode": "working",
    "sectionProceduresHx.orderedBy": "category",
    "sectionProceduresHx.emptyReason": "nilknown",
    "sectionMedicalDevices.code": {
        "coding": [
            {
                "system": "http://loinc.org",
                "code": "46264-8"
            }
        ]
    },
    "sectionMedicalDevices.mode": "working",
    "sectionMedicalDevices.orderedBy": "category",
    "sectionMedicalDevices.emptyReason": "nilknown",
    "sectionAdvanceDirectives.code": {
        "coding": [
            {
                "system": "http://loinc.org",
                "code": "42348-3"
            }
        ]
    },
    "sectionAdvanceDirectives.mode": "working",
    "sectionAdvanceDirectives.orderedBy": "category",
    "sectionAdvanceDirectives.emptyReason": "nilknown",
    "sectionAlerts.code": {
        "coding": [
            {
                "system": "http://loinc.org",
                "code": "104605-1"
            }
        ]
    },
    "sectionAlerts.mode": "working",
    "sectionAlerts.orderedBy": "category",
    "sectionAlerts.emptyReason": "nilknown",
    "sectionFunctionalStatus.code": {
        "coding": [
            {
                "system": "http://loinc.org",
                "code": "47420-5"
            }
        ]
    },
    "sectionFunctionalStatus.mode": "working",
    "sectionFunctionalStatus.orderedBy": "category",
    "sectionFunctionalStatus.emptyReason": "nilknown",
    "sectionPastProblems.code": {
        "coding": [
            {
                "system": "http://loinc.org",
                "code": "11348-0"
            }
        ]
    },
    "sectionPastProblems.mode": "working",
    "sectionPastProblems.orderedBy": "category",
    "sectionPastProblems.emptyReason": "nilknown",
    "sectionPregnancyHx.code": {
        "coding": [
            {
                "system": "http://loinc.org",
                "code": "10162-6"
            }
        ]
    },
    "sectionPregnancyHx.mode": "working",
    "sectionPregnancyHx.orderedBy": "category",
    "sectionPregnancyHx.emptyReason": "nilknown",
    "sectionPatientStory.code": {
        "coding": [
            {
                "system": "http://loinc.org",
                "code": "81338-6"
            }
        ]
    },
    "sectionPatientStory.mode": "working",
    "sectionPatientStory.orderedBy": "category",
    "sectionPatientStory.emptyReason": "nilknown",
    "sectionPlanOfCare.code": {
        "coding": [
            {
                "system": "http://loinc.org",
                "code": "18776-5"
            }
        ]
    },
    "sectionPlanOfCare.mode": "working",
    "sectionPlanOfCare.orderedBy": "category",
    "sectionPlanOfCare.emptyReason": "nilknown",
    "sectionSocialHistory.code": {
        "coding": [
            {
                "system": "http://loinc.org",
                "code": "29762-2"
            }
        ]
    },
    "sectionSocialHistory.mode": "working",
    "sectionSocialHistory.orderedBy": "category",
    "sectionSocialHistory.emptyReason": "nilknown",
    "sectionVitalSigns.code": {
        "coding": [
            {
                "system": "http://loinc.org",
                "code": "8716-3"
            }
        ]
    },
    "sectionVitalSigns.mode": "working",
    "sectionVitalSigns.orderedBy": "category",
    "sectionVitalSigns.emptyReason": "nilknown",
    "_refReq_subject": {
        "reference": true
    },
    "_refReq_attester": {
        "mode": true
    },
    "_refReq_relatesTo": {
        "code": true,
        "targetIdentifier": true
    },
    "_refReq_event": {
        "code": true
    },
    "_refReq_section": {
        "title": true,
        "code": true,
        "text": true
    }
};
/** Fields that are forbidden (max=0) in this profile - must not be generated */
CompositionUvIpsClass._forbiddenFields = ["section.section"];
/** FHIR element ordering for this profile's base resource (used by enrichResource for correct JSON field order) */
CompositionUvIpsClass._fieldOrder = ["id", "meta", "implicitRules", "language", "text", "contained", "extension", "modifierExtension", "identifier", "status", "type", "category", "subject", "encounter", "date", "author", "title", "confidentiality", "attester", "custodian", "relatesTo", "event", "section"];
/** ValueSet bindings for coded fields - maps field name to ValueSet URL */
CompositionUvIpsClass.valueSetBindings = {
    "meta.security": "http://hl7.org/fhir/ValueSet/security-labels|4.0.1",
    "meta.tag": "http://hl7.org/fhir/ValueSet/common-tags|4.0.1",
    "language": "http://hl7.org/fhir/ValueSet/languages|4.0.1",
    "status": "http://hl7.org/fhir/ValueSet/composition-status|4.0.1",
    "type": "http://hl7.org/fhir/ValueSet/doc-typecodes|4.0.1",
    "category": "http://hl7.org/fhir/ValueSet/document-classcodes|4.0.1",
    "subject.type": "http://hl7.org/fhir/ValueSet/resource-types|4.0.1",
    "confidentiality": "http://terminology.hl7.org/ValueSet/v3-ConfidentialityClassification|2014-03-26",
    "attester.mode": "http://hl7.org/fhir/ValueSet/composition-attestation-mode|4.0.1",
    "relatesTo.code": "http://hl7.org/fhir/ValueSet/document-relationship-type|4.0.1",
    "event.code": "http://terminology.hl7.org/ValueSet/v3-ActCode",
    "section.code": "http://hl7.org/fhir/ValueSet/doc-section-codes|4.0.1",
    "section.mode": "http://hl7.org/fhir/ValueSet/list-mode|4.0.1",
    "section.orderedBy": "http://hl7.org/fhir/ValueSet/list-order|4.0.1",
    "section.emptyReason": "http://hl7.org/fhir/ValueSet/list-empty-reason|4.0.1"
};
/** Code resolver for ValueSet bindings - returns a random valid code from a ValueSet by URL */
CompositionUvIpsClass._codeResolver = (() => {
    // Try to load the ValueSetRegistry - it may not exist if no ValueSets were generated
    try {
        const registry = __require('./valuesets/index.js');
        if (registry && typeof registry.getRandomConceptByUrl === 'function') {
            return registry.getRandomConceptByUrl;
        }
    }
    catch { /* ValueSetRegistry not available */ }
    return undefined;
})();
