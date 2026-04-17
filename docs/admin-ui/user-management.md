# User Management

The User Management section provides comprehensive tools for managing healthcare users within the SMART on FHIR platform. This includes user registration, FHIR resource associations, permissions, and lifecycle management.

## 👥 User Overview

### Healthcare User Types
The platform supports different types of healthcare users:

- **👨‍⚕️ Practitioners**: Doctors, nurses, clinicians
- **👨‍💼 Administrative Staff**: Hospital administrators, IT staff
- **🤖 System Users**: Service accounts for automated processes
- **👤 External Users**: Vendors, partners with limited access

### User States
- **🟢 Active**: User can authenticate and access systems
- **🟡 Pending**: Account created but not yet activated
- **🔴 Inactive**: Account disabled or suspended
- **⚪ Archived**: Historical record, no longer active

## 📝 User Registration

### Adding New Users

#### Basic Information
- **Personal Details**: First name, last name, email address
- **Professional Info**: Title, department, organization
- **Contact Information**: Phone, office location, extension
- **Authentication**: Username, temporary password settings

#### Account Configuration
- **Status**: Set initial account state (active/pending)
- **Permissions**: Assign role-based access levels
- **Expiration**: Set account validity period if needed
- **Notifications**: Configure email and system notifications

### Bulk User Import
- **CSV Upload**: Import multiple users from spreadsheet
- **LDAP Integration**: Sync with existing directory services
- **API Import**: Programmatic user creation via REST API
- **Template Based**: Use predefined user templates

## 🏥 FHIR Person Associations

### Understanding FHIR Person Resources
Each healthcare user can be associated with FHIR Person resources across multiple FHIR servers. This enables:
- Clinical data attribution
- Cross-server identity linking
- Audit trail maintenance
- Consistent user representation

### Managing Associations

#### Adding FHIR Associations
1. **Select User**: Choose user from the management table
2. **Choose Server**: Select target FHIR server
3. **Search/Create**: Find existing Person or create new
4. **Validate**: Confirm Person resource details
5. **Associate**: Link user to FHIR Person resource

#### Association Details
- **Person ID**: FHIR resource identifier
- **Server**: Which FHIR server hosts the resource
- **Created Date**: When association was established
- **Last Verified**: Last validation check
- **Status**: Active, pending, or error state

#### Multi-Server Support
Users can have Person resources on multiple FHIR servers:
- Primary association for main clinical data
- Secondary associations for specialized systems
- Cross-reference capabilities for data correlation
- Unified identity across healthcare ecosystem

## 🔐 User Permissions and Roles

### Role-Based Access Control (RBAC)
The platform implements comprehensive RBAC:

#### Administrator Roles
- **🔑 Super Admin**: Full platform access and configuration
- **👨‍💼 System Admin**: User and system management
- **🏥 Clinical Admin**: Healthcare-specific administration
- **📊 Analytics Admin**: Reporting and monitoring access

#### User Roles
- **👨‍⚕️ Clinician**: Clinical application access
- **📝 Data Entry**: Limited data input permissions
- **👁️ Read Only**: View-only access to specific resources
- **🔍 Auditor**: Audit trail and compliance review access

#### Custom Roles
- Create organization-specific roles
- Define granular permissions per role
- Assign multiple roles to single user
- Time-based role assignments

### Permission Matrix
Detailed permissions grid covering:
- **FHIR Resources**: Patient, Observation, etc.
- **Operations**: Create, Read, Update, Delete, Search
- **Scopes**: System, user, patient context access
- **Administrative**: User management, configuration

## 📊 User Analytics and Monitoring

### User Activity Tracking
- **Login History**: Authentication logs and patterns
- **Application Usage**: Which SMART apps users access
- **Data Access**: FHIR resource interactions
- **Session Management**: Active sessions and timeouts

### Compliance Reporting
- **Access Logs**: Detailed audit trails
- **Permission Changes**: History of role modifications
- **Data Downloads**: Tracking of sensitive data access
- **Violation Alerts**: Unauthorized access attempts

### Performance Metrics
- **Login Success Rates**: Authentication failure analysis
- **Session Duration**: Average user session lengths
- **Feature Usage**: Most/least used platform features
- **Error Patterns**: Common user error scenarios

## 🔄 User Lifecycle Management

### Account Activation
- **Email Verification**: Secure account activation process
- **Temporary Passwords**: System-generated secure passwords
- **First Login Setup**: Mandatory password change
- **Profile Completion**: Required information gathering

### Password Management
- **Policy Enforcement**: Strong password requirements
- **Reset Capabilities**: Self-service password reset
- **Expiration Handling**: Automatic password aging
- **Multi-Factor Authentication**: 2FA/MFA integration

### Account Maintenance
- **Profile Updates**: Self-service profile management
- **Permission Reviews**: Regular access certification
- **Account Cleanup**: Automated inactive account handling
- **Data Retention**: Compliance with retention policies

### Account Termination
- **Graceful Deactivation**: Preserving audit trails
- **Data Archival**: Secure historical data retention
- **Access Revocation**: Immediate permission removal
- **Cleanup Procedures**: System-wide account cleanup

## 🔍 Search and Filtering

### Advanced Search Capabilities
- **Text Search**: Name, email, username matching
- **Filter Options**: Status, role, department, creation date
- **FHIR Associations**: Search by server or Person ID
- **Activity Filters**: Last login, recent activity patterns

### Sorting and Organization
- **Column Sorting**: Sortable by any user attribute
- **Custom Views**: Save frequently used filter combinations
- **Export Options**: CSV, PDF report generation
- **Bulk Operations**: Multi-user actions

## 🚨 Security and Compliance

### Security Features
- **Account Lockout**: Brute force protection
- **IP Restrictions**: Geographic and network-based limits
- **Device Management**: Trusted device registration
- **Session Security**: Secure session handling

### Compliance Support
- **HIPAA Compliance**: Healthcare data protection
- **GDPR Support**: Data privacy and right to erasure
- **Audit Requirements**: Comprehensive logging
- **Access Certification**: Regular permission reviews

### Data Protection
- **Encryption**: All user data encrypted at rest
- **Secure Transmission**: TLS for all communications
- **Data Minimization**: Collect only necessary information
- **Anonymization**: Privacy-preserving analytics

## 🛠️ Integration Capabilities

### External Systems
- **LDAP/AD Integration**: Directory service synchronization
- **SAML/OIDC**: Federated identity management
- **HR Systems**: Employee database integration
- **Badge Systems**: Physical access correlation

### API Access
- **REST API**: Programmatic user management
- **Webhooks**: Real-time user event notifications
- **Bulk Operations**: API-based mass user updates
- **Synchronization**: Two-way data sync capabilities

## 📱 Mobile Support

### Mobile-Optimized Interface
- **Responsive Design**: Optimized for all screen sizes
- **Touch-Friendly**: Mobile-first interaction design
- **Offline Capability**: Limited offline functionality
- **Push Notifications**: Mobile alert delivery

## 🎯 Best Practices

### User Onboarding
1. **Pre-registration**: Collect requirements before account creation
2. **Role Assignment**: Assign minimal necessary permissions initially
3. **Training**: Provide platform orientation and training
4. **Gradual Access**: Incrementally increase permissions as needed

### Ongoing Management
1. **Regular Reviews**: Periodic access certification
2. **Activity Monitoring**: Watch for unusual usage patterns
3. **Feedback Collection**: User experience improvement
4. **Documentation**: Maintain up-to-date user procedures

### Security Hygiene
1. **Password Policies**: Enforce strong authentication
2. **Session Management**: Monitor and control active sessions
3. **Permission Cleanup**: Remove unnecessary access regularly
4. **Incident Response**: Have procedures for security events

The User Management system provides the foundation for secure, compliant, and efficient healthcare user administration within the SMART on FHIR ecosystem.

## User Federation (LDAP)

The Users page includes a **User Federation** sub-tab for managing LDAP directory connections. This allows importing and synchronizing users from enterprise directories (Active Directory, OpenLDAP, etc.) into Keycloak.

See the dedicated [User Federation](user-federation) page for full documentation on LDAP provider configuration, sync operations, and attribute mapping.
