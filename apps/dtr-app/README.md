# Proxy Smart DTR App

Da Vinci DTR (Documentation Templates & Rules) — a SMART on FHIR app for prior authorization documentation, questionnaire rendering, and PAS (Prior Authorization Support) claim submission.

## BabelFHIR-TS in Action

This app is a real-world demonstration of [BabelFHIR-TS](https://github.com/Max-Health-Inc/BabelFHIR-TS) — a code generator that converts FHIR Implementation Guide (IG) profiles into **type-safe TypeScript interfaces** with built-in validation.

### The Problem

FHIR R4 base types (`Claim`, `ClaimResponse`, `Coverage`, etc.) are generic — they represent every possible shape a resource could take. But Da Vinci PAS [IG 2.0.1](http://hl7.org/fhir/us/davinci-pas/STU2/) constrains those resources heavily:

- A `PASClaim` must have `status: "active"`, `use: "preauthorization"`, required `identifier[]`, and items with specific extension structures
- A `PASClaimResponse` requires `status: "active"`, `use: "preauthorization"`, with adjudication items carrying review action extensions
- `PASCoverage` locks `status: "active"` and mandates `payor`, `relationship`, and `subscriber` as Must Support

Without BabelFHIR-TS, developers either:
1. **Use raw `fhir/r4` types** — no compiler help, profile violations caught only at runtime (or worse, by the payer)
2. **Hand-write profile interfaces** — tedious, error-prone, drifts from the IG spec

### The Solution

One command generates the entire PAS type system:

```bash
npx babelfhir-ts install hl7.fhir.us.davinci-pas@2.0.1
```

This produces `hl7.fhir.us.davinci-pas-generated` — a local npm package with **150+ TypeScript interfaces**, runtime validators, and helper classes covering every profile in the IG.

### How This App Uses It

#### Type-Safe Claim Construction (`pas-builder.ts`)

The claim builder returns `PASClaim` instead of a generic `Claim`. The compiler enforces PAS constraints at build time:

```typescript
import type { PASClaim } from "hl7.fhir.us.davinci-pas-generated"

export function buildPasClaim({ patient, service }): PASClaim {
  // TypeScript enforces:
  //   - status MUST be "active" (not "draft", "cancelled", etc.)
  //   - use MUST be "preauthorization"
  //   - identifier[] is required (not optional like base Claim)
  //   - item[].productOrService requires data-absent-reason coding
  //   - item[].category is required (optional in base Claim)
  const claim: PASClaim = {
    resourceType: "Claim",
    status: "active",         // ← literal type, not string
    use: "preauthorization",  // ← literal type, not string
    identifier: [{ system: "...", value: crypto.randomUUID() }],
    // ...
  }
  return claim
}
```

Try changing `status: "active"` to `status: "draft"` — the compiler rejects it immediately.

#### FHIR Client with PAS Types (`fhir-client.ts`)

The FHIR client uses PAS-profiled types for every PAS-relevant operation:

```typescript
import type {
  PASClaim, PASCoverage, PASOrganization,
  PASServiceRequest, PASBeneficiary, PASInsurer,
  PASRequestBundle, PASResponseBundle,
  // ... 13 PAS types total
} from "hl7.fhir.us.davinci-pas-generated"
import type { PASClaimResponse } from "hl7.fhir.us.davinci-pas-generated/PASClaimResponse"

// Submit returns PASClaimResponse with typed adjudication + review actions
export async function submitClaim(claim: PASClaim): Promise<PASClaimResponse> { ... }

// Coverage search returns PASCoverage (status locked to "active", payor required)
export async function searchCoverage(patientId: string): Promise<PASCoverage[]> { ... }

// Organization fetch returns PASOrganization (active + name are required)
export async function getOrganization(id: string): Promise<PASOrganization> { ... }
```

Generic EHR resources (`Patient`, `Questionnaire`, `Condition`) correctly stay as base `fhir/r4` types — they aren't PAS-profiled.

#### Compile-Time IG Compliance

The PAS IG requires `item[].productOrService` to use a specific `data-absent-reason` coding, with the actual service code in an extension. BabelFHIR-TS enforces this:

```typescript
// This is the ONLY shape the compiler accepts for productOrService:
productOrService: {
  coding: [{
    system: "http://terminology.hl7.org/CodeSystem/data-absent-reason",  // ← literal
    code: "not-applicable",  // ← literal
  }],
},
// Real service code goes in the extension (PAS IG pattern):
extension: [{
  url: "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-requestedService",
  valueReference: { display: "99213 - Office Visit" },
}],
```

Without generated types, nothing stops you from putting a CPT code directly in `productOrService` — which would be rejected by a PAS-compliant payer.

### What You Get

| Capability | Without BabelFHIR-TS | With BabelFHIR-TS |
|---|---|---|
| Profile constraints | Runtime errors from payer | Compile-time type errors |
| Required fields | Easy to forget, silent failures | Compiler enforces them |
| Literal value types | `status: string` | `status: "active"` |
| Extension patterns | No guidance, manual wiring | Typed extension interfaces |
| IG version tracking | Manual, error-prone | Package versioned to IG (2.0.1) |
| Onboarding | Read the IG spec | Read the types |

### Generated Package Contents

The `hl7.fhir.us.davinci-pas-generated@2.0.1` package includes:

- **150+ TypeScript interfaces** — one per profile, extension, and backbone element
- **Runtime validators** — `validatePASClaim(resource)` returns `{ errors, warnings }`
- **Helper classes** — `PASClaimClass`, `PASClaimResponseClass` for building resources programmatically
- **Value set enums** — coded types like `X12278DiagnosisTypeCode`, `X12278RequestedServiceTypeCode`
- **FHIR client stubs** — `FhirClient`, `FhirReadClient`, `FhirWriteClient` for typed FHIR operations

## Stack

- **React 19** + **TypeScript 5.9** + **Vite 8**
- **shadcn/ui** component library
- **SMART on FHIR** launch via Proxy Smart backend
- **fhir/r4** for base FHIR types
- **hl7.fhir.us.davinci-pas-generated** for PAS profile types (generated by BabelFHIR-TS)

## Development

```bash
# Install dependencies
bun install

# Generate PAS types from the IG (requires babelfhir-ts)
npx babelfhir-ts install hl7.fhir.us.davinci-pas@2.0.1

# Start dev server
bun dev

# Type-check
npx tsc --noEmit
```
