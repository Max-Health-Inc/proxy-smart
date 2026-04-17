# Organizations

The Organizations page manages Keycloak organizations within your realm. Organizations represent healthcare entities such as hospitals, clinics, or departments, and allow grouping users with shared branding and access policies.

## Accessing

Navigate to **Organizations** in the admin sidebar.

## Features

### Organization List

The main view displays all organizations with:
- Organization name and domain
- Member count
- Quick actions (edit, delete)
- Search by name or domain

### Creating an Organization

Click **Add Organization** to create a new organization:

| Field | Description |
|---|---|
| **Name** | Display name of the organization |
| **Domains** | Email domains associated with this organization |
| **Description** | Optional description |
| **Attributes** | Custom key-value attributes |

### Editing an Organization

Click an organization to open the edit dialog with two tabs:

#### General Tab
- Update name, domains, description, and attributes
- View and manage organization metadata

#### Branding Tab
- Configure organization-specific branding that overrides the global brand settings
- Set custom logo URL, name, website, and portal details
- Organization branding is used in the SMART User-Access Brand Bundle to differentiate sub-organizations

### Member Management

Within an organization, you can manage membership:

- **View members** — list all users belonging to the organization
- **Add member** — assign an existing Keycloak user to the organization
- **Remove member** — revoke a user's organization membership

Members inherit the organization's branding and any organization-scoped access policies.

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
