# Organizations

The Organizations page manages Keycloak organizations within your realm. Organizations represent healthcare entities such as hospitals, clinics, or departments, and allow grouping users with shared branding and access policies.

## Accessing

Navigate to **Organizations** in the admin sidebar.

## Organization List

The main view lists every organization with its name, domain, and member count, searchable by name or domain, with edit and delete available inline.

## Creating an Organization

Click **Add Organization** to create a new organization:

| Field | Description |
|---|---|
| **Name** | Display name of the organization |
| **Domains** | Email domains associated with this organization |
| **Description** | Optional description |
| **Attributes** | Custom key-value attributes |

## Editing an Organization

Clicking an organization opens a dialog with two tabs. **General** edits the same fields as creation: name, domains, description, and attributes. **Branding** sets a logo URL, name, website, and portal details that override the global brand, which is how a sub-organization appears as its own entry in the SMART User-Access Brand Bundle instead of inheriting the parent's identity.

## Member Management

Membership is assignment, not creation: an existing Keycloak user is added to or removed from the organization. Members inherit the organization's branding and any organization-scoped access policies, so moving a user between organizations changes what patient apps display for them.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/organizations/` | List organizations (with search and pagination) |
| `GET` | `/admin/organizations/count` | Get organization count |
| `GET` | `/admin/organizations/:orgId` | Get organization details |
| `POST` | `/admin/organizations/` | Create organization |
| `PUT` | `/admin/organizations/:orgId` | Update organization |
| `DELETE` | `/admin/organizations/:orgId` | Delete organization |
| `GET` | `/admin/organizations/:orgId/members` | List organization members |
| `POST` | `/admin/organizations/:orgId/members` | Add member to organization |
| `DELETE` | `/admin/organizations/:orgId/members/:userId` | Remove member |
| `GET` | `/admin/organizations/:orgId/branding` | Get organization branding |
| `PUT` | `/admin/organizations/:orgId/branding` | Update organization branding |

## Relationship to Branding

Organization branding integrates with the SMART 2.2.0 User-Access Brand Bundle. When an organization has custom branding configured, it appears as a separate brand entry in the published bundle, allowing patient apps to display the correct logo and portal link for each sub-organization.

See [Brand Management](branding) for global branding configuration.
