# Optimized Multi-stage Dockerfile for Node.js backend

# 1. Base Stage with System Dependencies
FROM node:18-alpine AS base

# Install system dependencies in one layer
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    && pip3 install --break-system-packages yt-dlp \
    && rm -rf /var/cache/apk/*

# 2. Dependencies Stage
FROM base AS deps
WORKDIR /usr/src/app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies with npm ci for faster builds
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# 3. Builder Stage
FROM base AS builder
WORKDIR /usr/src/app

# Copy dependencies
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# 4. Runner Stage
FROM base AS runner
WORKDIR /usr/src/app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy built application and dependencies
COPY --from=deps --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/build ./build
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/package.json ./package.json

# Switch to non-root user
USER nodejs

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["npm", "start"]