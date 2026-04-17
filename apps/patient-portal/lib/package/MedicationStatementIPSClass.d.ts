import { MedicationStatementIPS } from "./MedicationStatementIPS.js";
import type { ValidatorOptions } from "./ValidatorOptions.js";
export declare class MedicationStatementIPSClass {
    private resource;
    /** Pattern constraints for profile fields (used by random() generator) */
    protected static readonly _fieldPatterns: {
        "subject.type": string;
        "dosage.additionalInstruction": string;
        "dosage.site": string;
        "dosage.route": string;
        "dosage.method": string;
        "dosage.doseAndRate.type": string;
        _refReq_subject: {
            reference: boolean;
        };
        "_choiceType_medication[x]": string[];
        "_choiceType_effective[x]": string[];
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
    constructor(resource: MedicationStatementIPS);
    /** Validate current resource instance. */
    validate(options?: ValidatorOptions): Promise<{
        errors: string[];
        warnings: string[];
    }>;
    getResource(): MedicationStatementIPS;
    setResource(resource: MedicationStatementIPS): void;
    /**
     * Returns a plain JSON clone of the underlying resource ONLY if the last validation succeeded with zero errors.
     * Call validate() first; otherwise this method throws to prevent accidental use of invalid / unchecked data.
     */
    toJSON(): Promise<MedicationStatementIPS>;
    /**
     * Create an empty instance for parity testing: for true FHIR resources, includes only resourceType; for datatypes, returns an empty object.
     * Note: meta.profile (when applicable) will be ensured by the constructor when wrapping this resource.
     */
    static empty(overrides?: Partial<MedicationStatementIPS>): MedicationStatementIPS;
    /**
     * Create a minimal randomized instance of MedicationStatementIPS.
     * Populates id, resourceType (if applicable) and primitive required (min>0) top-level fields with placeholders.
     */
    static random(overrides?: Partial<MedicationStatementIPS>, opts?: {
        seed?: number;
    }): MedicationStatementIPS;
    /** Convenience: returns a class instance wrapping a randomized resource. */
    static randomClass(overrides?: Partial<MedicationStatementIPS>, opts?: {
        seed?: number;
    }): MedicationStatementIPSClass;
}
