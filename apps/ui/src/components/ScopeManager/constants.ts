import type { ScopeTemplate } from './types';

// FHIR Resource types for scope building
export const FHIR_RESOURCES = [
  'Patient', 'Practitioner', 'PractitionerRole', 'Organization', 'Location',
  'Observation', 'DiagnosticReport', 'Condition', 'Procedure', 'MedicationRequest',
  'Medication', 'AllergyIntolerance', 'Immunization', 'Encounter', 'Appointment',
  'DocumentReference', 'Binary', 'QuestionnaireResponse', 'CarePlan', 'Goal',
  'List', 'Composition', 'Bundle', 'ValueSet', 'CodeSystem', 'StructureDefinition'
];

// FHIR permissions
export const FHIR_PERMISSIONS: Record<string, { label: string; description: string; color: string }> = {
  c: { label: 'Create', description: 'Type level create', color: 'bg-green-500/10 dark:bg-green-400/20 text-green-800 dark:text-green-300' },
  r: { label: 'Read', description: 'Instance level read, vread, history', color: 'bg-blue-500/10 dark:bg-blue-400/20 text-blue-800 dark:text-blue-300' },
  u: { label: 'Update', description: 'Instance level update, patch', color: 'bg-yellow-500/10 dark:bg-yellow-400/20 text-yellow-800 dark:text-yellow-300' },
  d: { label: 'Delete', description: 'Instance level delete', color: 'bg-red-500/10 dark:bg-red-400/20 text-red-800 dark:text-red-300' },
  s: { label: 'Search', description: 'Type level search, history, system level', color: 'bg-purple-500/10 dark:bg-purple-400/20 text-purple-800 dark:text-purple-300' }
};

// Scope contexts - defines the data access pattern for SMART scopes:
// - patient: Access to resources where the patient is the subject
// - user: Access to resources accessible by the current user
// - system: Backend system access without user context (for server-to-server)
// - agent: Access on behalf of an autonomous agent (fhirUser should reference Device resource for identity)
export const SCOPE_CONTEXTS = [
  { value: 'patient', label: 'Patient', description: 'Patient-specific data access' },
  { value: 'user', label: 'User', description: 'User-accessible data' },
  { value: 'system', label: 'System', description: 'System-level access (no user context)' },
  { value: 'agent', label: 'Agent', description: 'Access on behalf of an autonomous agent (fhirUser=Device/xyz)' }
];

// Pre-built scope templates with detailed role-based access
export const SCOPE_TEMPLATES: ScopeTemplate[] = [
  {
    id: 'physician-full',
    name: 'Physician - Full Clinical Access',
    description: 'Complete clinical data access for attending physicians with full CRUD permissions',
    role: 'physician',
    color: 'bg-blue-500/10 dark:bg-blue-400/20 text-blue-800 dark:text-blue-300 border-blue-500/20 dark:border-blue-400/20',
    scopes: [
      'patient/Patient.cruds',
      'patient/Observation.cruds',
      'patient/DiagnosticReport.cruds',
      'patient/Condition.cruds',
      'patient/Procedure.cruds',
      'patient/MedicationRequest.cruds',
      'patient/AllergyIntolerance.cruds',
      'patient/Immunization.cruds',
      'patient/Encounter.cruds',
      'patient/Appointment.cruds',
      'patient/CarePlan.cruds',
      'patient/Goal.cruds',
      'patient/DocumentReference.cruds',
      'user/Practitioner.rs',
      'user/Organization.rs',
      'user/Location.rs',
      'launch/patient',
      'launch/encounter',
      'openid',
      'profile',
      'fhirUser',
      'offline_access'
    ]
  },
  {
    id: 'physician-readonly',
    name: 'Physician - Read-Only Access',
    description: 'Read-only clinical data access for consulting physicians',
    role: 'physician',
    color: 'bg-blue-500/10 dark:bg-blue-400/20 text-blue-800 dark:text-blue-300 border-blue-500/20 dark:border-blue-400/20',
    scopes: [
      'patient/Patient.rs',
      'patient/Observation.rs',
      'patient/DiagnosticReport.rs',
      'patient/Condition.rs',
      'patient/Procedure.rs',
      'patient/MedicationRequest.rs',
      'patient/AllergyIntolerance.rs',
      'patient/Immunization.rs',
      'patient/Encounter.rs',
      'patient/DocumentReference.rs',
      'user/Practitioner.r',
      'launch/patient',
      'openid',
      'profile',
      'fhirUser'
    ]
  },
  {
    id: 'nurse-care',
    name: 'Nurse - Care Delivery',
    description: 'Clinical data access for direct patient care with medication and observation updates',
    role: 'nurse',
    color: 'bg-green-500/10 dark:bg-green-400/20 text-green-800 dark:text-green-300 border-green-500/20 dark:border-green-400/20',
    scopes: [
      'patient/Patient.rs',
      'patient/Observation.cruds',
      'patient/DiagnosticReport.rs',
      'patient/Condition.rs',
      'patient/MedicationRequest.rs',
      'patient/MedicationAdministration.cruds',
      'patient/AllergyIntolerance.rs',
      'patient/Immunization.cruds',
      'patient/Encounter.rus',
      'patient/Appointment.rs',
      'patient/CarePlan.rs',
      'user/Practitioner.r',
      'launch/patient',
      'openid',
      'profile',
      'fhirUser'
    ]
  },
  {
    id: 'nurse-basic',
    name: 'Nurse - Basic Access',
    description: 'Essential read-only clinical data for nursing staff',
    role: 'nurse',
    color: 'bg-green-500/10 dark:bg-green-400/20 text-green-800 dark:text-green-300 border-green-500/20 dark:border-green-400/20',
    scopes: [
      'patient/Patient.r',
      'patient/Observation.rs',
      'patient/DiagnosticReport.r',
      'patient/Condition.r',
      'patient/MedicationRequest.r',
      'patient/AllergyIntolerance.r',
      'patient/Immunization.r',
      'patient/Encounter.r',
      'launch/patient',
      'openid',
      'fhirUser'
    ]
  },
  {
    id: 'researcher-population',
    name: 'Researcher - Population Health',
    description: 'De-identified population-level data access for research and analytics',
    role: 'researcher',
    color: 'bg-purple-500/10 dark:bg-purple-400/20 text-purple-800 dark:text-purple-300 border-purple-500/20 dark:border-purple-400/20',
    scopes: [
      'user/Patient.rs',
      'user/Observation.rs',
      'user/DiagnosticReport.rs',
      'user/Condition.rs',
      'user/Procedure.rs',
      'user/MedicationRequest.rs',
      'user/Encounter.rs',
      'user/AllergyIntolerance.rs',
      'system/ValueSet.rs',
      'system/CodeSystem.rs',
      'openid',
      'fhirUser'
    ]
  },
  {
    id: 'researcher-clinical-trial',
    name: 'Researcher - Clinical Trial',
    description: 'Patient-specific research data access with consent for clinical trials',
    role: 'researcher',
    color: 'bg-purple-500/10 dark:bg-purple-400/20 text-purple-800 dark:text-purple-300 border-purple-500/20 dark:border-purple-400/20',
    scopes: [
      'patient/Patient.r',
      'patient/Observation.rs',
      'patient/DiagnosticReport.rs',
      'patient/Condition.rs',
      'patient/Procedure.rs',
      'patient/MedicationRequest.rs',
      'patient/ResearchStudy.rs',
      'patient/ResearchSubject.cruds',
      'patient/QuestionnaireResponse.cruds',
      'launch/patient',
      'openid',
      'fhirUser'
    ]
  },
  {
    id: 'pharmacist-medication',
    name: 'Pharmacist - Medication Management',
    description: 'Medication-focused access for pharmacists with dispensing capabilities',
    role: 'pharmacist',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    scopes: [
      'patient/Patient.rs',
      'patient/MedicationRequest.rs',
      'patient/Medication.rs',
      'patient/MedicationDispense.cruds',
      'patient/MedicationAdministration.rs',
      'patient/AllergyIntolerance.rs',
      'patient/Condition.rs',
      'patient/Observation.rs',
      'user/Practitioner.r',
      'launch/patient',
      'openid',
      'fhirUser'
    ]
  },
  {
    id: 'therapist-care',
    name: 'Therapist - Care Planning',
    description: 'Therapy-focused access for physical, occupational, and speech therapists',
    role: 'therapist',
    color: 'bg-teal-100 text-teal-800 border-teal-200',
    scopes: [
      'patient/Patient.rs',
      'patient/Condition.rs',
      'patient/Procedure.rs',
      'patient/Observation.cruds',
      'patient/CarePlan.cruds',
      'patient/Goal.cruds',
      'patient/Appointment.cruds',
      'patient/DiagnosticReport.rs',
      'user/Practitioner.r',
      'launch/patient',
      'openid',
      'fhirUser'
    ]
  },
  {
    id: 'admin-full',
    name: 'Administrator - System Access',
    description: 'Complete system access for healthcare administrators',
    role: 'admin',
    color: 'bg-red-100 text-red-800 border-red-200',
    scopes: [
      'patient/*.cruds',
      'user/*.cruds',
      'system/*.cruds',
      'launch/patient',
      'launch/encounter',
      'openid',
      'profile',
      'fhirUser',
      'offline_access'
    ]
  },
  {
    id: 'emergency-physician',
    name: 'Emergency Physician - Critical Care',
    description: 'Emergency department access with rapid clinical data retrieval',
    role: 'physician',
    color: 'bg-red-100 text-red-800 border-red-200',
    scopes: [
      'patient/Patient.cruds',
      'patient/Observation.cruds',
      'patient/DiagnosticReport.cruds',
      'patient/Condition.cruds',
      'patient/MedicationRequest.cruds',
      'patient/AllergyIntolerance.cruds',
      'patient/Encounter.cruds',
      'patient/Procedure.cruds',
      'user/Practitioner.rs',
      'user/Location.rs',
      'launch/patient',
      'launch/encounter',
      'openid',
      'fhirUser'
    ]
  },
  {
    id: 'autonomous-agent',
    name: 'Autonomous Agent - Clinical AI',
    description: 'Agent scopes for autonomous AI systems acting independently (fhirUser should reference Device resource)',
    role: 'agent',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    scopes: [
      'agent/Patient.rs',
      'agent/Observation.rs',
      'agent/DiagnosticReport.rs',
      'agent/Condition.rs',
      'agent/MedicationRequest.rs',
      'agent/AllergyIntolerance.rs',
      'agent/CarePlan.c',
      'agent/RiskAssessment.c',
      'agent/ClinicalImpression.c',
      'openid',
      'fhirUser'
    ]
  },
  {
    id: 'emergency-agent',
    name: 'Emergency Response Agent',
    description: 'Agent scopes for emergency response robots/devices (fhirUser=Device/emergency-unit-id)',
    role: 'agent',
    color: 'bg-red-100 text-red-800 border-red-200',
    scopes: [
      'agent/Patient.rs',
      'agent/Encounter.c',
      'agent/Observation.c',
      'agent/AllergyIntolerance.rs',
      'agent/MedicationStatement.rs',
      'agent/RelatedPerson.rs',
      'openid',
      'fhirUser'
    ]
  }
];
