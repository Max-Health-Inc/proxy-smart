/**
 * FHIR Service for Person Resource Operations
 * Handles creating and searching FHIR Person resources across different servers
 * with version-specific type support (R3, R4, R5)
 */

import type { PersonR3, PersonR4, PersonR5 } from '../lib/fhir-types';
import type { ContactPoint } from '../lib/fhir-types';
import { getStoredToken } from '@/lib/apiClient';
import { config } from '@/config';

// Union type for all FHIR Person versions
type AnyPerson = PersonR3 | PersonR4 | PersonR5;

export interface PersonData {
  firstName: string;
  lastName: string;
  email: string;
  telecom?: ContactPoint[];
  identifier?: Array<{
    system: string;
    value: string;
  }>;
}

export interface SearchPersonParams {
  name?: string;
  identifier?: string;
  email?: string;
  _id?: string;
}

/**
 * Determine the FHIR version path segment from version string
 */
function getFhirVersionPath(fhirVersion: string): 'R3' | 'R4' | 'R5' {
  const version = fhirVersion.toUpperCase();
  
  // Handle various version formats
  if (version.includes('3.0') || version === 'STU3' || version === 'R3') {
    return 'R3';
  }
  if (version.includes('5.0') || version === 'R5') {
    return 'R5';
  }
  // Default to R4 for 4.0.x or unrecognized versions
  return 'R4';
}

/**
 * Build a FHIR Person resource with the correct version-specific type
 * @param personData - The person data to build the resource from
 * @param fhirVersion - The FHIR version to build for (determines the return type)
 */
function buildPersonResource(personData: PersonData, fhirVersion: string): AnyPerson {
  const versionPath = getFhirVersionPath(fhirVersion);
  
  // Base structure that's compatible with all FHIR versions
  const basePersonData = {
    resourceType: 'Person' as const,
    active: true,
    name: [
      {
        use: 'official' as const,
        family: personData.lastName,
        given: [personData.firstName],
        text: `${personData.firstName} ${personData.lastName}`
      }
    ],
    telecom: personData.telecom || [
      {
        system: 'email' as const,
        value: personData.email,
        use: 'work' as const
      }
    ],
    ...(personData.identifier && personData.identifier.length > 0 && { identifier: personData.identifier })
  };

  // Return the version-specific typed resource
  switch (versionPath) {
    case 'R3':
      return basePersonData as PersonR3;
    case 'R5':
      return basePersonData as PersonR5;
    case 'R4':
    default:
      return basePersonData as PersonR4;
  }
}

/**
 * Create a FHIR Person resource on a specific server
 * @param serverId - The ID of the FHIR server
 * @param fhirVersion - The FHIR version of the server (e.g., "4.0.1", "R4", "5.0.0")
 * @param personData - The person data to create
 */
export async function createPersonResource(
  serverId: string,
  fhirVersion: string,
  personData: PersonData
): Promise<{ id: string; display: string }> {
  
  // Build the FHIR Person resource with version-specific structure
  const person = buildPersonResource(personData, fhirVersion);
  const versionPath = getFhirVersionPath(fhirVersion);

  // Get the access token
  const token = await getStoredToken();
  if (!token) {
    throw new Error('No access token available. Please log in.');
  }

  // Make the request to the FHIR proxy with the correct version path
  const fhirProxyUrl = `${config.api.baseUrl}/proxy/${serverId}/${versionPath}/Person`;

  const response = await fetch(fhirProxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/fhir+json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/fhir+json'
    },
    body: JSON.stringify(person)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Person resource: ${response.status} ${response.statusText}. ${errorText}`);
  }

  const createdPerson: AnyPerson = await response.json();
  
  if (!createdPerson.id) {
    throw new Error('Created Person resource has no ID');
  }

  const display = createdPerson.name?.[0]?.text || 
                  `${createdPerson.name?.[0]?.given?.[0] || ''} ${createdPerson.name?.[0]?.family || ''}`.trim();

  return {
    id: `Person/${createdPerson.id}`,
    display: display || createdPerson.id
  };
}

/**
 * Search for Person resources on a specific server
 * @param serverId - The ID of the FHIR server
 * @param fhirVersion - The FHIR version of the server (e.g., "4.0.1", "R4", "5.0.0")
 * @param searchParams - Search parameters
 */
export async function searchPersonResources(
  serverId: string,
  fhirVersion: string,
  searchParams: SearchPersonParams
): Promise<Array<{ id: string; display: string }>> {
  
  const versionPath = getFhirVersionPath(fhirVersion);
  
  // Get the access token
  const token = await getStoredToken();
  if (!token) {
    throw new Error('No access token available. Please log in.');
  }

  // Build search URL with parameters
  const params = new URLSearchParams();
  if (searchParams._id) {
    params.append('_id', searchParams._id);
  }
  if (searchParams.name) {
    params.append('name', searchParams.name);
  }
  if (searchParams.identifier) {
    params.append('identifier', searchParams.identifier);
  }
  if (searchParams.email) {
    params.append('telecom', `email|${searchParams.email}`);
  }

  const fhirProxyUrl = `${config.api.baseUrl}/proxy/${serverId}/${versionPath}/Person?${params.toString()}`;

  const response = await fetch(fhirProxyUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/fhir+json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to search Person resources: ${response.status} ${response.statusText}. ${errorText}`);
  }

  const bundle = await response.json();
  
  if (!bundle.entry || bundle.entry.length === 0) {
    return [];
  }

  return bundle.entry.map((entry: { resource: AnyPerson }) => {
    const person: AnyPerson = entry.resource;
    const display = person.name?.[0]?.text || 
                    `${person.name?.[0]?.given?.[0] || ''} ${person.name?.[0]?.family || ''}`.trim();
    
    return {
      id: `Person/${person.id}`,
      display: display || person.id || 'Unknown'
    };
  });
}

/**
 * Get a specific Person resource by ID
 * @param serverId - The ID of the FHIR server
 * @param fhirVersion - The FHIR version of the server (e.g., "4.0.1", "R4", "5.0.0")
 * @param personId - The Person resource ID (with or without "Person/" prefix)
 */
export async function getPersonResource(
  serverId: string,
  fhirVersion: string,
  personId: string
): Promise<{ id: string; display: string }> {
  
  const versionPath = getFhirVersionPath(fhirVersion);
  
  // Get the access token
  const token = await getStoredToken();
  if (!token) {
    throw new Error('No access token available. Please log in.');
  }

  // Remove "Person/" prefix if present
  const cleanId = personId.startsWith('Person/') ? personId.substring(7) : personId;

  const fhirProxyUrl = `${config.api.baseUrl}/proxy/${serverId}/${versionPath}/Person/${cleanId}`;

  const response = await fetch(fhirProxyUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/fhir+json'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Person resource not found: ${personId}`);
    }
    const errorText = await response.text();
    throw new Error(`Failed to get Person resource: ${response.status} ${response.statusText}. ${errorText}`);
  }

  const person: AnyPerson = await response.json();
  const display = person.name?.[0]?.text || 
                  `${person.name?.[0]?.given?.[0] || ''} ${person.name?.[0]?.family || ''}`.trim();

  return {
    id: `Person/${person.id}`,
    display: display || person.id || 'Unknown'
  };
}
