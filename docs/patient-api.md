# Patient API

The Patient API provides SMART-authenticated endpoints for patient-facing applications. These endpoints use the patient's own access token (obtained via SMART App Launch) and are separate from the admin API.

## Base Path

All patient API endpoints are under `/api/`.

## Document Import

**`POST /api/document-import/`**

Converts a PDF document into validated FHIR resources using OCR and AI extraction.

### Request

- **Authentication**: Bearer token (SMART access token)
- **Content-Type**: `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | File | PDF document to import (must be `application/pdf`) |
| `patientId` | string | FHIR Patient ID to associate extracted resources with |
| `engine` | string | OCR engine to use (optional) |

### Response

```json
{
  "success": true,
  "resources": [
    {
      "resourceType": "Observation",
      "resource": { /* validated FHIR resource */ },
      "retriesNeeded": 0,
      "warnings": []
    }
  ],
  "failed": [
    {
      "resourceType": "MedicationRequest",
      "errors": ["Validation error details"],
      "warnings": [],
      "retriesAttempted": 3
    }
  ],
  "processingTimeMs": 4523
}
```

### Workflow

1. Patient uploads a PDF (lab results, discharge summary, etc.) through the Patient Portal
2. Backend extracts text via OCR
3. AI generates structured FHIR resources from the extracted text
4. BabelFHIR-TS validates each resource against FHIR profiles (with retries)
5. Validated resources are returned for patient review in the `ResourceReviewCard` component
6. Patient confirms and the portal POSTs resources through the FHIR proxy

### Security

- The token's patient claim is checked against the requested `patientId`
- Resources are only *returned* for review — the patient portal must separately POST them through the FHIR proxy, which enforces scope, consent, and audit controls
- Requires AI to be configured (`OPENAI_API_KEY`)

## Patient Scribe

**`POST /api/patient-scribe/`**

Converts free-text descriptions into validated FHIR resources using AI.

### Request

- **Authentication**: Bearer token (SMART access token)
- **Content-Type**: `application/json`

| Field | Type | Description |
|---|---|---|
| `text` | string | Free text describing symptoms, medications, etc. (max 50,000 chars) |
| `patientId` | string | FHIR Patient ID to associate resources with |

### Response

Same format as Document Import — returns validated and failed resources with processing time.

### Use Cases

- Patient describes symptoms in their own words → AI generates Condition and Observation resources
- Patient lists current medications → AI generates MedicationStatement resources
- Patient enters allergy information → AI generates AllergyIntolerance resources

### Security

- Same token validation as Document Import
- Text input is length-limited (50,000 characters)
- Requires AI to be configured (`OPENAI_API_KEY`)

## Admin Document Import

**`POST /admin/document-import/`**

Admin-authenticated version of the document import pipeline. Uses admin bearer token instead of SMART patient token. Available for administrative bulk import workflows.
