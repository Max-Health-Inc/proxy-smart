/**
 * FHIR Person operations against a proxied FHIR server.
 *
 * Runs on `@babelfhir-ts/client-r4`, the generator's own client, rather than the
 * hand-rolled fetch this module used to carry: each of the five operations
 * repeated its own token lookup, URL assembly, header block, `!response.ok`
 * throw and JSON parse, and the search parsed `bundle.entry` by hand — so it read
 * only the first page and silently dropped every result after it. `searchAll`
 * follows the `next` links, and the writer reports the server's
 * `OperationOutcome` instead of just the status line.
 *
 * FHIR version handling is now only what it actually is: a path segment on the
 * proxy URL. `buildPersonResource` used to assemble one object and assert it to
 * `PersonR3`, `PersonR5` or `PersonR4` in a switch — three assertions proving the
 * fields used here (name, telecom, identifier, link) are identical across the
 * three releases. The R4 types describe them for all three.
 */

import { FhirResourceReader, FhirResourceWriter, bearerFetch } from '@babelfhir-ts/client-r4';
import { formatHumanName } from '@proxy-smart/shared-ui';
import type { Person, ContactPoint, Identifier } from 'fhir/r4';
import {
  isAssuranceLevel,
  isLinkedResourceType,
  type CustomPersonLink,
  type PersonResource,
  type ServerInfo,
} from '@/lib/person-linking';
import { getStoredToken } from '@/lib/apiClient';
import { config } from '@/config';

export interface PersonData {
  firstName: string;
  lastName: string;
  email: string;
  telecom?: ContactPoint[];
  identifier?: Identifier[];
}

export interface SearchPersonParams {
  name?: string;
  identifier?: string;
  email?: string;
  _id?: string;
}

/** A Person as the linking screens list it. */
export interface PersonSummary {
  id: string;
  display: string;
}

/**
 * The proxy path segment for a server's FHIR release.
 *
 * The proxy routes by release, so a server advertising `4.0.1`, `R4` or nothing
 * recognisable all land on the same `/R4` path.
 */
function getFhirVersionPath(fhirVersion: string): 'R3' | 'R4' | 'R5' {
  const version = fhirVersion.toUpperCase();

  if (version.includes('3.0') || version === 'STU3' || version === 'R3') {
    return 'R3';
  }
  if (version.includes('5.0') || version === 'R5') {
    return 'R5';
  }
  return 'R4';
}

/** The proxied base URL for one server's FHIR endpoint. */
function proxyBaseUrl(serverId: string, fhirVersion: string): string {
  return `${config.api.baseUrl}/proxy/${serverId}/${getFhirVersionPath(fhirVersion)}`;
}

/**
 * A reader and writer for one server, authorized with the token held right now.
 *
 * Built per operation rather than once at module scope, because the admin token
 * refreshes and `bearerFetch` captures the string it is given. Every operation
 * below therefore starts from a freshly read token.
 */
async function personClients(
  serverId: string,
  fhirVersion: string,
): Promise<{ reader: FhirResourceReader<Person>; writer: FhirResourceWriter<Person> }> {
  const baseUrl = proxyBaseUrl(serverId, fhirVersion);
  const authFetch = bearerFetch((await getStoredToken()) ?? undefined);
  return {
    reader: new FhirResourceReader<Person>(baseUrl, 'Person', authFetch),
    writer: new FhirResourceWriter<Person>(baseUrl, 'Person', authFetch),
  };
}

/** The logical id, whether the caller passed `Person/123` or `123`. */
function logicalId(personId: string): string {
  return personId.startsWith('Person/') ? personId.slice('Person/'.length) : personId;
}

function summarize(person: Person & { id: string }): PersonSummary {
  return { id: `Person/${person.id}`, display: formatHumanName(person.name) };
}

/** Build the Person resource to send for a new entry. */
function buildPersonResource(personData: PersonData): Person {
  return {
    resourceType: 'Person',
    active: true,
    name: [
      {
        use: 'official',
        family: personData.lastName,
        given: [personData.firstName],
        text: `${personData.firstName} ${personData.lastName}`,
      },
    ],
    telecom: personData.telecom ?? [
      { system: 'email', value: personData.email, use: 'work' },
    ],
    ...(personData.identifier?.length ? { identifier: personData.identifier } : {}),
  };
}

/** Create a Person on a server. */
export async function createPersonResource(
  serverId: string,
  fhirVersion: string,
  personData: PersonData,
): Promise<PersonSummary> {
  const { writer } = await personClients(serverId, fhirVersion);
  const created = await writer.create(buildPersonResource(personData));
  return summarize(created);
}

/** Search for Persons on a server, across every page of results. */
export async function searchPersonResources(
  serverId: string,
  fhirVersion: string,
  searchParams: SearchPersonParams,
): Promise<PersonSummary[]> {
  const params: Record<string, string> = {};
  if (searchParams._id) params._id = searchParams._id;
  if (searchParams.name) params.name = searchParams.name;
  if (searchParams.identifier) params.identifier = searchParams.identifier;
  if (searchParams.email) params.telecom = `email|${searchParams.email}`;

  const { reader } = await personClients(serverId, fhirVersion);
  const persons = await reader.searchAll(params);
  return persons.map(summarize);
}

/** Read one Person by id. */
export async function getPersonResource(
  serverId: string,
  fhirVersion: string,
  personId: string,
): Promise<PersonSummary> {
  const { reader } = await personClients(serverId, fhirVersion);
  const person = await reader.read(logicalId(personId));
  return summarize(person);
}

/**
 * Read one Person with its links, mapped for the linking screens.
 *
 * A link whose target is not a Patient, Practitioner or RelatedPerson is dropped
 * rather than relabelled: the old mapping asserted the reference's first segment
 * to that union and defaulted a missing one to `Patient`, which showed a link to
 * something else as a link to a patient.
 */
export async function getPersonResourceFull(
  serverId: string,
  fhirVersion: string,
  personId: string,
  serverInfo: ServerInfo,
): Promise<PersonResource> {
  const id = logicalId(personId);
  const { reader } = await personClients(serverId, fhirVersion);
  const person = await reader.read(id);

  const links: CustomPersonLink[] = (person.link ?? []).flatMap((link, idx) => {
    const reference = link.target?.reference;
    const resourceType = reference?.split('/')[0];
    if (!reference || !isLinkedResourceType(resourceType)) return [];
    return [
      {
        id: `link-${idx}`,
        target: { resourceType, reference, display: link.target?.display },
        assurance: isAssuranceLevel(link.assurance) ? link.assurance : 'level1',
        created: new Date().toISOString(),
      },
    ];
  });

  return {
    id: person.id,
    display: formatHumanName(person.name),
    serverInfo,
    links,
  };
}

/** Replace a Person's links (read-modify-write). */
export async function updatePersonLinks(
  serverId: string,
  fhirVersion: string,
  personId: string,
  links: CustomPersonLink[],
): Promise<void> {
  const id = logicalId(personId);
  const { reader, writer } = await personClients(serverId, fhirVersion);

  const person = await reader.read(id);
  await writer.update({
    ...person,
    link: links.map((link) => ({
      target: { reference: link.target.reference, display: link.target.display },
      assurance: link.assurance,
    })),
  });
}
