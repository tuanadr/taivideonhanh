# Production Deployment Guide - Monorepo Single Service

## 🚀 EasyPanel Deployment

### Environment Variables

Copy từ `.env.production.example` và cập nhật với giá trị thực tế:

```bash
# Database Configuration (EasyPanel format)
DB_HOST=taivideonhanh_postgres
DB_USER=postgres
DB_PASSWORD=s1234566
DB_NAME=postgres

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=s1234566
REDIS_DB=0

# JWT Configuration
JWT_ACCESS_SECRET=pQ7mN3xZ9cV1bY5tA8uR2eO4iL6kJ0hF!@#$
JWT_REFRESH_SECRET=zD9pX4rF8sC2vB6nM1tY5uJ7kH0gA3eLqWcE!@#$
JWT_SECRET=kV3jH6pS9dR2fZ5yC8aX1wB4nM7qL0eG!@#$
ADMIN_JWT_SECRET=gP5kN8sT2uW4vR6cD1bY7jF0hM9qA3eL!@#$

# Admin Configuration
DEFAULT_ADMIN_EMAIL=admin@taivideonhanh.vn
DEFAULT_ADMIN_PASSWORD=admin123456

# API Configuration
NEXT_PUBLIC_API_URL=https://taivideonhanh.vn/api
NEXT_PUBLIC_BACKEND_URL=https://taivideonhanh.vn
CORS_ORIGIN=https://taivideonhanh.vn

# Security
SESSION_SECRET=xR9mK2pL5nQ8wE3tY6uI1oP4aS7dF0gH!@#$
ENABLE_SECURITY_HEADERS=true
TRUST_PROXY=true

# Performance
ENABLE_RATE_LIMITING=true
PERFORMANCE_MONITORING_ENABLED=true
HEALTH_CHECK_ENABLED=true

# Paths
COOKIES_PATH=/app/data/cookies/platform-cookies.txt
UPLOAD_PATH=/app/data/uploads
LOG_FILE_PATH=/app/logs/app.log
```

### Deployment Steps

1. **Copy Environment Variables**
   - Paste vào EasyPanel → Environment Variables

2. **Deploy Monorepo**
   - EasyPanel tự động build cả frontend + backend
   - Single service deployment

3. **Verify**
   - Truy cập: https://taivideonhanh.vn
   - Admin login: admin@taivideonhanh.vn / admin123456
   - API health: https://taivideonhanh.vn/api/health

### Features

✅ **Single Service**: Frontend + Backend trong 1 container  
✅ **Auto-build**: EasyPanel tự động detect monorepo  
✅ **Production Ready**: Security, monitoring, backup  
✅ **Scalable**: Optional services sẵn sàng  

### Optional Services

Uncomment trong environment variables khi cần:
- Stripe payment processing
- Email notifications
- Google Analytics
- CDN configuration

---
**Ready for production deployment! 🎉**
