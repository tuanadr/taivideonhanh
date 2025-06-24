# Monorepo Dockerfile for EasyPanel
# Chạy cả frontend và backend trong một container

# 1. Base stage
FROM node:18-alpine AS base
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    nginx \
    supervisor \
    wget \
    && pip3 install --break-system-packages yt-dlp

# 2. Dependencies stage
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies for monorepo
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspaces --only=production

# 3. Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copy source code
COPY . .

# Build backend TypeScript
RUN cd backend && npm run build

# Build frontend Next.js
RUN cd frontend && npm run build

# 4. Production stage
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 -G appuser

# Copy built applications
COPY --from=deps --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appuser /app/backend/build ./backend/build
COPY --from=builder --chown=appuser:appuser /app/backend/package.json ./backend/
COPY --from=builder --chown=appuser:appuser /app/frontend/.next/standalone ./frontend/
COPY --from=builder --chown=appuser:appuser /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder --chown=appuser:appuser /app/frontend/public ./frontend/public

# Copy configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisord.conf

# Expose port 80 (nginx sẽ route internally)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/api/health || exit 1

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
