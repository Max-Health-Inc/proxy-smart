import { ObservationTobaccoUseUvIps } from "./ObservationTobaccoUseUvIps.js";
import type { ValidatorOptions } from "./ValidatorOptions.js";
export declare class ObservationTobaccoUseUvIpsClass {
    private resource;
    /** Pattern constraints for profile fields (used by random() generator) */
    protected static readonly _fieldPatterns: {
        code: {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "subject.type": string;
        "referenceRange.type": string;
        "referenceRange.appliesTo": string;
        "component.code": string;
        "component.dataAbsentReason": string;
        "component.interpretation": string;
        _refReq_subject: {
            reference: boolean;
        };
        _refReq_component: {
            code: boolean;
        };
        "_choiceType_effective[x]": string[];
        "_choiceType_value[x]": string[];
    };
    /** Fields that are forbidden (max=0) in this profile - must not be generated */
    protected static readonly _forbiddenFields: string[];
    /** FHIR element ordering for this profile's base resource (used by enrichResource for correct JSON field order) */
    protected static readonly _fieldOrder: string[];
    /** ValueSet bindings for coded fields - maps field name to ValueSet URL */
    static readonly valueSetBindings: Record<string, string>;
    /** Code resolver for ValueSet bindings - returns a random valid code from a ValueSet by URL */
    protected static readonly _codeResolver: ((url: string) => {
        code: string;
        system: string;
        display?: string;
    } | undefined) | undefined;
    constructor(resource: ObservationTobaccoUseUvIps);
    /** Validate current resource instance. */
    validate(options?: ValidatorOptions): Promise<{
        errors: string[];
        warnings: string[];
    }>;
    getResource(): ObservationTobaccoUseUvIps;
    setResource(resource: ObservationTobaccoUseUvIps): void;
    /**
     * Returns a plain JSON clone of the underlying resource ONLY if the last validation succeeded with zero errors.
     * Call validate() first; otherwise this method throws to prevent accidental use of invalid / unchecked data.
     */
    toJSON(): Promise<ObservationTobaccoUseUvIps>;
    /**
     * Create an empty instance for parity testing: for true FHIR resources, includes only resourceType; for datatypes, returns an empty object.
     * Note: meta.profile (when applicable) will be ensured by the constructor when wrapping this resource.
     */
    static empty(overrides?: Partial<ObservationTobaccoUseUvIps>): ObservationTobaccoUseUvIps;
    /**
     * Create a minimal randomized instance of ObservationTobaccoUseUvIps.
     * Populates id, resourceType (if applicable) and primitive required (min>0) top-level fields with placeholders.
     */
    static random(overrides?: Partial<ObservationTobaccoUseUvIps>, opts?: {
        seed?: number;
    }): ObservationTobaccoUseUvIps;
    /** Convenience: returns a class instance wrapping a randomized resource. */
    static randomClass(overrides?: Partial<ObservationTobaccoUseUvIps>, opts?: {
        seed?: number;
    }): ObservationTobaccoUseUvIpsClass;
}
