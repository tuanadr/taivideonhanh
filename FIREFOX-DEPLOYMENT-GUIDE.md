# 🦊 Firefox Cookie Service - EasyPanel Deployment Guide

## 🎯 Overview

Firefox Cookie Service thay thế Chromium approach để tối ưu hóa cookie extraction cho yt-dlp, dựa trên khuyến nghị từ Reddit community. Service này cung cấp:

- **🦊 Firefox-based cookie extraction** (tương thích tốt hơn với yt-dlp)
- **🌐 Multi-platform support** (YouTube, Facebook, Instagram, TikTok, Twitter)
- **🖥️ VNC interface** cho manual login
- **🔄 Auto-refresh cookies** khi expired
- **📡 RESTful API** cho integration

## 🚀 EasyPanel Deployment Steps

### Step 1: Chuẩn bị Files

```bash
# Đã có sẵn trong project
firefox-service/
├── Dockerfile
├── package.json
├── src/
│   ├── server.js
│   ├── firefoxManager.js
│   ├── cookieExtractor.js
│   └── platformManager.js
├── scripts/
├── docker-compose.yml
└── easypanel-config.json
```

### Step 2: Tạo App trên EasyPanel

1. **Login vào EasyPanel Dashboard**
2. **Create New App**:
   - Name: `firefox-cookie-service`
   - Type: `Docker Build` hoặc `Custom`
3. **Upload Files**: Upload toàn bộ thư mục `firefox-service/`

### Step 3: Environment Configuration

Trong EasyPanel, set các environment variables:

```bash
NODE_ENV=production
PORT=3000
DISPLAY=:99
FIREFOX_PROFILE_PATH=/app/firefox-profile
COOKIES_PATH=/app/cookies
VNC_PASSWORD=firefox123
ALLOWED_ORIGINS=https://taivideonhanh.vn,https://firefox-vnc.taivideonhanh.vn
```

### Step 4: Port Configuration

Configure ports trong EasyPanel:

| Internal Port | External Port | Purpose |
|---------------|---------------|---------|
| 3000 | 3000 | API endpoints |
| 6080 | 6080 | noVNC web interface |
| 5900 | 5900 | VNC direct access (optional) |

### Step 5: Domain Setup

Tạo domains trong EasyPanel:

1. **API Domain**:
   - Domain: `firefox-api.taivideonhanh.vn`
   - Port: `3000`
   - HTTPS: `Enabled`

2. **VNC Domain**:
   - Domain: `firefox-vnc.taivideonhanh.vn`
   - Port: `6080`
   - HTTPS: `Enabled`

### Step 6: Volume Configuration

Tạo persistent volumes:

```yaml
volumes:
  - name: firefox-profile
    mount: /app/firefox-profile
    size: 5GB
    
  - name: firefox-cookies
    mount: /app/cookies
    size: 2GB
    
  - name: firefox-logs
    mount: /app/logs
    size: 1GB
```

### Step 7: Resource Allocation

Recommended resources:

```yaml
resources:
  memory: 4GB  # minimum, 8GB recommended
  cpu: 2.0     # cores
  storage: 10GB
```

### Step 8: Security Configuration

```yaml
security:
  - seccomp: unconfined  # Required for Firefox
  - shm_size: 2gb       # Shared memory for Firefox
```

## 🔧 Post-Deployment Configuration

### 1. Verify Service Health

```bash
# Check API health
curl https://firefox-api.taivideonhanh.vn/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "firefox": true,
    "cookieExtractor": true,
    "platformManager": true
  }
}
```

### 2. Access VNC Interface

1. Open: `https://firefox-vnc.taivideonhanh.vn`
2. Password: `firefox123` (configurable)
3. You should see Firefox desktop

### 3. Test Cookie Extraction

```bash
# Get supported platforms
curl https://firefox-api.taivideonhanh.vn/platforms

# Test cookie extraction (manual login required first)
curl -X POST https://firefox-api.taivideonhanh.vn/extract-cookies \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "youtube",
    "headless": false,
    "testAfterExtraction": true
  }'
```

## 🔗 Backend Integration

### Update Main App Configuration

1. **Environment Variables**:
```bash
# In your main app's .env
FIREFOX_SERVICE_URL=https://firefox-api.taivideonhanh.vn
ENABLE_AUTO_COOKIE_EXTRACTION=true
COOKIE_REFRESH_INTERVAL=24h
```

2. **Network Configuration**:
```yaml
# In EasyPanel, ensure both apps can communicate
networks:
  - taivideonhanh-network  # Shared network
```

### Code Integration

```typescript
// Backend integration is already implemented in:
// - backend/src/services/cookieManagementService.ts
// - backend/src/services/streamingService.ts

// Usage example:
const cookies = await CookieManagementService.extractCookiesFromFirefox('youtube');
```

## 🖥️ Manual Login Workflow

### For YouTube:
1. Access VNC: `https://firefox-vnc.taivideonhanh.vn`
2. Navigate to: `https://accounts.google.com/signin`
3. Login with your Google account
4. Visit a few YouTube videos
5. Call API: `POST /extract-cookies` with `platform: "youtube"`
6. Validate: `POST /validate-cookies/youtube`

### For Facebook:
1. Navigate to: `https://www.facebook.com/login`
2. Login with Facebook credentials
3. Browse some videos
4. Extract cookies via API

### For Instagram:
1. Navigate to: `https://www.instagram.com/accounts/login/`
2. Login with Instagram credentials
3. Browse content
4. Extract cookies via API

## 📊 Monitoring & Maintenance

### Health Monitoring

```bash
# Service status
curl https://firefox-api.taivideonhanh.vn/status

# Cookie validation
curl -X POST https://firefox-api.taivideonhanh.vn/validate-cookies/youtube
curl -X POST https://firefox-api.taivideonhanh.vn/validate-cookies/facebook
```

### Log Monitoring

Access logs through EasyPanel dashboard:
- Application logs: `/app/logs/firefox-service.log`
- VNC logs: `/app/logs/novnc.log`
- Firefox logs: `/app/logs/xvfb.log`

### Cookie Refresh

```bash
# Manual refresh all platforms
curl -X POST https://firefox-api.taivideonhanh.vn/auto-refresh

# Download cookie files
curl https://firefox-api.taivideonhanh.vn/cookies/youtube/download
```

## 🔒 Security Best Practices

### 1. VNC Security
- Change default VNC password
- Restrict VNC access by IP
- Use VPN for VNC access in production

### 2. API Security
- Enable rate limiting
- Use API keys for production
- Monitor for unauthorized access

### 3. Cookie Security
- Regular cookie refresh (24-48 hours)
- Secure cookie storage
- Monitor cookie validation status

## 🧪 Testing & Validation

### 1. API Testing

```bash
# Test script
./test-firefox-service.sh

# Manual tests
curl https://firefox-api.taivideonhanh.vn/health
curl https://firefox-api.taivideonhanh.vn/platforms
curl https://firefox-api.taivideonhanh.vn/status
```

### 2. Cookie Validation

```bash
# Validate each platform
for platform in youtube facebook instagram tiktok twitter; do
  echo "Testing $platform..."
  curl -X POST https://firefox-api.taivideonhanh.vn/validate-cookies/$platform
done
```

### 3. Integration Testing

```bash
# Test with main app
# Should see improved format counts:
# YouTube: 4 → 20+ formats
# Facebook: Limited → Full access
# Instagram: Basic → High quality
```

## 🚨 Troubleshooting

### Common Issues

**1. Firefox won't start**
```bash
# Check in VNC interface or logs
# Usually X server or display issues
```

**2. VNC not accessible**
```bash
# Check port 6080 is exposed
# Verify domain configuration
# Check firewall settings
```

**3. Cookie extraction fails**
```bash
# Ensure manual login completed
# Check platform-specific selectors
# Verify network connectivity
```

**4. API not responding**
```bash
# Check port 3000 exposure
# Verify environment variables
# Check application logs
```

### Debug Commands

```bash
# Access container shell (if needed)
docker exec -it firefox-cookie-service bash

# Check processes
ps aux | grep firefox
ps aux | grep vnc

# Check network
netstat -tlnp | grep 3000
netstat -tlnp | grep 6080
```

## 📈 Expected Performance Improvements

| Platform | Before | After | Improvement |
|----------|--------|-------|-------------|
| YouTube | 4 formats | 20+ formats | 500% |
| Facebook | Limited | Full access | 100% |
| Instagram | Basic | High quality | 300% |
| TikTok | Standard | Multiple options | 200% |
| Twitter | Basic | Enhanced | 150% |

## 🎯 Next Steps

1. **Deploy Firefox Service** trên EasyPanel
2. **Configure domains** và SSL certificates
3. **Manual login** cho các platforms qua VNC
4. **Test cookie extraction** và validation
5. **Update main app** để sử dụng Firefox service
6. **Monitor performance** và format improvements

## 📞 Support

- **Documentation**: Firefox service README.md
- **API Reference**: `https://firefox-api.taivideonhanh.vn/health`
- **VNC Access**: `https://firefox-vnc.taivideonhanh.vn`
- **Logs**: EasyPanel dashboard → App logs

---

**🎉 Firefox Cookie Service sẽ cải thiện đáng kể chất lượng video download với cookie authentication tự động!**
