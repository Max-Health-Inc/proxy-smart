# User Federation

User Federation manages LDAP directory connections for importing and synchronizing users into Keycloak. This is found as a sub-tab within the **Users** admin page.

## Accessing

Navigate to **Users** in the admin sidebar, then select the **User Federation** tab.

## Features

### Provider List

Displays all configured LDAP federation providers with:
- Provider name and connection URL
- Sync status and last sync time
- User count (imported users)
- Enabled/disabled status

### Adding an LDAP Provider

Click **Add Provider** to configure a new LDAP connection:

| Field | Description |
|---|---|
| **Name** | Display name for the federation provider |
| **Vendor** | LDAP vendor (Active Directory, OpenLDAP, Red Hat DS, etc.) |
| **Connection URL** | LDAP server URL (`ldap://` or `ldaps://`) |
| **Bind DN** | Distinguished name for binding to LDAP |
| **Bind Credential** | Password for the bind DN |
| **Users DN** | Base DN for user searches |
| **User Object Classes** | LDAP object classes for user entries |
| **Edit Mode** | How Keycloak writes back to LDAP (`READ_ONLY`, `WRITABLE`, `UNSYNCED`) |
| **Search Scope** | LDAP search scope (`ONE_LEVEL` or `SUBTREE`) |
| **Pagination** | Enable LDAP pagination for large directories |
| **Import Users** | Whether to import users into Keycloak's local database |
| **Sync Registrations** | Sync newly registered Keycloak users back to LDAP |

### Connection Testing

Before saving, you can test the LDAP connection:

- **Test Connection** — Verifies network connectivity and TLS handshake
- **Test Authentication** — Verifies bind credentials are accepted

### Synchronization

Once configured, synchronize users from LDAP:

- **Full Sync** — Import all users matching the filter
- **Changed Users Sync** — Import only users modified since the last sync
- **Remove Imported** — Remove all users imported from this provider
- **Unlink Users** — Unlink imported users from the federation provider (keeps the users)

### Mapper Configuration

Each provider can have attribute mappers that control how LDAP attributes map to Keycloak user attributes. View the mapper list for any provider to see:

- Mapper name and type
- LDAP attribute → Keycloak attribute mapping
- Read/write synchronization direction

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/user-federation/count` | Count federation providers |
| `GET` | `/admin/user-federation/` | List all providers |
| `POST` | `/admin/user-federation/` | Create a new LDAP provider |
| `GET` | `/admin/user-federation/:id` | Get provider details |
| `PUT` | `/admin/user-federation/:id` | Update provider configuration |
| `DELETE` | `/admin/user-federation/:id` | Delete a provider |
| `POST` | `/admin/user-federation/:id/sync` | Trigger user sync (query: `action=triggerFullSync` or `triggerChangedUsersSync`) |
| `POST` | `/admin/user-federation/:id/remove-imported` | Remove all imported users |
| `POST` | `/admin/user-federation/:id/unlink` | Unlink users from provider |
| `POST` | `/admin/user-federation/test-connection` | Test LDAP connectivity |
| `POST` | `/admin/user-federation/test-authentication` | Test bind credentials |
| `GET` | `/admin/user-federation/:id/mappers` | List attribute mappers |
