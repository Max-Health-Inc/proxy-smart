# FHIR Servers

Configure upstream FHIR servers that the proxy routes requests to. Each registered server gets a proxy path at `/proxy-smart-backend/{server_name}/{fhir_version}/`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/fhir-servers/` | List all registered FHIR servers |
| POST | `/fhir-servers/` | Add a new FHIR server |
| GET | `/fhir-servers/:server_id` | Get server details + proxy URLs |
| PUT | `/fhir-servers/:server_id` | Update server name/URL |
| DELETE | `/fhir-servers/:server_id` | Remove a FHIR server |
| POST | `/fhir-servers/:server_id/refresh` | Re-fetch server metadata |
| PATCH | `/fhir-servers/:server_id/strict-capabilities` | Toggle strict CapabilityStatement enforcement |
| PATCH | `/fhir-servers/:server_id/mcp` | Toggle per-server MCP endpoint |

## mTLS Configuration

For servers that require mutual TLS (client certificates):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/fhir-servers/:server_id/mtls` | Get current mTLS config |
| PUT | `/fhir-servers/:server_id/mtls` | Enable/disable mTLS |
| POST | `/fhir-servers/:server_id/mtls/certificates` | Upload client certificate |

## Adding a Server

Minimum required fields:

- **Name** -- unique identifier used in proxy URLs (e.g., `hapi-fhir`)
- **Base URL** -- upstream FHIR server endpoint (e.g., `http://hapi-fhir:8080/fhir`)
- **FHIR Version** -- `R4`, `R5`, etc.

On creation, the backend fetches the server's `CapabilityStatement` to discover supported resources and operations.

## Proxy URL Structure

Once registered, the server is accessible through the proxy at:

```
/{backend-name}/{server_name}/{fhir_version}/{resource}
```

Example: `/proxy-smart-backend/hapi-fhir/R4/Patient/123`

All requests through the proxy pass through the authorization pipeline (token validation, scope enforcement, consent checks).

## Strict Capabilities

When enabled, the proxy rejects requests for resources or interactions not declared in the server's `CapabilityStatement`. Toggle via `PATCH /fhir-servers/:server_id/strict-capabilities`.

## DICOM Servers

PACS/DICOMweb servers are managed separately:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/dicom-servers/` | List DICOM servers |
| POST | `/admin/dicom-servers/` | Add DICOM server |
| GET | `/admin/dicom-servers/:server_id` | Get details |
| PUT | `/admin/dicom-servers/:server_id` | Update |
| DELETE | `/admin/dicom-servers/:server_id` | Remove |
| GET | `/admin/dicom-servers/:server_id/status` | Probe reachability |
| GET | `/admin/dicom-servers/viewer-app` | Get configured viewer app |
| PUT | `/admin/dicom-servers/viewer-app` | Set viewer app |

## Related

- [FHIR Proxy](../fhir-proxy.md) -- the request pipeline that processes proxied requests
- [SMART Apps](./smart-apps.md) -- apps that access FHIR servers through the proxy
- [Scope Management](./scope-management.md) -- scopes enforced at the proxy layer
- **🔄 Sync**: Data synchronization problems

### Diagnostic Tools

#### Built-in Diagnostics
- **🔍 Connection Test**: Basic connectivity testing
- **📋 Capability Check**: FHIR capability validation
- **🧪 Sample Queries**: Test search and read operations
- **📊 Performance Test**: Response time measurement

#### External Tools
- **🌐 Ping/Traceroute**: Network connectivity testing
- **🔒 SSL Labs**: SSL/TLS configuration analysis
- **📊 Load Testing**: Performance and capacity testing
- **🔍 FHIR Validators**: FHIR compliance validation

## 📈 Analytics and Reporting

### Usage Analytics
- **📊 Request Volume**: API call volume over time
- **👥 User Activity**: User access patterns
- **📱 Application Usage**: SMART app server usage
- **🔍 Search Patterns**: Common search operations

### Performance Reports
- **⚡ Response Times**: Performance trend analysis
- **✅ Availability**: Uptime and reliability reports
- **❌ Error Analysis**: Error pattern and resolution
- **📊 Capacity Planning**: Resource utilization trends

### Compliance Reporting
- **📋 Audit Trails**: Complete access logging
- **🔒 Security Events**: Security-related activities
- **📊 Usage Reports**: Compliance and usage reporting
- **📈 Trend Analysis**: Long-term usage patterns

## 🎯 Best Practices

### Server Configuration
1. **🔒 Security First**: Always use HTTPS and strong authentication
2. **📊 Monitor Continuously**: Implement comprehensive health monitoring
3. **🧪 Test Thoroughly**: Validate all configuration changes
4. **📋 Document Everything**: Maintain detailed configuration documentation

### Performance Optimization
1. **⚡ Connection Pooling**: Use efficient connection management
2. **💾 Caching**: Implement appropriate caching strategies
3. **🔄 Load Balancing**: Distribute load across multiple servers
4. **📊 Monitoring**: Track performance metrics continuously

### Security Management
1. **🔑 Credential Rotation**: Regular credential updates
2. **🔒 Certificate Management**: Proper SSL/TLS certificate handling
3. **🛡️ Access Control**: Implement principle of least privilege
4. **📋 Audit Logging**: Comprehensive security event logging

The FHIR Servers management system provides the foundation for secure, reliable, and performant healthcare data integration within the SMART on FHIR ecosystem.
