# 🍪 Cookie Upload System - Hướng Dẫn Hoàn Chỉnh

## 📋 Tổng Quan

Hệ thống Cookie Upload cho phép admin dễ dàng upload và quản lý cookie YouTube thông qua giao diện web, giải quyết vấn đề "Sign in to confirm you're not a bot" khi tải video YouTube.

## ✨ Tính Năng Chính

### 🔐 **Bảo Mật**
- ✅ Chỉ admin có quyền `system_settings` mới có thể upload cookie
- ✅ Validation file nghiêm ngặt (chỉ .txt, tối đa 5MB)
- ✅ Backup tự động cookie cũ trước khi thay thế
- ✅ Permissions 600 cho file cookie (chỉ owner đọc/ghi)

### 🚀 **Quản Lý Cookie**
- ✅ Upload cookie qua giao diện web (drag & drop)
- ✅ Validation format cookie tự động
- ✅ Test cookie với yt-dlp real-time
- ✅ Xem thông tin chi tiết cookie hiện tại
- ✅ Xóa cookie khi cần thiết

### 🔧 **Tích Hợp Hệ Thống**
- ✅ Tự động sử dụng cookie trong StreamingService
- ✅ Fallback graceful khi không có cookie
- ✅ Logging chi tiết cho debugging
- ✅ Environment variables configuration

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin Panel   │───▶│   Backend API   │───▶│  Cookie Service │
│   (Frontend)    │    │   (Express)     │    │   (File Mgmt)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ StreamingService│    │   File System   │
                       │   (yt-dlp)      │    │   (/tmp/cookies)│
                       └─────────────────┘    └─────────────────┘
```

## 📁 Cấu Trúc File

### **Backend Components**
```
backend/src/
├── services/
│   ├── cookieService.ts          # Cookie management logic
│   └── streamingService.ts       # Updated with cookie integration
├── routes/
│   └── admin.ts                  # Cookie API endpoints
└── middleware/
    └── fileUpload.ts             # File upload middleware (unused)
```

### **Frontend Components**
```
frontend/src/app/admin/
├── layout.tsx                    # Admin dashboard layout
├── page.tsx                      # Admin dashboard home
├── login/
│   └── page.tsx                  # Admin login page
└── cookie/
    └── page.tsx                  # Cookie management interface
```

## 🔌 API Endpoints

### **GET /api/admin/cookie/info**
Lấy thông tin cookie hiện tại
```json
{
  "message": "Cookie information retrieved successfully",
  "cookieInfo": {
    "filename": "youtube-cookies.txt",
    "size": 2048,
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "isValid": true,
    "lastValidated": "2024-01-01T00:00:00.000Z"
  },
  "hasActiveCookie": true
}
```

### **POST /api/admin/cookie/upload**
Upload cookie file mới
```json
{
  "content": "base64_encoded_cookie_content",
  "filename": "youtube-cookies.txt"
}
```

### **POST /api/admin/cookie/test**
Test cookie hiện tại với yt-dlp
```json
{
  "message": "Cookie test completed",
  "testResult": {
    "success": true
  }
}
```

### **DELETE /api/admin/cookie**
Xóa cookie hiện tại
```json
{
  "message": "Cookie file deleted successfully",
  "deletedBy": "admin@example.com"
}
```

## 🚀 Hướng Dẫn Triển Khai

### **1. Cài Đặt Dependencies**
```bash
# Backend
cd backend
npm install

# Frontend  
cd frontend
npm install
```

### **2. Cấu Hình Environment**
```bash
# .env.production
YOUTUBE_COOKIES_PATH=/tmp/cookies/youtube-cookies.txt
ENABLE_COOKIE_AUTH=true
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=5MB
```

### **3. Build & Start**
```bash
# Build backend
cd backend && npm run build

# Build frontend
cd frontend && npm run build

# Start backend
cd backend && npm start

# Start frontend (development)
cd frontend && npm run dev
```

### **4. Truy Cập Admin Panel**
- URL: `http://localhost:3000/admin/login`
- Credentials: Xem trong environment variables
- Cookie Management: `http://localhost:3000/admin/cookie`

## 🍪 Hướng Dẫn Lấy Cookie

### **Method 1: Browser Extension (Khuyến nghị)**
1. Cài đặt extension "Get cookies.txt LOCALLY" trên Chrome
2. Đăng nhập vào YouTube.com
3. Click vào extension và export cookies
4. Upload file cookies.txt vào admin panel

### **Method 2: Developer Tools**
1. Mở YouTube.com và đăng nhập
2. Mở Developer Tools (F12)
3. Vào tab Application > Storage > Cookies
4. Copy cookies theo format Netscape
5. Tạo file .txt và upload

### **Cookie Format Example**
```
# Netscape HTTP Cookie File
.youtube.com	TRUE	/	FALSE	1735689600	session_token	your_session_token
.youtube.com	TRUE	/	FALSE	1735689600	VISITOR_INFO1_LIVE	your_visitor_info
youtube.com	FALSE	/	FALSE	1735689600	YSC	your_ysc_value
```

## 🔧 Troubleshooting

### **Lỗi Upload**
```
Error: "Invalid file extension"
Solution: Chỉ chấp nhận file .txt
```

```
Error: "File size too large"  
Solution: File không được vượt quá 5MB
```

```
Error: "Cookie validation failed"
Solution: Kiểm tra format cookie, phải có ít nhất 6 fields per line
```

### **Lỗi Authentication**
```
Error: "Admin authentication required"
Solution: Đăng nhập lại admin panel
```

```
Error: "Insufficient admin permission"
Solution: Cần quyền 'system_settings'
```

### **Lỗi Cookie Test**
```
Error: "Cookie test timeout"
Solution: Kiểm tra kết nối internet và yt-dlp installation
```

```
Error: "Cookie test failed"
Solution: Cookie có thể đã hết hạn, cần lấy cookie mới
```

## 📊 Monitoring & Logs

### **Backend Logs**
```bash
# Cookie operations
grep "Cookie" /var/log/app.log

# Upload activity
grep "File upload activity" /var/log/app.log

# Authentication errors
grep "Admin" /var/log/app.log
```

### **File System Monitoring**
```bash
# Check cookie file
ls -la /tmp/cookies/

# Check permissions
stat /tmp/cookies/youtube-cookies.txt

# Check backup files
ls -la /tmp/cookies/backup/
```

## 🔒 Security Best Practices

### **File Security**
- Cookie files có permissions 600 (owner only)
- Backup directory có permissions 700
- Validation nghiêm ngặt file upload
- Sanitization filename

### **Access Control**
- Chỉ super_admin có quyền upload cookie
- JWT token authentication
- Rate limiting cho API endpoints
- Audit logging cho mọi thao tác

### **Cookie Security**
- Rotate cookies định kỳ (monthly)
- Monitor unauthorized access
- Use dedicated YouTube account
- Backup trước khi thay đổi

## 🚀 Production Deployment

### **Docker Configuration**
```dockerfile
# Dockerfile updates
ENV YOUTUBE_COOKIES_PATH=/tmp/cookies/youtube-cookies.txt
ENV ENABLE_COOKIE_AUTH=true

# Create directories
RUN mkdir -p /tmp/cookies /tmp/cookies/backup
RUN chmod 700 /tmp/cookies /tmp/cookies/backup
```

### **EasyPanel Setup**
1. Deploy với GitHub integration
2. Set environment variables
3. Configure volume mounts cho cookie persistence
4. Setup monitoring alerts

### **Health Checks**
```bash
# API health
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:5000/api/admin/cookie/info

# Cookie file check
test -f /tmp/cookies/youtube-cookies.txt && echo "Cookie exists"

# yt-dlp test
yt-dlp --cookies /tmp/cookies/youtube-cookies.txt \
  --dump-json "https://www.youtube.com/watch?v=test"
```

## 📈 Performance Optimization

### **File Operations**
- Async file operations
- Stream processing cho large files
- Compression cho backup files
- Cleanup old backups automatically

### **API Performance**
- Response caching cho cookie info
- Rate limiting protection
- Request validation middleware
- Error handling optimization

## 🔄 Maintenance

### **Regular Tasks**
- [ ] Update cookies monthly
- [ ] Clean backup files quarterly  
- [ ] Monitor success rates weekly
- [ ] Update user-agents quarterly
- [ ] Review error patterns monthly

### **Emergency Procedures**
```bash
# Reset cookies
rm /tmp/cookies/youtube-cookies.txt

# Restore from backup
cp /tmp/cookies/backup/latest.txt /tmp/cookies/youtube-cookies.txt

# Restart services
systemctl restart taivideonhanh
```

---

## 📞 Support

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra logs trong `/var/log/app.log`
2. Chạy test script: `node test-cookie-upload-system.js`
3. Verify permissions: `ls -la /tmp/cookies/`
4. Test yt-dlp manually với cookie file

**Hệ thống Cookie Upload đã sẵn sàng sử dụng! 🎉**
