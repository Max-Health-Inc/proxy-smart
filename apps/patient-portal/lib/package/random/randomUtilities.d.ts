import type { HumanName, Address, Coding, CodeableConcept, Identifier, Reference, Period, ContactPoint, Quantity, Money, Narrative, Dosage, Ratio, Range, Annotation, Attachment, Age, Duration, Expression, RelatedArtifact, DataRequirement, ParameterDefinition, TriggerDefinition, ContactDetail, UsageContext, Signature, SampledData, Timing } from 'fhir/r4';
export declare function setRandomSeed(seed: number): void;
export declare function randomId(): string;
export declare function randomString(prefix?: string): string;
export declare function randomInt(min?: number, max?: number): number;
export declare function randomBool(): boolean;
export declare function randomDate(start?: Date, end?: Date): string;
export declare function randomCode(codes: string[]): string;
/**
 * Generate a valid UUID v4 (random) for use in urn:uuid: URIs.
 * This generates proper hex-formatted UUIDs that are valid for FHIR fullUrl and identifier values.
 */
export declare function randomUUID(): string;
/**
 * Generate a valid US National Provider Identifier (NPI).
 * NPIs are 10-digit numbers that pass the US Core Luhn check.
 * The US Core us-core-17 constraint uses a specific algorithm:
 * - Doubles digits at positions 0, 2, 4, 6, 8 (even positions from left)
 * - If doubled value >= 10, subtracts 9
 * - Adds 24 (constant for '80' prefix)
 * - Sum must be divisible by 10
 */
export declare function randomNPI(): string;
export declare function skeletonHumanName(): HumanName;
export declare function skeletonAddress(): Address;
export declare function skeletonCoding(system?: string, codes?: string[]): Coding;
export declare function skeletonCodeableConcept(system?: string, codes?: string[]): CodeableConcept;
export declare function skeletonIdentifier(system?: string): Identifier;
export declare function skeletonReference(resourceType?: string): Reference;
export declare function skeletonPeriod(): Period;
export declare function skeletonContactPoint(): ContactPoint;
export declare function skeletonQuantity(): Quantity;
export declare function skeletonMoney(): Money;
export declare function skeletonNarrative(): Narrative;
export declare function skeletonDosage(): Dosage;
export declare function skeletonRatio(): Ratio;
export declare function skeletonRange(): Range;
export declare function skeletonAnnotation(): Annotation;
export declare function skeletonAttachment(): Attachment;
export declare function skeletonAge(): Age;
export declare function skeletonDuration(): Duration;
export declare function skeletonSimpleQuantity(): Quantity;
export declare function skeletonExpression(): Expression;
export declare function skeletonRelatedArtifact(): RelatedArtifact;
export declare function skeletonDataRequirement(): DataRequirement;
export declare function skeletonParameterDefinition(): ParameterDefinition;
export declare function skeletonTriggerDefinition(): TriggerDefinition;
export declare function skeletonContactDetail(): ContactDetail;
export declare function skeletonUsageContext(): UsageContext;
export declare function skeletonSignature(): Signature;
export declare function skeletonSampledData(): SampledData;
export declare function skeletonTiming(): Timing;
/**
 * Resolve a coding for a nestedCodingSlice from a ValueSet binding at runtime.
 * When a slice has a binding URI but no statically-known codes, this function
 * attempts to resolve a valid code from the ValueSetRegistry via the codeResolver.
 * Falls back to fake placeholder codes if resolution fails.
 */
export declare function resolveSliceCode(codeResolver: ((url: string) => {
    code: string;
    system: string;
    display?: string;
} | undefined) | undefined, valueSetUrl: string | undefined, fallbackSystem: string, fallbackVersion?: string): {
    system: string;
    code: string;
    display?: string;
    version?: string;
};
