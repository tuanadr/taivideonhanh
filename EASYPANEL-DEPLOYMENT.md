# 🚀 EasyPanel Deployment Guide - TaiVideoNhanh

Hướng dẫn deploy dự án TaiVideoNhanh (monorepo) lên EasyPanel sử dụng một App duy nhất.

## 📋 Tổng quan

- **Kiến trúc**: Monorepo với Frontend (Next.js) + Backend (Node.js) trong một container
- **Reverse Proxy**: Nginx internal routing + EasyPanel Traefik
- **Database**: PostgreSQL + Redis services riêng biệt
- **SSL**: Tự động qua EasyPanel Let's Encrypt

## 🏗️ Cấu trúc Deployment

```
EasyPanel Services:
├── taivideonhanh-db (PostgreSQL)
├── taivideonhanh-redis (Redis)  
└── taivideonhanh (Main App)
    ├── Frontend (Next.js) :3000
    ├── Backend (Node.js) :5000
    └── Nginx Proxy :80
```

## 🚀 Bước 1: Chuẩn bị Repository

1. **Đảm bảo code đã được push lên GitHub**:
```bash
git add .
git commit -m "Prepare for EasyPanel deployment"
git push origin main
```

2. **Tạo environment template**:
```bash
chmod +x deploy-easypanel.sh
./deploy-easypanel.sh
```

## 🗄️ Bước 2: Tạo Database Services

### PostgreSQL Service
1. Vào EasyPanel Dashboard
2. Tạo service mới → Chọn **PostgreSQL**
3. Cấu hình:
   - **Name**: `taivideonhanh-db`
   - **Database**: `taivideonhanh`
   - **Username**: `user`
   - **Password**: `[tạo password mạnh]`

### Redis Service
1. Tạo service mới → Chọn **Redis**
2. Cấu hình:
   - **Name**: `taivideonhanh-redis`

## 📱 Bước 3: Tạo Main App

1. **Tạo App mới**:
   - **Name**: `taivideonhanh`
   - **Source**: GitHub Repository
   - **Repository**: `tuanadr/taivideonhanh`
   - **Branch**: `main`

2. **Build Configuration**:
   - **Build Type**: `Dockerfile`
   - **Dockerfile Path**: `Dockerfile`
   - **Build Context**: `.` (root của repo)

3. **Port Configuration**:
   - **Internal Port**: `80`
   - **External Port**: `80`

## ⚙️ Bước 4: Environment Variables

Copy các biến môi trường từ file `.env.easypanel` được tạo:

```env
# Application
NODE_ENV=production

# Database (EasyPanel format)
DB_HOST=taivideonhanh_postgres
DB_USER=postgres
DB_PASSWORD=[password từ PostgreSQL service]
DB_NAME=postgres

# Redis (EasyPanel format)
REDIS_URL=redis://redis:6379

# JWT Secrets (TẠO MỚI!)
JWT_ACCESS_SECRET=[64 ký tự ngẫu nhiên]
JWT_REFRESH_SECRET=[64 ký tự ngẫu nhiên]
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ROTATE_REFRESH_TOKENS=true

# Admin
ADMIN_EMAILS=admin@yourdomain.com

# Streaming
STREAM_TOKEN_EXPIRES_MINUTES=30
MAX_CONCURRENT_STREAMS=3
MAX_TOKENS_PER_USER=5
MAX_TOKENS_PER_HOUR=20
STREAM_BUFFER_SIZE=65536
METRICS_RETENTION_HOURS=24
PERFORMANCE_MONITORING_ENABLED=true

# Frontend
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_TELEMETRY_DISABLED=1
```

## 🌐 Bước 5: Cấu hình Domain

1. **Thêm Domain**:
   - Vào App `taivideonhanh`
   - Thêm domain: `yourdomain.com`
   - Enable **SSL** (Let's Encrypt)

2. **Routing tự động**:
   - `yourdomain.com/` → Frontend (Next.js)
   - `yourdomain.com/api/` → Backend (Node.js API)

## 🔍 Bước 6: Health Check

EasyPanel sẽ tự động sử dụng health check từ Dockerfile:
- **Path**: `/api/health`
- **Interval**: 30s
- **Timeout**: 10s

## 📊 Monitoring

### Logs
- Vào EasyPanel Dashboard
- Chọn App `taivideonhanh`
- Tab **Logs** để xem real-time logs

### Health Status
- Frontend: `https://yourdomain.com`
- Backend API: `https://yourdomain.com/api/health`
- Database: Kiểm tra qua backend health endpoint

## 🔧 Troubleshooting

### Build Errors
```bash
# Test build locally
docker build -t taivideonhanh-test .
docker run -p 80:80 taivideonhanh-test
```

### Service Connection Issues
1. Kiểm tra service names trong environment variables
2. Đảm bảo PostgreSQL và Redis services đã running
3. Kiểm tra network connectivity trong EasyPanel

### SSL Issues
- EasyPanel Traefik tự động handle SSL
- Đảm bảo domain đã point đúng IP server
- Chờ vài phút để Let's Encrypt generate certificate

## 🚀 Deployment Commands

```bash
# Chuẩn bị deployment
./deploy-easypanel.sh

# Test build trước khi deploy
./deploy-easypanel.sh --test

# Push changes và trigger rebuild
git add .
git commit -m "Update for production"
git push origin main
```

## 📋 Checklist Deployment

- [ ] PostgreSQL service created và running
- [ ] Redis service created và running  
- [ ] Main app created với đúng Dockerfile path
- [ ] Environment variables đã copy từ `.env.easypanel`
- [ ] Domain đã được thêm và SSL enabled
- [ ] Health check đang hoạt động
- [ ] Frontend accessible tại `https://yourdomain.com`
- [ ] API accessible tại `https://yourdomain.com/api/health`

## 🎯 Kết quả

Sau khi hoàn thành:
- **Frontend**: `https://yourdomain.com`
- **API**: `https://yourdomain.com/api`
- **Admin Panel**: `https://yourdomain.com/admin`
- **Health Check**: `https://yourdomain.com/api/health`

## 🔄 Updates

Để update app:
1. Push code mới lên GitHub
2. Vào EasyPanel → App → **Rebuild**
3. Hoặc enable auto-deploy từ GitHub webhook
