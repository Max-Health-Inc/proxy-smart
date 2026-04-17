import { BundleUvIps } from "./BundleUvIps.js";
import type { ValidatorOptions } from "./ValidatorOptions.js";
export declare class BundleUvIpsClass {
    private resource;
    /** Pattern constraints for profile fields (used by random() generator) */
    protected static readonly _fieldPatterns: {
        type: string;
        "entry.search.mode": string;
        "entry.request.method": string;
        "composition.search.mode": string;
        "composition.request.method": string;
        "patient.search.mode": string;
        "patient.request.method": string;
        "allergyintolerance.search.mode": string;
        "allergyintolerance.request.method": string;
        "careplan.search.mode": string;
        "careplan.request.method": string;
        "clinicalimpression.search.mode": string;
        "clinicalimpression.request.method": string;
        "condition.search.mode": string;
        "condition.request.method": string;
        "consent.search.mode": string;
        "consent.request.method": string;
        "device.search.mode": string;
        "device.request.method": string;
        "deviceusestatement.search.mode": string;
        "deviceusestatement.request.method": string;
        "diagnosticreport.search.mode": string;
        "diagnosticreport.request.method": string;
        "documentreference.search.mode": string;
        "documentreference.request.method": string;
        "flag.search.mode": string;
        "flag.request.method": string;
        "imagingstudy.search.mode": string;
        "imagingstudy.request.method": string;
        "immunization.search.mode": string;
        "immunization.request.method": string;
        "immunizationrecommendation.search.mode": string;
        "immunizationrecommendation.request.method": string;
        "medication.search.mode": string;
        "medication.request.method": string;
        "medicationrequest.search.mode": string;
        "medicationrequest.request.method": string;
        "medicationstatement.search.mode": string;
        "medicationstatement.request.method": string;
        "practitioner.search.mode": string;
        "practitioner.request.method": string;
        "practitionerrole.search.mode": string;
        "practitionerrole.request.method": string;
        "procedure.search.mode": string;
        "procedure.request.method": string;
        "observation-pregnancy-edd.search.mode": string;
        "observation-pregnancy-edd.request.method": string;
        "observation-pregnancy-outcome.search.mode": string;
        "observation-pregnancy-outcome.request.method": string;
        "observation-pregnancy-status.search.mode": string;
        "observation-pregnancy-status.request.method": string;
        "observation-alcohol-use.search.mode": string;
        "observation-alcohol-use.request.method": string;
        "observation-tobacco-use.search.mode": string;
        "observation-tobacco-use.request.method": string;
        "observation-results-laboratory-pathology.search.mode": string;
        "observation-results-laboratory-pathology.request.method": string;
        "observation-results-radiology.search.mode": string;
        "observation-results-radiology.request.method": string;
        "observation-vital-signs.search.mode": string;
        "observation-vital-signs.request.method": string;
        "organization.search.mode": string;
        "organization.request.method": string;
        "specimen.search.mode": string;
        "specimen.request.method": string;
        _refReq_link: {
            relation: boolean;
            url: boolean;
        };
        _refReq_entry: {
            fullUrl: boolean;
            "request.method": boolean;
            "request.url": boolean;
            "response.status": boolean;
            resource: boolean;
        };
        "_entryProfile:Patient": {
            profile: string;
        };
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
    constructor(resource: BundleUvIps);
    /** Validate current resource instance. */
    validate(options?: ValidatorOptions): Promise<{
        errors: string[];
        warnings: string[];
    }>;
    getResource(): BundleUvIps;
    setResource(resource: BundleUvIps): void;
    /**
     * Returns a plain JSON clone of the underlying resource ONLY if the last validation succeeded with zero errors.
     * Call validate() first; otherwise this method throws to prevent accidental use of invalid / unchecked data.
     */
    toJSON(): Promise<BundleUvIps>;
    /**
     * Create an empty instance for parity testing: for true FHIR resources, includes only resourceType; for datatypes, returns an empty object.
     * Note: meta.profile (when applicable) will be ensured by the constructor when wrapping this resource.
     */
    static empty(overrides?: Partial<BundleUvIps>): BundleUvIps;
    /**
     * Create a minimal randomized instance of BundleUvIps.
     * Populates id, resourceType (if applicable) and primitive required (min>0) top-level fields with placeholders.
     */
    static random(overrides?: Partial<BundleUvIps>, opts?: {
        seed?: number;
    }): BundleUvIps;
    /** Convenience: returns a class instance wrapping a randomized resource. */
    static randomClass(overrides?: Partial<BundleUvIps>, opts?: {
        seed?: number;
    }): BundleUvIpsClass;
}
