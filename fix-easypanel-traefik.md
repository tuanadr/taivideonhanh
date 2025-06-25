# 🔧 EasyPanel + Traefik Admin Routes Fix

## 🚨 Problem Identified

**Issue**: Admin routes return 404 on EasyPanel with Traefik
**Root Cause**: Traefik routing configuration doesn't handle Next.js dynamic routes properly

## 🛠️ Solution 1: EasyPanel Configuration

### **Add Traefik Labels to Frontend Service**

In EasyPanel, add these labels to your frontend service:

```yaml
labels:
  # Basic routing
  - "traefik.enable=true"
  - "traefik.http.routers.frontend.rule=Host(`taivideonhanh.vn`)"
  - "traefik.http.routers.frontend.tls=true"
  - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
  
  # Admin routes specific handling
  - "traefik.http.routers.admin.rule=Host(`taivideonhanh.vn`) && PathPrefix(`/admin`)"
  - "traefik.http.routers.admin.tls=true"
  - "traefik.http.routers.admin.tls.certresolver=letsencrypt"
  - "traefik.http.routers.admin.priority=100"
  
  # Middleware for admin routes
  - "traefik.http.middlewares.admin-headers.headers.customrequestheaders.X-Forwarded-Proto=https"
  - "traefik.http.middlewares.admin-headers.headers.customrequestheaders.X-Forwarded-Host=taivideonhanh.vn"
  - "traefik.http.routers.admin.middlewares=admin-headers"
  
  # Service configuration
  - "traefik.http.services.frontend.loadbalancer.server.port=3000"
```

## 🛠️ Solution 2: Next.js Configuration Fix

### **Update next.config.js for EasyPanel**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Essential for EasyPanel/Traefik
  output: 'standalone',
  
  // Handle trailing slashes consistently
  trailingSlash: false,
  
  // Ensure admin routes are included
  async rewrites() {
    return [
      {
        source: '/admin/:path*',
        destination: '/admin/:path*',
      },
    ];
  },
  
  // Headers for admin routes
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Experimental features for better routing
  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig;
```

## 🛠️ Solution 3: Docker Configuration for EasyPanel

### **Update Dockerfile for Frontend**

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build with admin routes
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

## 🛠️ Solution 4: Environment Variables for EasyPanel

### **Add to EasyPanel Environment Variables**

```bash
# Frontend
NEXT_PUBLIC_API_URL=https://taivideonhanh.vn/api
NODE_ENV=production

# Backend  
COOKIES_PATH=/app/data/cookies/platform-cookies.txt
ENABLE_COOKIE_AUTH=true
DEFAULT_ADMIN_EMAIL=admin@taivideonhanh.vn
DEFAULT_ADMIN_PASSWORD=admin123456

# Database (use EasyPanel database service)
DB_HOST=your-postgres-service
DB_NAME=taivideonhanh
DB_USER=postgres
DB_PASSWORD=your-password
```

## 🛠️ Solution 5: Volume Mounts for Cookie Storage

### **Add Persistent Volume in EasyPanel**

```yaml
volumes:
  - name: cookie-data
    path: /app/data/cookies
    size: 1Gi
```

## 🔧 Quick Fix Commands

### **1. Rebuild Frontend with Correct Config**

```bash
# In your local environment
cd frontend
rm -rf .next
npm run build

# Check if admin routes are in build
ls -la .next/server/app/admin/
```

### **2. Deploy to EasyPanel**

```bash
# Push changes to git
git add .
git commit -m "fix: EasyPanel Traefik routing for admin routes"
git push

# EasyPanel will auto-deploy from git
```

### **3. Test Admin Routes**

```bash
# Test directly
curl -I https://taivideonhanh.vn/admin/login

# Should return 200, not 404
```

## 🔍 Debugging Steps

### **1. Check Traefik Dashboard**

Access Traefik dashboard in EasyPanel to verify:
- Routes are registered correctly
- Admin routes have proper priority
- Middleware is applied

### **2. Check Container Logs**

```bash
# Frontend logs
docker logs <frontend-container>

# Look for routing errors or build issues
```

### **3. Test Routing**

```bash
# Test main site
curl https://taivideonhanh.vn

# Test API
curl https://taivideonhanh.vn/api/health

# Test admin (should not be 404)
curl https://taivideonhanh.vn/admin/login
```

## 🎯 Expected Results

After applying these fixes:
- ✅ Admin routes should return 200 instead of 404
- ✅ Traefik should properly route `/admin/*` paths
- ✅ Next.js should serve admin pages correctly
- ✅ EasyPanel deployment should include admin routes

## 🚨 If Still 404

If admin routes still return 404 after these fixes:

1. **Check EasyPanel Service Configuration**
2. **Verify Traefik Labels are Applied**
3. **Rebuild Frontend Container**
4. **Check Next.js Build Output**
5. **Contact EasyPanel Support** for Traefik configuration help
