import { FhirReadClient as BaseFhirReadClient, FhirWriteClient as BaseFhirWriteClient, } from "@babelfhir-ts/client-r4";
/**
 * Profile-specific FHIR Read Client.
 * Extends the base R4 read client with typed profile accessors.
 * Inherits all base R4 resource methods from @babelfhir-ts/client-r4.
 */
export class FhirReadClient extends BaseFhirReadClient {
    allergyIntoleranceUvIps() {
        return this.forType("AllergyIntolerance");
    }
    bundleUvIps() {
        return this.forType("Bundle");
    }
    compositionUvIps() {
        return this.forType("Composition");
    }
    conditionUvIps() {
        return this.forType("Condition");
    }
    deviceObserverUvIps() {
        return this.forType("Device");
    }
    deviceUseStatementUvIps() {
        return this.forType("DeviceUseStatement");
    }
    deviceUvIps() {
        return this.forType("Device");
    }
    diagnosticReportUvIps() {
        return this.forType("DiagnosticReport");
    }
    flagAlertUvIps() {
        return this.forType("Flag");
    }
    imagingStudyUvIps() {
        return this.forType("ImagingStudy");
    }
    immunizationUvIps() {
        return this.forType("Immunization");
    }
    medicationIPS() {
        return this.forType("Medication");
    }
    medicationRequestIPS() {
        return this.forType("MedicationRequest");
    }
    medicationStatementIPS() {
        return this.forType("MedicationStatement");
    }
    observationAlcoholUseUvIps() {
        return this.forType("Observation");
    }
    observationPregnancyEddUvIps() {
        return this.forType("Observation");
    }
    observationPregnancyOutcomeUvIps() {
        return this.forType("Observation");
    }
    observationPregnancyStatusUvIps() {
        return this.forType("Observation");
    }
    observationResultsLaboratoryPathologyUvIps() {
        return this.forType("Observation");
    }
    observationResultsRadiologyUvIps() {
        return this.forType("Observation");
    }
    observationTobaccoUseUvIps() {
        return this.forType("Observation");
    }
    organizationUvIps() {
        return this.forType("Organization");
    }
    patientUvIps() {
        return this.forType("Patient");
    }
    practitionerRoleUvIps() {
        return this.forType("PractitionerRole");
    }
    practitionerUvIps() {
        return this.forType("Practitioner");
    }
    procedureUvIps() {
        return this.forType("Procedure");
    }
    specimenUvIps() {
        return this.forType("Specimen");
    }
}
/**
 * Profile-specific FHIR Write Client.
 * Extends the base R4 write client with typed profile accessors.
 * Inherits all base R4 resource methods from @babelfhir-ts/client-r4.
 */
export class FhirWriteClient extends BaseFhirWriteClient {
    allergyIntoleranceUvIps() {
        return this.forType("AllergyIntolerance");
    }
    bundleUvIps() {
        return this.forType("Bundle");
    }
    compositionUvIps() {
        return this.forType("Composition");
    }
    conditionUvIps() {
        return this.forType("Condition");
    }
    deviceObserverUvIps() {
        return this.forType("Device");
    }
    deviceUseStatementUvIps() {
        return this.forType("DeviceUseStatement");
    }
    deviceUvIps() {
        return this.forType("Device");
    }
    diagnosticReportUvIps() {
        return this.forType("DiagnosticReport");
    }
    flagAlertUvIps() {
        return this.forType("Flag");
    }
    imagingStudyUvIps() {
        return this.forType("ImagingStudy");
    }
    immunizationUvIps() {
        return this.forType("Immunization");
    }
    medicationIPS() {
        return this.forType("Medication");
    }
    medicationRequestIPS() {
        return this.forType("MedicationRequest");
    }
    medicationStatementIPS() {
        return this.forType("MedicationStatement");
    }
    observationAlcoholUseUvIps() {
        return this.forType("Observation");
    }
    observationPregnancyEddUvIps() {
        return this.forType("Observation");
    }
    observationPregnancyOutcomeUvIps() {
        return this.forType("Observation");
    }
    observationPregnancyStatusUvIps() {
        return this.forType("Observation");
    }
    observationResultsLaboratoryPathologyUvIps() {
        return this.forType("Observation");
    }
    observationResultsRadiologyUvIps() {
        return this.forType("Observation");
    }
    observationTobaccoUseUvIps() {
        return this.forType("Observation");
    }
    organizationUvIps() {
        return this.forType("Organization");
    }
    patientUvIps() {
        return this.forType("Patient");
    }
    practitionerRoleUvIps() {
        return this.forType("PractitionerRole");
    }
    practitionerUvIps() {
        return this.forType("Practitioner");
    }
    procedureUvIps() {
        return this.forType("Procedure");
    }
    specimenUvIps() {
        return this.forType("Specimen");
    }
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
export class FhirClient {
    constructor(baseUrl, fetchFn) {
        this.baseUrl = baseUrl;
        this.readClient = new FhirReadClient(baseUrl, fetchFn);
        this.writeClient = new FhirWriteClient(baseUrl, fetchFn);
    }
    /**
     * Get a read client for querying resources
     */
    read() {
        return this.readClient;
    }
    /**
     * Get a write client for creating/updating resources
     */
    write() {
        return this.writeClient;
    }
}
