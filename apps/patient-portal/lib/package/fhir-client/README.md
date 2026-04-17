# FHIR Client

Auto-generated type-safe FHIR client for TypeScript with SMART on FHIR authorization.

## Usage

### Basic CRUD Operations

```typescript
import { FhirClient } from './fhir-client';

const client = new FhirClient('https://your-fhir-server.com/fhir');

// Read a patient
const patient = await client.read().patient().read('patient-id');

// Search for patients
const bundle = await client.read().patient().search({
  name: 'John',
  birthdate: 'gt2000-01-01'
});

// Get all results (handles pagination)
const allPatients = await client.read().patient().searchAll({
  name: 'Smith'
});

// Create a patient
const newPatient = await client.write().patient().create({
  resourceType: 'Patient',
  name: [{ family: 'Doe', given: ['John'] }]
});

// Update a patient
const updated = await client.write().patient().update({
  ...patient,
  active: true
});

// Delete a patient
await client.write().patient().delete('patient-id');
```

### SMART on FHIR Authorization

The client includes full SMART App Launch Framework (v2) support with PKCE.

#### Quick Start — SmartFhirClient

```typescript
import { SmartFhirClient } from './fhir-client';

const smart = new SmartFhirClient({
  clientId: 'my-app',
  redirectUri: 'http://localhost:3000/callback',
  fhirBaseUrl: 'https://fhir.example.com/fhir',
  scopes: 'openid fhirUser patient/*.read',
});

// On page load — handle callback or start auth
if (smart.isCallback()) {
  await smart.handleCallback();
} else if (!smart.isAuthenticated()) {
  await smart.authorize(); // redirects to auth server
  return;
}

// All requests include the Bearer token automatically
const patient = await smart.read().patient().read('123');
const token = smart.getToken(); // access SmartToken
```

#### Advanced — SmartAuth + FhirClient

For more control, use `SmartAuth` directly with `FhirClient`:

```typescript
import { SmartAuth, FhirClient } from './fhir-client';

const auth = new SmartAuth({
  clientId: 'my-app',
  redirectUri: 'http://localhost:3000/callback',
  fhirBaseUrl: 'https://fhir.example.com/fhir',
  scopes: 'openid fhirUser patient/*.read launch/patient',
});

// Get an authenticated fetch function
const authFetch = auth.createAuthenticatedFetch();

// Pass it to FhirClient
const client = new FhirClient('https://fhir.example.com/fhir', authFetch);
```

#### EHR Launch

EHR launches are auto-detected from URL parameters (`launch` + `iss`):

```typescript
const smart = new SmartFhirClient({ ... });

// authorize() auto-detects and handles both modes
await smart.authorize();

// After callback
const mode = smart.getLaunchMode(); // "standalone" | "ehr"
const token = smart.getToken();
console.log('Patient context:', token?.patient);
console.log('Encounter context:', token?.encounter);
```

#### Token Management

```typescript
// Check authentication state
smart.isAuthenticated(); // boolean
smart.getToken();        // SmartToken | null
smart.getLaunchMode();   // "standalone" | "ehr"

// Logout
smart.logout();
```

### Bundle Parsing

```typescript
import { parseBundle } from './fhir-client';

// Parse a bundle returned from a search
const bundle = await client.read().patient().search({ name: 'Smith' });
const parser = parseBundle(bundle);

// Get all resources
const allResources = parser.getAllResources();

// Get resources of a specific type
const patients = parser.getResourcesByType('Patient');
const observations = parser.getResourcesByType('Observation');

// Get the first resource of a type
const firstPatient = parser.getFirstResourceByType('Patient');

// Filter resources with a custom predicate
const activePatients = parser.filterResources(
  (resource): resource is Patient => 
    resource.resourceType === 'Patient' && resource.active === true
);

// Group resources by type
const grouped = parser.groupByResourceType();
console.log(`Found ${grouped.get('Patient')?.length} patients`);

// Access bundle metadata
const total = parser.getTotal();
const nextUrl = parser.getNextUrl();
const hasMore = parser.hasNextPage();

// Get entries with full metadata (fullUrl, search scores, etc.)
const entries = parser.getAllEntries();
for (const entry of entries) {
  console.log(`Resource: ${entry.resource.resourceType}`);
  console.log(`Full URL: ${entry.fullUrl}`);
  console.log(`Search score: ${entry.search?.score}`);
}
```

### Custom Fetch

You can pass any custom fetch function to `FhirClient` — useful for logging, retries, or custom auth:

```typescript
import { FhirClient } from './fhir-client';

const loggingFetch: typeof fetch = async (input, init) => {
  console.log('Request:', input);
  const response = await fetch(input, init);
  console.log('Response:', response.status);
  return response;
};

const client = new FhirClient('https://fhir.example.com/fhir', loggingFetch);
```
