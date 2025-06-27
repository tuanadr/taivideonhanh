# Production Setup Guide - Tải Video Nhanh

## 🚀 EasyPanel Deployment Configuration

### 1. Environment Variables Setup

#### Backend (.env)
Copy từ `backend/.env.production.example` và cập nhật các giá trị sau:

```bash
# Database Configuration (EasyPanel format)
DB_HOST=taivideonhanh_postgres
DB_USER=postgres
DB_PASSWORD=s1234566  # Thay bằng password thực tế
DB_NAME=postgres

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=s1234566  # Thay bằng password thực tế
REDIS_DB=0

# JWT Configuration - Thay bằng secrets mạnh
JWT_ACCESS_SECRET=pQ7mN3xZ9cV1bY5tA8uR2eO4iL6kJ0hF!@#$
JWT_REFRESH_SECRET=zD9pX4rF8sC2vB6nM1tY5uJ7kH0gA3eLqWcE!@#$
JWT_SECRET=kV3jH6pS9dR2fZ5yC8aX1wB4nM7qL0eG!@#$
ADMIN_JWT_SECRET=gP5kN8sT2uW4vR6cD1bY7jF0hM9qA3eL!@#$

# Admin Configuration
DEFAULT_ADMIN_EMAIL=admin@taivideonhanh.vn
DEFAULT_ADMIN_PASSWORD=admin123456  # Thay bằng password mạnh

# Domain Configuration
NEXT_PUBLIC_API_URL=https://taivideonhanh.vn/api
CORS_ORIGIN=https://taivideonhanh.vn
```

#### Frontend (.env.local)
Copy từ `frontend/.env.production.example` và cập nhật:

```bash
NEXT_PUBLIC_API_URL=https://taivideonhanh.vn/api
NEXT_PUBLIC_BACKEND_URL=https://taivideonhanh.vn
```

### 2. Biến Môi Trường Bổ Sung Cần Thiết

#### 🔐 Security & Authentication
```bash
# Session Security
SESSION_SECRET=your_unique_session_secret_here

# CORS Configuration
CORS_ORIGIN=https://taivideonhanh.vn

# Security Headers
ENABLE_SECURITY_HEADERS=true
ENABLE_HELMET=true
TRUST_PROXY=true
```

#### 📧 Email Configuration (Tùy chọn)
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here
FROM_EMAIL=noreply@taivideonhanh.vn
```

#### 💳 Stripe Configuration (Nếu có subscription)
```bash
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

#### 📊 Analytics & Monitoring
```bash
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
ENABLE_ANALYTICS=true
ENABLE_ERROR_TRACKING=true
```

#### 🗂️ File & Storage Configuration
```bash
# File Upload
MAX_FILE_SIZE=100MB
UPLOAD_PATH=/app/data/uploads
ALLOWED_FILE_TYPES=mp4,avi,mkv,mov,wmv,flv,webm,m4v,3gp

# Cookie Storage
COOKIES_PATH=/app/data/cookies/platform-cookies.txt
YOUTUBE_COOKIES_PATH=/app/data/cookies/youtube-cookies.txt
CHROME_USER_DATA_DIR=/app/data/chrome-profile
```

#### ⚡ Performance & Caching
```bash
# Database Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

# Cache Configuration
CACHE_TTL=3600
ENABLE_REDIS_CACHE=true

# Queue Configuration
QUEUE_REDIS_HOST=redis
QUEUE_REDIS_PORT=6379
QUEUE_REDIS_PASSWORD=s1234566
QUEUE_REDIS_DB=1
```

#### 🎥 Video Processing
```bash
# Download Configuration
MAX_DOWNLOAD_SIZE=2GB
DOWNLOAD_TIMEOUT=300000
CONCURRENT_DOWNLOADS=5

# Video Quality
VIDEO_QUALITY_OPTIONS=144p,240p,360p,480p,720p,1080p
DEFAULT_VIDEO_QUALITY=720p
NEXT_PUBLIC_DEFAULT_VIDEO_QUALITY=720p
```

#### 🛡️ Rate Limiting & Security
```bash
# API Rate Limiting
API_RATE_LIMIT_WINDOW=900000
API_RATE_LIMIT_MAX=100
ENABLE_RATE_LIMITING=true

# Streaming Limits
MAX_CONCURRENT_STREAMS=3
MAX_TOKENS_PER_USER=5
MAX_TOKENS_PER_HOUR=20
```

### 3. EasyPanel Specific Configuration

#### Docker Compose Override
Tạo file `docker-compose.override.yml` cho production:

```yaml
version: '3.8'
services:
  app:
    environment:
      - NODE_ENV=production
    volumes:
      - /app/data:/app/data
      - /app/logs:/app/logs
    restart: unless-stopped
```

#### Health Check
```bash
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
```

### 4. Deployment Checklist

- [ ] Cập nhật tất cả passwords và secrets
- [ ] Cấu hình database connection
- [ ] Setup Redis connection
- [ ] Cấu hình CORS cho domain chính
- [ ] Setup file storage paths
- [ ] Cấu hình email (nếu cần)
- [ ] Setup Stripe (nếu có subscription)
- [ ] Cấu hình analytics
- [ ] Test health check endpoints
- [ ] Verify admin login functionality

### 5. Monitoring & Maintenance

#### Logs
```bash
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
LOG_FILE_PATH=/app/logs/app.log
```

#### Backup
```bash
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
```

### 6. Security Best Practices

1. **Thay đổi tất cả default passwords**
2. **Sử dụng secrets mạnh cho JWT**
3. **Enable security headers**
4. **Cấu hình CORS đúng domain**
5. **Enable rate limiting**
6. **Regular backup database**
7. **Monitor logs và performance**

### 7. Troubleshooting

#### Common Issues:
- **Database connection**: Kiểm tra DB_HOST và credentials
- **Redis connection**: Verify REDIS_HOST và password
- **CORS errors**: Đảm bảo CORS_ORIGIN đúng domain
- **File upload**: Kiểm tra UPLOAD_PATH permissions
- **Admin login**: Verify ADMIN_JWT_SECRET và credentials
