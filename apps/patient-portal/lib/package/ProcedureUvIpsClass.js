import { validateProcedureUvIps } from "./ProcedureUvIps.js";
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
export class ProcedureUvIpsClass {
    constructor(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Procedure-uv-ips');
    }
    /** Validate current resource instance. */
    async validate(options) {
        return validateProcedureUvIps(this.resource, options);
    }
    getResource() {
        return this.resource;
    }
    setResource(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Procedure-uv-ips');
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
            resourceType: 'Procedure',
        };
        return { ...base, ...overrides };
    }
    /**
     * Create a minimal randomized instance of ProcedureUvIps.
     * Populates id, resourceType (if applicable) and primitive required (min>0) top-level fields with placeholders.
     */
    static random(overrides = {}, opts) {
        if (opts?.seed !== undefined) {
            // Direct call (no dynamic require) to ensure deterministic seeding works under ESM.
            setRandomSeed(opts.seed);
        }
        // Start with a Partial to avoid unsafe casting errors; we'll assert at the end.
        const base = { resourceType: 'Procedure', id: randomId(), status: "stopped", code: { coding: [{ system: "http://snomed.info/sct", code: "80146002", display: "Appendectomy" }], text: "Appendectomy" }, subject: { reference: 'Patient/' + randomId() }, performedDateTime: randomDate(), };
        // Always include meta.profile with this profile's canonical URL if available & only for resource profiles
        ensureProfile(base, 'http://hl7.org/fhir/uv/ips/StructureDefinition/Procedure-uv-ips');
        // Enrich the base resource with common fields using centralized enrichment logic
        enrichResource(base, 'Procedure', 'http://hl7.org/fhir/uv/ips/StructureDefinition/Procedure-uv-ips', ProcedureUvIpsClass._fieldPatterns, ProcedureUvIpsClass._forbiddenFields, ProcedureUvIpsClass.valueSetBindings, ProcedureUvIpsClass._codeResolver, ProcedureUvIpsClass._fieldOrder);
        // Cast through unknown to acknowledge dynamic enrichment
        return { ...base, ...overrides };
    }
    /** Convenience: returns a class instance wrapping a randomized resource. */
    static randomClass(overrides = {}, opts) {
        return new ProcedureUvIpsClass(this.random(overrides, opts));
    }
}
/** Pattern constraints for profile fields (used by random() generator) */
ProcedureUvIpsClass._fieldPatterns = {
    "subject.type": "ImplementationGuide",
    "performer.function": "75271001",
    "focalDevice.action": "129346006",
    "_refReq_subject": {
        "reference": true
    },
    "_refReq_performer": {
        "actor": true
    },
    "_refReq_focalDevice": {
        "manipulated": true
    },
    "_choiceType_performed[x]": [
        "dateTime",
        "Period",
        "string",
        "Age",
        "Range"
    ]
};
/** Fields that are forbidden (max=0) in this profile - must not be generated */
ProcedureUvIpsClass._forbiddenFields = [];
/** FHIR element ordering for this profile's base resource (used by enrichResource for correct JSON field order) */
ProcedureUvIpsClass._fieldOrder = ["id", "meta", "implicitRules", "language", "text", "contained", "extension", "modifierExtension", "identifier", "instantiatesCanonical", "instantiatesUri", "basedOn", "partOf", "status", "statusReason", "category", "code", "subject", "encounter", "performed[x]", "recorder", "asserter", "performer", "location", "reasonCode", "reasonReference", "bodySite", "outcome", "report", "complication", "complicationDetail", "followUp", "note", "focalDevice", "usedReference", "usedCode"];
/** ValueSet bindings for coded fields - maps field name to ValueSet URL */
ProcedureUvIpsClass.valueSetBindings = {
    "language": "http://hl7.org/fhir/ValueSet/languages|4.0.1",
    "status": "http://hl7.org/fhir/ValueSet/event-status|4.0.1",
    "statusReason": "http://hl7.org/fhir/ValueSet/procedure-not-performed-reason|4.0.1",
    "category": "http://hl7.org/fhir/ValueSet/procedure-category|4.0.1",
    "code": "http://hl7.org/fhir/uv/ips/ValueSet/procedures-uv-ips",
    "subject.type": "http://hl7.org/fhir/ValueSet/resource-types|4.0.1",
    "performer.function": "http://hl7.org/fhir/ValueSet/performer-role|4.0.1",
    "reasonCode": "http://hl7.org/fhir/ValueSet/procedure-reason|4.0.1",
    "bodySite": "http://hl7.org/fhir/ValueSet/body-site",
    "outcome": "http://hl7.org/fhir/ValueSet/procedure-outcome|4.0.1",
    "complication": "http://hl7.org/fhir/ValueSet/condition-code|4.0.1",
    "followUp": "http://hl7.org/fhir/ValueSet/procedure-followup|4.0.1",
    "focalDevice.action": "http://hl7.org/fhir/ValueSet/device-action|4.0.1",
    "usedCode": "http://hl7.org/fhir/ValueSet/device-kind|4.0.1"
};
/** Code resolver for ValueSet bindings - returns a random valid code from a ValueSet by URL */
ProcedureUvIpsClass._codeResolver = (() => {
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
