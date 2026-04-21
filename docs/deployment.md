# Deployment

Proxy Smart uses Docker Compose for deployment. Multiple compose files target different environments.

## Compose Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | Base infrastructure (Keycloak + PostgreSQL) |
| `docker-compose.development.yml` | Development with FHIR server (HAPI) and Orthanc PACS |
| `docker-compose.prod.yml` | Production with built backend image and required secrets |
| `docker-compose.beta.yml` | Beta/staging environment |
| `docker-compose.caddy.yml` | Adds Caddy reverse proxy with automatic HTTPS |

## Quick Start (Development)

```bash
# Start base infrastructure
docker compose up -d

# Start development stack (adds HAPI FHIR + Orthanc)
docker compose -f docker-compose.development.yml up -d

# Run backend locally
cd backend && bun install && bun run dev
```

The development stack provides:
- **Keycloak** on port `8080` (admin/admin)
- **PostgreSQL** on port `5432`
- **HAPI FHIR** on port `8081` (if using development compose)
- **Orthanc PACS** on port `8042` (if using development compose)
- **Backend** on port `8445` (run locally with `bun run dev`)

## Production Deployment

### Prerequisites

Set required environment variables or use a `.env` file:

```bash
KC_DB_PASSWORD=<secure-password>
POSTGRES_PASSWORD=<secure-password>
KEYCLOAK_ADMIN_CLIENT_SECRET=<service-account-secret>
```

### Deploy

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Production Architecture

```
Internet  ──►  Caddy (HTTPS)  ──►  Backend (:8445)  ──►  FHIR Server(s)
                                       │
                                       ├──►  Keycloak (:8080)
                                       └──►  Orthanc PACS (optional)
```

The production compose builds the backend from `Dockerfile` and Keycloak from `Dockerfile.keycloak`:
- Backend serves all frontend apps as static files
- Keycloak uses PostgreSQL for persistence
- Realm configuration is imported from `keycloak/realm-export.json`

### With Caddy (HTTPS)

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.caddy.yml up -d
```

Caddy provides automatic TLS certificate provisioning via Let's Encrypt.

## Services

### Keycloak

- **Image**: `quay.io/keycloak/keycloak:26.6.1`
- **Purpose**: OAuth 2.0 / OIDC identity provider
- **Health check**: HTTP on port 9000 (`/health/ready`)
- **Realm import**: Auto-imports `keycloak/realm-export.json` on first start
- **Features**: CIMD (Client-Initiated Metadata Discovery) enabled in base compose

### PostgreSQL

- **Image**: `postgres:16-alpine`
- **Purpose**: Keycloak persistence
- **Init script**: `keycloak/database/init.sql` runs on first start
- **Volume**: `postgres_data` for data persistence

### Backend

- **Built from**: `Dockerfile` (multi-stage Bun build)
- **Port**: 8445
- **Serves**: Backend API + all frontend apps as static files
- **Key env vars**: See [Environment Variables](environment-variables)

### Orthanc (Development)

- **Image**: `jodogne/orthanc-plugins:1.12.8`
- **Purpose**: DICOM PACS with DICOMweb support
- **Ports**: 8042 (HTTP/DICOMweb), 4242 (DICOM DIMSE)
- **Volume**: `orthanc_data_dev` for study persistence

## AWS CDK Deployment

For cloud deployment, see the [Infrastructure README](https://github.com/Max-Health-Inc/proxy-smart/tree/main/infra) which provides AWS CDK stacks for:
- ECS Fargate services
- RDS PostgreSQL
- CloudFront distribution
- ACM certificates
- VPC networking

## Networking

All services join the `proxy-smart-network` bridge network. Services communicate by container name:
- Backend → Keycloak: `http://keycloak:8080`
- Backend → FHIR: configured via `FHIR_SERVER_BASE`
- Backend → Orthanc: `http://orthanc:8042/dicom-web`
