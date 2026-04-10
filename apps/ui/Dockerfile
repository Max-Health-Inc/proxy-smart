# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Install only production dependencies
RUN bun install --production --frozen-lockfile

# Expose the port
EXPOSE 3000

# Start the application
CMD ["bun", "run", "preview", "--port", "3000", "--host"]
