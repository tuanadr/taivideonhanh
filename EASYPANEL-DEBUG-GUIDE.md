# 🔧 EasyPanel Deployment Debug Guide

## 🚨 Vấn đề đã được giải quyết ✅

**Triệu chứng ban đầu:**
- Status màu vàng thay vì xanh (healthy)
- Lỗi: "Service is not reachable - Make sure the service is running and healthy"

**Nguyên nhân từ logs:**
1. **Backend**: `Error: Cannot find module 'express'` ✅ **ĐÃ SỬA**
2. **Frontend**: `Error: Cannot find module '/app/frontend/server.js'` ✅ **ĐÃ SỬA**

## 🛠️ Giải pháp đã thực hiện

### 1. Sửa Dockerfile
- ✅ Thêm copy backend/node_modules riêng biệt
- ✅ Sửa `--only=production` thành `--omit=dev` (cú pháp mới hơn)
- ✅ Đảm bảo NODE_PATH có cả root và backend node_modules

### 2. Sửa supervisord.conf
- ✅ Cập nhật NODE_PATH: `/app/node_modules:/app/backend/node_modules`
- ✅ Sửa đường dẫn frontend: `node frontend/server.js` (do Next.js standalone structure)

## 🎉 Kết quả sau khi sửa

**Test local thành công:**
- ✅ Backend: Express module được tìm thấy
- ✅ Frontend: Server.js được tìm thấy và chạy
- ✅ Nginx: Routing hoạt động bình thường
- ✅ Container: Khởi động thành công (chỉ fail ở database connection - bình thường khi test local)

**Logs sau khi sửa:**
```
✓ Starting...
✓ Ready in 237ms
```

**Frontend response test:**
```html
<!DOCTYPE html><html lang="vi">...
```

## 📋 Checklist Debug từng bước

### Bước 1: Kiểm tra Build Local
```bash
# Chạy script test build
chmod +x test-docker-build.sh
./test-docker-build.sh
```

### Bước 2: Kiểm tra Dependencies
```bash
# Vào container để debug
docker run -it --rm taivideonhanh-test /bin/sh

# Kiểm tra node_modules
ls -la /app/node_modules | grep express
ls -la /app/backend/node_modules | grep express

# Kiểm tra frontend structure
ls -la /app/frontend/
ls -la /app/frontend/.next/
```

### Bước 3: Kiểm tra Services trong Container
```bash
# Kiểm tra processes
ps aux

# Kiểm tra ports
netstat -tlnp

# Test backend trực tiếp
curl http://localhost:5000/api/health

# Test frontend trực tiếp  
curl http://localhost:3000
```

### Bước 4: Kiểm tra Logs
```bash
# Xem logs của từng service
tail -f /var/log/supervisor/backend-stdout.log
tail -f /var/log/supervisor/frontend-stdout.log
tail -f /var/log/supervisor/nginx-stdout.log
```

## 🔍 Các vấn đề có thể gặp

### 1. Backend Module Not Found
**Nguyên nhân:** Dependencies không được copy đúng
**Giải pháp:** 
- Kiểm tra `/app/node_modules/express` có tồn tại không
- Kiểm tra NODE_PATH trong supervisord.conf

### 2. Frontend Server.js Missing
**Nguyên nhân:** Next.js standalone build structure
**Giải pháp:**
- File server.js phải ở `/app/frontend/server.js`
- Kiểm tra Next.js config có `output: 'standalone'`

### 3. Health Check Fail
**Nguyên nhân:** Services chưa ready hoặc database/redis không connect được
**Giải pháp:**
- Tăng start-period trong HEALTHCHECK
- Kiểm tra biến môi trường database

## 🚀 Deploy lại trên EasyPanel

1. **Commit changes:**
```bash
git add .
git commit -m "Fix Docker build and supervisord config for EasyPanel"
git push origin main
```

2. **Rebuild trên EasyPanel:**
- Vào EasyPanel dashboard
- Chọn app taivideonhanh
- Click "Rebuild" 
- Theo dõi build logs

3. **Kiểm tra sau deploy:**
- Status phải chuyển từ vàng sang xanh
- Test endpoint: `https://your-domain/api/health`
- Kiểm tra logs không còn lỗi module not found

## 📊 Monitoring sau deploy

### Health Endpoints
- `/api/health` - Basic health check
- `/api/health/ready` - Readiness probe  
- `/api/health/live` - Liveness probe
- `/api/monitoring/health` - Detailed system health

### Expected Response
```json
{
  "status": "OK",
  "timestamp": "2025-06-24T04:30:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

## 🆘 Nếu vẫn gặp vấn đề

1. **Kiểm tra EasyPanel logs chi tiết**
2. **SSH vào container (nếu có thể)**
3. **Kiểm tra biến môi trường**
4. **Test từng service riêng biệt**
5. **Liên hệ support EasyPanel nếu cần**
