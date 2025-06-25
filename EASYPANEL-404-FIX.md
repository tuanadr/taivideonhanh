# 🚨 EasyPanel Admin Routes 404 Fix

## 🔍 **Problem Analysis**

**Issue**: `https://taivideonhanh.vn/admin/login` returns 404
**Root Cause**: EasyPanel + Traefik routing doesn't handle Next.js app directory admin routes properly

## 🛠️ **Immediate Fix for EasyPanel**

### **Step 1: Update Frontend Service Labels**

In EasyPanel → Your Frontend Service → Settings → Advanced → Labels:

```yaml
# Basic routing
traefik.enable=true
traefik.http.routers.frontend.rule=Host(`taivideonhanh.vn`)
traefik.http.routers.frontend.tls=true
traefik.http.routers.frontend.tls.certresolver=letsencrypt

# Admin routes with higher priority (CRITICAL FIX)
traefik.http.routers.admin.rule=Host(`taivideonhanh.vn`) && PathPrefix(`/admin`)
traefik.http.routers.admin.tls=true
traefik.http.routers.admin.tls.certresolver=letsencrypt
traefik.http.routers.admin.priority=100

# Service configuration
traefik.http.services.frontend.loadbalancer.server.port=3000

# Headers middleware
traefik.http.middlewares.admin-headers.headers.customrequestheaders.X-Forwarded-Proto=https
traefik.http.routers.admin.middlewares=admin-headers
```

### **Step 2: Update Backend Environment Variables**

In EasyPanel → Backend Service → Environment Variables:

```bash
# Fix cookie directory permission issue
COOKIES_PATH=/app/data/cookies/platform-cookies.txt
ENABLE_COOKIE_AUTH=true

# Admin credentials
DEFAULT_ADMIN_EMAIL=admin@taivideonhanh.vn
DEFAULT_ADMIN_PASSWORD=admin123456
```

### **Step 3: Add Persistent Volume**

In EasyPanel → Backend Service → Volumes:

```
Volume Name: cookie-data
Mount Path: /app/data/cookies
Size: 1GB
```

### **Step 4: Rebuild Services**

1. **Frontend Service**: Click "Rebuild" button
2. **Backend Service**: Click "Rebuild" button
3. Wait for both to complete

## 🔧 **Code Changes Applied**

### **Next.js Configuration Fix**
Updated `frontend/next.config.js`:

```javascript
{
  output: 'standalone',
  trailingSlash: false,  // Better Traefik compatibility
  
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
      // CRITICAL: Ensure admin routes are handled
      {
        source: '/admin/:path*',
        destination: '/admin/:path*',
      },
    ]
  },
  
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
  
  experimental: {
    appDir: true,  // Enable app directory
  },
}
```

### **Cookie Service Fix**
Updated `backend/src/services/cookieService.ts`:

```typescript
// Changed from /tmp/cookies to /app/data/cookies
private static readonly COOKIES_DIR = '/app/data/cookies';

// Better error handling for EasyPanel
public static async initializeDirectories(): Promise<void> {
  try {
    await mkdir(this.COOKIES_DIR, { recursive: true });
    await mkdir(this.BACKUP_DIR, { recursive: true });
  } catch (error) {
    console.warn('Cookie directory creation failed:', error.message);
    // Don't crash server - continue without cookie functionality
  }
}
```

## 🧪 **Testing Commands**

After applying fixes, test with:

```bash
# Test main site
curl -I https://taivideonhanh.vn
# Expected: 200 OK

# Test API
curl -I https://taivideonhanh.vn/api/health  
# Expected: 200 OK

# Test admin login (CRITICAL TEST)
curl -I https://taivideonhanh.vn/admin/login
# Expected: 200 OK (NOT 404)

# Test admin dashboard
curl -I https://taivideonhanh.vn/admin
# Expected: 200 OK
```

## 🔍 **Debugging Steps**

### **1. Check Frontend Build Logs**
In EasyPanel Frontend Service logs, verify:
```
✓ Compiled successfully
✓ Route (app) /admin/page compiled
✓ Route (app) /admin/login/page compiled
```

### **2. Check Backend Logs**
In EasyPanel Backend Service logs, verify:
```
✓ Cookie directories initialized successfully
✓ Server started on port 5000
✓ Database connection established
```

### **3. Check Traefik Dashboard**
In EasyPanel → Services → Traefik:
- Verify admin routes are registered
- Check priority is set to 100
- Confirm SSL certificates are valid

## 🚨 **If Still 404**

### **Emergency Troubleshooting**

1. **Force Rebuild Frontend**
   ```bash
   # In EasyPanel Frontend Service
   # Settings → Advanced → Force Rebuild
   ```

2. **Check Build Output**
   ```bash
   # In build logs, verify admin routes exist:
   # ✓ .next/server/app/admin/layout.js
   # ✓ .next/server/app/admin/page.js
   # ✓ .next/server/app/admin/login/page.js
   ```

3. **Restart All Services**
   ```bash
   # Stop all services, then start in order:
   # 1. Database
   # 2. Redis  
   # 3. Backend
   # 4. Frontend
   ```

4. **Check Traefik Configuration**
   ```bash
   # In EasyPanel Traefik service logs
   # Look for routing rules registration
   ```

## 🎯 **Expected Results**

After applying these fixes:

✅ **Admin Routes Accessible**
- `https://taivideonhanh.vn/admin/login` → 200 OK
- `https://taivideonhanh.vn/admin` → 200 OK  
- `https://taivideonhanh.vn/admin/cookie` → 200 OK

✅ **Backend Stable**
- No cookie directory permission errors
- Server starts without crashes
- Cookie functionality available

✅ **Traefik Routing**
- Admin routes have priority 100
- Proper headers are set
- SSL works correctly

## 📞 **Support**

If admin routes still return 404 after these fixes:

1. **Check EasyPanel Status Page** for Traefik issues
2. **Contact EasyPanel Support** with:
   - This guide
   - Your service configuration
   - Build logs showing admin routes exist
3. **Verify DNS** is pointing to correct EasyPanel instance

## 🔧 **Quick Verification Script**

```bash
#!/bin/bash
echo "🧪 Testing TaiVideoNhanh Admin Routes..."

echo "1. Main site:"
curl -s -o /dev/null -w "%{http_code}\n" https://taivideonhanh.vn

echo "2. API health:"
curl -s -o /dev/null -w "%{http_code}\n" https://taivideonhanh.vn/api/health

echo "3. Admin login (CRITICAL):"
curl -s -o /dev/null -w "%{http_code}\n" https://taivideonhanh.vn/admin/login

echo "4. Admin dashboard:"
curl -s -o /dev/null -w "%{http_code}\n" https://taivideonhanh.vn/admin

echo "✅ All should return 200, not 404"
```

**Save this as `test-admin-routes.sh` and run after deployment.**

---

**🔥 This fix specifically addresses EasyPanel + Traefik routing issues for Next.js app directory admin routes!**
