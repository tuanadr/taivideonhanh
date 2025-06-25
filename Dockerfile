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
    chromium \
    && pip3 install --break-system-packages yt-dlp

# Create directories for cookie authentication
RUN mkdir -p /tmp/cookies /opt/chrome-profile && \
    chmod 755 /tmp/cookies /opt/chrome-profile

# 2. Dependencies stage - All dependencies for building
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install all dependencies (including dev dependencies for building)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspaces

# 2.1. Production dependencies stage
FROM base AS prod-deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install only production dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspaces --omit=dev

# 3. Build stage
FROM base AS builder
WORKDIR /app

# Copy all dependencies (including dev dependencies)
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

# Copy production dependencies for backend
COPY --from=prod-deps --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=prod-deps --chown=appuser:appuser /app/backend/node_modules ./backend/node_modules

# Copy built backend
COPY --from=builder --chown=appuser:appuser /app/backend/build ./backend/build
COPY --from=builder --chown=appuser:appuser /app/backend/package.json ./backend/package.json

# Copy built frontend (Next.js standalone)
COPY --from=builder --chown=appuser:appuser /app/frontend/.next/standalone ./frontend/
COPY --from=builder --chown=appuser:appuser /app/frontend/.next/static ./frontend/frontend/.next/static
COPY --from=builder --chown=appuser:appuser /app/frontend/public ./frontend/frontend/public

# Copy configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisord.conf

# Copy cookie setup script
COPY setup-youtube-cookies.sh /usr/local/bin/setup-youtube-cookies.sh
RUN chmod +x /usr/local/bin/setup-youtube-cookies.sh

# Set environment variables for cookie authentication
ENV YOUTUBE_COOKIES_PATH=/tmp/cookies/youtube-cookies.txt
ENV CHROME_USER_DATA_DIR=/opt/chrome-profile
# Note: ENABLE_COOKIE_AUTH should be set via docker-compose or runtime environment

# Expose port 80 (nginx sẽ route internally)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/api/health || exit 1

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
