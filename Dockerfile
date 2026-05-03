# Multi-stage build for Proxy Smart monorepo
# Single backend image serves API + all frontend apps (Admin UI, SMART apps, docs)
FROM oven/bun:1.3.13-slim AS base
WORKDIR /app

# Common build dependencies stage
FROM base AS build-deps
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    pkg-config \
    python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy root package files first
COPY package.json bun.lock ./

# Copy root lib (contains shared tarballs like smart-app-launch-generated.tgz)
COPY lib/ ./lib/

# Copy workspace package files (only the ones needed for Docker build)
COPY backend/package.json ./backend/
COPY apps/ui/package.json ./apps/ui/
COPY apps/consent-app/package.json ./apps/consent-app/
COPY apps/dtr-app/package.json ./apps/dtr-app/
COPY apps/dtr-app/lib/ ./apps/dtr-app/lib/
COPY apps/patient-portal/package.json ./apps/patient-portal/
COPY apps/patient-picker/package.json ./apps/patient-picker/
COPY packages/auth/package.json ./packages/auth/

# Strip workspaces not included in Docker build to avoid install failures
RUN bun -e 'const p=JSON.parse(require("fs").readFileSync("./package.json","utf8")); p.workspaces=["backend","packages/auth","apps/ui","apps/consent-app","apps/dtr-app","apps/patient-portal","apps/patient-picker"]; require("fs").writeFileSync("./package.json", JSON.stringify(p,null,2))'

# Install dependencies for Docker-relevant workspaces only
RUN bun install

# Copy shared Vite config (imported by all SMART apps via ../../config/vite-config)
COPY config/ ./config/

# Backend build stage (just the JS bundle)
FROM build-deps AS backend-build
COPY packages/auth/ ./packages/auth/
COPY backend/ ./backend/
WORKDIR /app/backend
RUN bun run build

# OpenAPI spec generation (runs in parallel with backend-build)
# export-openapi imports TypeScript source directly, doesn't need dist/
FROM build-deps AS openapi-gen
COPY packages/auth/ ./packages/auth/
COPY backend/ ./backend/
WORKDIR /app/backend
RUN bun run export-openapi

# API client generation stage
FROM build-deps AS api-client-gen
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
RUN uv tool install openapi-ts-fetch==0.2.0
ENV PATH="/root/.local/bin:$PATH"
COPY --from=openapi-gen /app/backend/dist/openapi.json ./backend/dist/openapi.json
RUN mkdir -p apps/ui/src/lib/api-client && \
    openapi-ts-fetch backend/dist/openapi.json apps/ui/src/lib/api-client && \
    mkdir -p apps/patient-portal/src/lib/api-client && \
    openapi-ts-fetch backend/dist/openapi.json apps/patient-portal/src/lib/api-client --tags shl

# Admin UI build stage — always built with /webapp/ base path
FROM build-deps AS ui-build
ARG VITE_ENCRYPTION_SECRET
RUN test -n "$VITE_ENCRYPTION_SECRET" || (echo "ERROR: VITE_ENCRYPTION_SECRET build arg is required" && exit 1)
ENV VITE_ENCRYPTION_SECRET=${VITE_ENCRYPTION_SECRET}
ENV VITE_BASE=/webapp/
COPY apps/ui/ ./apps/ui/
COPY --from=api-client-gen /app/apps/ui/src/lib/api-client ./apps/ui/src/lib/api-client/
WORKDIR /app/apps/ui
RUN bun run build

# Consent App build stage
FROM build-deps AS consent-app-build
COPY apps/consent-app/ ./apps/consent-app/
WORKDIR /app/apps/consent-app
RUN bun run build

# DTR App build stage
FROM build-deps AS dtr-app-build
COPY apps/dtr-app/ ./apps/dtr-app/
WORKDIR /app/apps/dtr-app
RUN bun run build

# Patient Picker build stage
FROM build-deps AS patient-picker-build
COPY apps/patient-picker/ ./apps/patient-picker/
WORKDIR /app/apps/patient-picker
RUN bun run build

# Patient Portal build stage
FROM build-deps AS patient-portal-build
COPY apps/patient-portal/ ./apps/patient-portal/
COPY --from=api-client-gen /app/apps/patient-portal/src/lib/api-client ./apps/patient-portal/src/lib/api-client/
WORKDIR /app/apps/patient-portal
RUN bun run build

# Docs build stage (VitePress)
FROM build-deps AS docs-build
COPY docs/ ./docs/
RUN bun run docs:build

# Production stage — single backend serves everything
FROM base AS backend
WORKDIR /app

# Install minimal runtime dependencies (Java 21 needed for @opendataloader/pdf)
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    ca-certificates \
    openjdk-21-jre-headless \
    && rm -rf /var/lib/apt/lists/*

# Copy built backend
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/package.json ./backend/package.json

# Copy backend's public directory (landing page, static assets)
COPY --from=backend-build /app/backend/public ./backend/public

# Copy Admin UI into backend public (served at /webapp/)
COPY --from=ui-build /app/apps/ui/dist ./backend/public/webapp

# Copy built SMART apps into backend public
COPY --from=consent-app-build /app/apps/consent-app/dist ./backend/public/apps/consent
COPY --from=dtr-app-build /app/apps/dtr-app/dist ./backend/public/apps/dtr
COPY --from=patient-picker-build /app/apps/patient-picker/dist ./backend/public/apps/patient-picker
COPY --from=patient-portal-build /app/apps/patient-portal/dist ./backend/public/apps/patient-portal

# Verify no localhost URLs leaked into production bundles
RUN if grep -rl 'localhost:8445' /app/backend/public/apps/ 2>/dev/null; then \
      echo "ERROR: Found hardcoded localhost:8445 in app bundles. Check .dockerignore." && exit 1; \
    fi

# Copy built VitePress docs
COPY --from=docs-build /app/docs/.vitepress/dist ./backend/public/docs

# Copy raw markdown docs for the /docs API
COPY --from=docs-build /app/docs ./docs

# Copy root node_modules (monorepo structure)
COPY --from=backend-build /app/node_modules ./node_modules

# Copy system prompt for AI assistant
COPY prompts/ ./prompts/

# Create non-root user for security
RUN groupadd --gid 1001 app && \
    useradd --uid 1001 --gid app --no-create-home --shell /bin/false app && \
    chown -R app:app /app
USER app

# Expose backend port
EXPOSE 8445

# Start the backend API server (serves API + all frontend apps)
WORKDIR /app/backend
CMD ["bun", "run", "dist/index.js"]
