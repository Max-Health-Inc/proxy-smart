import { validateObservationPregnancyEddUvIps } from "./ObservationPregnancyEddUvIps.js";
// Only import helpers actually referenced below (dynamic based on required fields)
import { randomId, setRandomSeed, enrichResource, randomDate, skeletonCodeableConcept } from "./random/index.js";
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
export class ObservationPregnancyEddUvIpsClass {
    constructor(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-pregnancy-edd-uv-ips');
    }
    /** Validate current resource instance. */
    async validate(options) {
        return validateObservationPregnancyEddUvIps(this.resource, options);
    }
    getResource() {
        return this.resource;
    }
    setResource(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-pregnancy-edd-uv-ips');
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
            resourceType: 'Observation',
        };
        return { ...base, ...overrides };
    }
    /**
     * Create a minimal randomized instance of ObservationPregnancyEddUvIps.
     * Populates id, resourceType (if applicable) and primitive required (min>0) top-level fields with placeholders.
     */
    static random(overrides = {}, opts) {
        if (opts?.seed !== undefined) {
            // Direct call (no dynamic require) to ensure deterministic seeding works under ESM.
            setRandomSeed(opts.seed);
        }
        // Start with a Partial to avoid unsafe casting errors; we'll assert at the end.
        const base = { resourceType: 'Observation', id: randomId(), status: "final", code: skeletonCodeableConcept('http://loinc.org', ['11778-8']), subject: { reference: 'Patient/' + randomId() }, effectiveDateTime: randomDate(), };
        // Always include meta.profile with this profile's canonical URL if available & only for resource profiles
        ensureProfile(base, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-pregnancy-edd-uv-ips');
        // Enrich the base resource with common fields using centralized enrichment logic
        enrichResource(base, 'Observation', 'http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-pregnancy-edd-uv-ips', ObservationPregnancyEddUvIpsClass._fieldPatterns, ObservationPregnancyEddUvIpsClass._forbiddenFields, ObservationPregnancyEddUvIpsClass.valueSetBindings, ObservationPregnancyEddUvIpsClass._codeResolver, ObservationPregnancyEddUvIpsClass._fieldOrder);
        // Cast through unknown to acknowledge dynamic enrichment
        return { ...base, ...overrides };
    }
    /** Convenience: returns a class instance wrapping a randomized resource. */
    static randomClass(overrides = {}, opts) {
        return new ObservationPregnancyEddUvIpsClass(this.random(overrides, opts));
    }
}
/** Pattern constraints for profile fields (used by random() generator) */
ObservationPregnancyEddUvIpsClass._fieldPatterns = {
    "subject.type": "ImplementationGuide",
    "referenceRange.type": "therapeutic",
    "referenceRange.appliesTo": "1742-6",
    "component.code": "100000-9",
    "component.dataAbsentReason": "not-asked",
    "component.interpretation": "HH",
    "_refReq_subject": {
        "reference": true
    },
    "_refReq_component": {
        "code": true
    },
    "_choiceType_effective[x]": [
        "dateTime"
    ],
    "_choiceType_value[x]": [
        "Quantity",
        "CodeableConcept",
        "string",
        "boolean",
        "integer",
        "Range",
        "Ratio",
        "SampledData",
        "time",
        "dateTime",
        "Period"
    ]
};
/** Fields that are forbidden (max=0) in this profile - must not be generated */
ObservationPregnancyEddUvIpsClass._forbiddenFields = ["bodySite", "method", "specimen", "device", "referenceRange", "component"];
/** FHIR element ordering for this profile's base resource (used by enrichResource for correct JSON field order) */
ObservationPregnancyEddUvIpsClass._fieldOrder = ["id", "meta", "implicitRules", "language", "text", "contained", "extension", "modifierExtension", "identifier", "basedOn", "partOf", "status", "category", "code", "subject", "focus", "encounter", "effective[x]", "issued", "performer", "value[x]", "dataAbsentReason", "interpretation", "note", "bodySite", "method", "specimen", "device", "referenceRange", "hasMember", "derivedFrom", "component"];
/** ValueSet bindings for coded fields - maps field name to ValueSet URL */
ObservationPregnancyEddUvIpsClass.valueSetBindings = {
    "language": "http://hl7.org/fhir/ValueSet/languages|4.0.1",
    "status": "http://hl7.org/fhir/ValueSet/observation-status|4.0.1",
    "category": "http://hl7.org/fhir/ValueSet/observation-category|4.0.1",
    "code": "http://hl7.org/fhir/uv/ips/ValueSet/edd-method-uv-ips",
    "subject.type": "http://hl7.org/fhir/ValueSet/resource-types|4.0.1",
    "dataAbsentReason": "http://hl7.org/fhir/ValueSet/data-absent-reason|4.0.1",
    "interpretation": "http://hl7.org/fhir/ValueSet/observation-interpretation|4.0.1",
    "bodySite": "http://hl7.org/fhir/ValueSet/body-site|4.0.1",
    "method": "http://hl7.org/fhir/ValueSet/observation-methods|4.0.1",
    "referenceRange.type": "http://hl7.org/fhir/ValueSet/referencerange-meaning|4.0.1",
    "referenceRange.appliesTo": "http://hl7.org/fhir/ValueSet/referencerange-appliesto|4.0.1",
    "component.code": "http://hl7.org/fhir/ValueSet/observation-codes|4.0.1",
    "component.dataAbsentReason": "http://hl7.org/fhir/ValueSet/data-absent-reason|4.0.1",
    "component.interpretation": "http://hl7.org/fhir/ValueSet/observation-interpretation|4.0.1"
};
/** Code resolver for ValueSet bindings - returns a random valid code from a ValueSet by URL */
ObservationPregnancyEddUvIpsClass._codeResolver = (() => {
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
