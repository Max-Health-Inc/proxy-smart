import { FhirReadClient as BaseFhirReadClient, FhirWriteClient as BaseFhirWriteClient, type FetchFn } from "@babelfhir-ts/client-r4";
import type * as GeneratedTypes from "../index.js";
/**
 * Profile-specific FHIR Read Client.
 * Extends the base R4 read client with typed profile accessors.
 * Inherits all base R4 resource methods from @babelfhir-ts/client-r4.
 */
export declare class FhirReadClient extends BaseFhirReadClient {
    allergyIntoleranceUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.AllergyIntoleranceUvIps>;
    bundleUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.BundleUvIps>;
    compositionUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.CompositionUvIps>;
    conditionUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.ConditionUvIps>;
    deviceObserverUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.DeviceObserverUvIps>;
    deviceUseStatementUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.DeviceUseStatementUvIps>;
    deviceUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.DeviceUvIps>;
    diagnosticReportUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.DiagnosticReportUvIps>;
    flagAlertUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.FlagAlertUvIps>;
    imagingStudyUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.ImagingStudyUvIps>;
    immunizationUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.ImmunizationUvIps>;
    medicationIPS(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.MedicationIPS>;
    medicationRequestIPS(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.MedicationRequestIPS>;
    medicationStatementIPS(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.MedicationStatementIPS>;
    observationAlcoholUseUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.ObservationAlcoholUseUvIps>;
    observationPregnancyEddUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.ObservationPregnancyEddUvIps>;
    observationPregnancyOutcomeUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.ObservationPregnancyOutcomeUvIps>;
    observationPregnancyStatusUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.ObservationPregnancyStatusUvIps>;
    observationResultsLaboratoryPathologyUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.ObservationResultsLaboratoryPathologyUvIps>;
    observationResultsRadiologyUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.ObservationResultsRadiologyUvIps>;
    observationTobaccoUseUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.ObservationTobaccoUseUvIps>;
    organizationUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.OrganizationUvIps>;
    patientUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.PatientUvIps>;
    practitionerRoleUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.PractitionerRoleUvIps>;
    practitionerUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.PractitionerUvIps>;
    procedureUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.ProcedureUvIps>;
    specimenUvIps(): import("@babelfhir-ts/client-r4").FhirResourceReader<GeneratedTypes.SpecimenUvIps>;
}
/**
 * Profile-specific FHIR Write Client.
 * Extends the base R4 write client with typed profile accessors.
 * Inherits all base R4 resource methods from @babelfhir-ts/client-r4.
 */
export declare class FhirWriteClient extends BaseFhirWriteClient {
    allergyIntoleranceUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.AllergyIntoleranceUvIps>;
    bundleUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.BundleUvIps>;
    compositionUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.CompositionUvIps>;
    conditionUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.ConditionUvIps>;
    deviceObserverUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.DeviceObserverUvIps>;
    deviceUseStatementUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.DeviceUseStatementUvIps>;
    deviceUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.DeviceUvIps>;
    diagnosticReportUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.DiagnosticReportUvIps>;
    flagAlertUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.FlagAlertUvIps>;
    imagingStudyUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.ImagingStudyUvIps>;
    immunizationUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.ImmunizationUvIps>;
    medicationIPS(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.MedicationIPS>;
    medicationRequestIPS(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.MedicationRequestIPS>;
    medicationStatementIPS(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.MedicationStatementIPS>;
    observationAlcoholUseUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.ObservationAlcoholUseUvIps>;
    observationPregnancyEddUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.ObservationPregnancyEddUvIps>;
    observationPregnancyOutcomeUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.ObservationPregnancyOutcomeUvIps>;
    observationPregnancyStatusUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.ObservationPregnancyStatusUvIps>;
    observationResultsLaboratoryPathologyUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.ObservationResultsLaboratoryPathologyUvIps>;
    observationResultsRadiologyUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.ObservationResultsRadiologyUvIps>;
    observationTobaccoUseUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.ObservationTobaccoUseUvIps>;
    organizationUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.OrganizationUvIps>;
    patientUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.PatientUvIps>;
    practitionerRoleUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.PractitionerRoleUvIps>;
    practitionerUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.PractitionerUvIps>;
    procedureUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.ProcedureUvIps>;
    specimenUvIps(): import("@babelfhir-ts/client-r4").FhirResourceWriter<GeneratedTypes.SpecimenUvIps>;
}
/**
 * Main FHIR Client — works with plain fetch or an authenticated fetch wrapper.
 * Provides both base R4 accessors (inherited) and profile-specific accessors.
 *
 * @example
 * // Unauthenticated
 * const client = new FhirClient("https://fhir.example.com");
 *
 * // With custom fetch (e.g. from SmartFhirClient)
 * const client = new FhirClient("https://fhir.example.com", authenticatedFetch);
 *
 * // Base R4 methods (inherited from @babelfhir-ts/client-r4)
 * const pt = await client.read().patient().read("123");
 *
 * // Profile-specific methods (generated)
 * const claim = await client.read().pASClaim().search({ status: "active" });
 */
export declare class FhirClient {
    readonly baseUrl: string;
    private readonly readClient;
    private readonly writeClient;
    constructor(baseUrl: string, fetchFn?: FetchFn);
    /**
     * Get a read client for querying resources
     */
    read(): FhirReadClient;
    /**
     * Get a write client for creating/updating resources
     */
    write(): FhirWriteClient;
}
