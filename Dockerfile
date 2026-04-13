# Multi-stage build for Proxy Smart monorepo - Separate Backend and UI containers
FROM oven/bun:slim AS base
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
COPY shared-ui/package.json ./shared-ui/
COPY apps/ui/package.json ./apps/ui/
COPY apps/consent-app/package.json ./apps/consent-app/
COPY apps/consent-app/lib/ ./apps/consent-app/lib/
COPY apps/dtr-app/package.json ./apps/dtr-app/
COPY apps/dtr-app/lib/ ./apps/dtr-app/lib/
COPY apps/patient-portal/package.json ./apps/patient-portal/
COPY apps/patient-portal/lib/ ./apps/patient-portal/lib/

# Strip workspaces not included in Docker build to avoid install failures
RUN bun -e 'const p=JSON.parse(require("fs").readFileSync("./package.json","utf8")); p.workspaces=["backend","apps/ui","shared-ui","apps/consent-app","apps/dtr-app","apps/patient-portal"]; require("fs").writeFileSync("./package.json", JSON.stringify(p,null,2))'

# Install dependencies for Docker-relevant workspaces only
RUN bun install

# Backend build stage
FROM build-deps AS backend-build
# Copy backend source code
COPY backend/ ./backend/

# Build backend and export OpenAPI spec
WORKDIR /app/backend
RUN bun run build
RUN bun run export-openapi

# API client generation stage
FROM build-deps AS api-client-gen
COPY scripts/generate-ts-fetch-client.py scripts/runtime-template.ts ./scripts/
COPY --from=backend-build /app/backend/dist/openapi.json ./backend/dist/openapi.json
RUN mkdir -p apps/ui/src/lib/api-client && \
    python scripts/generate-ts-fetch-client.py backend/dist/openapi.json apps/ui/src/lib/api-client

# UI build stage
FROM build-deps AS ui-build

# Encryption secret for browser local-storage obfuscation (baked into Vite bundle)
ARG VITE_ENCRYPTION_SECRET=proxy-smart-default-encryption-key
ENV VITE_ENCRYPTION_SECRET=${VITE_ENCRYPTION_SECRET}

# Base path for the UI (/ for mono, /webapp/ for split deployment)
ARG VITE_BASE=/
ENV VITE_BASE=${VITE_BASE}

# Copy UI source code
COPY shared-ui/ ./shared-ui/
COPY apps/ui/ ./apps/ui/

# Copy generated API client from the generation stage
COPY --from=api-client-gen /app/apps/ui/src/lib/api-client ./apps/ui/src/lib/api-client/

# Build UI
WORKDIR /app/apps/ui

# Build UI for standalone deployment
RUN bun run build

# Consent App build stage
FROM build-deps AS consent-app-build
COPY shared-ui/ ./shared-ui/
COPY apps/consent-app/ ./apps/consent-app/
WORKDIR /app/apps/consent-app
RUN bun run build

# DTR App build stage
FROM build-deps AS dtr-app-build
COPY shared-ui/ ./shared-ui/
COPY apps/dtr-app/ ./apps/dtr-app/
WORKDIR /app/apps/dtr-app
RUN bun run build

# Patient Portal build stage
FROM build-deps AS patient-portal-build
COPY shared-ui/ ./shared-ui/
COPY apps/patient-portal/ ./apps/patient-portal/
WORKDIR /app/apps/patient-portal
RUN bun run build

# Docs build stage (VitePress)
FROM build-deps AS docs-build
COPY docs/ ./docs/
RUN bun run docs:build

# Backend production stage
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
COPY --from=backend-build /app/backend/mcp-server-templates.json ./backend/mcp-server-templates.json

# Copy backend's public directory (landing page only, no UI)
COPY --from=backend-build /app/backend/public ./backend/public

# Copy built SMART apps into backend public
COPY --from=consent-app-build /app/apps/consent-app/dist ./backend/public/apps/consent
COPY --from=dtr-app-build /app/apps/dtr-app/dist ./backend/public/apps/dtr
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

# Expose backend port
EXPOSE 8445

# Start the backend API server
WORKDIR /app/backend
CMD ["bun", "run", "dist/index.js"]

# UI production stage (nginx-based)
FROM nginx:alpine AS ui
WORKDIR /usr/share/nginx/html

# Copy built UI into /webapp/ subdirectory
COPY --from=ui-build /app/apps/ui/dist /usr/share/nginx/html/webapp

# Copy custom nginx config for SPA routing under /webapp/
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;

    # Serve the Admin SPA under /webapp/
    location /webapp/ {
        alias /usr/share/nginx/html/webapp/;
        try_files \$uri \$uri/ /webapp/index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Redirect /webapp to /webapp/
    location = /webapp {
        return 301 /webapp/;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# Expose UI port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
