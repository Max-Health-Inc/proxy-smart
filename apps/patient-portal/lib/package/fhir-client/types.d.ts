import type * as GeneratedTypes from "../index.js";
/**
 * A FHIR resource with an ID
 */
export type WithId<T> = {
    id: string;
} & T;
/**
 * Search parameters for FHIR resources
 */
export type SearchParams = Record<string, boolean | number | string | string[] | undefined>;
/**
 * Bundle of FHIR resources
 */
export interface Bundle<T> {
    resourceType: "Bundle";
    type: "collection" | "searchset" | "transaction-response" | "transaction";
    total?: number;
    link?: {
        relation: string;
        url: string;
    }[];
    entry?: {
        resource: T;
        fullUrl?: string;
    }[];
}
/**
 * Type-safe FHIR resource types
 */
export type FhirResource = GeneratedTypes.AllergyIntoleranceUvIps | GeneratedTypes.BundleUvIps | GeneratedTypes.CompositionUvIps | GeneratedTypes.ConditionUvIps | GeneratedTypes.DeviceObserverUvIps | GeneratedTypes.DeviceUseStatementUvIps | GeneratedTypes.DeviceUvIps | GeneratedTypes.DiagnosticReportUvIps | GeneratedTypes.FlagAlertUvIps | GeneratedTypes.ImagingStudyUvIps | GeneratedTypes.ImmunizationUvIps | GeneratedTypes.MedicationIPS | GeneratedTypes.MedicationRequestIPS | GeneratedTypes.MedicationStatementIPS | GeneratedTypes.ObservationAlcoholUseUvIps | GeneratedTypes.ObservationPregnancyEddUvIps | GeneratedTypes.ObservationPregnancyOutcomeUvIps | GeneratedTypes.ObservationPregnancyStatusUvIps | GeneratedTypes.ObservationResultsLaboratoryPathologyUvIps | GeneratedTypes.ObservationResultsRadiologyUvIps | GeneratedTypes.ObservationTobaccoUseUvIps | GeneratedTypes.OrganizationUvIps | GeneratedTypes.PatientUvIps | GeneratedTypes.PractitionerRoleUvIps | GeneratedTypes.PractitionerUvIps | GeneratedTypes.ProcedureUvIps | GeneratedTypes.SpecimenUvIps;
