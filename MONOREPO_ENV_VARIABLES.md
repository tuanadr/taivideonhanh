# Complete Environment Variables - Monorepo Single Service

## 🔧 Biến môi trường đầy đủ cho EasyPanel (1 service duy nhất)

### 📝 Copy-paste trực tiếp vào EasyPanel Environment Variables:

```bash
# Production Environment Configuration - Monorepo
NODE_ENV=production

# Database Configuration (EasyPanel format)
DB_HOST=taivideonhanh_postgres
DB_USER=postgres
DB_PASSWORD=s1234566
DB_NAME=postgres
DB_PORT=5432

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=s1234566
REDIS_DB=0
REDIS_URL=redis://:s1234566@redis:6379/0

# JWT Configuration
JWT_ACCESS_SECRET=pQ7mN3xZ9cV1bY5tA8uR2eO4iL6kJ0hF!@#$
JWT_REFRESH_SECRET=zD9pX4rF8sC2vB6nM1tY5uJ7kH0gA3eLqWcE!@#$
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ROTATE_REFRESH_TOKENS=true
JWT_SECRET=kV3jH6pS9dR2fZ5yC8aX1wB4nM7qL0eG!@#$
ADMIN_JWT_SECRET=gP5kN8sT2uW4vR6cD1bY7jF0hM9qA3eL!@#$

# Admin Configuration
ADMIN_EMAILS=admin@taivideonhanh.vn
DEFAULT_ADMIN_EMAIL=admin@taivideonhanh.vn
DEFAULT_ADMIN_PASSWORD=admin123456

# API Configuration (Domain taivideonhanh.vn)
NEXT_PUBLIC_API_URL=https://taivideonhanh.vn/api
NEXT_PUBLIC_BACKEND_URL=https://taivideonhanh.vn

# Security Configuration
CORS_ORIGIN=https://taivideonhanh.vn
ENABLE_SECURITY_HEADERS=true
ENABLE_HELMET=true
TRUST_PROXY=true
SESSION_SECRET=xR9mK2pL5nQ8wE3tY6uI1oP4aS7dF0gH!@#$
SESSION_MAX_AGE=86400000

# Server Configuration
PORT=5000
LOG_LEVEL=info
HOSTNAME=0.0.0.0

# Streaming Configuration
STREAM_TOKEN_EXPIRES_MINUTES=30
MAX_CONCURRENT_STREAMS=3
MAX_TOKENS_PER_USER=5
MAX_TOKENS_PER_HOUR=20
STREAM_BUFFER_SIZE=65536

# Performance Monitoring
METRICS_RETENTION_HOURS=24
PERFORMANCE_MONITORING_ENABLED=true
ENABLE_RATE_LIMITING=true

# Cookie Authentication (Production paths)
COOKIES_PATH=/app/data/cookies/platform-cookies.txt
YOUTUBE_COOKIES_PATH=/app/data/cookies/youtube-cookies.txt
CHROME_USER_DATA_DIR=/app/data/chrome-profile
ENABLE_COOKIE_AUTH=true
SKIP_COOKIE_AUTH=false

# YouTube Download Optimization
YOUTUBE_MAX_RETRIES=3
YOUTUBE_RETRY_DELAY=2000
YOUTUBE_MIN_REQUEST_INTERVAL=2000
YOUTUBE_USER_AGENT_ROTATION=true

# Frontend Configuration
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_APP_NAME=Tải Video Nhanh
NEXT_PUBLIC_APP_DESCRIPTION=Tải video từ các nền tảng phổ biến một cách nhanh chóng và dễ dàng
NEXT_PUBLIC_APP_URL=https://taivideonhanh.vn
NEXT_PUBLIC_SUPPORT_EMAIL=support@taivideonhanh.vn

# Database Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

# Cache Configuration
CACHE_TTL=3600
ENABLE_REDIS_CACHE=true

# Queue Configuration (for background jobs)
QUEUE_REDIS_HOST=redis
QUEUE_REDIS_PORT=6379
QUEUE_REDIS_PASSWORD=s1234566
QUEUE_REDIS_DB=1

# Health Check Configuration
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=30000

# Monitoring & Logging
ENABLE_REQUEST_LOGGING=true
ENABLE_ERROR_TRACKING=true
LOG_FILE_PATH=/app/logs/app.log

# Feature Flags
ENABLE_USER_REGISTRATION=true
ENABLE_SUBSCRIPTION_FEATURES=true
ENABLE_ADMIN_PANEL=true
ENABLE_API_DOCS=false
NEXT_PUBLIC_ENABLE_USER_REGISTRATION=true
NEXT_PUBLIC_ENABLE_SUBSCRIPTION_FEATURES=true
NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN=false
NEXT_PUBLIC_ENABLE_PWA=true

# File Upload Configuration
MAX_FILE_SIZE=100MB
UPLOAD_PATH=/app/data/uploads
ALLOWED_FILE_TYPES=mp4,avi,mkv,mov,wmv,flv,webm,m4v,3gp

# Video Configuration
MAX_DOWNLOAD_SIZE=2GB
DOWNLOAD_TIMEOUT=300000
CONCURRENT_DOWNLOADS=5
VIDEO_QUALITY_OPTIONS=144p,240p,360p,480p,720p,1080p
DEFAULT_VIDEO_QUALITY=720p
NEXT_PUBLIC_MAX_DOWNLOAD_SIZE=2GB
NEXT_PUBLIC_SUPPORTED_PLATFORMS=YouTube,Facebook,Instagram,TikTok,Twitter,Vimeo
NEXT_PUBLIC_DEFAULT_VIDEO_QUALITY=720p
NEXT_PUBLIC_QUALITY_OPTIONS=144p,240p,360p,480p,720p,1080p

# UI Configuration
NEXT_PUBLIC_THEME=light
NEXT_PUBLIC_ENABLE_DARK_MODE=true
NEXT_PUBLIC_DEFAULT_LANGUAGE=vi

# API Rate Limiting
API_RATE_LIMIT_WINDOW=900000
API_RATE_LIMIT_MAX=100
API_RATE_LIMIT_SKIP_SUCCESSFUL=false

# WebSocket Configuration
ENABLE_WEBSOCKET=true
WS_HEARTBEAT_INTERVAL=30000

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30

# Maintenance Mode
MAINTENANCE_MODE=false
MAINTENANCE_MESSAGE=Hệ thống đang bảo trì, vui lòng quay lại sau.

# Legal & Compliance
PRIVACY_POLICY_URL=https://taivideonhanh.vn/privacy
TERMS_OF_SERVICE_URL=https://taivideonhanh.vn/terms
DMCA_EMAIL=dmca@taivideonhanh.vn
NEXT_PUBLIC_PRIVACY_POLICY_URL=https://taivideonhanh.vn/privacy
NEXT_PUBLIC_TERMS_OF_SERVICE_URL=https://taivideonhanh.vn/terms
NEXT_PUBLIC_DMCA_EMAIL=dmca@taivideonhanh.vn

# Performance Configuration
NEXT_PUBLIC_ENABLE_SERVICE_WORKER=true
NEXT_PUBLIC_CACHE_DURATION=3600

# Security Configuration (Frontend)
NEXT_PUBLIC_ENABLE_CSP=true
NEXT_PUBLIC_ENABLE_SECURITY_HEADERS=true

# Build Configuration
ANALYZE=false
BUNDLE_ANALYZE=false

# Notification Configuration
ENABLE_PUSH_NOTIFICATIONS=true
VAPID_SUBJECT=mailto:admin@taivideonhanh.vn
NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true

# Domain Configuration
DOMAIN=taivideonhanh.vn

# Optional - Stripe Configuration (Uncomment if needed)
# STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
# STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here
# STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here

# Optional - Email Configuration (Uncomment if needed)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your_email@gmail.com
# SMTP_PASSWORD=your_app_password_here
# FROM_EMAIL=noreply@taivideonhanh.vn

# Optional - Analytics Configuration (Uncomment if needed)
# GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
# ENABLE_ANALYTICS=true
# NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
# NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Optional - CDN Configuration (Uncomment if needed)
# CDN_URL=https://cdn.taivideonhanh.vn
# ENABLE_CDN=false
# NEXT_PUBLIC_CDN_URL=https://cdn.taivideonhanh.vn
# NEXT_PUBLIC_ENABLE_CDN=false

# Optional - Social Media Integration (Uncomment if needed)
# FACEBOOK_APP_ID=your_facebook_app_id
# GOOGLE_CLIENT_ID=your_google_client_id
# TWITTER_API_KEY=your_twitter_api_key
# NEXT_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# Optional - Push Notifications (Uncomment if needed)
# VAPID_PUBLIC_KEY=your_vapid_public_key
# VAPID_PRIVATE_KEY=your_vapid_private_key
# NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key

# Optional - Error Tracking (Uncomment if needed)
# NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true
# NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
```

## 🚀 Hướng dẫn sử dụng trên EasyPanel:

### 1. **Copy Environment Variables**
- Copy toàn bộ nội dung trên
- Paste vào EasyPanel → App Settings → Environment Variables

### 2. **Deploy Monorepo**
- EasyPanel sẽ tự động detect và build cả frontend + backend
- Một service duy nhất chạy cả hai

### 3. **Verify Deployment**
- Truy cập: https://taivideonhanh.vn
- Test admin login: admin@taivideonhanh.vn / admin123456
- Kiểm tra API: https://taivideonhanh.vn/api/health

## ✅ Đặc điểm:

- **✅ Single Service**: Chỉ 1 service cho cả frontend và backend
- **✅ EasyPanel Optimized**: Đúng format cho EasyPanel deployment
- **✅ Production Ready**: Tất cả biến đã điền sẵn với credentials hiện tại
- **✅ Security First**: JWT secrets mạnh, CORS, security headers
- **✅ Performance**: Connection pooling, caching, rate limiting
- **✅ Monitoring**: Health checks, logging, backup
- **✅ Scalable**: Optional services sẵn sàng khi cần

## 🔧 Optional Services:

Uncomment các dòng khi cần sử dụng:
- **Stripe**: Payment processing
- **Email**: SMTP notifications  
- **Analytics**: Google Analytics
- **CDN**: Content delivery
- **Social Login**: Facebook, Google
- **Push Notifications**: Web push
- **Error Tracking**: Sentry

**Ready for production deployment! 🎉**
