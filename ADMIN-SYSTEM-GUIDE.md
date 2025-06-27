# 🔐 TaiVideoNhanh Admin System Guide

## 📋 Tổng Quan

Hệ thống admin TaiVideoNhanh cung cấp giao diện quản lý toàn diện với các tính năng:
- ✅ Authentication & Authorization
- ✅ User Management
- ✅ Subscription Management
- ✅ Cookie Management
- ✅ System Settings
- ✅ Analytics & Monitoring

## 🚀 Quick Start

### 1. **Truy Cập Admin Panel**

#### Phương pháp 1: Direct Login (Khuyến nghị)
```
URL: https://taivideonhanh.vn/admin/direct-login
Email: admin@taivideonhanh.com
Password: admin123456
```

#### Phương pháp 2: Setup Wizard
```
URL: https://taivideonhanh.vn/admin/setup
```

#### Phương pháp 3: Simple Dashboard
```
URL: https://taivideonhanh.vn/admin/simple-dashboard
```

### 2. **Tạo Admin User Mới**

#### Via API:
```bash
curl -X POST https://taivideonhanh.vn/api/admin/create-vn-admin \
  -H "Content-Type: application/json"
```

#### Via SQL Script:
```bash
bash run-admin-sql.sh
```

## 🔧 API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login
- `GET /api/admin/verify` - Verify admin token

### Admin Management
- `GET /api/admin/status` - Get admin system status
- `POST /api/admin/create-vn-admin` - Create .vn admin user

### User Management
- `GET /api/admin/users` - Get users with pagination
- `PUT /api/admin/users/:userId/subscription-tier` - Update user subscription

### Cookie Management
- `POST /api/admin/cookie/upload` - Upload cookie file
- `POST /api/admin/cookie/test` - Test cookie file
- `GET /api/admin/cookie/status` - Get cookie status

### Analytics
- `GET /api/admin/analytics/subscriptions` - Subscription analytics
- `GET /api/admin/dashboard/stats` - Dashboard statistics

## 🎯 Admin Roles & Permissions

### Roles
- **super_admin**: Toàn quyền truy cập
- **admin**: Quản lý users và subscriptions
- **moderator**: Chỉ xem thông tin

### Permissions
- `user_management` - Quản lý người dùng
- `subscription_management` - Quản lý gói đăng ký
- `payment_management` - Quản lý thanh toán
- `system_settings` - Cài đặt hệ thống
- `analytics_view` - Xem thống kê

## 🛠️ Troubleshooting

### Vấn đề thường gặp:

#### 1. **Vòng lặp chuyển hướng**
```
Nguyên nhân: Thiếu /api/admin/verify endpoint
Giải pháp: Sử dụng /admin/direct-login
```

#### 2. **Invalid admin credentials**
```
Nguyên nhân: Email không đúng (.com vs .vn)
Giải pháp: Kiểm tra email trong database
```

#### 3. **Token verification failed**
```
Nguyên nhân: Token hết hạn hoặc không hợp lệ
Giải pháp: Đăng nhập lại
```

### Debug Commands:

#### Kiểm tra admin users:
```sql
SELECT email, role, is_active, created_at FROM admins;
```

#### Test API endpoints:
```bash
node test-admin-system-complete.js
```

#### Kiểm tra logs:
```bash
docker logs taivideonhanh_backend
```

## 📊 Monitoring & Health Check

### Health Check Endpoint:
```
GET /api/health
```

### Admin Status Check:
```
GET /api/admin/status
```

### Response Example:
```json
{
  "status": {
    "totalAdmins": 2,
    "activeAdmins": 2,
    "hasVnAdmin": true,
    "hasComAdmin": true,
    "systemHealthy": true,
    "timestamp": "2025-06-27T04:30:00.000Z"
  }
}
```

## 🔒 Security Best Practices

### 1. **Password Security**
- Sử dụng bcrypt với 12 salt rounds
- Đổi password mặc định trong production
- Implement password complexity requirements

### 2. **Token Security**
- JWT tokens với expiration time
- Secure token storage (httpOnly cookies)
- Token rotation for long sessions

### 3. **Access Control**
- Role-based permissions
- IP whitelisting cho admin routes
- Rate limiting cho login attempts

### 4. **Audit Logging**
- Log tất cả admin actions
- Monitor failed login attempts
- Track permission changes

## 🚀 Deployment

### Production Checklist:
- [ ] Đổi admin password mặc định
- [ ] Cấu hình HTTPS
- [ ] Setup monitoring alerts
- [ ] Backup database regularly
- [ ] Configure rate limiting
- [ ] Setup audit logging

### Environment Variables:
```env
DEFAULT_ADMIN_EMAIL=admin@taivideonhanh.vn
DEFAULT_ADMIN_PASSWORD=your_secure_password
ADMIN_JWT_EXPIRES_IN=8h
JWT_ACCESS_SECRET=your_jwt_secret
```

## 📞 Support

### Liên hệ hỗ trợ:
- **Email**: admin@taivideonhanh.vn
- **Documentation**: /docs/admin-system
- **Health Check**: https://taivideonhanh.vn/api/health

### Emergency Access:
- **Direct Login**: https://taivideonhanh.vn/admin/direct-login
- **Setup Wizard**: https://taivideonhanh.vn/admin/setup
- **SQL Scripts**: `run-admin-sql.sh`

---

**TaiVideoNhanh Admin System v1.0**  
*Powered by Next.js, Express.js, PostgreSQL*
