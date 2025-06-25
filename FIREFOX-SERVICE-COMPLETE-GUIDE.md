# 🦊 Firefox Cookie Management System - Hướng dẫn Hoàn chỉnh

## 📋 Tổng quan

Hướng dẫn đầy đủ để deploy, cấu hình và vận hành Firefox Cookie Management System cho TaiVideoNhanh. Hệ thống này sẽ cải thiện đáng kể chất lượng video download với cookie authentication tự động.

## 🎯 Mục tiêu

- **YouTube**: 4 → 20+ formats (cải thiện 500%)
- **Facebook**: Từ limited → full access
- **Instagram**: Từ basic → high quality options
- **TikTok**: Từ standard → multiple quality options
- **Twitter**: Từ basic → enhanced format selection

## 📚 Cấu trúc Hướng dẫn

### 📖 [Phần 1: Setup và Deploy](./HUONG-DAN-SETUP-FIREFOX-SERVICE.md)
- **Bước 1**: Deploy Firefox Service trên EasyPanel
- **Bước 2**: Cấu hình Domain và SSL
- **Bước 3**: Build và Deploy Docker Container

### 🖥️ [Phần 2: Đăng nhập và Sử dụng](./HUONG-DAN-SU-DUNG-FIREFOX-SERVICE.md)
- **Bước 4**: Truy cập VNC Interface
- **Bước 5**: Đăng nhập vào các Platform
- **Bước 6**: Extract Cookies thông qua API
- **Bước 7**: Validate Cookies
- **Bước 8**: Download Cookie Files

### 🔗 [Phần 3: Tích hợp và Vận hành](./HUONG-DAN-TICH-HOP-FIREFOX-SERVICE.md)
- **Bước 9**: Tích hợp với Backend hiện tại
- **Bước 10**: Test và Verify Cookie Extraction
- **Bước 11**: Troubleshooting
- **Bước 12**: Monitor và Maintain

## ✅ Master Checklist

### 🚀 Phase 1: Deployment (Bước 1-3)
- [ ] **1.1** EasyPanel app `firefox-cookie-service` được tạo
- [ ] **1.2** Environment variables đã cấu hình đầy đủ
- [ ] **1.3** Ports 3000, 6080 đã expose
- [ ] **1.4** Volumes cho profiles, cookies, logs đã tạo
- [ ] **1.5** Resources 4GB RAM, 2 CPU cores allocated
- [ ] **1.6** Security settings (seccomp, shm_size) configured
- [ ] **2.1** Domain `firefox-api.taivideonhanh.vn` configured
- [ ] **2.2** Domain `firefox-vnc.taivideonhanh.vn` configured
- [ ] **2.3** SSL certificates active và verified
- [ ] **3.1** Docker build thành công
- [ ] **3.2** Service health check returns "healthy"
- [ ] **3.3** VNC interface accessible

### 🖥️ Phase 2: Login & Usage (Bước 4-8)
- [ ] **4.1** VNC interface accessible với password `firefox123`
- [ ] **4.2** Firefox browser hoạt động trong VNC
- [ ] **5.1** YouTube login thành công và session stable
- [ ] **5.2** Facebook login thành công và session stable
- [ ] **5.3** Instagram login thành công và session stable
- [ ] **5.4** TikTok login thành công và session stable
- [ ] **5.5** Twitter login thành công và session stable
- [ ] **6.1** YouTube cookies extracted thành công
- [ ] **6.2** Facebook cookies extracted thành công
- [ ] **6.3** Instagram cookies extracted thành công
- [ ] **6.4** TikTok cookies extracted thành công
- [ ] **6.5** Twitter cookies extracted thành công
- [ ] **7.1** Tất cả cookies validated thành công
- [ ] **8.1** Cookie files có thể download được

### 🔗 Phase 3: Integration & Operations (Bước 9-12)
- [ ] **9.1** Backend environment variables updated
- [ ] **9.2** Firefox service integration verified
- [ ] **9.3** Auto cookie extraction working
- [ ] **10.1** YouTube format count improved (4 → 20+)
- [ ] **10.2** Multi-platform support working
- [ ] **10.3** Performance tests passing
- [ ] **11.1** Troubleshooting procedures tested
- [ ] **11.2** Debug commands working
- [ ] **11.3** Recovery procedures documented
- [ ] **12.1** Health monitoring setup
- [ ] **12.2** Performance monitoring active
- [ ] **12.3** Maintenance tasks scheduled

## 🔧 Quick Start Commands

### Health Check
```bash
curl https://firefox-api.taivideonhanh.vn/health
```

### Extract All Cookies
```bash
for platform in youtube facebook instagram tiktok twitter; do
  curl -X POST https://firefox-api.taivideonhanh.vn/extract-cookies \
    -H "Content-Type: application/json" \
    -d "{\"platform\": \"$platform\", \"headless\": false}"
done
```

### Validate All Cookies
```bash
for platform in youtube facebook instagram tiktok twitter; do
  curl -X POST https://firefox-api.taivideonhanh.vn/validate-cookies/$platform
done
```

### Test Video Info
```bash
curl -X POST https://taivideonhanh.vn/api/video-info \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

## 🚨 Emergency Procedures

### Service Down
```bash
# Check EasyPanel app status
# Restart Firefox service
# Verify health endpoint
curl https://firefox-api.taivideonhanh.vn/health
```

### Cookies Invalid
```bash
# Re-login via VNC
# Extract cookies again
# Validate cookies
curl -X POST https://firefox-api.taivideonhanh.vn/auto-refresh
```

### Performance Degraded
```bash
# Check format counts
# Verify cookie validation
# Refresh cookies if needed
# Monitor for 24h
```

## 📊 Success Metrics

### Performance Targets
| Platform | Before | Target | Success Criteria |
|----------|--------|--------|------------------|
| YouTube | 4 formats | 20+ formats | ≥ 15 formats |
| Facebook | Limited | Full access | Video info available |
| Instagram | Basic | High quality | Multiple formats |
| TikTok | Standard | Multiple options | ≥ 3 formats |
| Twitter | Basic | Enhanced | Video downloadable |

### Uptime Targets
- **Firefox Service**: 99.5% uptime
- **Cookie Validation**: 95% success rate
- **VNC Interface**: 99% accessibility
- **Auto-refresh**: Weekly execution success

## 📞 Support & Troubleshooting

### Documentation Links
- [Setup Guide](./HUONG-DAN-SETUP-FIREFOX-SERVICE.md)
- [Usage Guide](./HUONG-DAN-SU-DUNG-FIREFOX-SERVICE.md)
- [Integration Guide](./HUONG-DAN-TICH-HOP-FIREFOX-SERVICE.md)
- [Firefox Service README](./firefox-service/README.md)

### API Endpoints
- **Health**: `https://firefox-api.taivideonhanh.vn/health`
- **Status**: `https://firefox-api.taivideonhanh.vn/status`
- **Platforms**: `https://firefox-api.taivideonhanh.vn/platforms`
- **VNC Info**: `https://firefox-api.taivideonhanh.vn/vnc`

### VNC Access
- **URL**: `https://firefox-vnc.taivideonhanh.vn`
- **Password**: `firefox123`
- **Resolution**: 1920x1080

## 🎉 Completion Verification

Khi tất cả checklist đã hoàn thành, verify bằng cách:

1. **Test YouTube video**:
   ```bash
   curl -X POST https://taivideonhanh.vn/api/video-info \
     -H "Content-Type: application/json" \
     -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' | jq '.formats | length'
   ```
   **Expected**: ≥ 15 formats

2. **Test multi-platform**:
   - Facebook video accessible
   - Instagram video downloadable
   - TikTok video available
   - Twitter video working

3. **Verify automation**:
   - Auto cookie extraction working
   - Cookie validation passing
   - Health monitoring active

---

**🏆 Firefox Cookie Management System đã sẵn sàng cải thiện đáng kể chất lượng video download cho TaiVideoNhanh!**

**📈 Expected Results**: 500% improvement trong số lượng formats available và full access cho tất cả major video platforms.
