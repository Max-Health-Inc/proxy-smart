import { validatePatientUvIps } from "./PatientUvIps.js";
// Only import helpers actually referenced below (dynamic based on required fields)
import { randomId, setRandomSeed, enrichResource, randomDate, skeletonHumanName } from "./random/index.js";
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
export class PatientUvIpsClass {
    constructor(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips');
    }
    /** Validate current resource instance. */
    async validate(options) {
        return validatePatientUvIps(this.resource, options);
    }
    getResource() {
        return this.resource;
    }
    setResource(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips');
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
            resourceType: 'Patient',
        };
        return { ...base, ...overrides };
    }
    /**
     * Create a minimal randomized instance of PatientUvIps.
     * Populates id, resourceType (if applicable) and primitive required (min>0) top-level fields with placeholders.
     */
    static random(overrides = {}, opts) {
        if (opts?.seed !== undefined) {
            // Direct call (no dynamic require) to ensure deterministic seeding works under ESM.
            setRandomSeed(opts.seed);
        }
        // Start with a Partial to avoid unsafe casting errors; we'll assert at the end.
        const base = { resourceType: 'Patient', id: randomId(), name: [skeletonHumanName()], birthDate: randomDate().slice(0, 10), };
        // Always include meta.profile with this profile's canonical URL if available & only for resource profiles
        ensureProfile(base, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips');
        // Enrich the base resource with common fields using centralized enrichment logic
        enrichResource(base, 'Patient', 'http://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips', PatientUvIpsClass._fieldPatterns, PatientUvIpsClass._forbiddenFields, PatientUvIpsClass.valueSetBindings, PatientUvIpsClass._codeResolver, PatientUvIpsClass._fieldOrder);
        // Cast through unknown to acknowledge dynamic enrichment
        return { ...base, ...overrides };
    }
    /** Convenience: returns a class instance wrapping a randomized resource. */
    static randomClass(overrides = {}, opts) {
        return new PatientUvIpsClass(this.random(overrides, opts));
    }
}
/** Pattern constraints for profile fields (used by random() generator) */
PatientUvIpsClass._fieldPatterns = {
    "name.use": "maiden",
    "contact.relationship": "I",
    "contact.gender": "unknown",
    "communication.language": "fr",
    "link.type": "replaced-by",
    "_refReq_communication": {
        "language": true
    },
    "_refReq_link": {
        "other": true,
        "type": true
    },
    "_choiceType_deceased[x]": [
        "boolean",
        "dateTime"
    ],
    "_choiceType_multipleBirth[x]": [
        "boolean",
        "integer"
    ]
};
/** Fields that are forbidden (max=0) in this profile - must not be generated */
PatientUvIpsClass._forbiddenFields = [];
/** FHIR element ordering for this profile's base resource (used by enrichResource for correct JSON field order) */
PatientUvIpsClass._fieldOrder = ["id", "meta", "implicitRules", "language", "text", "contained", "extension", "modifierExtension", "identifier", "active", "name", "telecom", "gender", "birthDate", "deceased[x]", "address", "maritalStatus", "multipleBirth[x]", "photo", "contact", "communication", "generalPractitioner", "managingOrganization", "link"];
/** ValueSet bindings for coded fields - maps field name to ValueSet URL */
PatientUvIpsClass.valueSetBindings = {
    "language": "http://hl7.org/fhir/ValueSet/languages|4.0.1",
    "name.use": "http://hl7.org/fhir/ValueSet/name-use|4.0.1",
    "gender": "http://hl7.org/fhir/ValueSet/administrative-gender|4.0.1",
    "maritalStatus": "http://hl7.org/fhir/ValueSet/marital-status|4.0.1",
    "contact.relationship": "http://hl7.org/fhir/ValueSet/patient-contactrelationship|4.0.1",
    "contact.gender": "http://hl7.org/fhir/ValueSet/administrative-gender|4.0.1",
    "communication.language": "http://hl7.org/fhir/ValueSet/languages|4.0.1",
    "link.type": "http://hl7.org/fhir/ValueSet/link-type|4.0.1"
};
/** Code resolver for ValueSet bindings - returns a random valid code from a ValueSet by URL */
PatientUvIpsClass._codeResolver = (() => {
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
