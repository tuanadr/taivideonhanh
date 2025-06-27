# 🍪 TaiVideoNhanh Cookie Management System

## 📋 Tổng Quan

Hệ thống quản lý cookie TaiVideoNhanh cho phép admin upload, quản lý và test cookie files cho các platform streaming khác nhau.

## 🚀 Tính Năng Chính

### ✅ **Cookie Upload & Management**
- Upload cookie files (.txt, .json)
- Validate cookie format và content
- Quản lý multiple cookie files
- Platform-specific categorization
- Backup và versioning

### ✅ **Cookie Testing**
- Test cookie validity với real requests
- Response time monitoring
- Success/failure tracking
- Detailed error reporting

### ✅ **Admin Dashboard**
- Real-time cookie status
- File size và count monitoring
- Platform distribution
- Upload history

## 🔧 API Endpoints

### Authentication Required
Tất cả endpoints yêu cầu admin authentication:
```
Authorization: Bearer <admin_token>
```

### Cookie Management

#### **Upload Cookie File**
```http
POST /api/admin/cookie/upload
Content-Type: multipart/form-data

Form Data:
- cookieFile: File (.txt hoặc .json)
- description: string (optional)
- platform: string (youtube|tiktok|facebook|instagram|twitter)
```

#### **Get Cookie List**
```http
GET /api/admin/cookie/list?page=1&limit=10&platform=youtube&status=active
```

#### **Test Cookie**
```http
POST /api/admin/cookie/:cookieId/test
Content-Type: application/json

{
  "testUrl": "https://www.youtube.com"
}
```

#### **Delete Cookie**
```http
DELETE /api/admin/cookie/:cookieId
```

#### **Activate/Deactivate Cookie**
```http
PUT /api/admin/cookie/:cookieId/activate
Content-Type: application/json

{
  "active": true
}
```

#### **Get Cookie System Status**
```http
GET /api/admin/cookie/status
```

## 📊 Response Examples

### Cookie Status Response
```json
{
  "message": "Cookie system status retrieved",
  "status": {
    "totalCookieFiles": 5,
    "activeCookieFile": "youtube_cookies.txt",
    "lastUpload": "2025-06-27T04:30:00.000Z",
    "fileSize": 2048,
    "isValid": true,
    "supportedPlatforms": ["YouTube", "TikTok", "Facebook", "Instagram"],
    "backupCount": 3
  }
}
```

### Cookie Test Response
```json
{
  "message": "Cookie test completed",
  "result": {
    "success": true,
    "responseTime": 1250,
    "statusCode": 200,
    "testedAt": "2025-06-27T04:30:00.000Z"
  }
}
```

### Cookie List Response
```json
{
  "message": "Cookie list retrieved successfully",
  "cookies": [
    {
      "id": "uuid",
      "filename": "youtube_cookies.txt",
      "platform": "youtube",
      "description": "YouTube premium cookies",
      "cookie_count": 25,
      "domains": ["youtube.com", "googlevideo.com"],
      "is_active": true,
      "last_tested": "2025-06-27T04:30:00.000Z",
      "test_result": { "success": true, "responseTime": 1200 },
      "created_at": "2025-06-27T04:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

## 🎯 Cookie File Formats

### Netscape Format (.txt)
```
# Netscape HTTP Cookie File
.youtube.com	TRUE	/	FALSE	1735689600	session_token	value123
.youtube.com	TRUE	/	FALSE	1735689600	VISITOR_INFO1_LIVE	value456
```

### JSON Format (.json)
```json
[
  {
    "domain": ".youtube.com",
    "name": "session_token",
    "value": "value123",
    "path": "/",
    "expires": 1735689600,
    "httpOnly": false,
    "secure": false
  }
]
```

## 🖥️ Frontend Pages

### Cookie Management Dashboard
```
URL: https://taivideonhanh.vn/admin/cookies

Features:
- System status overview
- Cookie file upload
- Cookie testing
- File management
```

### Admin Setup Integration
```
URL: https://taivideonhanh.vn/admin/setup

New Feature:
- Cookie Management quick access
- System status integration
```

## 🛠️ Database Schema

### Cookies Table
```sql
CREATE TABLE cookies (
    id UUID PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    platform VARCHAR(50) NOT NULL,
    description TEXT,
    cookie_count INTEGER DEFAULT 0,
    domains JSONB DEFAULT '[]',
    uploaded_by UUID REFERENCES admins(id),
    is_active BOOLEAN DEFAULT true,
    last_tested TIMESTAMP,
    test_result JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🧪 Testing

### Comprehensive Test Suite
```bash
# Run cookie system tests
node test-cookie-system.js

# Expected results:
✅ Admin Token: PASSED
✅ Cookie Status: PASSED
✅ Cookie Upload: PASSED
✅ Cookie Test: PASSED
✅ Cookie List: PASSED
✅ Frontend Pages: ACCESSIBLE
```

### Manual Testing
1. **Upload Test**: Upload sample cookie file
2. **Validation Test**: Check file parsing và validation
3. **Test Functionality**: Test cookie với real URL
4. **Management Test**: Activate/deactivate cookies
5. **Cleanup Test**: Delete old cookie files

## 🔒 Security Considerations

### File Security
- **File Type Validation**: Chỉ accept .txt và .json
- **File Size Limits**: Maximum 5MB per file
- **Path Sanitization**: Prevent directory traversal
- **Secure Storage**: Files stored outside web root

### Access Control
- **Admin Only**: Tất cả endpoints require admin auth
- **Permission Checks**: Role-based access control
- **Audit Logging**: Track all cookie operations
- **Rate Limiting**: Prevent abuse

### Data Protection
- **Encryption**: Sensitive cookie data encrypted
- **Backup Security**: Secure backup storage
- **Cleanup**: Automatic cleanup of old files
- **Monitoring**: Real-time security monitoring

## 🚀 Deployment

### Production Setup
1. **Create uploads directory**:
   ```bash
   mkdir -p /app/uploads/cookies
   chmod 755 /app/uploads/cookies
   ```

2. **Run database migration**:
   ```bash
   psql -d taivideonhanh_prod -f backend/migrations/20250627-create-cookies-table.sql
   ```

3. **Configure environment**:
   ```env
   COOKIES_UPLOAD_PATH=/app/uploads/cookies
   MAX_COOKIE_FILE_SIZE=5242880
   COOKIE_BACKUP_RETENTION_DAYS=30
   ```

### Health Checks
- **File System**: Check upload directory permissions
- **Database**: Verify cookies table exists
- **API Endpoints**: Test all cookie endpoints
- **Frontend**: Verify cookie management page

## 📞 Support

### Troubleshooting

#### Upload Issues
```
Problem: File upload fails
Solution: Check file permissions và disk space
```

#### Validation Errors
```
Problem: Cookie file invalid
Solution: Verify file format và content
```

#### Test Failures
```
Problem: Cookie test fails
Solution: Check network connectivity và cookie validity
```

### Emergency Procedures
- **Backup Recovery**: Restore from backup directory
- **Manual Cleanup**: Remove corrupted files
- **Database Reset**: Recreate cookies table
- **Service Restart**: Restart backend service

---

**TaiVideoNhanh Cookie Management System v1.0**  
*Secure, Scalable, User-Friendly*
