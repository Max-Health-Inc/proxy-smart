# Use Bun as the base image
FROM oven/bun:1.3.13-slim AS base
WORKDIR /app

# Build stage
FROM base AS build
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential pkg-config python-is-python3

# Copy only backend package files (not root workspace files)
COPY package.json ./
# Don't copy root bun.lock since it contains workspace references

# Install dependencies
RUN bun install

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./
COPY public ./public
# Build the application
RUN bun run build

# Production stage
FROM base AS production

# Install minimal runtime dependencies (Java 21 needed for @opendataloader/pdf)
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    ca-certificates \
    openjdk-21-jre-headless \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/public ./public

# Create non-root user for security
RUN addgroup --system --gid 1001 app && \
    adduser --system --uid 1001 --ingroup app app && \
    chown -R app:app /app
USER app

# Expose the port
EXPOSE 8445

# Start the application
CMD ["bun", "run", "dist/index.js"]
