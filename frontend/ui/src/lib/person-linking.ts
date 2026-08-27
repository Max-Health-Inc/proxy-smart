/**
 * View models for the Person↔resource linking screens.
 *
 * These are the admin UI's own shapes, not FHIR ones: a `CustomPersonLink` is a
 * `Person.link` entry flattened for a table row, and `PersonResource` pairs a
 * Person with the server it was read from. FHIR types come from `fhir/r4` at the
 * point of use — this module used to re-alias Person/Patient/Practitioner/
 * RelatedPerson/Reference/ContactPoint for R3, R4 and R5 (18 aliases), of which
 * only the three Person ones were ever imported, all by fhirService.
 */

export type LinkedResourceType = 'Patient' | 'Practitioner' | 'RelatedPerson';

export type AssuranceLevel = 'level1' | 'level2' | 'level3' | 'level4';

/** Whether a string is one of the resource types a Person link may point at. */
export function isLinkedResourceType(value: string | undefined): value is LinkedResourceType {
  return value === 'Patient' || value === 'Practitioner' || value === 'RelatedPerson';
}

/** Whether a string is one of FHIR's `Person.link.assurance` codes. */
export function isAssuranceLevel(value: string | undefined): value is AssuranceLevel {
  return value === 'level1' || value === 'level2' || value === 'level3' || value === 'level4';
}

export interface ServerInfo {
  serverName: string;
  version: string;
  baseUrl: string;
  fhirVersion?: string;
}

/** One `Person.link` entry, flattened for the linking table. */
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

/** Whether `reference` is a well-formed `ResourceType/id` reference of the expected type. */
export function validateFhirReference(reference: string, expectedResourceType: LinkedResourceType): boolean {
  if (!reference || !expectedResourceType) {
    return false;
  }

  const referencePattern = new RegExp(`^${expectedResourceType}\\/[a-zA-Z0-9\\-\\.]+$`);
  return referencePattern.test(reference);
}
