import { CompositionUvIps } from "./CompositionUvIps.js";
import type { ValidatorOptions } from "./ValidatorOptions.js";
export declare class CompositionUvIpsClass {
    private resource;
    /** Pattern constraints for profile fields (used by random() generator) */
    protected static readonly _fieldPatterns: {
        "meta.security": string;
        "meta.tag": string;
        type: {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "subject.type": string;
        "attester.mode": string;
        "relatesTo.code": string;
        "event.code": string;
        "careProvisioningEvent.code": {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "section.code": string;
        "section.mode": string;
        "section.orderedBy": string;
        "section.emptyReason": string;
        "sectionProblems.code": {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "sectionProblems.mode": string;
        "sectionProblems.orderedBy": string;
        "sectionProblems.emptyReason": string;
        "sectionAllergies.code": {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "sectionAllergies.mode": string;
        "sectionAllergies.orderedBy": string;
        "sectionAllergies.emptyReason": string;
        "sectionMedications.code": {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "sectionMedications.mode": string;
        "sectionMedications.orderedBy": string;
        "sectionMedications.emptyReason": string;
        "sectionImmunizations.code": {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "sectionImmunizations.mode": string;
        "sectionImmunizations.orderedBy": string;
        "sectionImmunizations.emptyReason": string;
        "sectionResults.code": {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "sectionResults.mode": string;
        "sectionResults.orderedBy": string;
        "sectionResults.emptyReason": string;
        "sectionProceduresHx.code": {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "sectionProceduresHx.mode": string;
        "sectionProceduresHx.orderedBy": string;
        "sectionProceduresHx.emptyReason": string;
        "sectionMedicalDevices.code": {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "sectionMedicalDevices.mode": string;
        "sectionMedicalDevices.orderedBy": string;
        "sectionMedicalDevices.emptyReason": string;
        "sectionAdvanceDirectives.code": {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "sectionAdvanceDirectives.mode": string;
        "sectionAdvanceDirectives.orderedBy": string;
        "sectionAdvanceDirectives.emptyReason": string;
        "sectionAlerts.code": {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "sectionAlerts.mode": string;
        "sectionAlerts.orderedBy": string;
        "sectionAlerts.emptyReason": string;
        "sectionFunctionalStatus.code": {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "sectionFunctionalStatus.mode": string;
        "sectionFunctionalStatus.orderedBy": string;
        "sectionFunctionalStatus.emptyReason": string;
        "sectionPastProblems.code": {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "sectionPastProblems.mode": string;
        "sectionPastProblems.orderedBy": string;
        "sectionPastProblems.emptyReason": string;
        "sectionPregnancyHx.code": {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "sectionPregnancyHx.mode": string;
        "sectionPregnancyHx.orderedBy": string;
        "sectionPregnancyHx.emptyReason": string;
        "sectionPatientStory.code": {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "sectionPatientStory.mode": string;
        "sectionPatientStory.orderedBy": string;
        "sectionPatientStory.emptyReason": string;
        "sectionPlanOfCare.code": {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "sectionPlanOfCare.mode": string;
        "sectionPlanOfCare.orderedBy": string;
        "sectionPlanOfCare.emptyReason": string;
        "sectionSocialHistory.code": {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "sectionSocialHistory.mode": string;
        "sectionSocialHistory.orderedBy": string;
        "sectionSocialHistory.emptyReason": string;
        "sectionVitalSigns.code": {
            coding: {
                system: string;
                code: string;
            }[];
        };
        "sectionVitalSigns.mode": string;
        "sectionVitalSigns.orderedBy": string;
        "sectionVitalSigns.emptyReason": string;
        _refReq_subject: {
            reference: boolean;
        };
        _refReq_attester: {
            mode: boolean;
        };
        _refReq_relatesTo: {
            code: boolean;
            targetIdentifier: boolean;
        };
        _refReq_event: {
            code: boolean;
        };
        _refReq_section: {
            title: boolean;
            code: boolean;
            text: boolean;
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
    constructor(resource: CompositionUvIps);
    /** Validate current resource instance. */
    validate(options?: ValidatorOptions): Promise<{
        errors: string[];
        warnings: string[];
    }>;
    getResource(): CompositionUvIps;
    setResource(resource: CompositionUvIps): void;
    /**
     * Returns a plain JSON clone of the underlying resource ONLY if the last validation succeeded with zero errors.
     * Call validate() first; otherwise this method throws to prevent accidental use of invalid / unchecked data.
     */
    toJSON(): Promise<CompositionUvIps>;
    /**
     * Create an empty instance for parity testing: for true FHIR resources, includes only resourceType; for datatypes, returns an empty object.
     * Note: meta.profile (when applicable) will be ensured by the constructor when wrapping this resource.
     */
    static empty(overrides?: Partial<CompositionUvIps>): CompositionUvIps;
    /**
     * Create a minimal randomized instance of CompositionUvIps.
     * Populates id, resourceType (if applicable) and primitive required (min>0) top-level fields with placeholders.
     */
    static random(overrides?: Partial<CompositionUvIps>, opts?: {
        seed?: number;
    }): CompositionUvIps;
    /** Convenience: returns a class instance wrapping a randomized resource. */
    static randomClass(overrides?: Partial<CompositionUvIps>, opts?: {
        seed?: number;
    }): CompositionUvIpsClass;
}
