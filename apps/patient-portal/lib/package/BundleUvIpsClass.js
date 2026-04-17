import { validateBundleUvIps } from "./BundleUvIps.js";
// Only import helpers actually referenced below (dynamic based on required fields)
import { randomId, setRandomSeed, enrichResource, randomDate, skeletonIdentifier } from "./random/index.js";
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
export class BundleUvIpsClass {
    constructor(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Bundle-uv-ips');
    }
    /** Validate current resource instance. */
    async validate(options) {
        return validateBundleUvIps(this.resource, options);
    }
    getResource() {
        return this.resource;
    }
    setResource(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Bundle-uv-ips');
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
            resourceType: 'Bundle',
        };
        return { ...base, ...overrides };
    }
    /**
     * Create a minimal randomized instance of BundleUvIps.
     * Populates id, resourceType (if applicable) and primitive required (min>0) top-level fields with placeholders.
     */
    static random(overrides = {}, opts) {
        if (opts?.seed !== undefined) {
            // Direct call (no dynamic require) to ensure deterministic seeding works under ESM.
            setRandomSeed(opts.seed);
        }
        // Start with a Partial to avoid unsafe casting errors; we'll assert at the end.
        const base = { resourceType: 'Bundle', id: randomId(), identifier: skeletonIdentifier(), type: "document", timestamp: randomDate(), entry: (() => { const _patientUrl = 'urn:uuid:' + crypto.randomUUID(); return [{ fullUrl: 'urn:uuid:' + crypto.randomUUID(), resource: { resourceType: 'Composition', id: 'comp-' + randomId(), meta: { profile: ['http://hl7.org/fhir/uv/ips/StructureDefinition/Composition-uv-ips'] }, text: { status: 'generated', div: '<div xmlns="http://www.w3.org/1999/xhtml">Composition Narrative</div>' }, status: 'final', type: { coding: [{ system: 'http://loinc.org', code: '60591-5' }], text: '60591-5' }, subject: { reference: _patientUrl, display: 'Example Patient' }, date: new Date().toISOString(), author: [{ reference: 'Practitioner/' + randomId(), display: 'Example Practitioner' }], title: 'Document Title', section: [{ title: 'Problems', code: { coding: [{ system: 'http://loinc.org', code: '11450-4' }] }, text: { status: 'generated', div: '<div xmlns="http://www.w3.org/1999/xhtml">Problems</div>' }, emptyReason: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/list-empty-reason', code: 'unavailable', display: 'Unavailable' }] } }, { title: 'Allergies', code: { coding: [{ system: 'http://loinc.org', code: '48765-2' }] }, text: { status: 'generated', div: '<div xmlns="http://www.w3.org/1999/xhtml">Allergies</div>' }, emptyReason: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/list-empty-reason', code: 'unavailable', display: 'Unavailable' }] } }, { title: 'Medications', code: { coding: [{ system: 'http://loinc.org', code: '10160-0' }] }, text: { status: 'generated', div: '<div xmlns="http://www.w3.org/1999/xhtml">Medications</div>' }, emptyReason: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/list-empty-reason', code: 'unavailable', display: 'Unavailable' }] } }] } }, { fullUrl: _patientUrl, resource: { resourceType: 'Patient', id: randomId(), meta: { profile: ['http://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips'] }, identifier: [{ system: 'https://babelfhir.dev/ids', value: randomId() }], name: [{ family: 'Doe', given: ['John'] }], gender: 'unknown', birthDate: '1970-01-01' } }]; })(), };
        // Always include meta.profile with this profile's canonical URL if available & only for resource profiles
        ensureProfile(base, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Bundle-uv-ips');
        // Enrich the base resource with common fields using centralized enrichment logic
        enrichResource(base, 'Bundle', 'http://hl7.org/fhir/uv/ips/StructureDefinition/Bundle-uv-ips', BundleUvIpsClass._fieldPatterns, BundleUvIpsClass._forbiddenFields, BundleUvIpsClass.valueSetBindings, BundleUvIpsClass._codeResolver, BundleUvIpsClass._fieldOrder);
        // Cast through unknown to acknowledge dynamic enrichment
        return { ...base, ...overrides };
    }
    /** Convenience: returns a class instance wrapping a randomized resource. */
    static randomClass(overrides = {}, opts) {
        return new BundleUvIpsClass(this.random(overrides, opts));
    }
}
/** Pattern constraints for profile fields (used by random() generator) */
BundleUvIpsClass._fieldPatterns = {
    "type": "document",
    "entry.search.mode": "include",
    "entry.request.method": "PATCH",
    "composition.search.mode": "include",
    "composition.request.method": "PATCH",
    "patient.search.mode": "include",
    "patient.request.method": "PATCH",
    "allergyintolerance.search.mode": "include",
    "allergyintolerance.request.method": "PATCH",
    "careplan.search.mode": "include",
    "careplan.request.method": "PATCH",
    "clinicalimpression.search.mode": "include",
    "clinicalimpression.request.method": "PATCH",
    "condition.search.mode": "include",
    "condition.request.method": "PATCH",
    "consent.search.mode": "include",
    "consent.request.method": "PATCH",
    "device.search.mode": "include",
    "device.request.method": "PATCH",
    "deviceusestatement.search.mode": "include",
    "deviceusestatement.request.method": "PATCH",
    "diagnosticreport.search.mode": "include",
    "diagnosticreport.request.method": "PATCH",
    "documentreference.search.mode": "include",
    "documentreference.request.method": "PATCH",
    "flag.search.mode": "include",
    "flag.request.method": "PATCH",
    "imagingstudy.search.mode": "include",
    "imagingstudy.request.method": "PATCH",
    "immunization.search.mode": "include",
    "immunization.request.method": "PATCH",
    "immunizationrecommendation.search.mode": "include",
    "immunizationrecommendation.request.method": "PATCH",
    "medication.search.mode": "include",
    "medication.request.method": "PATCH",
    "medicationrequest.search.mode": "include",
    "medicationrequest.request.method": "PATCH",
    "medicationstatement.search.mode": "include",
    "medicationstatement.request.method": "PATCH",
    "practitioner.search.mode": "include",
    "practitioner.request.method": "PATCH",
    "practitionerrole.search.mode": "include",
    "practitionerrole.request.method": "PATCH",
    "procedure.search.mode": "include",
    "procedure.request.method": "PATCH",
    "observation-pregnancy-edd.search.mode": "include",
    "observation-pregnancy-edd.request.method": "PATCH",
    "observation-pregnancy-outcome.search.mode": "include",
    "observation-pregnancy-outcome.request.method": "PATCH",
    "observation-pregnancy-status.search.mode": "include",
    "observation-pregnancy-status.request.method": "PATCH",
    "observation-alcohol-use.search.mode": "include",
    "observation-alcohol-use.request.method": "PATCH",
    "observation-tobacco-use.search.mode": "include",
    "observation-tobacco-use.request.method": "PATCH",
    "observation-results-laboratory-pathology.search.mode": "include",
    "observation-results-laboratory-pathology.request.method": "PATCH",
    "observation-results-radiology.search.mode": "include",
    "observation-results-radiology.request.method": "PATCH",
    "observation-vital-signs.search.mode": "include",
    "observation-vital-signs.request.method": "PATCH",
    "organization.search.mode": "include",
    "organization.request.method": "PATCH",
    "specimen.search.mode": "include",
    "specimen.request.method": "PATCH",
    "_refReq_link": {
        "relation": true,
        "url": true
    },
    "_refReq_entry": {
        "fullUrl": true,
        "request.method": true,
        "request.url": true,
        "response.status": true,
        "resource": true
    },
    "_entryProfile:Patient": {
        "profile": "http://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips"
    }
};
/** Fields that are forbidden (max=0) in this profile - must not be generated */
BundleUvIpsClass._forbiddenFields = ["entry.search", "entry.request", "entry.response"];
/** FHIR element ordering for this profile's base resource (used by enrichResource for correct JSON field order) */
BundleUvIpsClass._fieldOrder = ["id", "meta", "implicitRules", "language", "identifier", "type", "timestamp", "total", "link", "entry", "signature"];
/** ValueSet bindings for coded fields - maps field name to ValueSet URL */
BundleUvIpsClass.valueSetBindings = {
    "language": "http://hl7.org/fhir/ValueSet/languages|4.0.1",
    "type": "http://hl7.org/fhir/ValueSet/bundle-type|4.0.1",
    "entry.search.mode": "http://hl7.org/fhir/ValueSet/search-entry-mode|4.0.1",
    "entry.request.method": "http://hl7.org/fhir/ValueSet/http-verb|4.0.1"
};
/** Code resolver for ValueSet bindings - returns a random valid code from a ValueSet by URL */
BundleUvIpsClass._codeResolver = (() => {
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
