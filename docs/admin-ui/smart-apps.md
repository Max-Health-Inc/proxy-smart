# SMART Apps

Register and manage SMART on FHIR OAuth clients. Each SMART app corresponds to a Keycloak client with SMART-specific attributes.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/smart-apps/` | List all registered SMART apps |
| POST | `/admin/smart-apps/` | Register a new SMART app |
| GET | `/admin/smart-apps/:clientId` | Get app details |
| PUT | `/admin/smart-apps/:clientId` | Update app configuration |
| DELETE | `/admin/smart-apps/:clientId` | Remove app registration |

## App Registration

When creating a SMART app, you provide:

- **Client ID** -- unique identifier used in OAuth flows
- **App Name** -- human-readable display name
- **Redirect URIs** -- allowed OAuth callback URLs
- **Launch URI** -- the URL opened when the app is launched from an EHR context
- **Client Type** -- `public` (SPA, native) or `confidential` (backend service)
- **Grant Types** -- `authorization_code`, `client_credentials`, etc.
- **Scopes** -- which SMART scopes the app is allowed to request

## Launch Types

| Type | Flow | Use Case |
|------|------|----------|
| EHR Launch | `ehr-launch` | App launched from within EHR context (patient already selected) |
| Standalone Launch | `standalone-launch` | App launches independently and selects its own context |
| Backend Service | `client_credentials` | Server-to-server with no user interaction |

## Client Configuration

The backend stores the full Keycloak client configuration and adds SMART-specific metadata:

- **PKCE enforcement** -- required for public clients per SMART STU2
- **Token lifetimes** -- access token and refresh token expiry
- **Allowed scopes** -- restrict which scopes the app can request
- **Web origins** -- CORS origins for browser-based apps
- **Logo URI** -- displayed in consent screens and app store

## App Store Integration

Published apps appear in the `/admin/app-store/` catalog:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/app-store/` | List all apps with visibility status |
| POST | `/admin/app-store/publish` | Publish an app to the catalog |
| POST | `/admin/app-store/:appId/hide` | Hide app from users |
| POST | `/admin/app-store/:appId/show` | Make app visible again |
| POST | `/admin/app-store/:appId/unpublish` | Remove from catalog |

## Related

- [Scope Management](./scope-management.md) -- configure which scopes exist
- [Launch Contexts](./launch-contexts.md) -- set per-user launch context attributes
- [FHIR Servers](./fhir-servers.md) -- the upstream servers apps will access
- **🔔 Notification Services**: Push notification support

## 📱 Mobile Application Support

### Mobile-Specific Features
- **📱 App Store Links**: iOS/Android app store integration
- **🔗 Deep Linking**: Native app launch support
- **📲 Push Notifications**: Mobile notification delivery
- **🔒 Certificate Pinning**: Enhanced mobile security

### Progressive Web Apps (PWA)
- **🌐 Web App Manifest**: PWA configuration
- **⚡ Service Workers**: Offline capability
- **🏠 Home Screen**: Install to home screen
- **📱 Native Experience**: App-like behavior

## 🎯 Best Practices

### Application Design
1. **🎯 Scope Minimization**: Request only necessary permissions
2. **🔒 Security First**: Implement strong security measures
3. **👥 User Experience**: Prioritize intuitive interface design
4. **📊 Performance**: Optimize for speed and efficiency

### Launch Context
1. **🎯 Context Relevance**: Ensure context matches workflow
2. **⚡ Fast Loading**: Minimize context resolution time
3. **🔄 Context Persistence**: Maintain context across sessions
4. **📊 Context Validation**: Verify context accuracy

### Ongoing Management
1. **📊 Monitor Usage**: Track application performance
2. **🔄 Regular Updates**: Keep applications current
3. **🛡️ Security Reviews**: Periodic security assessments
4. **👥 User Feedback**: Collect and act on user input

The SMART Apps management system provides comprehensive tools for healthcare application lifecycle management, ensuring secure, compliant, and efficient integration within the healthcare ecosystem.

## Sub-Tabs

The SMART Apps page contains three sub-tabs:

### Registered Apps
The main view for managing manually registered SMART client applications (documented above).

### App Store
Controls the visibility and publication of SMART apps:

| Action | Description |
|---|---|
| **Publish** | Make an app available in the app store catalog |
| **Unpublish** | Remove an app from the catalog |
| **Hide** | Hide an app from the catalog without removing it |
| **Show** | Restore visibility of a hidden app |

API endpoints: `GET /admin/app-store/`, `POST /admin/app-store/publish`, `POST /admin/app-store/:appId/hide`, `POST /admin/app-store/:appId/show`, `POST /admin/app-store/:appId/unpublish`.

### Dynamic Client Registration
Manages RFC 7591 Dynamic Client Registration settings:

- **View settings** -- current DCR policy configuration
- **Update settings** -- modify registration requirements and defaults
- **Reset to defaults** -- restore factory DCR settings

API endpoints: `GET /admin/client-registration/settings`, `PUT /admin/client-registration/settings`, `POST /admin/client-registration/reset-defaults`.

