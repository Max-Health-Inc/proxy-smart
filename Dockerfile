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

# Copy workspace package files
COPY backend/package.json ./backend/
COPY ui/package.json ./ui/

# Install dependencies for all workspaces
RUN bun install --frozen-lockfile

# Backend build stage
FROM build-deps AS backend-build
# Copy backend source code
COPY backend/ ./backend/

# Build backend only
WORKDIR /app/backend
RUN bun run build

# UI build stage
FROM build-deps AS ui-build
# Copy UI source code
COPY ui/ ./ui/

# Build UI
WORKDIR /app/ui

RUN bun run generate:ui

# Build UI for standalone deployment
RUN bun run build

# Backend production stage
FROM base AS backend
WORKDIR /app

# Install minimal runtime dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy built backend
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/package.json ./backend/package.json
COPY --from=backend-build /app/backend/mcp-server-templates.json ./backend/mcp-server-templates.json

# Copy backend's public directory (SMART launcher only, no UI)
COPY --from=backend-build /app/backend/public ./backend/public

# Copy root node_modules (monorepo structure)
COPY --from=backend-build /app/node_modules ./node_modules

# Expose backend port
EXPOSE 8445

# Start the backend API server
WORKDIR /app/backend
CMD ["bun", "run", "dist/index.js"]

# UI production stage (nginx-based)
FROM nginx:alpine AS ui
WORKDIR /usr/share/nginx/html

# Copy built UI
COPY --from=ui-build /app/ui/dist .

# Copy custom nginx config for SPA routing
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Handle client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
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
