# Scope Management

The Scope Management section provides comprehensive tools for configuring FHIR resource permissions, creating role-based access templates, and managing granular data access control within the SMART on FHIR platform.

## 🎯 Scope Overview

### Understanding SMART Scopes
SMART scopes define what data an application can access and what operations it can perform. Scopes follow the pattern: `{context}/{resource}.{operations}`

#### Context Prefixes
- **patient/**: Access to resources where patient is the subject
- **user/**: Access to resources accessible by authenticated user  
- **system/**: Backend system access without user context
- **agent/**: Autonomous agent access for AI/ML systems

#### Resource Types
Common FHIR resources with scope support:
- **Patient**: Demographics and patient information
- **Observation**: Clinical observations and measurements
- **MedicationRequest**: Medication orders and prescriptions
- **DiagnosticReport**: Lab results and imaging reports
- **Condition**: Diagnoses and health conditions
- **Procedure**: Medical procedures and interventions
- **Encounter**: Healthcare encounters and visits
- **Practitioner**: Healthcare provider information

#### Operations
- **read**: Read access to specific resources
- **write**: Create and update resource capabilities
- **cruds**: Full Create, Read, Update, Delete, Search operations
- **search**: Search and query capabilities

## 📋 Scope Templates

### Pre-built Role Templates

#### Clinical Roles
- **👨‍⚕️ Primary Care Provider**
  - `user/Patient.read` - Patient demographics
  - `user/Observation.read` - Vital signs and lab results
  - `user/MedicationRequest.cruds` - Medication management
  - `user/Condition.cruds` - Diagnosis management
  - `user/DiagnosticReport.read` - Lab and imaging results

- **👩‍⚕️ Specialist Physician**
  - `user/Patient.read` - Patient information
  - `user/Observation.read` - Clinical observations
  - `user/Procedure.cruds` - Procedure documentation
  - `user/DiagnosticReport.read` - Diagnostic results
  - `user/CarePlan.cruds` - Treatment planning

- **👩‍⚕️ Registered Nurse**
  - `user/Patient.read` - Patient demographics
  - `user/Observation.cruds` - Vital signs and assessments
  - `user/MedicationAdministration.cruds` - Medication administration
  - `user/CarePlan.read` - Care plan review
  - `user/Task.cruds` - Nursing tasks and assignments

#### Administrative Roles
- **👨‍💼 Health Information Manager**
  - `user/Patient.read` - Patient directory access
  - `user/*.read` - Read access to all clinical data
  - `user/AuditEvent.read` - Access audit trails
  - `user/Organization.read` - Organizational information

- **📊 Clinical Researcher**
  - `user/Patient.read` - De-identified patient data
  - `user/Observation.read` - Research data access
  - `user/Condition.read` - Diagnosis information
  - `user/Procedure.read` - Procedure data
  - `user/MedicationRequest.read` - Medication data

### Custom Template Creation

#### Template Builder Interface
- **📛 Template Name**: Descriptive template identifier
- **📋 Description**: Template purpose and usage
- **🎯 Target Role**: Intended user role or job function
- **🏢 Organization**: Organizational scope and applicability

#### Scope Selection
- **🔍 Resource Browser**: Visual FHIR resource selection
- **⚙️ Operation Matrix**: Granular operation permissions
- **🎯 Context Assignment**: Context prefix configuration
- **✅ Validation**: Scope combination validation

#### Template Testing
- **🧪 Dry Run**: Test scope combinations
- **📊 Access Simulation**: Simulate user access patterns
- **🔍 Permission Audit**: Review effective permissions
- **📋 Compliance Check**: Regulatory compliance validation

## 🔐 Granular Permissions

### Resource-Level Permissions

#### Patient Data Access
- **patient/Patient.read**: Patient's own demographic data
- **patient/Observation.read**: Patient's clinical observations
- **patient/MedicationRequest.read**: Patient's medication orders
- **patient/AllergyIntolerance.read**: Patient's allergy information
- **patient/Immunization.read**: Patient's immunization records

#### Provider Workflow Permissions
- **user/Patient.search**: Search patient directory
- **user/Encounter.read**: Access patient encounters
- **user/CareTeam.read**: View care team assignments
- **user/Schedule.read**: Access scheduling information
- **user/Appointment.cruds**: Manage appointments

#### System Integration Permissions
- **system/Patient.read**: System-wide patient access
- **system/Bundle.read**: FHIR bundle operations
- **system/OperationOutcome.read**: Operation result access
- **system/AuditEvent.cruds**: Audit event management

### Operation-Specific Controls

#### Read Operations
- **Basic Read**: Single resource retrieval by ID
- **Search**: Resource search with query parameters
- **History**: Resource version history access
- **Include**: Related resource inclusion in queries

#### Write Operations  
- **Create**: New resource creation
- **Update**: Existing resource modification
- **Patch**: Partial resource updates
- **Delete**: Resource deletion (soft or hard delete)

#### Advanced Operations
- **Validate**: Resource validation operations
- **Transform**: Data transformation operations
- **Export**: Bulk data export capabilities
- **Import**: Bulk data import operations

## 🏢 Organizational Scope Management

### Multi-Tenant Support

#### Organization Hierarchies
- **🏥 Health System**: Top-level health system permissions
- **🏢 Hospital**: Hospital-specific data access
- **🏪 Clinic**: Clinic or department-level permissions
- **👥 Unit**: Specific unit or team permissions

#### Inheritance Models
- **⬇️ Cascading**: Permissions cascade down hierarchy
- **🔒 Isolated**: Each level maintains separate permissions
- **🔄 Hybrid**: Mixed inheritance and isolation models
- **🎯 Custom**: Organization-defined inheritance rules

### Geographic and Legal Boundaries

#### Regional Compliance
- **🌍 GDPR**: European data protection compliance
- **🇺🇸 HIPAA**: US healthcare privacy requirements
- **🇨🇦 PIPEDA**: Canadian privacy legislation
- **🌏 Local Laws**: Country-specific requirements

#### Cross-Border Data Access
- **🌐 Data Residency**: Geographic data storage requirements
- **🔒 Encryption**: Cross-border data encryption
- **📋 Consent**: Patient consent for data sharing
- **🛡️ Security**: Additional security measures

## 📊 Scope Analytics and Monitoring

### Usage Analytics

#### Permission Utilization
- **📊 Access Patterns**: Most/least used permissions
- **👥 User Activity**: Per-user permission usage
- **📱 Application Usage**: App-specific scope utilization
- **⏰ Temporal Patterns**: Time-based access patterns

#### Security Monitoring
- **🚨 Violations**: Scope violation attempts
- **❌ Denied Access**: Permission denial tracking
- **🔍 Anomalies**: Unusual access pattern detection
- **📋 Audit Trails**: Comprehensive access logging

### Compliance Reporting

#### Access Reviews
- **📅 Periodic Reviews**: Regular permission reviews
- **👥 User Certification**: User access certification
- **📊 Compliance Reports**: Regulatory compliance reporting
- **🔍 Risk Assessment**: Permission-based risk analysis

#### Change Management
- **📋 Change Logs**: Permission modification history
- **✅ Approval Workflows**: Change approval processes
- **🧪 Testing**: Permission change testing
- **📊 Impact Analysis**: Change impact assessment

## 🛠️ Scope Administration

### Template Management

#### Template Lifecycle
- **➕ Creation**: New template development
- **🧪 Testing**: Template validation and testing
- **🚀 Deployment**: Template activation and assignment
- **🔄 Updates**: Template modification and versioning
- **🗄️ Archival**: Template retirement and archival

#### Version Control
- **📊 Versioning**: Template version management
- **🔄 Migration**: User migration to new versions
- **📋 Rollback**: Revert to previous template versions
- **📊 Comparison**: Template version comparison

### User Assignment

#### Assignment Methods
- **👤 Individual**: Direct user assignment
- **👥 Group**: Group-based assignment
- **🎯 Role**: Role-based assignment
- **🤖 Automatic**: Rule-based automatic assignment

#### Assignment Validation
- **✅ Compatibility**: User role compatibility check
- **🔍 Conflicts**: Permission conflict detection
- **📋 Requirements**: Minimum permission validation
- **🛡️ Security**: Security policy compliance

## 🔍 Troubleshooting

### Common Scope Issues

#### Permission Conflicts
- **🚨 Overlapping Scopes**: Conflicting permission combinations
- **❌ Insufficient Access**: Missing required permissions
- **🔒 Over-Privileged**: Excessive permission grants
- **🎯 Misaligned Context**: Incorrect context prefix usage

#### Application Integration
- **📱 App Registration**: Application scope configuration
- **🔐 OAuth Flow**: Authorization scope handling
- **🎯 Launch Context**: Context-scope alignment
- **📊 Resource Access**: FHIR resource accessibility

### Diagnostic Tools

#### Scope Validators
- **✅ Syntax Check**: Scope syntax validation
- **🔍 Compatibility**: FHIR version compatibility
- **📋 Standards**: SMART specification compliance
- **🛡️ Security**: Security best practice validation

#### Access Simulators
- **🧪 User Simulation**: Simulate user access scenarios
- **📱 App Testing**: Test application access patterns
- **🎯 Context Testing**: Launch context simulation
- **📊 Permission Testing**: Effective permission verification

## 📈 Best Practices

### Scope Design Principles
1. **🎯 Least Privilege**: Grant minimum necessary permissions
2. **🔒 Defense in Depth**: Multiple permission layers
3. **📋 Clear Documentation**: Document scope purposes
4. **🧪 Regular Testing**: Validate scope effectiveness

### Template Management
1. **🎯 Role Alignment**: Align templates with job functions
2. **🔄 Regular Review**: Periodic template review and updates
3. **📊 Usage Monitoring**: Track template utilization
4. **🛡️ Security Focus**: Prioritize security in template design

### Compliance Management
1. **📋 Documentation**: Maintain comprehensive documentation
2. **🔍 Regular Audits**: Conduct permission audits
3. **📊 Reporting**: Generate compliance reports
4. **🔄 Continuous Improvement**: Iteratively improve processes

The Scope Management system provides the foundation for secure, compliant, and efficient data access control within the SMART on FHIR healthcare ecosystem.

## Related Sub-Tabs

The **SMART Config** page in the admin UI contains three sub-tabs:

- **Scopes** — Scope configuration (documented above)
- **Launch Context** — Per-user SMART launch context management. See the dedicated [Launch Context](launch-context) page.
- **Protocol Mappers** — Diagnostic view and repair tool for SMART scope protocol mappers in Keycloak. Lists all configured mappers, detects issues, and provides a one-click fix action via `POST /admin/scope-mappers/fix`.

