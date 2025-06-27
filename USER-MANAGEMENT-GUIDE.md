# 👥 TaiVideoNhanh User Management System

## 📋 Tổng Quan

Hệ thống quản lý người dùng TaiVideoNhanh cung cấp giao diện admin toàn diện để quản lý, theo dõi và phân tích người dùng trong hệ thống.

## 🚀 Tính Năng Chính

### ✅ **User Management Dashboard**
- Danh sách người dùng với pagination
- Search và filter theo nhiều tiêu chí
- Sorting theo các trường khác nhau
- Real-time statistics và analytics
- User actions (view, edit, suspend, delete)

### ✅ **Advanced Filtering & Search**
- Search theo email, tên, họ
- Filter theo trạng thái (active, inactive, suspended)
- Filter theo gói đăng ký (free, premium, pro)
- Sorting theo ngày tạo, đăng nhập cuối, email
- Pagination với customizable page size

### ✅ **User Statistics & Analytics**
- Tổng số người dùng và phân loại
- Thống kê theo gói đăng ký
- Người dùng mới theo ngày/tuần/tháng
- Top countries và demographics
- Average session time

## 🔧 API Endpoints

### Authentication Required
Tất cả endpoints yêu cầu admin authentication và permissions:
```
Authorization: Bearer <admin_token>
Permissions: user_management, subscription_management, analytics_view
```

### User Management

#### **Get Users List**
```http
GET /api/admin/users?page=1&limit=20&search=query&status=active&subscription=premium&sortBy=created_at&sortOrder=desc
```

#### **Get User Details**
```http
GET /api/admin/users/:userId
```

#### **Update User Subscription**
```http
PUT /api/admin/users/:userId/subscription
Content-Type: application/json

{
  "tier": "premium",
  "expiresAt": "2025-12-31T23:59:59Z",
  "reason": "Admin upgrade"
}
```

#### **Update User Status**
```http
PUT /api/admin/users/:userId/status
Content-Type: application/json

{
  "status": "suspended",
  "reason": "Policy violation"
}
```

#### **Reset User Password**
```http
POST /api/admin/users/:userId/reset-password
Content-Type: application/json

{
  "newPassword": "NewSecurePassword123!",
  "reason": "User request"
}
```

#### **Delete User**
```http
DELETE /api/admin/users/:userId
Content-Type: application/json

{
  "reason": "Account closure request"
}
```

#### **Get User Statistics**
```http
GET /api/admin/users/stats/overview
```

## 📊 Response Examples

### Users List Response
```json
{
  "message": "Users list retrieved successfully",
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "is_active": true,
      "is_suspended": false,
      "last_login": "2025-06-27T04:30:00.000Z",
      "created_at": "2025-01-15T10:00:00.000Z",
      "subscription": {
        "tier": "premium",
        "expires_at": "2025-12-31T23:59:59Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "filters": {
    "search": "john",
    "status": "active",
    "subscription": "premium",
    "sortBy": "created_at",
    "sortOrder": "desc"
  }
}
```

### User Statistics Response
```json
{
  "message": "User statistics retrieved successfully",
  "stats": {
    "totalUsers": 1500,
    "activeUsers": 1200,
    "inactiveUsers": 250,
    "suspendedUsers": 50,
    "freeUsers": 800,
    "premiumUsers": 600,
    "proUsers": 100,
    "newUsersToday": 25,
    "newUsersThisWeek": 180,
    "newUsersThisMonth": 750,
    "averageSessionTime": 1800,
    "topCountries": [
      { "country": "Vietnam", "count": 900 },
      { "country": "United States", "count": 300 },
      { "country": "Thailand", "count": 150 }
    ]
  }
}
```

## 🖥️ Frontend Dashboard

### User Management Page
```
URL: https://taivideonhanh.vn/admin/users

Features:
- Real-time user statistics cards
- Advanced search và filtering
- Sortable table columns
- Pagination controls
- User action dropdown menus
- Responsive design
```

### Dashboard Components
- **Statistics Cards**: Overview metrics
- **Search Bar**: Real-time search
- **Filter Dropdowns**: Status và subscription filters
- **Users Table**: Sortable columns với actions
- **Pagination**: Navigation controls

## 🛠️ Database Integration

### User Model Extensions
```typescript
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_suspended: boolean;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  deletion_reason?: string;
  deleted_by?: string;
}
```

### Subscription Relationship
```typescript
interface Subscription {
  id: string;
  user_id: string;
  tier: 'free' | 'premium' | 'pro';
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
```

## 🧪 Testing

### Comprehensive Test Suite
```bash
# Run user management tests
node test-user-management-system.js

# Expected results:
✅ Admin Token: PASSED
✅ Users List: PASSED
✅ User Stats: PASSED
✅ User Search: PASSED
✅ User Filters: PASSED
✅ User Sorting: PASSED
✅ Frontend Pages: ACCESSIBLE
```

### Test Coverage
- **Authentication**: Admin token validation
- **Users List**: Pagination, search, filters, sorting
- **User Statistics**: All metrics và analytics
- **Search Functionality**: Multiple search terms
- **Filter Options**: Status và subscription filters
- **Sorting Options**: All sortable fields
- **Frontend Pages**: Accessibility tests

## 🔒 Security & Permissions

### Role-Based Access Control
- **user_management**: View và manage users
- **subscription_management**: Update subscriptions
- **analytics_view**: View statistics
- **super_admin**: All permissions

### Security Features
- **Input Validation**: All inputs validated
- **SQL Injection Protection**: Parameterized queries
- **Rate Limiting**: Prevent abuse
- **Audit Logging**: Track all admin actions
- **Data Sanitization**: Clean user inputs

### Privacy Compliance
- **Data Minimization**: Only necessary data exposed
- **Access Logging**: Track data access
- **Soft Delete**: Preserve data integrity
- **GDPR Compliance**: Data protection standards

## 🚀 Performance Optimization

### Database Optimization
- **Indexes**: Optimized for common queries
- **Pagination**: Efficient large dataset handling
- **Query Optimization**: Minimal database calls
- **Caching**: Redis caching for statistics

### Frontend Optimization
- **Lazy Loading**: Load data on demand
- **Debounced Search**: Reduce API calls
- **Virtual Scrolling**: Handle large lists
- **Memoization**: Prevent unnecessary re-renders

## 📈 Analytics & Reporting

### Available Metrics
- **User Growth**: Daily, weekly, monthly trends
- **Subscription Distribution**: Tier breakdown
- **Geographic Distribution**: Country-based stats
- **Activity Metrics**: Login patterns, session times
- **Retention Rates**: User engagement metrics

### Export Options
- **CSV Export**: User lists và statistics
- **PDF Reports**: Formatted analytics reports
- **API Access**: Programmatic data access
- **Real-time Dashboards**: Live metrics

## 🛠️ Troubleshooting

### Common Issues

#### Search Not Working
```
Problem: Search returns no results
Solution: Check search term encoding và database indexes
```

#### Slow Performance
```
Problem: Page loads slowly
Solution: Check database query performance và add indexes
```

#### Permission Errors
```
Problem: Access denied errors
Solution: Verify admin permissions và token validity
```

### Debug Commands
```bash
# Check user count
curl -H "Authorization: Bearer <token>" \
  https://taivideonhanh.vn/api/admin/users/stats/overview

# Test search functionality
curl -H "Authorization: Bearer <token>" \
  "https://taivideonhanh.vn/api/admin/users?search=test&limit=5"

# Verify pagination
curl -H "Authorization: Bearer <token>" \
  "https://taivideonhanh.vn/api/admin/users?page=1&limit=10"
```

## 📞 Support

### Emergency Procedures
- **Database Issues**: Check connection và indexes
- **Performance Problems**: Monitor query execution times
- **Access Issues**: Verify admin permissions
- **Data Corruption**: Use backup restoration procedures

### Monitoring
- **API Response Times**: Track endpoint performance
- **Error Rates**: Monitor failed requests
- **User Activity**: Track admin actions
- **System Health**: Overall system metrics

---

**TaiVideoNhanh User Management System v1.0**  
*Comprehensive, Secure, Scalable User Administration*
