import { validateMedicationStatementIPS } from "./MedicationStatementIPS.js";
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
export class MedicationStatementIPSClass {
    constructor(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/MedicationStatement-uv-ips');
    }
    /** Validate current resource instance. */
    async validate(options) {
        return validateMedicationStatementIPS(this.resource, options);
    }
    getResource() {
        return this.resource;
    }
    setResource(resource) {
        this.resource = resource;
        ensureProfile(this.resource, 'http://hl7.org/fhir/uv/ips/StructureDefinition/MedicationStatement-uv-ips');
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
            resourceType: 'MedicationStatement',
        };
        return { ...base, ...overrides };
    }
    /**
     * Create a minimal randomized instance of MedicationStatementIPS.
     * Populates id, resourceType (if applicable) and primitive required (min>0) top-level fields with placeholders.
     */
    static random(overrides = {}, opts) {
        if (opts?.seed !== undefined) {
            // Direct call (no dynamic require) to ensure deterministic seeding works under ESM.
            setRandomSeed(opts.seed);
        }
        // Start with a Partial to avoid unsafe casting errors; we'll assert at the end.
        const base = { resourceType: 'MedicationStatement', id: randomId(), status: "completed", medicationCodeableConcept: skeletonCodeableConcept(), subject: { reference: 'Patient/' + randomId() }, effectiveDateTime: randomDate(), };
        // Always include meta.profile with this profile's canonical URL if available & only for resource profiles
        ensureProfile(base, 'http://hl7.org/fhir/uv/ips/StructureDefinition/MedicationStatement-uv-ips');
        // Enrich the base resource with common fields using centralized enrichment logic
        enrichResource(base, 'MedicationStatement', 'http://hl7.org/fhir/uv/ips/StructureDefinition/MedicationStatement-uv-ips', MedicationStatementIPSClass._fieldPatterns, MedicationStatementIPSClass._forbiddenFields, MedicationStatementIPSClass.valueSetBindings, MedicationStatementIPSClass._codeResolver, MedicationStatementIPSClass._fieldOrder);
        // Cast through unknown to acknowledge dynamic enrichment
        return { ...base, ...overrides };
    }
    /** Convenience: returns a class instance wrapping a randomized resource. */
    static randomClass(overrides = {}, opts) {
        return new MedicationStatementIPSClass(this.random(overrides, opts));
    }
}
/** Pattern constraints for profile fields (used by random() generator) */
MedicationStatementIPSClass._fieldPatterns = {
    "subject.type": "ImplementationGuide",
    "dosage.additionalInstruction": "418577003",
    "dosage.site": "344001",
    "dosage.route": "418331006",
    "dosage.method": "422033008",
    "dosage.doseAndRate.type": "calculated",
    "_refReq_subject": {
        "reference": true
    },
    "_choiceType_medication[x]": [
        "CodeableConcept",
        "Reference"
    ],
    "_choiceType_effective[x]": [
        "dateTime",
        "Period"
    ]
};
/** Fields that are forbidden (max=0) in this profile - must not be generated */
MedicationStatementIPSClass._forbiddenFields = [];
/** FHIR element ordering for this profile's base resource (used by enrichResource for correct JSON field order) */
MedicationStatementIPSClass._fieldOrder = ["id", "meta", "implicitRules", "language", "text", "contained", "extension", "modifierExtension", "identifier", "basedOn", "partOf", "status", "statusReason", "category", "medication[x]", "subject", "context", "effective[x]", "dateAsserted", "informationSource", "derivedFrom", "reasonCode", "reasonReference", "note", "dosage"];
/** ValueSet bindings for coded fields - maps field name to ValueSet URL */
MedicationStatementIPSClass.valueSetBindings = {
    "language": "http://hl7.org/fhir/ValueSet/languages|4.0.1",
    "status": "http://hl7.org/fhir/ValueSet/medication-statement-status|4.0.1",
    "statusReason": "http://hl7.org/fhir/ValueSet/reason-medication-status-codes|4.0.1",
    "category": "http://hl7.org/fhir/ValueSet/medication-statement-category|4.0.1",
    "medication[x]": "http://hl7.org/fhir/uv/ips/ValueSet/medication-uv-ips",
    "subject.type": "http://hl7.org/fhir/ValueSet/resource-types|4.0.1",
    "reasonCode": "http://hl7.org/fhir/ValueSet/condition-code|4.0.1",
    "dosage.additionalInstruction": "http://hl7.org/fhir/ValueSet/additional-instruction-codes|4.0.1",
    "dosage.asNeeded[x]": "http://hl7.org/fhir/ValueSet/medication-as-needed-reason|4.0.1",
    "dosage.site": "http://hl7.org/fhir/ValueSet/approach-site-codes|4.0.1",
    "dosage.route": "http://hl7.org/fhir/ValueSet/route-codes",
    "dosage.method": "http://hl7.org/fhir/ValueSet/administration-method-codes|4.0.1",
    "dosage.doseAndRate.type": "http://hl7.org/fhir/ValueSet/dose-rate-type|4.0.1"
};
/** Code resolver for ValueSet bindings - returns a random valid code from a ValueSet by URL */
MedicationStatementIPSClass._codeResolver = (() => {
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
