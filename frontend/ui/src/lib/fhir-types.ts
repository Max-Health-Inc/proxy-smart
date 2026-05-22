// FHIR Types for the PersonResourceLinker component
// Imports from available FHIR type libraries based on version

import type { 
  Person as PersonR3, 
  Patient as PatientR3, 
  Practitioner as PractitionerR3, 
  RelatedPerson as RelatedPersonR3, 
  Reference as ReferenceR3,
  ContactPoint as ContactPointR3
} from 'fhir/r3';  


import type {
  Person as PersonR4,
  Patient as PatientR4,
  Practitioner as PractitionerR4,
  RelatedPerson as RelatedPersonR4,
  Reference as ReferenceR4,
  ContactPoint as ContactPointR4
} from 'fhir/r4';

import type { 
  Person as PersonR5, 
  Patient as PatientR5, 
  Practitioner as PractitionerR5, 
  RelatedPerson as RelatedPersonR5, 
  Reference as ReferenceR5,
  ContactPoint as ContactPointR5
} from 'fhir/r5';

// Export version-specific types for use in production code
export type { PersonR3, PatientR3, PractitionerR3, RelatedPersonR3, ReferenceR3, ContactPointR3 };
export type { PersonR4, PatientR4, PractitionerR4, RelatedPersonR4, ReferenceR4, ContactPointR4 };
export type { PersonR5, PatientR5, PractitionerR5, RelatedPersonR5, ReferenceR5, ContactPointR5 };

// TODO: dont use custom types for FHIR resources, use the existing libraries only
// Re-export types with version-agnostic names for FHIR resources (defaults to R4)
export type Person = PersonR4;
export type Patient = PatientR4;
export type Practitioner = PractitionerR4;
export type RelatedPerson = RelatedPersonR4;
export type Reference = ReferenceR4;
export type ContactPoint = ContactPointR4;

// Custom types for our UI that extend FHIR concepts
export type LinkedResourceType = 'Patient' | 'Practitioner' | 'RelatedPerson';

export type AssuranceLevel = 'level1' | 'level2' | 'level3' | 'level4';

export interface ServerInfo {
  serverName: string;
  version: string;
  baseUrl: string;
  fhirVersion?: string;
}

// Custom PersonLink interface for our UI (not the FHIR PersonLink)
export interface CustomPersonLink {
  id: string;
  target: {
    resourceType: LinkedResourceType;
    reference: string;
    display?: string;
  };
  assurance: AssuranceLevel;
  created: string;
  notes?: string;
}

export interface PersonResource {
  id: string;
  display: string;
  serverInfo: ServerInfo;
  links: CustomPersonLink[];
}

// Utility function to validate FHIR reference format
export function validateFhirReference(reference: string, expectedResourceType: LinkedResourceType): boolean {
  if (!reference || !expectedResourceType) {
    return false;
  }

  // Check if reference follows the pattern: ResourceType/id
  const referencePattern = new RegExp(`^${expectedResourceType}\\/[a-zA-Z0-9\\-\\.]+$`);
  return referencePattern.test(reference);
}

// Type mapping for different FHIR versions
// For now, we default to R4 types. In the future, this could be extended
// to support conditional type mapping based on FHIR version
