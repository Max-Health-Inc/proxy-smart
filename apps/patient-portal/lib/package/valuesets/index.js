/**
 * ValueSet Registry
 * Central registry of all loaded ValueSets with explicit codes
 */
import * as AdministrativeGender from './ValueSet-AdministrativeGender.js';
import * as AllergyIntoleranceCategory from './ValueSet-AllergyIntoleranceCategory.js';
import * as AllergyintoleranceClinical from './ValueSet-AllergyintoleranceClinical.js';
import * as AllergyIntoleranceCriticality from './ValueSet-AllergyIntoleranceCriticality.js';
import * as AllergyIntoleranceType from './ValueSet-AllergyIntoleranceType.js';
import * as AllergyintoleranceVerification from './ValueSet-AllergyintoleranceVerification.js';
import * as AllSecurityLabels from './ValueSet-AllSecurityLabels.js';
import * as BodySite from './ValueSet-BodySite.js';
import * as BodysiteLaterality from './ValueSet-BodysiteLaterality.js';
import * as BundleType from './ValueSet-BundleType.js';
import * as C80PracticeCodes from './ValueSet-C80PracticeCodes.js';
import * as ClinicalFindings from './ValueSet-ClinicalFindings.js';
import * as CommonTags from './ValueSet-CommonTags.js';
import * as CompositionAttestationMode from './ValueSet-CompositionAttestationMode.js';
import * as CompositionStatus from './ValueSet-CompositionStatus.js';
import * as ConditionClinical from './ValueSet-ConditionClinical.js';
import * as ConditionCode from './ValueSet-ConditionCode.js';
import * as ConditionSeverity from './ValueSet-ConditionSeverity.js';
import * as ConditionStage from './ValueSet-ConditionStage.js';
import * as ConditionStageType from './ValueSet-ConditionStageType.js';
import * as ConditionVerStatus from './ValueSet-ConditionVerStatus.js';
import * as ContactentityType from './ValueSet-ContactentityType.js';
import * as CurrentSmokingStatusUvIps from './ValueSet-CurrentSmokingStatusUvIps.js';
import * as DataAbsentReason from './ValueSet-DataAbsentReason.js';
import * as DaysOfWeek from './ValueSet-DaysOfWeek.js';
import * as DeviceNametype from './ValueSet-DeviceNametype.js';
import * as DeviceStatementStatus from './ValueSet-DeviceStatementStatus.js';
import * as DeviceStatus from './ValueSet-DeviceStatus.js';
import * as DeviceStatusReason from './ValueSet-DeviceStatusReason.js';
import * as DeviceType from './ValueSet-DeviceType.js';
import * as DiagnosticReportStatusUvIps from './ValueSet-DiagnosticReportStatusUvIps.js';
import * as DiagnosticServiceSections from './ValueSet-DiagnosticServiceSections.js';
import * as DocSectionCodes from './ValueSet-DocSectionCodes.js';
import * as DocumentClasscodes from './ValueSet-DocumentClasscodes.js';
import * as DocumentRelationshipType from './ValueSet-DocumentRelationshipType.js';
import * as DoseRateType from './ValueSet-DoseRateType.js';
import * as EventStatus from './ValueSet-EventStatus.js';
import * as FHIRDeviceTypes from './ValueSet-FHIRDeviceTypes.js';
import * as FHIRDocumentTypeCodes from './ValueSet-FHIRDocumentTypeCodes.js';
import * as FlagCategory from './ValueSet-FlagCategory.js';
import * as FlagCode from './ValueSet-FlagCode.js';
import * as FlagStatus from './ValueSet-FlagStatus.js';
import * as HttpVerb from './ValueSet-HttpVerb.js';
import * as ImagingStudyStatusUvIps from './ValueSet-ImagingStudyStatusUvIps.js';
import * as ImmunizationFunction from './ValueSet-ImmunizationFunction.js';
import * as ImmunizationFundingSource from './ValueSet-ImmunizationFundingSource.js';
import * as ImmunizationOrigin from './ValueSet-ImmunizationOrigin.js';
import * as ImmunizationProgramEligibility from './ValueSet-ImmunizationProgramEligibility.js';
import * as ImmunizationReason from './ValueSet-ImmunizationReason.js';
import * as ImmunizationStatus from './ValueSet-ImmunizationStatus.js';
import * as ImmunizationStatusReason from './ValueSet-ImmunizationStatusReason.js';
import * as ImmunizationSubpotentReason from './ValueSet-ImmunizationSubpotentReason.js';
import * as Languages from './ValueSet-Languages.js';
import * as LinkType from './ValueSet-LinkType.js';
import * as ListEmptyReason from './ValueSet-ListEmptyReason.js';
import * as ListMode from './ValueSet-ListMode.js';
import * as ListOrder from './ValueSet-ListOrder.js';
import * as ManifestationAndSymptomCodes from './ValueSet-ManifestationAndSymptomCodes.js';
import * as MaritalStatus from './ValueSet-MaritalStatus.js';
import * as MedicationrequestCategory from './ValueSet-MedicationrequestCategory.js';
import * as MedicationrequestCourseOfTherapy from './ValueSet-MedicationrequestCourseOfTherapy.js';
import * as MedicationrequestIntent from './ValueSet-MedicationrequestIntent.js';
import * as MedicationrequestStatus from './ValueSet-MedicationrequestStatus.js';
import * as MedicationrequestStatusReason from './ValueSet-MedicationrequestStatusReason.js';
import * as MedicationsExampleUvIps from './ValueSet-MedicationsExampleUvIps.js';
import * as MedicationStatementCategory from './ValueSet-MedicationStatementCategory.js';
import * as MedicationStatementStatus from './ValueSet-MedicationStatementStatus.js';
import * as MedicationStatus from './ValueSet-MedicationStatus.js';
import * as NameUse from './ValueSet-NameUse.js';
import * as ObservationCategory from './ValueSet-ObservationCategory.js';
import * as ObservationCodes from './ValueSet-ObservationCodes.js';
import * as ObservationInterpretation from './ValueSet-ObservationInterpretation.js';
import * as ObservationMethods from './ValueSet-ObservationMethods.js';
import * as ObservationStatus from './ValueSet-ObservationStatus.js';
import * as OrganizationType from './ValueSet-OrganizationType.js';
import * as PatientContactRelationship from './ValueSet-PatientContactRelationship.js';
import * as PersonalRelationshipUvIps from './ValueSet-PersonalRelationshipUvIps.js';
import * as PregnanciesSummaryUvIps from './ValueSet-PregnanciesSummaryUvIps.js';
import * as PregnancyExpectedDeliveryDateMethodUvIps from './ValueSet-PregnancyExpectedDeliveryDateMethodUvIps.js';
import * as PregnancyStatusUvIps from './ValueSet-PregnancyStatusUvIps.js';
import * as ProblemTypeLoinc from './ValueSet-ProblemTypeLoinc.js';
import * as ProblemTypeUvIps from './ValueSet-ProblemTypeUvIps.js';
import * as ProcedureCategory from './ValueSet-ProcedureCategory.js';
import * as ProcedureDeviceActionCodes from './ValueSet-ProcedureDeviceActionCodes.js';
import * as ProcedureFollowup from './ValueSet-ProcedureFollowup.js';
import * as ProcedureNotPerformedReasonSNOMEDCT from './ValueSet-ProcedureNotPerformedReasonSNOMEDCT.js';
import * as ProcedureOutcome from './ValueSet-ProcedureOutcome.js';
import * as ProcedurePerformerRoleCodes from './ValueSet-ProcedurePerformerRoleCodes.js';
import * as ProcedureReasonCodes from './ValueSet-ProcedureReasonCodes.js';
import * as ReactionEventSeverity from './ValueSet-ReactionEventSeverity.js';
import * as ReferencerangeAppliesto from './ValueSet-ReferencerangeAppliesto.js';
import * as ReferencerangeMeaning from './ValueSet-ReferencerangeMeaning.js';
import * as ReportCodes from './ValueSet-ReportCodes.js';
import * as RequestPriority from './ValueSet-RequestPriority.js';
import * as ResourceTypes from './ValueSet-ResourceTypes.js';
import * as ResultsRadiologyComponentUvIps from './ValueSet-ResultsRadiologyComponentUvIps.js';
import * as ResultsStatusUvIps from './ValueSet-ResultsStatusUvIps.js';
import * as SearchEntryMode from './ValueSet-SearchEntryMode.js';
import * as SeriesPerformerFunction from './ValueSet-SeriesPerformerFunction.js';
import * as SNOMEDCTAdditionalDosageInstructions from './ValueSet-SNOMEDCTAdditionalDosageInstructions.js';
import * as SNOMEDCTAdministrationMethodCodes from './ValueSet-SNOMEDCTAdministrationMethodCodes.js';
import * as SNOMEDCTAnatomicalStructureForAdministrationSiteCodes from './ValueSet-SNOMEDCTAnatomicalStructureForAdministrationSiteCodes.js';
import * as SNOMEDCTDrugTherapyStatusCodes from './ValueSet-SNOMEDCTDrugTherapyStatusCodes.js';
import * as SNOMEDCTFormCodes from './ValueSet-SNOMEDCTFormCodes.js';
import * as SNOMEDCTMedicationAsNeededReasonCodes from './ValueSet-SNOMEDCTMedicationAsNeededReasonCodes.js';
import * as SNOMEDCTRouteCodes from './ValueSet-SNOMEDCTRouteCodes.js';
import * as SpecimenContainerType from './ValueSet-SpecimenContainerType.js';
import * as SpecimenProcessingProcedure from './ValueSet-SpecimenProcessingProcedure.js';
import * as SpecimenStatus from './ValueSet-SpecimenStatus.js';
import * as SubstanceCode from './ValueSet-SubstanceCode.js';
import * as UdiEntryType from './ValueSet-UdiEntryType.js';
import * as V20371 from './ValueSet-V20371.js';
import * as V20493 from './ValueSet-V20493.js';
import * as V20916 from './ValueSet-V20916.js';
import * as V2270360 from './ValueSet-V2270360.js';
import * as V3ActCode from './ValueSet-V3ActCode.js';
import * as V3ActSubstanceAdminSubstitutionCode from './ValueSet-V3ActSubstanceAdminSubstitutionCode.js';
import * as V3ConfidentialityClassification from './ValueSet-V3ConfidentialityClassification.js';
import * as V3SubstanceAdminSubstitutionReason from './ValueSet-V3SubstanceAdminSubstitutionReason.js';
import * as VaccineTargetDiseasesUvIps from './ValueSet-VaccineTargetDiseasesUvIps.js';
export const ValueSetRegistry = {
    AdministrativeGender,
    AllergyIntoleranceCategory,
    AllergyintoleranceClinical,
    AllergyIntoleranceCriticality,
    AllergyIntoleranceType,
    AllergyintoleranceVerification,
    AllSecurityLabels,
    BodySite,
    BodysiteLaterality,
    BundleType,
    C80PracticeCodes,
    ClinicalFindings,
    CommonTags,
    CompositionAttestationMode,
    CompositionStatus,
    ConditionClinical,
    ConditionCode,
    ConditionSeverity,
    ConditionStage,
    ConditionStageType,
    ConditionVerStatus,
    ContactentityType,
    CurrentSmokingStatusUvIps,
    DataAbsentReason,
    DaysOfWeek,
    DeviceNametype,
    DeviceStatementStatus,
    DeviceStatus,
    DeviceStatusReason,
    DeviceType,
    DiagnosticReportStatusUvIps,
    DiagnosticServiceSections,
    DocSectionCodes,
    DocumentClasscodes,
    DocumentRelationshipType,
    DoseRateType,
    EventStatus,
    FHIRDeviceTypes,
    FHIRDocumentTypeCodes,
    FlagCategory,
    FlagCode,
    FlagStatus,
    HttpVerb,
    ImagingStudyStatusUvIps,
    ImmunizationFunction,
    ImmunizationFundingSource,
    ImmunizationOrigin,
    ImmunizationProgramEligibility,
    ImmunizationReason,
    ImmunizationStatus,
    ImmunizationStatusReason,
    ImmunizationSubpotentReason,
    Languages,
    LinkType,
    ListEmptyReason,
    ListMode,
    ListOrder,
    ManifestationAndSymptomCodes,
    MaritalStatus,
    MedicationrequestCategory,
    MedicationrequestCourseOfTherapy,
    MedicationrequestIntent,
    MedicationrequestStatus,
    MedicationrequestStatusReason,
    MedicationsExampleUvIps,
    MedicationStatementCategory,
    MedicationStatementStatus,
    MedicationStatus,
    NameUse,
    ObservationCategory,
    ObservationCodes,
    ObservationInterpretation,
    ObservationMethods,
    ObservationStatus,
    OrganizationType,
    PatientContactRelationship,
    PersonalRelationshipUvIps,
    PregnanciesSummaryUvIps,
    PregnancyExpectedDeliveryDateMethodUvIps,
    PregnancyStatusUvIps,
    ProblemTypeLoinc,
    ProblemTypeUvIps,
    ProcedureCategory,
    ProcedureDeviceActionCodes,
    ProcedureFollowup,
    ProcedureNotPerformedReasonSNOMEDCT,
    ProcedureOutcome,
    ProcedurePerformerRoleCodes,
    ProcedureReasonCodes,
    ReactionEventSeverity,
    ReferencerangeAppliesto,
    ReferencerangeMeaning,
    ReportCodes,
    RequestPriority,
    ResourceTypes,
    ResultsRadiologyComponentUvIps,
    ResultsStatusUvIps,
    SearchEntryMode,
    SeriesPerformerFunction,
    SNOMEDCTAdditionalDosageInstructions,
    SNOMEDCTAdministrationMethodCodes,
    SNOMEDCTAnatomicalStructureForAdministrationSiteCodes,
    SNOMEDCTDrugTherapyStatusCodes,
    SNOMEDCTFormCodes,
    SNOMEDCTMedicationAsNeededReasonCodes,
    SNOMEDCTRouteCodes,
    SpecimenContainerType,
    SpecimenProcessingProcedure,
    SpecimenStatus,
    SubstanceCode,
    UdiEntryType,
    V20371,
    V20493,
    V20916,
    V2270360,
    V3ActCode,
    V3ActSubstanceAdminSubstitutionCode,
    V3ConfidentialityClassification,
    V3SubstanceAdminSubstitutionReason,
    VaccineTargetDiseasesUvIps,
};
export function getValueSet(name) {
    return ValueSetRegistry[name];
}
/** Map from ValueSet URL to registry name */
export const ValueSetUrlMap = {
    'http://hl7.org/fhir/ValueSet/administrative-gender': 'AdministrativeGender',
    'http://hl7.org/fhir/ValueSet/allergy-intolerance-category': 'AllergyIntoleranceCategory',
    'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical': 'AllergyintoleranceClinical',
    'http://hl7.org/fhir/ValueSet/allergy-intolerance-criticality': 'AllergyIntoleranceCriticality',
    'http://hl7.org/fhir/ValueSet/allergy-intolerance-type': 'AllergyIntoleranceType',
    'http://hl7.org/fhir/ValueSet/allergyintolerance-verification': 'AllergyintoleranceVerification',
    'http://hl7.org/fhir/ValueSet/security-labels': 'AllSecurityLabels',
    'http://hl7.org/fhir/ValueSet/body-site': 'BodySite',
    'http://hl7.org/fhir/ValueSet/bodysite-laterality': 'BodysiteLaterality',
    'http://hl7.org/fhir/ValueSet/bundle-type': 'BundleType',
    'http://hl7.org/fhir/ValueSet/c80-practice-codes': 'C80PracticeCodes',
    'http://hl7.org/fhir/ValueSet/clinical-findings': 'ClinicalFindings',
    'http://hl7.org/fhir/ValueSet/common-tags': 'CommonTags',
    'http://hl7.org/fhir/ValueSet/composition-attestation-mode': 'CompositionAttestationMode',
    'http://hl7.org/fhir/ValueSet/composition-status': 'CompositionStatus',
    'http://hl7.org/fhir/ValueSet/condition-clinical': 'ConditionClinical',
    'http://hl7.org/fhir/ValueSet/condition-code': 'ConditionCode',
    'http://hl7.org/fhir/ValueSet/condition-severity': 'ConditionSeverity',
    'http://hl7.org/fhir/ValueSet/condition-stage': 'ConditionStage',
    'http://hl7.org/fhir/ValueSet/condition-stage-type': 'ConditionStageType',
    'http://hl7.org/fhir/ValueSet/condition-ver-status': 'ConditionVerStatus',
    'http://hl7.org/fhir/ValueSet/contactentity-type': 'ContactentityType',
    'http://hl7.org/fhir/uv/ips/ValueSet/current-smoking-status-uv-ips': 'CurrentSmokingStatusUvIps',
    'http://hl7.org/fhir/ValueSet/data-absent-reason': 'DataAbsentReason',
    'http://hl7.org/fhir/ValueSet/days-of-week': 'DaysOfWeek',
    'http://hl7.org/fhir/ValueSet/device-nametype': 'DeviceNametype',
    'http://hl7.org/fhir/ValueSet/device-statement-status': 'DeviceStatementStatus',
    'http://hl7.org/fhir/ValueSet/device-status': 'DeviceStatus',
    'http://hl7.org/fhir/ValueSet/device-status-reason': 'DeviceStatusReason',
    'http://hl7.org/fhir/ValueSet/device-type': 'DeviceType',
    'http://hl7.org/fhir/uv/ips/ValueSet/diagnostics-report-status-uv-ips': 'DiagnosticReportStatusUvIps',
    'http://hl7.org/fhir/ValueSet/diagnostic-service-sections': 'DiagnosticServiceSections',
    'http://hl7.org/fhir/ValueSet/doc-section-codes': 'DocSectionCodes',
    'http://hl7.org/fhir/ValueSet/document-classcodes': 'DocumentClasscodes',
    'http://hl7.org/fhir/ValueSet/document-relationship-type': 'DocumentRelationshipType',
    'http://hl7.org/fhir/ValueSet/dose-rate-type': 'DoseRateType',
    'http://hl7.org/fhir/ValueSet/event-status': 'EventStatus',
    'http://hl7.org/fhir/ValueSet/device-kind': 'FHIRDeviceTypes',
    'http://hl7.org/fhir/ValueSet/doc-typecodes': 'FHIRDocumentTypeCodes',
    'http://hl7.org/fhir/ValueSet/flag-category': 'FlagCategory',
    'http://hl7.org/fhir/ValueSet/flag-code': 'FlagCode',
    'http://hl7.org/fhir/ValueSet/flag-status': 'FlagStatus',
    'http://hl7.org/fhir/ValueSet/http-verb': 'HttpVerb',
    'http://hl7.org/fhir/uv/ips/ValueSet/imaging-study-status-uv-ips': 'ImagingStudyStatusUvIps',
    'http://hl7.org/fhir/ValueSet/immunization-function': 'ImmunizationFunction',
    'http://hl7.org/fhir/ValueSet/immunization-funding-source': 'ImmunizationFundingSource',
    'http://hl7.org/fhir/ValueSet/immunization-origin': 'ImmunizationOrigin',
    'http://hl7.org/fhir/ValueSet/immunization-program-eligibility': 'ImmunizationProgramEligibility',
    'http://hl7.org/fhir/ValueSet/immunization-reason': 'ImmunizationReason',
    'http://hl7.org/fhir/ValueSet/immunization-status': 'ImmunizationStatus',
    'http://hl7.org/fhir/ValueSet/immunization-status-reason': 'ImmunizationStatusReason',
    'http://hl7.org/fhir/ValueSet/immunization-subpotent-reason': 'ImmunizationSubpotentReason',
    'http://hl7.org/fhir/ValueSet/languages': 'Languages',
    'http://hl7.org/fhir/ValueSet/link-type': 'LinkType',
    'http://hl7.org/fhir/ValueSet/list-empty-reason': 'ListEmptyReason',
    'http://hl7.org/fhir/ValueSet/list-mode': 'ListMode',
    'http://hl7.org/fhir/ValueSet/list-order': 'ListOrder',
    'http://hl7.org/fhir/ValueSet/manifestation-or-symptom': 'ManifestationAndSymptomCodes',
    'http://hl7.org/fhir/ValueSet/marital-status': 'MaritalStatus',
    'http://hl7.org/fhir/ValueSet/medicationrequest-category': 'MedicationrequestCategory',
    'http://hl7.org/fhir/ValueSet/medicationrequest-course-of-therapy': 'MedicationrequestCourseOfTherapy',
    'http://hl7.org/fhir/ValueSet/medicationrequest-intent': 'MedicationrequestIntent',
    'http://hl7.org/fhir/ValueSet/medicationrequest-status': 'MedicationrequestStatus',
    'http://hl7.org/fhir/ValueSet/medicationrequest-status-reason': 'MedicationrequestStatusReason',
    'http://hl7.org/fhir/uv/ips/ValueSet/medication-example-uv-ips': 'MedicationsExampleUvIps',
    'http://hl7.org/fhir/ValueSet/medication-statement-category': 'MedicationStatementCategory',
    'http://hl7.org/fhir/ValueSet/medication-statement-status': 'MedicationStatementStatus',
    'http://hl7.org/fhir/ValueSet/medication-status': 'MedicationStatus',
    'http://hl7.org/fhir/ValueSet/name-use': 'NameUse',
    'http://hl7.org/fhir/ValueSet/observation-category': 'ObservationCategory',
    'http://hl7.org/fhir/ValueSet/observation-codes': 'ObservationCodes',
    'http://hl7.org/fhir/ValueSet/observation-interpretation': 'ObservationInterpretation',
    'http://hl7.org/fhir/ValueSet/observation-methods': 'ObservationMethods',
    'http://hl7.org/fhir/ValueSet/observation-status': 'ObservationStatus',
    'http://hl7.org/fhir/ValueSet/organization-type': 'OrganizationType',
    'http://hl7.org/fhir/ValueSet/patient-contactrelationship': 'PatientContactRelationship',
    'http://hl7.org/fhir/uv/ips/ValueSet/personal-relationship-uv-ips': 'PersonalRelationshipUvIps',
    'http://hl7.org/fhir/uv/ips/ValueSet/pregnancies-summary-uv-ips': 'PregnanciesSummaryUvIps',
    'http://hl7.org/fhir/uv/ips/ValueSet/edd-method-uv-ips': 'PregnancyExpectedDeliveryDateMethodUvIps',
    'http://hl7.org/fhir/uv/ips/ValueSet/pregnancy-status-uv-ips': 'PregnancyStatusUvIps',
    'http://hl7.org/fhir/uv/ips/ValueSet/problem-type-loinc': 'ProblemTypeLoinc',
    'http://hl7.org/fhir/uv/ips/ValueSet/problem-type-uv-ips': 'ProblemTypeUvIps',
    'http://hl7.org/fhir/ValueSet/procedure-category': 'ProcedureCategory',
    'http://hl7.org/fhir/ValueSet/device-action': 'ProcedureDeviceActionCodes',
    'http://hl7.org/fhir/ValueSet/procedure-followup': 'ProcedureFollowup',
    'http://hl7.org/fhir/ValueSet/procedure-not-performed-reason': 'ProcedureNotPerformedReasonSNOMEDCT',
    'http://hl7.org/fhir/ValueSet/procedure-outcome': 'ProcedureOutcome',
    'http://hl7.org/fhir/ValueSet/performer-role': 'ProcedurePerformerRoleCodes',
    'http://hl7.org/fhir/ValueSet/procedure-reason': 'ProcedureReasonCodes',
    'http://hl7.org/fhir/ValueSet/reaction-event-severity': 'ReactionEventSeverity',
    'http://hl7.org/fhir/ValueSet/referencerange-appliesto': 'ReferencerangeAppliesto',
    'http://hl7.org/fhir/ValueSet/referencerange-meaning': 'ReferencerangeMeaning',
    'http://hl7.org/fhir/ValueSet/report-codes': 'ReportCodes',
    'http://hl7.org/fhir/ValueSet/request-priority': 'RequestPriority',
    'http://hl7.org/fhir/ValueSet/resource-types': 'ResourceTypes',
    'http://hl7.org/fhir/uv/ips/ValueSet/results-radiology-component-uv-ips': 'ResultsRadiologyComponentUvIps',
    'http://hl7.org/fhir/uv/ips/ValueSet/results-status-uv-ips': 'ResultsStatusUvIps',
    'http://hl7.org/fhir/ValueSet/search-entry-mode': 'SearchEntryMode',
    'http://hl7.org/fhir/ValueSet/series-performer-function': 'SeriesPerformerFunction',
    'http://hl7.org/fhir/ValueSet/additional-instruction-codes': 'SNOMEDCTAdditionalDosageInstructions',
    'http://hl7.org/fhir/ValueSet/administration-method-codes': 'SNOMEDCTAdministrationMethodCodes',
    'http://hl7.org/fhir/ValueSet/approach-site-codes': 'SNOMEDCTAnatomicalStructureForAdministrationSiteCodes',
    'http://hl7.org/fhir/ValueSet/reason-medication-status-codes': 'SNOMEDCTDrugTherapyStatusCodes',
    'http://hl7.org/fhir/ValueSet/medication-form-codes': 'SNOMEDCTFormCodes',
    'http://hl7.org/fhir/ValueSet/medication-as-needed-reason': 'SNOMEDCTMedicationAsNeededReasonCodes',
    'http://hl7.org/fhir/ValueSet/route-codes': 'SNOMEDCTRouteCodes',
    'http://hl7.org/fhir/ValueSet/specimen-container-type': 'SpecimenContainerType',
    'http://hl7.org/fhir/ValueSet/specimen-processing-procedure': 'SpecimenProcessingProcedure',
    'http://hl7.org/fhir/ValueSet/specimen-status': 'SpecimenStatus',
    'http://hl7.org/fhir/ValueSet/substance-code': 'SubstanceCode',
    'http://hl7.org/fhir/ValueSet/udi-entry-type': 'UdiEntryType',
    'http://terminology.hl7.org/ValueSet/v2-0371': 'V20371',
    'http://terminology.hl7.org/ValueSet/v2-0493': 'V20493',
    'http://terminology.hl7.org/ValueSet/v2-0916': 'V20916',
    'http://terminology.hl7.org/ValueSet/v2-2.7-0360': 'V2270360',
    'http://terminology.hl7.org/ValueSet/v3-ActCode': 'V3ActCode',
    'http://terminology.hl7.org/ValueSet/v3-ActSubstanceAdminSubstitutionCode': 'V3ActSubstanceAdminSubstitutionCode',
    'http://terminology.hl7.org/ValueSet/v3-ConfidentialityClassification': 'V3ConfidentialityClassification',
    'http://terminology.hl7.org/ValueSet/v3-SubstanceAdminSubstitutionReason': 'V3SubstanceAdminSubstitutionReason',
    'http://hl7.org/fhir/uv/ips/ValueSet/target-diseases-uv-ips': 'VaccineTargetDiseasesUvIps',
};
function stripVersionFromUrl(url) {
    const pipeIndex = url.indexOf('|');
    return pipeIndex >= 0 ? url.substring(0, pipeIndex) : url;
}
/**
 * Get a random code from a ValueSet by URL
 * @param url - The canonical URL of the ValueSet (may include version like "|4.0.1")
 * @returns A random code string, or undefined if ValueSet not found
 */
export function getRandomCodeByUrl(url) {
    const cleanUrl = stripVersionFromUrl(url);
    const name = ValueSetUrlMap[cleanUrl];
    if (!name)
        return undefined;
    const vs = ValueSetRegistry[name];
    // Each ValueSet exports random<Name>Code() function
    const randomFn = vs['random' + name + 'Code'];
    return randomFn?.();
}
/**
 * Get a random concept (code, system, display) from a ValueSet by URL
 * @param url - The canonical URL of the ValueSet (may include version like "|4.0.1")
 * @returns A concept object with code, system, and optional display, or undefined if ValueSet not found
 */
export function getRandomConceptByUrl(url) {
    const cleanUrl = stripVersionFromUrl(url);
    const name = ValueSetUrlMap[cleanUrl];
    if (!name)
        return undefined;
    const vs = ValueSetRegistry[name];
    // Each ValueSet exports random<Name>Concept() function
    const randomFn = vs['random' + name + 'Concept'];
    return randomFn?.();
}
