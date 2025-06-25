# 🚀 EasyPanel Monorepo Deployment Guide

## 📋 Overview

This guide provides complete configuration for deploying TaiVideoNhanh as a **monorepo** (single service) on EasyPanel with Traefik routing.

## 🚨 **Key Differences from Separate Services**

- ✅ **Single Service**: One container runs both frontend (port 3000) and backend (port 5000)
- ✅ **Internal Communication**: Frontend and backend communicate via localhost
- ✅ **Traefik Routing**: Routes admin, API, and main site to the same service
- ✅ **Shared Storage**: Single persistent volume for all data

## 🛠️ **EasyPanel Service Configuration**

### **Service Settings**

#### **Basic Information**
```
Service Name: taivideonhanh
Image: Built from Git repository
Port: 3000 (frontend port - exposed)
```

#### **Build Configuration**
```
Dockerfile: Dockerfile.monorepo
Build Context: . (root directory)
```

#### **Environment Variables**
```bash
# Node Environment
NODE_ENV=production

# Frontend Configuration
NEXT_PUBLIC_API_URL=https://taivideonhanh.vn/api
HOSTNAME=0.0.0.0

# Backend Configuration
PORT=5000

# Database Configuration
DB_HOST=your-postgres-service-name
DB_NAME=taivideonhanh
DB_USER=postgres
DB_PASSWORD=your-database-password
DB_PORT=5432

# Redis Configuration
REDIS_HOST=your-redis-service-name
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Authentication
JWT_SECRET=your-jwt-secret-here
ADMIN_JWT_SECRET=your-admin-jwt-secret-here

# Admin Configuration
DEFAULT_ADMIN_EMAIL=admin@taivideonhanh.vn
DEFAULT_ADMIN_PASSWORD=admin123456

# Cookie System (IMPORTANT)
COOKIES_PATH=/app/data/cookies/platform-cookies.txt
ENABLE_COOKIE_AUTH=true

# File Upload
UPLOAD_PATH=/app/data/uploads
MAX_FILE_SIZE=50MB

# Stripe (Optional)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Logging
LOG_LEVEL=info
```

#### **Domains**
```
Primary: taivideonhanh.vn
Aliases: www.taivideonhanh.vn
```

#### **Volumes**
```
Volume Name: app-data
Mount Path: /app/data
Size: 5GB
```

#### **Advanced Settings → Labels (CRITICAL)**
```yaml
# Enable Traefik
traefik.enable=true

# Main service routing
traefik.http.routers.app.rule=Host(`taivideonhanh.vn`) || Host(`www.taivideonhanh.vn`)
traefik.http.routers.app.tls=true
traefik.http.routers.app.tls.certresolver=letsencrypt
traefik.http.routers.app.priority=50

# Admin routes with highest priority
traefik.http.routers.admin.rule=(Host(`taivideonhanh.vn`) || Host(`www.taivideonhanh.vn`)) && PathPrefix(`/admin`)
traefik.http.routers.admin.tls=true
traefik.http.routers.admin.tls.certresolver=letsencrypt
traefik.http.routers.admin.priority=100

# API routes with high priority
traefik.http.routers.api.rule=(Host(`taivideonhanh.vn`) || Host(`www.taivideonhanh.vn`)) && PathPrefix(`/api`)
traefik.http.routers.api.tls=true
traefik.http.routers.api.tls.certresolver=letsencrypt
traefik.http.routers.api.priority=90

# Service configuration
traefik.http.services.app.loadbalancer.server.port=3000

# Middleware for admin security
traefik.http.middlewares.admin-headers.headers.customrequestheaders.X-Forwarded-Proto=https
traefik.http.middlewares.admin-headers.headers.customrequestheaders.X-Forwarded-Host=taivideonhanh.vn
traefik.http.middlewares.admin-headers.headers.customrequestheaders.X-Real-IP=
traefik.http.routers.admin.middlewares=admin-headers

# Rate limiting for admin routes
traefik.http.middlewares.admin-ratelimit.ratelimit.burst=10
traefik.http.middlewares.admin-ratelimit.ratelimit.average=5
traefik.http.routers.admin.middlewares=admin-headers,admin-ratelimit

# API rate limiting
traefik.http.middlewares.api-ratelimit.ratelimit.burst=20
traefik.http.middlewares.api-ratelimit.ratelimit.average=10
traefik.http.routers.api.middlewares=api-ratelimit
```

## 🔧 **Deployment Steps**

### **Step 1: Prepare Repository**
```bash
# Ensure these files exist in your repository:
# - Dockerfile.monorepo
# - start-monorepo.sh
# - health-check-monorepo.sh
# - Updated next.config.js
```

### **Step 2: Create Service in EasyPanel**
1. Go to **Services** → **Create Service**
2. Choose **Git Repository**
3. Connect your GitHub repository
4. Set **Dockerfile** to `Dockerfile.monorepo`
5. Configure environment variables (see above)
6. Add Traefik labels (see above)
7. Create persistent volume

### **Step 3: Deploy**
1. Click **Deploy** in EasyPanel
2. Monitor build logs for any errors
3. Wait for deployment to complete

### **Step 4: Verify Deployment**
```bash
# Test main site
curl -I https://taivideonhanh.vn

# Test API
curl -I https://taivideonhanh.vn/api/health

# Test admin routes (CRITICAL)
curl -I https://taivideonhanh.vn/admin/login

# All should return 200 OK
```

## 🔍 **Troubleshooting**

### **Build Issues**
```bash
# Check build logs in EasyPanel for:
✓ Backend build completed successfully
✓ Frontend build completed successfully
✓ Admin routes included in build
✓ Docker image created successfully
```

### **Runtime Issues**
```bash
# Check service logs in EasyPanel for:
✓ Backend server started (PID: xxx)
✓ Frontend server started (PID: xxx)
✓ Backend health check passed
✓ Frontend health check passed
✓ Admin routes are accessible
```

### **404 Admin Routes**
1. **Check Traefik Labels**: Ensure admin routes have priority 100
2. **Verify Build**: Admin routes should be in `.next/server/app/admin/`
3. **Check Logs**: Look for routing errors in service logs
4. **Test Internal**: SSH into container and test `curl localhost:3000/admin/login`

### **Backend Connection Issues**
1. **Check Environment Variables**: Verify database and Redis connections
2. **Check Logs**: Look for connection errors in `/app/logs/backend.log`
3. **Test Health**: Use health check script: `./health-check-monorepo.sh backend`

### **Cookie Directory Errors**
1. **Check Volume Mount**: Ensure `/app/data` is mounted correctly
2. **Check Permissions**: Volume should be writable by user `nextjs`
3. **Check Logs**: Look for permission errors in backend logs

## 🧪 **Testing Commands**

### **Health Checks**
```bash
# Full health check
./health-check-monorepo.sh

# Quick check
./health-check-monorepo.sh quick

# Backend only
./health-check-monorepo.sh backend

# Frontend only
./health-check-monorepo.sh frontend

# Admin routes only
./health-check-monorepo.sh admin
```

### **External Testing**
```bash
# Test from outside container
curl -I https://taivideonhanh.vn
curl -I https://taivideonhanh.vn/api/health
curl -I https://taivideonhanh.vn/admin/login
curl -I https://taivideonhanh.vn/admin
curl -I https://taivideonhanh.vn/admin/cookie
```

## 📊 **Monitoring**

### **Service Logs**
- **Application Logs**: Available in EasyPanel service logs
- **Backend Logs**: `/app/logs/backend.log` (inside container)
- **Frontend Logs**: `/app/logs/frontend.log` (inside container)

### **Health Monitoring**
- **Docker Health Check**: Runs every 30 seconds
- **EasyPanel Health**: Shows service status
- **Traefik Health**: Shows routing status

### **Performance Metrics**
- **CPU Usage**: Monitor in EasyPanel dashboard
- **Memory Usage**: Monitor in EasyPanel dashboard
- **Disk Usage**: Monitor volume usage
- **Response Times**: Monitor via Traefik metrics

## 🚨 **Emergency Procedures**

### **Service Not Starting**
1. Check build logs for errors
2. Verify environment variables
3. Check volume mounts
4. Restart service in EasyPanel

### **Admin Routes 404**
1. Verify Traefik labels are applied
2. Check frontend build includes admin routes
3. Test internal routing
4. Contact EasyPanel support with configuration

### **Database Connection Issues**
1. Verify database service is running
2. Check connection strings
3. Test database connectivity
4. Check firewall rules

## 🎯 **Expected Results**

After successful deployment:

✅ **Service Running**
- Single container with both frontend and backend
- Health checks passing
- Logs showing both services started

✅ **Routing Working**
- Main site: `https://taivideonhanh.vn` → 200 OK
- API: `https://taivideonhanh.vn/api/health` → 200 OK
- Admin: `https://taivideonhanh.vn/admin/login` → 200 OK

✅ **Admin Access**
- Login: `admin@taivideonhanh.vn` / `admin123456`
- Cookie management functional
- Multi-platform support ready

✅ **Data Persistence**
- Cookie files stored in `/app/data/cookies`
- Upload files stored in `/app/data/uploads`
- Logs stored in `/app/data/logs`

---

**🔥 This configuration provides a complete monorepo deployment solution for EasyPanel with Traefik routing! 🚀**
