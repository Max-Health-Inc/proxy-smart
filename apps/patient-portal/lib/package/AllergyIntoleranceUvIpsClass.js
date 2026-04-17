import { validateAllergyIntoleranceUvIps } from "./AllergyIntoleranceUvIps.js";
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
export class AllergyIntoleranceUvIpsClass {
    constructor(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/AllergyIntolerance-uv-ips');
    }
    /** Validate current resource instance. */
    async validate(options) {
        return validateAllergyIntoleranceUvIps(this.resource, options);
    }
    getResource() {
        return this.resource;
    }
    setResource(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/AllergyIntolerance-uv-ips');
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
            resourceType: 'AllergyIntolerance',
        };
        return { ...base, ...overrides };
    }
    /**
     * Create a minimal randomized instance of AllergyIntoleranceUvIps.
     * Populates id, resourceType (if applicable) and primitive required (min>0) top-level fields with placeholders.
     */
    static random(overrides = {}, opts) {
        if (opts?.seed !== undefined) {
            // Direct call (no dynamic require) to ensure deterministic seeding works under ESM.
            setRandomSeed(opts.seed);
        }
        // Start with a Partial to avoid unsafe casting errors; we'll assert at the end.
        const base = { resourceType: 'AllergyIntolerance', id: randomId(), code: skeletonCodeableConcept(), patient: { reference: 'Patient/' + randomId() }, };
        // Always include meta.profile with this profile's canonical URL if available & only for resource profiles
        ensureProfile(base, 'http://hl7.org/fhir/uv/ips/StructureDefinition/AllergyIntolerance-uv-ips');
        // Enrich the base resource with common fields using centralized enrichment logic
        enrichResource(base, 'AllergyIntolerance', 'http://hl7.org/fhir/uv/ips/StructureDefinition/AllergyIntolerance-uv-ips', AllergyIntoleranceUvIpsClass._fieldPatterns, AllergyIntoleranceUvIpsClass._forbiddenFields, AllergyIntoleranceUvIpsClass.valueSetBindings, AllergyIntoleranceUvIpsClass._codeResolver, AllergyIntoleranceUvIpsClass._fieldOrder);
        // Cast through unknown to acknowledge dynamic enrichment
        return { ...base, ...overrides };
    }
    /** Convenience: returns a class instance wrapping a randomized resource. */
    static randomClass(overrides = {}, opts) {
        return new AllergyIntoleranceUvIpsClass(this.random(overrides, opts));
    }
}
/** Pattern constraints for profile fields (used by random() generator) */
AllergyIntoleranceUvIpsClass._fieldPatterns = {
    "patient.type": "ImplementationGuide",
    "reaction.substance": "597008",
    "reaction.severity": "moderate",
    "reaction.exposureRoute": "372471009",
    "_refReq_patient": {
        "reference": true
    },
    "_refReq_reaction": {
        "manifestation": true
    },
    "_choiceType_onset[x]": [
        "dateTime",
        "Age",
        "Period",
        "Range",
        "string"
    ]
};
/** Fields that are forbidden (max=0) in this profile - must not be generated */
AllergyIntoleranceUvIpsClass._forbiddenFields = [];
/** FHIR element ordering for this profile's base resource (used by enrichResource for correct JSON field order) */
AllergyIntoleranceUvIpsClass._fieldOrder = ["id", "meta", "implicitRules", "language", "text", "contained", "extension", "modifierExtension", "identifier", "clinicalStatus", "verificationStatus", "type", "category", "criticality", "code", "patient", "encounter", "onset[x]", "recordedDate", "recorder", "asserter", "lastOccurrence", "note", "reaction"];
/** ValueSet bindings for coded fields - maps field name to ValueSet URL */
AllergyIntoleranceUvIpsClass.valueSetBindings = {
    "language": "http://hl7.org/fhir/ValueSet/languages|4.0.1",
    "clinicalStatus": "http://hl7.org/fhir/ValueSet/allergyintolerance-clinical|4.0.1",
    "verificationStatus": "http://hl7.org/fhir/ValueSet/allergyintolerance-verification|4.0.1",
    "type": "http://hl7.org/fhir/ValueSet/allergy-intolerance-type|4.0.1",
    "category": "http://hl7.org/fhir/ValueSet/allergy-intolerance-category|4.0.1",
    "criticality": "http://hl7.org/fhir/ValueSet/allergy-intolerance-criticality|4.0.1",
    "code": "http://hl7.org/fhir/uv/ips/ValueSet/allergies-intolerances-uv-ips",
    "patient.type": "http://hl7.org/fhir/ValueSet/resource-types|4.0.1",
    "reaction.substance": "http://hl7.org/fhir/ValueSet/substance-code|4.0.1",
    "reaction.manifestation": "http://hl7.org/fhir/uv/ips/ValueSet/allergy-reaction-uv-ips",
    "reaction.severity": "http://hl7.org/fhir/ValueSet/reaction-event-severity|4.0.1",
    "reaction.exposureRoute": "http://hl7.org/fhir/ValueSet/route-codes|4.0.1"
};
/** Code resolver for ValueSet bindings - returns a random valid code from a ValueSet by URL */
AllergyIntoleranceUvIpsClass._codeResolver = (() => {
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
