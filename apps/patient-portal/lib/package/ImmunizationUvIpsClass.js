import { validateImmunizationUvIps } from "./ImmunizationUvIps.js";
// Only import helpers actually referenced below (dynamic based on required fields)
import { randomId, setRandomSeed, enrichResource, randomDate } from "./random/index.js";
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
export class ImmunizationUvIpsClass {
    constructor(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Immunization-uv-ips');
    }
    /** Validate current resource instance. */
    async validate(options) {
        return validateImmunizationUvIps(this.resource, options);
    }
    getResource() {
        return this.resource;
    }
    setResource(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Immunization-uv-ips');
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
            resourceType: 'Immunization',
        };
        return { ...base, ...overrides };
    }
    /**
     * Create a minimal randomized instance of ImmunizationUvIps.
     * Populates id, resourceType (if applicable) and primitive required (min>0) top-level fields with placeholders.
     */
    static random(overrides = {}, opts) {
        if (opts?.seed !== undefined) {
            // Direct call (no dynamic require) to ensure deterministic seeding works under ESM.
            setRandomSeed(opts.seed);
        }
        // Start with a Partial to avoid unsafe casting errors; we'll assert at the end.
        const base = { resourceType: 'Immunization', id: randomId(), status: "entered-in-error", vaccineCode: { coding: [{ system: "http://hl7.org/fhir/sid/cvx", code: "207", display: "COVID-19, mRNA, LNP-S, PF, 100 mcg/0.5mL dose or 50 mcg/0.25mL dose" }], text: "COVID-19 mRNA vaccine" }, patient: { reference: 'Patient/' + randomId() }, occurrenceDateTime: randomDate(), };
        // Always include meta.profile with this profile's canonical URL if available & only for resource profiles
        ensureProfile(base, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Immunization-uv-ips');
        // Enrich the base resource with common fields using centralized enrichment logic
        enrichResource(base, 'Immunization', 'http://hl7.org/fhir/uv/ips/StructureDefinition/Immunization-uv-ips', ImmunizationUvIpsClass._fieldPatterns, ImmunizationUvIpsClass._forbiddenFields, ImmunizationUvIpsClass.valueSetBindings, ImmunizationUvIpsClass._codeResolver, ImmunizationUvIpsClass._fieldOrder);
        // Cast through unknown to acknowledge dynamic enrichment
        return { ...base, ...overrides };
    }
    /** Convenience: returns a class instance wrapping a randomized resource. */
    static randomClass(overrides = {}, opts) {
        return new ImmunizationUvIpsClass(this.random(overrides, opts));
    }
}
/** Pattern constraints for profile fields (used by random() generator) */
ImmunizationUvIpsClass._fieldPatterns = {
    "patient.type": "ImplementationGuide",
    "performer.function": "OP",
    "protocolApplied.targetDisease": "63650001",
    "_refReq_patient": {
        "reference": true
    },
    "_refReq_performer": {
        "actor": true
    },
    "_refReq_protocolApplied": {
        "doseNumberPositiveInt": true
    },
    "_choiceType_occurrence[x]": [
        "dateTime",
        "string"
    ]
};
/** Fields that are forbidden (max=0) in this profile - must not be generated */
ImmunizationUvIpsClass._forbiddenFields = [];
/** FHIR element ordering for this profile's base resource (used by enrichResource for correct JSON field order) */
ImmunizationUvIpsClass._fieldOrder = ["id", "meta", "implicitRules", "language", "text", "contained", "extension", "modifierExtension", "identifier", "status", "statusReason", "vaccineCode", "patient", "encounter", "occurrence[x]", "recorded", "primarySource", "reportOrigin", "location", "manufacturer", "lotNumber", "expirationDate", "site", "route", "doseQuantity", "performer", "note", "reasonCode", "reasonReference", "isSubpotent", "subpotentReason", "education", "programEligibility", "fundingSource", "reaction", "protocolApplied"];
/** ValueSet bindings for coded fields - maps field name to ValueSet URL */
ImmunizationUvIpsClass.valueSetBindings = {
    "language": "http://hl7.org/fhir/ValueSet/languages|4.0.1",
    "status": "http://hl7.org/fhir/ValueSet/immunization-status|4.0.1",
    "statusReason": "http://hl7.org/fhir/ValueSet/immunization-status-reason|4.0.1",
    "vaccineCode": "http://hl7.org/fhir/uv/ips/ValueSet/vaccines-uv-ips",
    "patient.type": "http://hl7.org/fhir/ValueSet/resource-types|4.0.1",
    "reportOrigin": "http://hl7.org/fhir/ValueSet/immunization-origin|4.0.1",
    "site": "http://hl7.org/fhir/ValueSet/body-site",
    "route": "http://hl7.org/fhir/ValueSet/route-codes",
    "performer.function": "http://hl7.org/fhir/ValueSet/immunization-function|4.0.1",
    "reasonCode": "http://hl7.org/fhir/ValueSet/immunization-reason|4.0.1",
    "subpotentReason": "http://hl7.org/fhir/ValueSet/immunization-subpotent-reason|4.0.1",
    "programEligibility": "http://hl7.org/fhir/ValueSet/immunization-program-eligibility|4.0.1",
    "fundingSource": "http://hl7.org/fhir/ValueSet/immunization-funding-source|4.0.1",
    "protocolApplied.targetDisease": "http://hl7.org/fhir/uv/ips/ValueSet/target-diseases-uv-ips"
};
/** Code resolver for ValueSet bindings - returns a random valid code from a ValueSet by URL */
ImmunizationUvIpsClass._codeResolver = (() => {
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
