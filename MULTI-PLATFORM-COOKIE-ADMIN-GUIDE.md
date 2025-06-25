# 🍪 Multi-Platform Cookie & Admin System - Hướng Dẫn Hoàn Chỉnh

## 📋 Tổng Quan

Hệ thống đã được nâng cấp để hỗ trợ:
1. **Multi-Platform Cookie Support** - Một file cookie cho tất cả platforms (YouTube, TikTok, Facebook, Instagram, Twitter, Twitch, Vimeo, etc.)
2. **Admin User Management** - Tạo và quản lý admin users với đầy đủ quyền hạn

## 🎯 Câu Trả Lời Chi Tiết

### **Câu Hỏi 1: Quản Lý Cookie Nhiều Platform**

#### **💡 Giải Pháp: MỘT FILE COOKIE DUY NHẤT**

**Kết luận:** Bạn **CHỈ CẦN MỘT FILE COOKIE DUY NHẤT** có thể hoạt động với tất cả các platform!

#### **🔍 Cách Thức Hoạt Động:**

1. **Cookie File Format:** File cookie sử dụng format Netscape HTTP Cookie File
2. **Multi-Domain Support:** Một file có thể chứa cookies cho nhiều domains
3. **Automatic Selection:** yt-dlp tự động chọn cookies phù hợp cho từng platform
4. **Domain Matching:** Cookies được match theo domain (youtube.com, tiktok.com, etc.)

#### **📁 Cấu Trúc Cookie File:**
```
# Netscape HTTP Cookie File
.youtube.com	TRUE	/	FALSE	1735689600	session_token	youtube_token_here
.tiktok.com	TRUE	/	FALSE	1735689600	sessionid	tiktok_session_here
.facebook.com	TRUE	/	FALSE	1735689600	c_user	facebook_user_here
.instagram.com	TRUE	/	FALSE	1735689600	sessionid	instagram_session_here
.twitter.com	TRUE	/	FALSE	1735689600	auth_token	twitter_token_here
```

#### **✨ Tính Năng Mới:**

1. **Platform Detection:** Hệ thống tự động detect platforms có trong cookie file
2. **Universal Cookie Support:** Cookie được áp dụng cho TẤT CẢ platforms, không chỉ YouTube
3. **Smart Validation:** Validation kiểm tra cookies cho multiple domains
4. **Enhanced UI:** Frontend hiển thị danh sách platforms được hỗ trợ

---

### **Câu Hỏi 2: Tạo Admin User Mặc Định**

#### **🔐 Thông Tin Admin Mặc Định:**

```
Email: admin@taivideonhanh.com
Password: admin123456
Role: super_admin
Permissions: user_management, subscription_management, payment_management, system_settings, analytics_view
```

#### **🛠️ Các Cách Tạo Admin User:**

##### **Method 1: Quick Setup (Khuyến nghị)**
```bash
node quick-setup-admin.js
```

##### **Method 2: Interactive Management**
```bash
node create-admin-user.js
```

##### **Method 3: Database Migration**
```bash
psql -d your_database -f backend/migrations/001-create-default-admin.sql
```

##### **Method 4: Programmatic (trong code)**
```javascript
const AdminService = require('./backend/dist/services/adminService.js').default;
await AdminService.initializeDefaultAdmin();
```

## 🚀 Hướng Dẫn Triển Khai

### **Bước 1: Environment Setup**
```bash
# .env.production
DEFAULT_ADMIN_EMAIL=admin@taivideonhanh.com
DEFAULT_ADMIN_PASSWORD=TaiVideo2024!Admin
COOKIES_PATH=/tmp/cookies/platform-cookies.txt
ENABLE_COOKIE_AUTH=true
```

### **Bước 2: Quick Setup**
```bash
# Chạy setup tự động
node quick-setup-admin.js

# Hoặc setup thủ công
node create-admin-user.js
```

### **Bước 3: Build & Start**
```bash
# Build
cd backend && npm run build
cd frontend && npm run build

# Start
cd backend && npm start
cd frontend && npm run dev
```

### **Bước 4: Access Admin Panel**
```
URL: http://localhost:3000/admin/login
Email: admin@taivideonhanh.com  
Password: admin123456
```

## 🍪 Hướng Dẫn Cookie Multi-Platform

### **Lấy Cookie Từ Browser:**

1. **Cài Extension:** "Get cookies.txt LOCALLY" trên Chrome
2. **Đăng Nhập Platforms:**
   - YouTube.com
   - TikTok.com  
   - Facebook.com
   - Instagram.com
   - Twitter.com/X.com
   - Twitch.tv
   - Vimeo.com
   - Dailymotion.com

3. **Export Cookie:** Click extension → Export cookies.txt
4. **Upload:** Vào Admin Panel → Cookie Management → Upload file

### **Platforms Được Hỗ Trợ:**
- ✅ YouTube (youtube.com)
- ✅ TikTok (tiktok.com)  
- ✅ Facebook (facebook.com)
- ✅ Instagram (instagram.com)
- ✅ Twitter/X (twitter.com, x.com)
- ✅ Twitch (twitch.tv)
- ✅ Vimeo (vimeo.com)
- ✅ Dailymotion (dailymotion.com)
- ✅ Và 3000+ platforms khác mà yt-dlp hỗ trợ

## 🔧 Quản Lý Admin Users

### **Tạo Admin Mới:**
```bash
node create-admin-user.js
# Chọn option 2: Create custom admin user
```

### **Liệt Kê Admin Users:**
```bash
node create-admin-user.js  
# Chọn option 3: List all admin users
```

### **Đổi Mật Khẩu:**
```bash
node create-admin-user.js
# Chọn option 4: Change admin password
```

### **Permissions Available:**
- `user_management` - Quản lý người dùng
- `subscription_management` - Quản lý gói đăng ký
- `payment_management` - Quản lý thanh toán
- `system_settings` - Cài đặt hệ thống (bao gồm cookie upload)
- `analytics_view` - Xem thống kê

## 🔒 Bảo Mật

### **Admin Security:**
- ✅ JWT authentication với expiration
- ✅ Bcrypt password hashing (12 rounds)
- ✅ Role-based permissions
- ✅ Admin activity logging
- ✅ Session management

### **Cookie Security:**
- ✅ File permissions 600 (owner only)
- ✅ Secure directory permissions 700
- ✅ Automatic backup before replacement
- ✅ Validation và sanitization
- ✅ Admin-only access

## 📊 Monitoring

### **Admin Activity:**
```sql
SELECT email, last_login, created_at FROM admins ORDER BY last_login DESC;
```

### **Cookie Status:**
```bash
# Check cookie file
ls -la /tmp/cookies/platform-cookies.txt

# Check supported platforms
grep -E "\.(youtube|tiktok|facebook|instagram|twitter|x|twitch|vimeo)\.com" /tmp/cookies/platform-cookies.txt
```

### **System Health:**
```bash
# Test cookie functionality
node test-cookie-upload-system.js

# Check admin access
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:5000/api/admin/cookie/info
```

## 🚨 Troubleshooting

### **Admin Login Issues:**
```
Error: "Invalid credentials"
Solution: Chạy node create-admin-user.js để reset password
```

### **Cookie Upload Issues:**
```
Error: "No supported platforms found"
Solution: Đảm bảo cookie file chứa ít nhất một domain được hỗ trợ
```

### **Permission Issues:**
```
Error: "Insufficient admin permission"  
Solution: Admin cần quyền 'system_settings' để upload cookie
```

## 📈 Performance Optimization

### **Cookie Management:**
- Rotate cookies monthly
- Monitor success rates per platform
- Clean old backup files quarterly
- Use dedicated accounts for cookie extraction

### **Admin Management:**
- Regular password updates
- Monitor admin activity logs
- Deactivate unused admin accounts
- Review permissions quarterly

## 🎯 Best Practices

### **Cookie Strategy:**
1. **Single Source:** Sử dụng một browser profile để lấy tất cả cookies
2. **Regular Updates:** Cập nhật cookies khi gặp authentication errors
3. **Platform Coverage:** Đảm bảo đăng nhập đầy đủ các platforms cần thiết
4. **Backup Strategy:** Giữ backup cookies working trước khi update

### **Admin Management:**
1. **Principle of Least Privilege:** Chỉ cấp quyền cần thiết
2. **Regular Audits:** Review admin accounts và permissions
3. **Strong Passwords:** Enforce password complexity
4. **Activity Monitoring:** Track admin actions và login patterns

---

## 📞 Support & Tools

### **Management Scripts:**
- `quick-setup-admin.js` - Setup tự động hoàn chỉnh
- `create-admin-user.js` - Quản lý admin users interactive
- `test-cookie-upload-system.js` - Test toàn bộ hệ thống

### **Database Tools:**
- `backend/migrations/001-create-default-admin.sql` - Migration script
- Admin management functions trong PostgreSQL

### **Sample Files:**
- `sample-multi-platform-cookies.txt` - Template cookie file
- `test-youtube-cookies.txt` - Test cookie file

**🎉 Hệ thống Multi-Platform Cookie & Admin đã sẵn sàng sử dụng!**
