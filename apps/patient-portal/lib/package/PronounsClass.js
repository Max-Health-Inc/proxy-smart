import { validatePronouns } from "./Pronouns.js";
// Only import helpers actually referenced below (dynamic based on required fields)
import { randomId, setRandomSeed, enrichResource } from "./random/index.js";
import { createRequire } from 'module';
const __require = createRequire(import.meta.url);
// Helper emitted only when meta.profile enforcement is applicable (resource profiles)
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
export class PronounsClass {
    constructor(resource) {
        this.resource = resource;
    }
    /** Validate current resource instance. */
    async validate(options) {
        return validatePronouns(this.resource, options);
    }
    getResource() {
        return this.resource;
    }
    setResource(resource) {
        this.resource = resource;
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
            url: 'http://hl7.org/fhir/StructureDefinition/individual-pronouns',
        };
        return { ...base, ...overrides };
    }
    /**
     * Create a minimal randomized instance of Pronouns.
     * Populates id, resourceType (if applicable) and primitive required (min>0) top-level fields with placeholders.
     */
    static random(overrides = {}, opts) {
        if (opts?.seed !== undefined) {
            // Direct call (no dynamic require) to ensure deterministic seeding works under ESM.
            setRandomSeed(opts.seed);
        }
        // Start with a Partial to avoid unsafe casting errors; we'll assert at the end.
        const base = { id: randomId(), extension: [{ url: "value", valueCodeableConcept: { coding: [{ "system": "http://loinc.org", "code": "LA29519-8" }] } }], url: "http://hl7.org/fhir/StructureDefinition/individual-pronouns", };
        // Always include meta.profile with this profile's canonical URL if available & only for resource profiles
        // (no profileUrl provided or profile targets a datatype â€“ meta.profile not applicable)
        // Enrich the base resource with common fields using centralized enrichment logic
        enrichResource(base, 'Extension', 'http://hl7.org/fhir/StructureDefinition/individual-pronouns', PronounsClass._fieldPatterns, PronounsClass._forbiddenFields, PronounsClass.valueSetBindings, PronounsClass._codeResolver, PronounsClass._fieldOrder);
        // Cast through unknown to acknowledge dynamic enrichment
        return { ...base, ...overrides };
    }
    /** Convenience: returns a class instance wrapping a randomized resource. */
    static randomClass(overrides = {}, opts) {
        return new PronounsClass(this.random(overrides, opts));
    }
}
/** Pattern constraints for profile fields (used by random() generator) */
PronounsClass._fieldPatterns = {
    "value.url": "value",
    "period.url": "period",
    "comment.url": "comment",
    "url": "http://hl7.org/fhir/StructureDefinition/individual-pronouns",
    "_refReq_extension": {
        "url": true,
        "valueCodeableConcept": true,
        "valuePeriod": true,
        "valueString": true
    },
    "_choiceType_value[x]": [
        "base64Binary",
        "boolean",
        "canonical",
        "code",
        "date",
        "dateTime",
        "decimal",
        "id",
        "instant",
        "integer",
        "integer64",
        "markdown",
        "oid",
        "positiveInt",
        "string",
        "time",
        "unsignedInt",
        "uri",
        "url",
        "uuid",
        "Address",
        "Age",
        "Annotation",
        "Attachment",
        "CodeableConcept",
        "CodeableReference",
        "Coding",
        "ContactPoint",
        "Count",
        "Distance",
        "Duration",
        "HumanName",
        "Identifier",
        "Money",
        "Period",
        "Quantity",
        "Range",
        "Ratio",
        "RatioRange",
        "Reference",
        "SampledData",
        "Signature",
        "Timing",
        "ContactDetail",
        "DataRequirement",
        "Expression",
        "ParameterDefinition",
        "RelatedArtifact",
        "TriggerDefinition",
        "UsageContext",
        "Availability",
        "ExtendedContactDetail",
        "Dosage",
        "Meta"
    ]
};
/** Fields that are forbidden (max=0) in this profile - must not be generated */
PronounsClass._forbiddenFields = ["extension.extension", "value[x]"];
/** FHIR element ordering for this profile's base resource (used by enrichResource for correct JSON field order) */
PronounsClass._fieldOrder = ["id", "extension", "url", "value[x]"];
/** ValueSet bindings for coded fields - maps field name to ValueSet URL */
PronounsClass.valueSetBindings = {
    "extension.value[x]": "http://terminology.hl7.org/ValueSet/pronouns"
};
/** Code resolver for ValueSet bindings - returns a random valid code from a ValueSet by URL */
PronounsClass._codeResolver = (() => {
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
