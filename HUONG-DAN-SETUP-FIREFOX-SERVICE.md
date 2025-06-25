# 🦊 Hướng dẫn Setup Firefox Cookie Management System

## 📋 Tổng quan

Hướng dẫn chi tiết từng bước để deploy và sử dụng Firefox Cookie Management System trên EasyPanel. Hệ thống này sẽ cải thiện đáng kể chất lượng video download với cookie authentication tự động.

## ✅ Checklist Chuẩn bị

- [ ] Tài khoản EasyPanel đã setup
- [ ] Domain `taivideonhanh.vn` đã được cấu hình
- [ ] Quyền truy cập vào GitHub repository
- [ ] Tài khoản video platforms (YouTube, Facebook, Instagram, TikTok, Twitter)

## 🚀 Bước 1: Deploy Firefox Service trên EasyPanel

### 1.1 Tạo App mới trên EasyPanel

1. **Login vào EasyPanel Dashboard**
   ```
   https://your-easypanel-domain.com
   ```

2. **Tạo New App**:
   - Click **"Create App"**
   - App Name: `firefox-cookie-service`
   - App Type: **"Docker Build"**
   - Repository: `https://github.com/tuanadr/taivideonhanh`
   - Branch: `fix/update-package-lock-for-dotenv` (hoặc branch có Firefox service)
   - Build Context: `firefox-service`
   - Dockerfile: `Dockerfile`

### 1.2 Cấu hình Environment Variables

Trong EasyPanel App Settings, thêm các environment variables:

```bash
NODE_ENV=production
PORT=3000
DISPLAY=:99
FIREFOX_PROFILE_PATH=/app/firefox-profile
COOKIES_PATH=/app/cookies
VNC_PASSWORD=firefox123
ALLOWED_ORIGINS=https://taivideonhanh.vn,https://firefox-vnc.taivideonhanh.vn
```

### 1.3 Cấu hình Ports

Expose các ports sau:

| Internal Port | External Port | Protocol | Purpose |
|---------------|---------------|----------|---------|
| 3000 | 3000 | TCP | API endpoints |
| 6080 | 6080 | TCP | noVNC web interface |
| 5900 | 5900 | TCP | VNC direct (optional) |

### 1.4 Cấu hình Volumes

Tạo persistent volumes:

```yaml
Volumes:
  - Name: firefox-profile
    Mount Path: /app/firefox-profile
    Size: 5GB
    
  - Name: firefox-cookies
    Mount Path: /app/cookies
    Size: 2GB
    
  - Name: firefox-logs
    Mount Path: /app/logs
    Size: 1GB
```

### 1.5 Cấu hình Resources

```yaml
Resources:
  Memory: 4GB (minimum), 8GB (recommended)
  CPU: 2.0 cores
  Storage: 10GB total
```

### 1.6 Security Settings

```yaml
Security:
  - seccomp: unconfined  # Required for Firefox
  - shm_size: 2gb       # Shared memory for Firefox
```

## 🌐 Bước 2: Cấu hình Domain và SSL

### 2.1 Tạo Domains

Trong EasyPanel Domain Settings:

1. **API Domain**:
   - Domain: `firefox-api.taivideonhanh.vn`
   - Target Port: `3000`
   - HTTPS: `Enabled`
   - SSL Certificate: `Auto (Let's Encrypt)`

2. **VNC Domain**:
   - Domain: `firefox-vnc.taivideonhanh.vn`
   - Target Port: `6080`
   - HTTPS: `Enabled`
   - SSL Certificate: `Auto (Let's Encrypt)`

### 2.2 DNS Configuration

Cấu hình DNS records tại nhà cung cấp domain:

```
Type: A
Name: firefox-api
Value: [EasyPanel Server IP]
TTL: 300

Type: A
Name: firefox-vnc
Value: [EasyPanel Server IP]
TTL: 300
```

### 2.3 Verify SSL Certificates

Sau khi deploy, kiểm tra SSL:

```bash
# Test API domain
curl -I https://firefox-api.taivideonhanh.vn/health

# Test VNC domain
curl -I https://firefox-vnc.taivideonhanh.vn
```

## 🐳 Bước 3: Build và Deploy Docker Container

### 3.1 Automatic Build

EasyPanel sẽ tự động build từ GitHub repository:

1. **Monitor Build Logs**:
   - Vào App → Logs → Build Logs
   - Kiểm tra quá trình build thành công

2. **Expected Build Steps**:
   ```
   ✅ Installing Firefox
   ✅ Installing Node.js dependencies
   ✅ Setting up VNC server
   ✅ Configuring supervisord
   ✅ Creating user permissions
   ```

### 3.2 Manual Build (nếu cần)

Nếu auto build fail, có thể build manual:

```bash
# Clone repository
git clone https://github.com/tuanadr/taivideonhanh
cd taivideonhanh/firefox-service

# Build Docker image
docker build -t firefox-cookie-service .

# Test locally
docker run -p 3000:3000 -p 6080:6080 firefox-cookie-service
```

### 3.3 Verify Deployment

Kiểm tra service đã deploy thành công:

```bash
# Health check
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

## ✅ Checklist Bước 1-3

- [ ] EasyPanel app được tạo thành công
- [ ] Environment variables đã cấu hình
- [ ] Ports đã expose đúng
- [ ] Volumes đã tạo và mount
- [ ] Resources đã allocate đủ
- [ ] Domains đã cấu hình và có SSL
- [ ] DNS records đã point đúng IP
- [ ] Docker build thành công
- [ ] Health check API trả về "healthy"
- [ ] VNC interface accessible

## 🔧 Troubleshooting Bước 1-3

### Build Fails
```bash
# Check build logs trong EasyPanel
# Common issues:
- Insufficient memory during build
- Network timeout downloading packages
- Missing dependencies

# Solutions:
- Increase build memory limit
- Retry build
- Check Dockerfile syntax
```

### Service Won't Start
```bash
# Check application logs
# Common issues:
- Port conflicts
- Missing environment variables
- Volume mount permissions

# Solutions:
- Verify port configuration
- Check all env vars are set
- Fix volume permissions
```

### Domain Not Accessible
```bash
# Check DNS propagation
nslookup firefox-api.taivideonhanh.vn

# Check SSL certificate
openssl s_client -connect firefox-api.taivideonhanh.vn:443

# Solutions:
- Wait for DNS propagation (up to 24h)
- Verify DNS records
- Check EasyPanel proxy configuration
```

---

**Tiếp theo**: [Bước 4-6: Đăng nhập và sử dụng](./HUONG-DAN-SU-DUNG-FIREFOX-SERVICE.md)
