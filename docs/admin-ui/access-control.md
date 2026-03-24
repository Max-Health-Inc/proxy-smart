# Access Control (Door Management)

Physical access control integration for healthcare facilities. Proxy Smart provides a vendor-agnostic abstraction over door access systems, with built-in Keycloak user sync and group-based authorization.

## Supported Providers

| Provider | Type | Capabilities |
|----------|------|-------------|
| **Kisi** | Cloud API | Locations, Doors, Groups, Members, Events, Sync, Unlock |
| **UniFi Access** | Local Controller | Locations (floors), Doors, Groups*, Members*, Events*, Sync*, Unlock, Real-time WS |

\* UniFi groups/members/sync are managed by Proxy Smart (persisted in local state) since UniFi Access doesn't have a native user/group API.

## Configuration

### Environment Variables

#### Kisi

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KISI_API_KEY` | Yes | — | API key from your Kisi dashboard |
| `KISI_BASE_URL` | No | `https://api.kisi.io` | Override for self-hosted Kisi |
| `KISI_TIMEOUT_MS` | No | `10000` | HTTP request timeout |

#### UniFi Access

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `UNIFI_ACCESS_HOST` | Yes | — | Controller IP or FQDN (no protocol) |
| `UNIFI_ACCESS_USERNAME` | Yes | — | Controller admin username |
| `UNIFI_ACCESS_PASSWORD` | Yes | — | Controller admin password |

#### Provider Selection

| Variable | Description |
|----------|-------------|
| `ACCESS_CONTROL_PROVIDER` | Force `kisi` or `unifi-access`. Auto-detected if omitted. |

Auto-detection priority: if `KISI_API_KEY` is set, Kisi is used. Otherwise if `UNIFI_ACCESS_HOST` is set, UniFi Access is used.

### In-App Configuration

The **Configure Provider** panel in the UI allows setting up access control without editing environment variables:

1. Select provider type (Kisi or UniFi Access)
2. Enter credentials
3. **Test Connection** — validates connectivity before saving
4. **Save** — writes config to `.env` and reinitializes the provider

## Admin UI

The Door Management page is a tabbed interface. Tabs are shown or hidden based on the active provider's capabilities.

### Overview Tab

- Stat cards: location count, door count, group count, member count
- Door status grid showing online/offline state per door
- Locations list with addresses

### Doors Tab

- Searchable door list, grouped by location
- Per-door badges: online/offline, locked/unlocked
- **Unlock** button per door (with loading/success/error feedback)

### Groups Tab *(capability-gated)*

- Create and delete access groups
- Expand a group to view and manage its door assignments
- Assign or remove doors from groups

### Members Tab *(capability-gated)*

- Create and delete members (by email)
- View group memberships per member
- **Sync from Keycloak** button — imports users from the Keycloak realm

### Events Tab *(capability-gated)*

- Paginated audit log of access events
- Columns: action, actor, door, timestamp
- Searchable by actor email, door, or action type

## API Endpoints

All endpoints are under `/admin/access-control` and require a valid admin Bearer token.

### Core (always available)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Provider health check + capability flags |
| `GET` | `/overview` | Combined stats (locations, doors, groups, members) |
| `GET` | `/locations` | List locations (paginated) |
| `GET` | `/locations/:id` | Get single location |
| `GET` | `/doors` | List doors (paginated) |
| `GET` | `/doors/:id` | Get single door |
| `POST` | `/doors/:id/unlock` | Unlock a door |
| `GET` | `/events` | List access events (paginated) |

### Groups (optional)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/groups` | List groups |
| `GET` | `/groups/:id` | Get single group |
| `POST` | `/groups` | Create group (`{ name, description? }`) |
| `DELETE` | `/groups/:id` | Delete group |
| `GET` | `/group-doors` | List group-door assignments |
| `POST` | `/group-doors` | Assign door to group (`{ groupId, doorId }`) |
| `DELETE` | `/group-doors/:id` | Remove door from group |

### Members (optional)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/members` | List members |
| `GET` | `/members/:id` | Get single member |
| `POST` | `/members` | Create member (`{ email, name? }`) |
| `DELETE` | `/members/:id` | Delete member |

### Sync & Configuration

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sync` | Sync users from Keycloak (with optional role mappings) |
| `GET` | `/config/status` | Current provider configuration status |
| `POST` | `/config/test` | Test connection to a provider |
| `POST` | `/config/configure` | Save provider configuration |

Endpoints for optional capabilities return **501 Not Implemented** when the active provider doesn't support them.

## Architecture

```
┌──────────────────┐
│   Admin UI       │
│  DoorManagement  │
└────────┬─────────┘
         │ REST API
         ▼
┌──────────────────┐
│  Access Control  │
│  Admin Routes    │  /admin/access-control/*
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Provider       │
│   Abstraction    │  AccessControlProvider interface
├────────┬─────────┤
│  Kisi  │  UniFi  │
│Provider│Provider  │
└────────┴─────────┘
         │
         ▼
┌──────────────────┐
│  External API    │
│  Kisi Cloud /    │
│  UniFi Controller│
└──────────────────┘
```

### Provider Interface

The `AccessControlProvider` interface defines:

- **Required**: `isHealthy()`, `getLocations()`, `getDoors()`, `unlock()`
- **Optional**: `getGroups()`, `getMembers()`, `getEvents()`, `syncUsersFromKeycloak()`, `getOverview()`
- **Capabilities object**: declares which optional methods are available

Routes check capabilities at runtime and degrade gracefully (501) when a feature isn't supported.

## Keycloak Sync

The sync flow:

1. Admin clicks **Sync from Keycloak** (or calls `POST /sync`)
2. Backend fetches all users from the Keycloak realm
3. For each user, checks realm-role mappings against optional `roleMappings` rules
4. Creates new members in the access control provider (skips existing)
5. Assigns groups based on role mapping matches
6. Returns a summary: `{ created[], skipped[], failed[] }`

### Role Mapping Rules

```json
{
  "roleMappings": [
    { "keycloakRole": "doctor", "groupId": "grp-1" },
    { "keycloakRole": "nurse", "groupId": "grp-2" }
  ]
}
```

Role matching is case-insensitive and uses substring matching (e.g., `"doctor"` matches role `"senior-doctor"`).

## UniFi Access: Unlock Authorization

For UniFi Access, the provider implements group-based unlock authorization:

1. Request comes in to unlock door X
2. Provider checks if the requesting user's email is a member
3. Checks if the member belongs to a group that has door X assigned
4. Records a decision event (`unlock_allow` or `unlock_deny`) for audit
5. Proceeds with unlock only if authorized

Decision events are persisted in the provider's local state file (`logs/access-control/unifi-provider-state.json`).
