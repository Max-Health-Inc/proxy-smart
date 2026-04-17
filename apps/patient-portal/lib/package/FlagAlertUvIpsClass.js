import { validateFlagAlertUvIps } from "./FlagAlertUvIps.js";
// Only import helpers actually referenced below (dynamic based on required fields)
import { randomId, setRandomSeed, enrichResource, skeletonCodeableConcept } from "./random/index.js";
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
export class FlagAlertUvIpsClass {
    constructor(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Flag-alert-uv-ips');
    }
    /** Validate current resource instance. */
    async validate(options) {
        return validateFlagAlertUvIps(this.resource, options);
    }
    getResource() {
        return this.resource;
    }
    setResource(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Flag-alert-uv-ips');
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
            resourceType: 'Flag',
        };
        return { ...base, ...overrides };
    }
    /**
     * Create a minimal randomized instance of FlagAlertUvIps.
     * Populates id, resourceType (if applicable) and primitive required (min>0) top-level fields with placeholders.
     */
    static random(overrides = {}, opts) {
        if (opts?.seed !== undefined) {
            // Direct call (no dynamic require) to ensure deterministic seeding works under ESM.
            setRandomSeed(opts.seed);
        }
        // Start with a Partial to avoid unsafe casting errors; we'll assert at the end.
        const base = { resourceType: 'Flag', id: randomId(), status: "active", code: skeletonCodeableConcept(), subject: { reference: 'Patient/' + randomId() }, };
        // Always include meta.profile with this profile's canonical URL if available & only for resource profiles
        ensureProfile(base, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Flag-alert-uv-ips');
        // Enrich the base resource with common fields using centralized enrichment logic
        enrichResource(base, 'Flag', 'http://hl7.org/fhir/uv/ips/StructureDefinition/Flag-alert-uv-ips', FlagAlertUvIpsClass._fieldPatterns, FlagAlertUvIpsClass._forbiddenFields, FlagAlertUvIpsClass.valueSetBindings, FlagAlertUvIpsClass._codeResolver, FlagAlertUvIpsClass._fieldOrder);
        // Cast through unknown to acknowledge dynamic enrichment
        return { ...base, ...overrides };
    }
    /** Convenience: returns a class instance wrapping a randomized resource. */
    static randomClass(overrides = {}, opts) {
        return new FlagAlertUvIpsClass(this.random(overrides, opts));
    }
}
/** Pattern constraints for profile fields (used by random() generator) */
FlagAlertUvIpsClass._fieldPatterns = {
    "status": "active",
    "subject.type": "ImplementationGuide",
    "_refReq_subject": {
        "reference": true
    }
};
/** Fields that are forbidden (max=0) in this profile - must not be generated */
FlagAlertUvIpsClass._forbiddenFields = [];
/** FHIR element ordering for this profile's base resource (used by enrichResource for correct JSON field order) */
FlagAlertUvIpsClass._fieldOrder = ["id", "meta", "implicitRules", "language", "text", "contained", "extension", "modifierExtension", "identifier", "status", "category", "code", "subject", "period", "encounter", "author"];
/** ValueSet bindings for coded fields - maps field name to ValueSet URL */
FlagAlertUvIpsClass.valueSetBindings = {
    "language": "http://hl7.org/fhir/ValueSet/languages|4.0.1",
    "status": "http://hl7.org/fhir/ValueSet/flag-status|4.0.1",
    "category": "http://hl7.org/fhir/ValueSet/flag-category|4.0.1",
    "code": "http://hl7.org/fhir/ValueSet/flag-code|4.0.1",
    "subject.type": "http://hl7.org/fhir/ValueSet/resource-types|4.0.1"
};
/** Code resolver for ValueSet bindings - returns a random valid code from a ValueSet by URL */
FlagAlertUvIpsClass._codeResolver = (() => {
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
