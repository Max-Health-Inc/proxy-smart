# Proxy Smart Agent Support

This implementation provides comprehensive support for SMART on FHIR "agent" scopes, which represent autonomous agents (AI systems, robots, automated decision tools) acting as independent entities rather than on behalf of users.

## Agent vs Other Scope Contexts

### Scope Contexts Overview

- **`patient/`** - Access to resources where the patient is the subject (interactive user login)
- **`user/`** - Access to resources accessible by the current authenticated user (interactive user login)
- **`system/`** - Backend system access without user context (server-to-server, deterministic)
- **`agent/`** - Autonomous agent access without user interaction (non-deterministic, self-initiated)

### Key Differences

| Context              | Who Acts                   | Identity Source                     | User Interaction            | Behavior                    | Use Case                                          |
| -------------------- | -------------------------- | ----------------------------------- | --------------------------- | --------------------------- | ------------------------------------------------- |
| `patient/`         | User on behalf of patient  | User identity + patient context     | **Interactive login** | User-driven                 | Patient portals, patient-facing apps              |
| `user/`            | Authenticated user         | User identity (Practitioner/Person) | **Interactive login** | User-driven                 | Clinician workflows, admin tools                  |
| `system/`          | System/server              | Client credentials                  | **No login screen**   | **Deterministic**     | Backend integrations, scheduled jobs              |
| **`agent/`** | **Autonomous agent** | **Device resource**           | **No login screen**   | **Non-deterministic** | **AI assistants, robots, autonomous tools** |

### Critical Distinction: System vs Agent

**Backend Service (`system/`):**

- Predictable, scheduled operations
- Deterministic workflows (e.g., nightly data sync)
- Human-programmed logic
- No real-time decision making

**Autonomous Agent (`agent/`):**

- Self-initiated actions based on environmental triggers
- Non-deterministic behavior (AI/ML decisions)
- Real-time autonomous responses
- Independent decision-making capabilities

## OAuth Flow Comparison

### Interactive Flows (patient/, user/)

```bash
# 1. User visits app → redirected to authorization server
# 2. User login screen → username/password
# 3. User consent screen → approve scopes  
# 4. Redirect back to app with authorization code
# 5. App exchanges code for access token
```

### Backend Service Flow (system/)

```bash
# 1. Scheduled job triggers
# 2. App authenticates directly with client credentials
# 3. No user interaction, no redirect URI
# 4. Deterministic, predictable operation
POST /oauth/token
{
  "grant_type": "client_credentials",
  "client_assertion": "eyJ...", # Private key JWT
  "scope": "system/Patient.read"
}
```

### Agent Flow (agent/)

```bash
# 1. Environmental trigger detected (e.g., patient vitals alarm)
# 2. Agent autonomously decides to act
# 3. App authenticates with client credentials + device context
# 4. No user interaction, no redirect URI  
# 5. Non-deterministic, AI-driven operation
POST /oauth/token
{
  "grant_type": "client_credentials", 
  "client_assertion": "eyJ...", # Private key JWT
  "scope": "agent/Patient.read agent/Encounter.create",
  "device_identifier": "emergency-robot-42",
  "trigger_context": "patient-alarm-critical-vitals"
}
```

## Agent Identity Requirements

### Dynamic fhirUser Resolution

Unlike user-based flows where `fhirUser` references a Practitioner, agent flows require **dynamic Device resolution** during authorization:

```json
// Token request includes client authentication + optional device info
POST /oauth/token
{
  "grant_type": "client_credentials",
  "client_assertion": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
  "scope": "agent/Patient.read agent/CarePlan.create",
  "device_identifier": "serial-12345", // Optional: specific device instance
  "deployment_context": "hospital-east-wing-room-201" // Optional: deployment info
}

// Authorization server dynamically determines Device and issues token:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
  "token_type": "Bearer",
  "scope": "agent/Patient.read agent/CarePlan.create",
  "fhirUser": "Device/ai-clinical-assistant-instance-42" // DYNAMICALLY ASSIGNED
}
```

### Authorization Server Logic

The authorization server must implement logic to:

1. **Authenticate the client** using asymmetric keys
2. **Identify the specific agent instance** via:
   - Device serial numbers
   - Deployment context
   - Network location
   - Certificate-based device identity
3. **Locate or create** the corresponding Device resource
4. **Validate requested scopes** against Device capabilities
5. **Issue token** with appropriate `fhirUser` reference

### Client Registration vs. Runtime Identity

**Client Registration (Static):**

- Client ID: `ai-clinical-assistant`
- Allowed scopes: `agent/Patient.read`, `agent/CarePlan.create`
- Authentication method: Private Key JWT
- **NO static fhirUser** ❌

**Runtime Token (Dynamic):**

- Specific Device instance determined during auth flow
- `fhirUser`: `Device/ai-assistant-deployment-east-wing-3`
- Scopes validated against this specific Device's capabilities

### Device Resource Requirements

The referenced Device resource should include:

```json
{
  "resourceType": "Device",
  "id": "autonomous-agent-123",
  "status": "active",
  "type": {
    "coding": [{
      "system": "http://snomed.info/sct",
      "code": "706689003",
      "display": "Artificial intelligence"
    }]
  },
  "version": [
    {
      "type": {
        "coding": [{
          "system": "http://terminology.hl7.org/CodeSystem/device-version-type",
          "code": "software-version"
        }]
      },
      "value": "v2.1.0"
    }
  ],
  "property": [
    {
      "type": {
        "coding": [{
          "system": "http://terminology.hl7.org/CodeSystem/device-property-type", 
          "code": "capability"
        }]
      },
      "valueCode": [{
        "coding": [{
          "system": "http://example.com/agent-capabilities",
          "code": "clinical-decision-support"
        }]
      }]
    }
  ],
  "owner": {
    "reference": "Organization/healthcare-system-1",
    "display": "General Hospital System"
  }
}
```

## Example Agent Applications

### 1. Clinical Decision Support AI

**Client Registration:**

```javascript
{
  name: "Autonomous Clinical AI Agent",
  clientId: "ai-clinical-assistant",
  scopes: [
    "agent/Patient.read",
    "agent/Observation.read", 
    "agent/Condition.read",
    "agent/MedicationRequest.read",
    "agent/CarePlan.create",
    "agent/RiskAssessment.create"
  ],
  // NO static fhirUser - determined dynamically
}
```

**Runtime Token Example:**

```json
{
  "iss": "https://auth.hospital.com",
  "sub": "ai-clinical-assistant",
  "fhirUser": "Device/ai-assistant-icu-deployment-3", // Dynamic!
  "scope": "agent/Patient.read agent/Observation.read agent/CarePlan.create"
}
```

### 2. Emergency Response Robot

**Client Registration:**

```javascript
{
  name: "Emergency Response Robots",
  clientId: "emergency-response-fleet",
  scopes: [
    "agent/Patient.read",
    "agent/Encounter.create",
    "agent/Observation.create",
    "agent/AllergyIntolerance.read"
  ]
}
```

**Runtime Token (Specific Robot):**

```json
{
  "fhirUser": "Device/emergency-robot-unit-42", // Specific robot instance
  "scope": "agent/Patient.read agent/Encounter.create",
  "device_serial": "ER-ROBOT-042",
  "deployment_location": "hospital-parking-lot-sector-c"
}
```

## Security Considerations

### Authentication for Agents

Agents should use **asymmetric client authentication** (private key JWT) rather than client secrets for enhanced security, as they may operate in diverse or remote environments.

### Audit and Provenance

All resources created or modified by agents should include appropriate:

- **Provenance** resources linking actions to the Device
- **AuditEvent** resources for security monitoring
- **Meta.tag** indicating agent-generated content

### Scope Limitations

Agent scopes should follow the principle of least privilege:

- Grant only the minimum necessary permissions
- Consider time-limited tokens for active operations
- Implement regular scope review processes

## Implementation Notes

### UI Support

The admin interface provides:

- Agent-specific scope templates
- Visual indicators for agent applications
- Device identity validation hints
- Agent capability descriptions

### Scope Validation

The system validates that:

- Agent scopes use proper `agent/` prefix
- fhirUser references are valid Device resources
- Requested permissions align with Device capabilities

## Standards Compliance

This implementation follows:

- **SMART App Launch Framework** v2.0+ agent scope specifications
- **FHIR R4/R5** Device resource requirements
- **OAuth 2.0** security best practices for autonomous systems
- **HL7 FHIR** Provenance and AuditEvent patterns

## Future Enhancements

Planned improvements include:

- **Device capability validation** - Automatic scope restriction based on Device.property
- **Agent certification tracking** - Integration with device certification systems
- **Cross-organization agent identity** - Support for federated agent authentication
- **Agent behavior monitoring** - Enhanced audit trails and performance metrics
