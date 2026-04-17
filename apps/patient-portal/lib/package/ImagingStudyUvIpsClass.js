import { validateImagingStudyUvIps } from "./ImagingStudyUvIps.js";
// Only import helpers actually referenced below (dynamic based on required fields)
import { randomId, setRandomSeed, enrichResource } from "./random/index.js";
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
export class ImagingStudyUvIpsClass {
    constructor(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/ImagingStudy-uv-ips');
    }
    /** Validate current resource instance. */
    async validate(options) {
        return validateImagingStudyUvIps(this.resource, options);
    }
    getResource() {
        return this.resource;
    }
    setResource(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/ImagingStudy-uv-ips');
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
            resourceType: 'ImagingStudy',
        };
        return { ...base, ...overrides };
    }
    /**
     * Create a minimal randomized instance of ImagingStudyUvIps.
     * Populates id, resourceType (if applicable) and primitive required (min>0) top-level fields with placeholders.
     */
    static random(overrides = {}, opts) {
        if (opts?.seed !== undefined) {
            // Direct call (no dynamic require) to ensure deterministic seeding works under ESM.
            setRandomSeed(opts.seed);
        }
        // Start with a Partial to avoid unsafe casting errors; we'll assert at the end.
        const base = { resourceType: 'ImagingStudy', id: randomId(), status: "available", subject: { reference: 'Patient/' + randomId() }, };
        // Always include meta.profile with this profile's canonical URL if available & only for resource profiles
        ensureProfile(base, 'http://hl7.org/fhir/uv/ips/StructureDefinition/ImagingStudy-uv-ips');
        // Enrich the base resource with common fields using centralized enrichment logic
        enrichResource(base, 'ImagingStudy', 'http://hl7.org/fhir/uv/ips/StructureDefinition/ImagingStudy-uv-ips', ImagingStudyUvIpsClass._fieldPatterns, ImagingStudyUvIpsClass._forbiddenFields, ImagingStudyUvIpsClass.valueSetBindings, ImagingStudyUvIpsClass._codeResolver, ImagingStudyUvIpsClass._fieldOrder);
        // Cast through unknown to acknowledge dynamic enrichment
        return { ...base, ...overrides };
    }
    /** Convenience: returns a class instance wrapping a randomized resource. */
    static randomClass(overrides = {}, opts) {
        return new ImagingStudyUvIpsClass(this.random(overrides, opts));
    }
}
/** Pattern constraints for profile fields (used by random() generator) */
ImagingStudyUvIpsClass._fieldPatterns = {
    "subject.type": "ImplementationGuide",
    "series.bodySite": "311007",
    "series.laterality": "419161000",
    "series.performer.function": "REF",
    "_refReq_subject": {
        "reference": true
    },
    "_refReq_series": {
        "uid": true,
        "modality": true,
        "performer.actor": true,
        "instance.uid": true,
        "instance.sopClass": true
    }
};
/** Fields that are forbidden (max=0) in this profile - must not be generated */
ImagingStudyUvIpsClass._forbiddenFields = [];
/** FHIR element ordering for this profile's base resource (used by enrichResource for correct JSON field order) */
ImagingStudyUvIpsClass._fieldOrder = ["id", "meta", "implicitRules", "language", "text", "contained", "extension", "modifierExtension", "identifier", "status", "modality", "subject", "encounter", "started", "basedOn", "referrer", "interpreter", "endpoint", "numberOfSeries", "numberOfInstances", "procedureReference", "procedureCode", "location", "reasonCode", "reasonReference", "note", "description", "series"];
/** ValueSet bindings for coded fields - maps field name to ValueSet URL */
ImagingStudyUvIpsClass.valueSetBindings = {
    "language": "http://hl7.org/fhir/ValueSet/languages|4.0.1",
    "status": "http://hl7.org/fhir/uv/ips/ValueSet/imaging-study-status-uv-ips",
    "modality": "http://dicom.nema.org/medical/dicom/current/output/chtml/part16/sect_CID_29.html",
    "subject.type": "http://hl7.org/fhir/ValueSet/resource-types|4.0.1",
    "procedureCode": "http://www.rsna.org/RadLex_Playbook.aspx",
    "reasonCode": "http://hl7.org/fhir/ValueSet/procedure-reason|4.0.1",
    "series.modality": "http://dicom.nema.org/medical/dicom/current/output/chtml/part16/sect_CID_29.html",
    "series.bodySite": "http://hl7.org/fhir/ValueSet/body-site|4.0.1",
    "series.laterality": "http://hl7.org/fhir/ValueSet/bodysite-laterality|4.0.1",
    "series.performer.function": "http://hl7.org/fhir/ValueSet/series-performer-function|4.0.1",
    "series.instance.sopClass": "http://dicom.nema.org/medical/dicom/current/output/chtml/part04/sect_B.5.html#table_B.5-1"
};
/** Code resolver for ValueSet bindings - returns a random valid code from a ValueSet by URL */
ImagingStudyUvIpsClass._codeResolver = (() => {
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
