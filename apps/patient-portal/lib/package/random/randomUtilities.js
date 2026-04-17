let __seed = Date.now() & 0xffffffff;
export function setRandomSeed(seed) { __seed = seed >>> 0; }
function rng() {
    __seed = (1664525 * __seed + 1013904223) >>> 0;
    return __seed / 0x100000000;
}
export function randomId() { return 'id-' + rng().toString(36).slice(2, 10); }
export function randomString(prefix = 'val') { return prefix + '-' + rng().toString(36).slice(2, 8); }
export function randomInt(min = 0, max = 100) { return Math.floor(rng() * (max - min + 1)) + min; }
export function randomBool() { return rng() < 0.5; }
export function randomDate(start = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), end = new Date()) { const t = start.getTime() + rng() * (end.getTime() - start.getTime()); return new Date(t).toISOString(); }
export function randomCode(codes) { if (!codes.length)
    return randomString('code'); return codes[Math.floor(rng() * codes.length)]; }
/**
 * Generate a valid UUID v4 (random) for use in urn:uuid: URIs.
 * This generates proper hex-formatted UUIDs that are valid for FHIR fullUrl and identifier values.
 */
export function randomUUID() {
    const hex = () => Math.floor(rng() * 16).toString(16);
    const segment = (len) => Array.from({ length: len }, hex).join('');
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (y is 8, 9, a, or b)
    const variant = ['8', '9', 'a', 'b'][Math.floor(rng() * 4)];
    return segment(8) + '-' + segment(4) + '-4' + segment(3) + '-' + variant + segment(3) + '-' + segment(12);
}
/**
 * Generate a valid US National Provider Identifier (NPI).
 * NPIs are 10-digit numbers that pass the US Core Luhn check.
 * The US Core us-core-17 constraint uses a specific algorithm:
 * - Doubles digits at positions 0, 2, 4, 6, 8 (even positions from left)
 * - If doubled value >= 10, subtracts 9
 * - Adds 24 (constant for '80' prefix)
 * - Sum must be divisible by 10
 */
export function randomNPI() {
    // Generate 9 random digits (the 10th is the check digit)
    const digits = [];
    for (let i = 0; i < 9; i++) {
        digits.push(Math.floor(rng() * 10));
    }
    // Calculate sum using US Core algorithm: double at even positions (0,2,4,6,8) + 24
    let sum = 24; // Constant for '80' prefix
    for (let i = 0; i < 9; i++) {
        let d = digits[i];
        // Double digits at even positions (0, 2, 4, 6, 8)
        if (i % 2 === 0) {
            d = d < 5 ? d * 2 : (d * 2) - 9;
        }
        sum += d;
    }
    // Check digit makes sum divisible by 10
    const checkDigit = (10 - (sum % 10)) % 10;
    return digits.join('') + checkDigit.toString();
}
// Skeleton factories for common FHIR complex types
export function skeletonHumanName() { return { family: randomString('fam'), given: [randomString('giv')] }; }
export function skeletonAddress() { return { line: [randomString('line')], city: randomString('city'), country: 'XX' }; }
// Valid NullFlavor codes that terminology servers will accept
const VALID_NULL_FLAVOR_CODES = ['UNK', 'ASKU', 'NAV', 'NASK', 'OTH', 'MSK', 'NI', 'NA'];
export function skeletonCoding(system = 'http://terminology.hl7.org/CodeSystem/v3-NullFlavor', codes = []) {
    // When using NullFlavor system with no explicit codes, pick from valid NullFlavor codes
    const effectiveCodes = codes.length > 0 ? codes : (system === 'http://terminology.hl7.org/CodeSystem/v3-NullFlavor' ? VALID_NULL_FLAVOR_CODES : []);
    return { system, code: randomCode(effectiveCodes) };
}
export function skeletonCodeableConcept(system, codes = []) { return { coding: [skeletonCoding(system, codes)], text: randomString('text') }; }
export function skeletonIdentifier(system = 'urn:ietf:rfc:3986') { return { system, value: 'urn:uuid:' + randomUUID() }; }
export function skeletonReference(resourceType = 'Patient') { return { reference: resourceType + '/' + randomId() }; }
export function skeletonPeriod() { const start = randomDate(); return { start, end: start }; }
export function skeletonContactPoint() { return { system: 'phone', value: randomString('tel'), use: 'mobile' }; }
export function skeletonQuantity() { return { value: randomInt(1, 100), unit: randomString('u'), system: 'http://unitsofmeasure.org' }; }
export function skeletonMoney() { return { value: randomInt(0, 1000), currency: 'USD' }; }
export function skeletonNarrative() { return { status: 'generated', div: '<div xmlns="http://www.w3.org/1999/xhtml">Generated</div>' }; }
export function skeletonDosage() { return { text: 'As directed' }; }
export function skeletonRatio() { return { numerator: { value: 1, unit: 'unit', system: 'http://unitsofmeasure.org', code: '1' }, denominator: { value: 1, unit: 'unit', system: 'http://unitsofmeasure.org', code: '1' } }; }
export function skeletonRange() { return { low: { value: 0, unit: 'unit', system: 'http://unitsofmeasure.org', code: '1' }, high: { value: 100, unit: 'unit', system: 'http://unitsofmeasure.org', code: '1' } }; }
export function skeletonAnnotation() { return { text: 'Note: ' + randomString('note') }; }
export function skeletonAttachment() { return { contentType: 'text/plain' }; }
export function skeletonAge() { return { value: randomInt(1, 99), unit: 'years', system: 'http://unitsofmeasure.org', code: 'a' }; }
export function skeletonDuration() { return { value: randomInt(1, 30), unit: 'days', system: 'http://unitsofmeasure.org', code: 'd' }; }
export function skeletonSimpleQuantity() { return { value: randomInt(1, 100), unit: 'unit', system: 'http://unitsofmeasure.org', code: '1' }; }
export function skeletonExpression() { return { language: 'text/fhirpath', expression: 'true' }; }
export function skeletonRelatedArtifact() { return { type: 'documentation' }; }
export function skeletonDataRequirement() { return { type: 'Patient' }; }
export function skeletonParameterDefinition() { return { use: 'in', type: 'string' }; }
export function skeletonTriggerDefinition() { return { type: 'named-event', name: 'event' }; }
export function skeletonContactDetail() { return { name: 'Contact' }; }
export function skeletonUsageContext() { return { code: { system: 'http://terminology.hl7.org/CodeSystem/usage-context-type', code: 'focus' }, valueCodeableConcept: skeletonCodeableConcept() }; }
export function skeletonSignature() { return { type: [{ system: 'urn:iso-astm:E1762-95:2013', code: '1.2.840.10065.1.12.1.1' }], when: randomDate(), who: skeletonReference('Practitioner') }; }
export function skeletonSampledData() { return { origin: { value: 0, unit: 'unit', system: 'http://unitsofmeasure.org', code: '1' }, period: 1, dimensions: 1, data: 'E' }; }
export function skeletonTiming() { return { repeat: { frequency: 1, period: 1, periodUnit: 'd' } }; }
/**
 * Resolve a coding for a nestedCodingSlice from a ValueSet binding at runtime.
 * When a slice has a binding URI but no statically-known codes, this function
 * attempts to resolve a valid code from the ValueSetRegistry via the codeResolver.
 * Falls back to fake placeholder codes if resolution fails.
 */
export function resolveSliceCode(codeResolver, valueSetUrl, fallbackSystem, fallbackVersion) {
    if (valueSetUrl && codeResolver) {
        const resolved = codeResolver(valueSetUrl);
        if (resolved) {
            const result = {
                system: resolved.system || fallbackSystem,
                code: resolved.code,
                ...(resolved.display ? { display: resolved.display } : {}),
            };
            if (fallbackVersion)
                result.version = fallbackVersion;
            return result;
        }
    }
    // Fallback: use well-known valid codes per system to avoid placeholder codes
    // that fail terminology server validation
    const wellKnownFallbacks = {
        'http://loinc.org': { code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' },
        'http://snomed.info/sct': { code: '404684003', display: 'Clinical finding' },
        'http://terminology.hl7.org/CodeSystem/observation-category': { code: 'laboratory', display: 'Laboratory' },
        'http://terminology.hl7.org/CodeSystem/v3-NullFlavor': { code: 'UNK', display: 'Unknown' },
    };
    const fallback = wellKnownFallbacks[fallbackSystem];
    const result = {
        system: fallbackSystem,
        code: fallback?.code || ('code-' + randomId().slice(0, 6)),
        ...(fallback?.display ? { display: fallback.display } : {}),
    };
    if (fallbackVersion)
        result.version = fallbackVersion;
    return result;
}
