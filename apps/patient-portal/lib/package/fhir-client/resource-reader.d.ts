import type * as GeneratedTypes from "../index.js";
import type { Bundle, SearchParams, WithId } from "./types.js";
/**
 * Generic FHIR resource searcher/reader
 */
export interface FhirResourceSearcher<T> {
    readonly baseUrl: string;
    readonly resourceType: string;
    /**
     * Read a resource by ID
     */
    read(id: string): Promise<WithId<T>>;
    /**
     * Search for resources
     */
    search(params?: SearchParams): Promise<Bundle<WithId<T>>>;
    /**
     * Search and return first result or undefined
     */
    searchOne(params?: SearchParams): Promise<undefined | WithId<T>>;
    /**
     * Search and return all results (handles pagination)
     */
    searchAll(params?: SearchParams): Promise<WithId<T>[]>;
}
/**
 * Specific reader types for type safety
 */
export type AllergyIntoleranceUvIpsReader = FhirResourceSearcher<GeneratedTypes.AllergyIntoleranceUvIps>;
export type BundleUvIpsReader = FhirResourceSearcher<GeneratedTypes.BundleUvIps>;
export type CompositionUvIpsReader = FhirResourceSearcher<GeneratedTypes.CompositionUvIps>;
export type ConditionUvIpsReader = FhirResourceSearcher<GeneratedTypes.ConditionUvIps>;
export type DeviceObserverUvIpsReader = FhirResourceSearcher<GeneratedTypes.DeviceObserverUvIps>;
export type DeviceUseStatementUvIpsReader = FhirResourceSearcher<GeneratedTypes.DeviceUseStatementUvIps>;
export type DeviceUvIpsReader = FhirResourceSearcher<GeneratedTypes.DeviceUvIps>;
export type DiagnosticReportUvIpsReader = FhirResourceSearcher<GeneratedTypes.DiagnosticReportUvIps>;
export type FlagAlertUvIpsReader = FhirResourceSearcher<GeneratedTypes.FlagAlertUvIps>;
export type ImagingStudyUvIpsReader = FhirResourceSearcher<GeneratedTypes.ImagingStudyUvIps>;
export type ImmunizationUvIpsReader = FhirResourceSearcher<GeneratedTypes.ImmunizationUvIps>;
export type MedicationIPSReader = FhirResourceSearcher<GeneratedTypes.MedicationIPS>;
export type MedicationRequestIPSReader = FhirResourceSearcher<GeneratedTypes.MedicationRequestIPS>;
export type MedicationStatementIPSReader = FhirResourceSearcher<GeneratedTypes.MedicationStatementIPS>;
export type ObservationAlcoholUseUvIpsReader = FhirResourceSearcher<GeneratedTypes.ObservationAlcoholUseUvIps>;
export type ObservationPregnancyEddUvIpsReader = FhirResourceSearcher<GeneratedTypes.ObservationPregnancyEddUvIps>;
export type ObservationPregnancyOutcomeUvIpsReader = FhirResourceSearcher<GeneratedTypes.ObservationPregnancyOutcomeUvIps>;
export type ObservationPregnancyStatusUvIpsReader = FhirResourceSearcher<GeneratedTypes.ObservationPregnancyStatusUvIps>;
export type ObservationResultsLaboratoryPathologyUvIpsReader = FhirResourceSearcher<GeneratedTypes.ObservationResultsLaboratoryPathologyUvIps>;
export type ObservationResultsRadiologyUvIpsReader = FhirResourceSearcher<GeneratedTypes.ObservationResultsRadiologyUvIps>;
export type ObservationTobaccoUseUvIpsReader = FhirResourceSearcher<GeneratedTypes.ObservationTobaccoUseUvIps>;
export type OrganizationUvIpsReader = FhirResourceSearcher<GeneratedTypes.OrganizationUvIps>;
export type PatientUvIpsReader = FhirResourceSearcher<GeneratedTypes.PatientUvIps>;
export type PractitionerRoleUvIpsReader = FhirResourceSearcher<GeneratedTypes.PractitionerRoleUvIps>;
export type PractitionerUvIpsReader = FhirResourceSearcher<GeneratedTypes.PractitionerUvIps>;
export type ProcedureUvIpsReader = FhirResourceSearcher<GeneratedTypes.ProcedureUvIps>;
export type SpecimenUvIpsReader = FhirResourceSearcher<GeneratedTypes.SpecimenUvIps>;
/**
 * Custom fetch function type for injecting auth headers
 */
export type FetchFn = typeof globalThis.fetch;
/**
 * Implementation of FHIR resource reader
 */
export declare class FhirResourceReader<T> implements FhirResourceSearcher<T> {
    readonly baseUrl: string;
    readonly resourceType: string;
    private readonly fetchFn;
    constructor(baseUrl: string, resourceType: string, fetchFn?: FetchFn);
    read(id: string): Promise<WithId<T>>;
    search(params?: SearchParams): Promise<Bundle<WithId<T>>>;
    searchOne(params?: SearchParams): Promise<undefined | WithId<T>>;
    searchAll(params?: SearchParams): Promise<WithId<T>[]>;
}
