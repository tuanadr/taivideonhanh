# 🔗 Hướng dẫn Tích hợp và Vận hành Firefox Service

## 📋 Tổng quan

Hướng dẫn tích hợp Firefox Cookie Service với backend hiện tại và các thao tác vận hành, monitoring hệ thống.

## 🔗 Bước 9: Tích hợp với Backend hiện tại

### 9.1 Cập nhật Environment Variables

Trong EasyPanel app chính (TaiVideoNhanh), thêm environment variables:

```bash
# Firefox Service Integration
FIREFOX_SERVICE_URL=https://firefox-api.taivideonhanh.vn
ENABLE_AUTO_COOKIE_EXTRACTION=true
COOKIE_REFRESH_INTERVAL=24h

# Existing cookie paths (keep for fallback)
YOUTUBE_COOKIES_PATH=/tmp/cookies/youtube-cookies.txt
ENABLE_COOKIE_AUTH=true
```

### 9.2 Verify Backend Integration

Kiểm tra backend đã nhận environment variables:

```bash
# Check backend logs
curl https://taivideonhanh.vn/api/health

# Expected log entries:
# ✅ Firefox service connection successful
# 🍪 Cookie Management Service initialized
# 🦊 Firefox service: https://firefox-api.taivideonhanh.vn
```

### 9.3 Test Auto Cookie Extraction

```bash
# Test video info với auto cookie extraction
curl -X POST https://taivideonhanh.vn/api/video-info \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }'
```

**Expected Response với Firefox cookies**:
```json
{
  "success": true,
  "title": "Rick Astley - Never Gonna Give You Up",
  "formats": [
    {
      "quality": "4K",
      "hasAudio": false,
      "size": "~500MB"
    },
    {
      "quality": "1080p",
      "hasAudio": false,
      "size": "~200MB"
    },
    // ... 18+ more formats
  ],
  "cookieAuthUsed": true,
  "formatCount": 22
}
```

## 🧪 Bước 10: Test và Verify Cookie Extraction

### 10.1 Test YouTube Format Improvement

**Before Firefox cookies**:
```bash
# Test without cookies
curl -X POST https://taivideonhanh.vn/api/video-info \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "useCookies": false
  }'

# Expected: ~4 formats
```

**After Firefox cookies**:
```bash
# Test with Firefox cookies
curl -X POST https://taivideonhanh.vn/api/video-info \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "useCookies": true
  }'

# Expected: 20+ formats
```

### 10.2 Test Multi-platform Support

**Facebook Video**:
```bash
curl -X POST https://taivideonhanh.vn/api/video-info \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.facebook.com/watch/?v=123456789"
  }'
```

**Instagram Video**:
```bash
curl -X POST https://taivideonhanh.vn/api/video-info \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.instagram.com/p/ABC123/"
  }'
```

**TikTok Video**:
```bash
curl -X POST https://taivideonhanh.vn/api/video-info \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.tiktok.com/@user/video/123456789"
  }'
```

### 10.3 Performance Comparison

Tạo script test performance:

```bash
#!/bin/bash
# test-performance.sh

echo "🧪 Testing Firefox Cookie Performance..."

# Test YouTube
echo "Testing YouTube..."
YOUTUBE_RESULT=$(curl -s -X POST https://taivideonhanh.vn/api/video-info \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' | jq '.formats | length')

echo "YouTube formats: $YOUTUBE_RESULT"

# Test Facebook
echo "Testing Facebook..."
FACEBOOK_RESULT=$(curl -s -X POST https://taivideonhanh.vn/api/video-info \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.facebook.com/watch/?v=123456789"}' | jq '.formats | length')

echo "Facebook formats: $FACEBOOK_RESULT"

echo "✅ Performance test completed"
```

## 🔧 Bước 11: Troubleshooting

### 11.1 Common Issues và Solutions

**Issue: Firefox Service không accessible**
```bash
# Check service status
curl https://firefox-api.taivideonhanh.vn/health

# Solutions:
- Verify EasyPanel app is running
- Check domain DNS configuration
- Verify SSL certificates
- Check firewall settings
```

**Issue: VNC không connect được**
```bash
# Check VNC port
curl -I https://firefox-vnc.taivideonhanh.vn

# Solutions:
- Verify port 6080 is exposed
- Check VNC password
- Try different browser
- Clear browser cache
```

**Issue: Cookie extraction fails**
```bash
# Check platform login status
curl https://firefox-api.taivideonhanh.vn/status

# Solutions:
- Re-login to platform via VNC
- Check platform-specific selectors
- Verify session is active
- Clear browser data and re-login
```

**Issue: Backend không nhận cookies**
```bash
# Check backend logs
# Look for Firefox service connection errors

# Solutions:
- Verify FIREFOX_SERVICE_URL environment variable
- Check network connectivity between services
- Restart backend service
- Verify API endpoints are accessible
```

### 11.2 Debug Commands

```bash
# Check Firefox service logs
curl https://firefox-api.taivideonhanh.vn/status

# Check cookie file status
curl https://firefox-api.taivideonhanh.vn/cookies/youtube/download

# Test cookie validation
curl -X POST https://firefox-api.taivideonhanh.vn/validate-cookies/youtube

# Check active sessions
curl https://firefox-api.taivideonhanh.vn/status | jq '.sessions'
```

### 11.3 Recovery Procedures

**Reset Firefox Profile**:
```bash
# Delete corrupted profile via API
curl -X DELETE https://firefox-api.taivideonhanh.vn/profile/youtube

# Re-login via VNC
# Extract cookies again
```

**Refresh All Cookies**:
```bash
# Auto-refresh all platform cookies
curl -X POST https://firefox-api.taivideonhanh.vn/auto-refresh
```

## 📊 Bước 12: Monitor và Maintain

### 12.1 Health Monitoring

**Daily Health Check**:
```bash
#!/bin/bash
# daily-health-check.sh

echo "🏥 Daily Firefox Service Health Check"

# Check service health
HEALTH=$(curl -s https://firefox-api.taivideonhanh.vn/health | jq -r '.status')
echo "Service Health: $HEALTH"

# Check cookie validation
for platform in youtube facebook instagram tiktok twitter; do
  VALID=$(curl -s -X POST https://firefox-api.taivideonhanh.vn/validate-cookies/$platform | jq -r '.isValid')
  echo "$platform cookies: $VALID"
done

echo "✅ Health check completed"
```

### 12.2 Performance Monitoring

**Weekly Performance Report**:
```bash
#!/bin/bash
# weekly-performance.sh

echo "📊 Weekly Performance Report"

# Test format counts
YOUTUBE_FORMATS=$(curl -s -X POST https://taivideonhanh.vn/api/video-info \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' | jq '.formats | length')

echo "YouTube formats available: $YOUTUBE_FORMATS"
echo "Target: 20+ formats"

if [ "$YOUTUBE_FORMATS" -gt 15 ]; then
  echo "✅ Performance is good"
else
  echo "⚠️ Performance degraded - check cookies"
fi
```

### 12.3 Maintenance Tasks

**Weekly Cookie Refresh**:
```bash
# Schedule via cron
0 2 * * 0 curl -X POST https://firefox-api.taivideonhanh.vn/auto-refresh
```

**Monthly Profile Cleanup**:
```bash
# Clean old profiles and logs
curl -X POST https://firefox-api.taivideonhanh.vn/cleanup
```

**Backup Cookie Files**:
```bash
#!/bin/bash
# backup-cookies.sh

mkdir -p /backup/cookies/$(date +%Y%m%d)

for platform in youtube facebook instagram tiktok twitter; do
  curl -o /backup/cookies/$(date +%Y%m%d)/$platform-cookies.txt \
    https://firefox-api.taivideonhanh.vn/cookies/$platform/download
done
```

## ✅ Final Checklist

- [ ] Backend environment variables configured
- [ ] Firefox service integration working
- [ ] Auto cookie extraction enabled
- [ ] YouTube format count improved (4 → 20+)
- [ ] Multi-platform support working
- [ ] Performance tests passing
- [ ] Health monitoring setup
- [ ] Troubleshooting procedures documented
- [ ] Maintenance tasks scheduled
- [ ] Backup procedures in place

## 🎯 Success Metrics

**Target Performance**:
- YouTube: 20+ formats available
- Facebook: Full video access
- Instagram: High quality options
- TikTok: Multiple quality choices
- Twitter: Enhanced format selection

**Uptime Targets**:
- Firefox Service: 99.5% uptime
- Cookie Validation: 95% success rate
- Auto-refresh: Weekly execution

**Maintenance Schedule**:
- Daily: Health checks
- Weekly: Performance monitoring
- Monthly: Profile cleanup
- Quarterly: Security review

---

**🎉 Firefox Cookie Management System đã sẵn sàng cho production!**
