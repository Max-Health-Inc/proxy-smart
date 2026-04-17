import type * as GeneratedTypes from "../index.js";
import type { WithId } from "./types.js";
/**
 * Generic FHIR resource writer
 */
export interface FhirResourceWriter<T> {
    readonly baseUrl: string;
    readonly resourceType: string;
    /**
     * Create a new resource
     */
    create(resource: T): Promise<WithId<T>>;
    /**
     * Update an existing resource
     */
    update(resource: WithId<T>): Promise<WithId<T>>;
    /**
     * Delete a resource
     */
    delete(id: string): Promise<void>;
    /**
     * Create or update (upsert)
     */
    createOrUpdate(resource: T | WithId<T>): Promise<WithId<T>>;
}
/**
 * Specific writer types for type safety
 */
export type AllergyIntoleranceUvIpsWriter = FhirResourceWriter<GeneratedTypes.AllergyIntoleranceUvIps>;
export type BundleUvIpsWriter = FhirResourceWriter<GeneratedTypes.BundleUvIps>;
export type CompositionUvIpsWriter = FhirResourceWriter<GeneratedTypes.CompositionUvIps>;
export type ConditionUvIpsWriter = FhirResourceWriter<GeneratedTypes.ConditionUvIps>;
export type DeviceObserverUvIpsWriter = FhirResourceWriter<GeneratedTypes.DeviceObserverUvIps>;
export type DeviceUseStatementUvIpsWriter = FhirResourceWriter<GeneratedTypes.DeviceUseStatementUvIps>;
export type DeviceUvIpsWriter = FhirResourceWriter<GeneratedTypes.DeviceUvIps>;
export type DiagnosticReportUvIpsWriter = FhirResourceWriter<GeneratedTypes.DiagnosticReportUvIps>;
export type FlagAlertUvIpsWriter = FhirResourceWriter<GeneratedTypes.FlagAlertUvIps>;
export type ImagingStudyUvIpsWriter = FhirResourceWriter<GeneratedTypes.ImagingStudyUvIps>;
export type ImmunizationUvIpsWriter = FhirResourceWriter<GeneratedTypes.ImmunizationUvIps>;
export type MedicationIPSWriter = FhirResourceWriter<GeneratedTypes.MedicationIPS>;
export type MedicationRequestIPSWriter = FhirResourceWriter<GeneratedTypes.MedicationRequestIPS>;
export type MedicationStatementIPSWriter = FhirResourceWriter<GeneratedTypes.MedicationStatementIPS>;
export type ObservationAlcoholUseUvIpsWriter = FhirResourceWriter<GeneratedTypes.ObservationAlcoholUseUvIps>;
export type ObservationPregnancyEddUvIpsWriter = FhirResourceWriter<GeneratedTypes.ObservationPregnancyEddUvIps>;
export type ObservationPregnancyOutcomeUvIpsWriter = FhirResourceWriter<GeneratedTypes.ObservationPregnancyOutcomeUvIps>;
export type ObservationPregnancyStatusUvIpsWriter = FhirResourceWriter<GeneratedTypes.ObservationPregnancyStatusUvIps>;
export type ObservationResultsLaboratoryPathologyUvIpsWriter = FhirResourceWriter<GeneratedTypes.ObservationResultsLaboratoryPathologyUvIps>;
export type ObservationResultsRadiologyUvIpsWriter = FhirResourceWriter<GeneratedTypes.ObservationResultsRadiologyUvIps>;
export type ObservationTobaccoUseUvIpsWriter = FhirResourceWriter<GeneratedTypes.ObservationTobaccoUseUvIps>;
export type OrganizationUvIpsWriter = FhirResourceWriter<GeneratedTypes.OrganizationUvIps>;
export type PatientUvIpsWriter = FhirResourceWriter<GeneratedTypes.PatientUvIps>;
export type PractitionerRoleUvIpsWriter = FhirResourceWriter<GeneratedTypes.PractitionerRoleUvIps>;
export type PractitionerUvIpsWriter = FhirResourceWriter<GeneratedTypes.PractitionerUvIps>;
export type ProcedureUvIpsWriter = FhirResourceWriter<GeneratedTypes.ProcedureUvIps>;
export type SpecimenUvIpsWriter = FhirResourceWriter<GeneratedTypes.SpecimenUvIps>;
import type { FetchFn } from "./resource-reader.js";
/**
 * Implementation of FHIR resource writer
 */
export declare class FhirResourceWriterImpl<T> implements FhirResourceWriter<T> {
    readonly baseUrl: string;
    readonly resourceType: string;
    private readonly fetchFn;
    constructor(baseUrl: string, resourceType: string, fetchFn?: FetchFn);
    create(resource: T): Promise<WithId<T>>;
    update(resource: WithId<T>): Promise<WithId<T>>;
    delete(id: string): Promise<void>;
    createOrUpdate(resource: T | WithId<T>): Promise<WithId<T>>;
}
