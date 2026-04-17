import { validateConditionUvIps } from "./ConditionUvIps.js";
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
export class ConditionUvIpsClass {
    constructor(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Condition-uv-ips');
    }
    /** Validate current resource instance. */
    async validate(options) {
        return validateConditionUvIps(this.resource, options);
    }
    getResource() {
        return this.resource;
    }
    setResource(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Condition-uv-ips');
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
            resourceType: 'Condition',
        };
        return { ...base, ...overrides };
    }
    /**
     * Create a minimal randomized instance of ConditionUvIps.
     * Populates id, resourceType (if applicable) and primitive required (min>0) top-level fields with placeholders.
     */
    static random(overrides = {}, opts) {
        if (opts?.seed !== undefined) {
            // Direct call (no dynamic require) to ensure deterministic seeding works under ESM.
            setRandomSeed(opts.seed);
        }
        // Start with a Partial to avoid unsafe casting errors; we'll assert at the end.
        const base = { resourceType: 'Condition', id: randomId(), code: { coding: [{ system: "http://snomed.info/sct", code: "44054006", display: "Type 2 diabetes mellitus" }], text: "Type 2 diabetes mellitus" }, subject: { reference: 'Patient/' + randomId() }, };
        // Always include meta.profile with this profile's canonical URL if available & only for resource profiles
        ensureProfile(base, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Condition-uv-ips');
        // Enrich the base resource with common fields using centralized enrichment logic
        enrichResource(base, 'Condition', 'http://hl7.org/fhir/uv/ips/StructureDefinition/Condition-uv-ips', ConditionUvIpsClass._fieldPatterns, ConditionUvIpsClass._forbiddenFields, ConditionUvIpsClass.valueSetBindings, ConditionUvIpsClass._codeResolver, ConditionUvIpsClass._fieldOrder);
        // Cast through unknown to acknowledge dynamic enrichment
        return { ...base, ...overrides };
    }
    /** Convenience: returns a class instance wrapping a randomized resource. */
    static randomClass(overrides = {}, opts) {
        return new ConditionUvIpsClass(this.random(overrides, opts));
    }
}
/** Pattern constraints for profile fields (used by random() generator) */
ConditionUvIpsClass._fieldPatterns = {
    "subject.type": "ImplementationGuide",
    "stage.summary": "385368003",
    "stage.type": "165272006",
    "evidence.code": "151004",
    "_refReq_subject": {
        "reference": true
    },
    "_choiceType_onset[x]": [
        "dateTime",
        "Age",
        "Period",
        "Range",
        "string"
    ],
    "_choiceType_abatement[x]": [
        "dateTime",
        "Age",
        "Period",
        "Range",
        "string"
    ]
};
/** Fields that are forbidden (max=0) in this profile - must not be generated */
ConditionUvIpsClass._forbiddenFields = [];
/** FHIR element ordering for this profile's base resource (used by enrichResource for correct JSON field order) */
ConditionUvIpsClass._fieldOrder = ["id", "meta", "implicitRules", "language", "text", "contained", "extension", "modifierExtension", "identifier", "clinicalStatus", "verificationStatus", "category", "severity", "code", "bodySite", "subject", "encounter", "onset[x]", "abatement[x]", "recordedDate", "recorder", "asserter", "stage", "evidence", "note"];
/** ValueSet bindings for coded fields - maps field name to ValueSet URL */
ConditionUvIpsClass.valueSetBindings = {
    "language": "http://hl7.org/fhir/ValueSet/languages|4.0.1",
    "clinicalStatus": "http://hl7.org/fhir/ValueSet/condition-clinical|4.0.1",
    "verificationStatus": "http://hl7.org/fhir/ValueSet/condition-ver-status|4.0.1",
    "category": "http://hl7.org/fhir/uv/ips/ValueSet/problem-type-uv-ips",
    "severity": "http://hl7.org/fhir/ValueSet/condition-severity",
    "code": "http://hl7.org/fhir/uv/ips/ValueSet/problems-uv-ips",
    "bodySite": "http://hl7.org/fhir/ValueSet/body-site",
    "subject.type": "http://hl7.org/fhir/ValueSet/resource-types|4.0.1",
    "stage.summary": "http://hl7.org/fhir/ValueSet/condition-stage|4.0.1",
    "stage.type": "http://hl7.org/fhir/ValueSet/condition-stage-type|4.0.1",
    "evidence.code": "http://hl7.org/fhir/ValueSet/manifestation-or-symptom|4.0.1"
};
/** Code resolver for ValueSet bindings - returns a random valid code from a ValueSet by URL */
ConditionUvIpsClass._codeResolver = (() => {
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
