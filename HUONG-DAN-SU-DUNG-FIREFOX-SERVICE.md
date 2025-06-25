# 🖥️ Hướng dẫn Đăng nhập và Sử dụng Firefox Service

## 📋 Tổng quan

Hướng dẫn chi tiết cách sử dụng VNC interface để đăng nhập vào các platform và extract cookies thông qua API.

## 🖥️ Bước 4: Truy cập VNC Interface

### 4.1 Mở VNC Web Interface

1. **Truy cập VNC URL**:
   ```
   https://firefox-vnc.taivideonhanh.vn
   ```

2. **Nhập Password**:
   - Password: `firefox123` (hoặc password đã cấu hình)
   - Click **"Connect"**

3. **Verify Firefox Desktop**:
   - Bạn sẽ thấy desktop Ubuntu với Firefox browser
   - Resolution: 1920x1080
   - Firefox đã được cấu hình sẵn cho automation

### 4.2 Điều khiển VNC Interface

**Mouse Controls**:
- Click trái: Click bình thường
- Click phải: Right-click menu
- Scroll: Cuộn trang

**Keyboard Controls**:
- Tất cả phím hoạt động bình thường
- Ctrl+C, Ctrl+V cho copy/paste
- Tab để navigate giữa các fields

**VNC Controls**:
- **Fullscreen**: Click icon fullscreen
- **Clipboard**: Sync clipboard với máy local
- **Settings**: Adjust quality và performance

## 🔐 Bước 5: Đăng nhập vào các Platform

### 5.1 Đăng nhập YouTube (Google)

1. **Mở Firefox trong VNC**
2. **Navigate đến Google Login**:
   ```
   https://accounts.google.com/signin
   ```

3. **Quy trình đăng nhập**:
   - Nhập email Google của bạn
   - Click **"Next"**
   - Nhập password
   - Click **"Next"**
   - Xử lý 2FA nếu có (SMS/Authenticator)

4. **Verify Login**:
   - Navigate đến `https://youtube.com`
   - Kiểm tra đã login thành công
   - Xem 2-3 video để tạo session

5. **Test Video Access**:
   ```
   https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```

### 5.2 Đăng nhập Facebook

1. **Navigate đến Facebook Login**:
   ```
   https://www.facebook.com/login
   ```

2. **Quy trình đăng nhập**:
   - Nhập email/phone Facebook
   - Nhập password
   - Click **"Log In"**
   - Xử lý security checks nếu có

3. **Verify Login**:
   - Navigate đến Facebook Watch
   - Browse một vài video
   - Đảm bảo session stable

### 5.3 Đăng nhập Instagram

1. **Navigate đến Instagram Login**:
   ```
   https://www.instagram.com/accounts/login/
   ```

2. **Quy trình đăng nhập**:
   - Nhập username Instagram
   - Nhập password
   - Click **"Log In"**
   - Xử lý 2FA nếu có

3. **Verify Login**:
   - Browse Instagram feed
   - Xem một vài stories/reels
   - Đảm bảo session active

### 5.4 Đăng nhập TikTok

1. **Navigate đến TikTok Login**:
   ```
   https://www.tiktok.com/login/phone-or-email/email
   ```

2. **Quy trình đăng nhập**:
   - Nhập email TikTok
   - Nhập password
   - Click **"Log in"**
   - Solve CAPTCHA nếu có

3. **Verify Login**:
   - Browse TikTok For You page
   - Xem một vài videos
   - Check profile accessible

### 5.5 Đăng nhập Twitter/X

1. **Navigate đến Twitter Login**:
   ```
   https://twitter.com/i/flow/login
   ```

2. **Quy trình đăng nhập**:
   - Nhập username/email Twitter
   - Click **"Next"**
   - Nhập password
   - Click **"Log in"**
   - Xử lý 2FA nếu có

3. **Verify Login**:
   - Browse Twitter timeline
   - Check notifications
   - Verify profile access

## 🍪 Bước 6: Extract Cookies thông qua API

### 6.1 Extract Cookies cho YouTube

```bash
# API call để extract YouTube cookies
curl -X POST https://firefox-api.taivideonhanh.vn/extract-cookies \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "youtube",
    "headless": false,
    "testAfterExtraction": true
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "platform": "YouTube",
  "cookiesExtracted": 25,
  "filePath": "/app/cookies/youtube-cookies.txt",
  "validation": {
    "isValid": true,
    "formatCount": 22,
    "title": "Rick Astley - Never Gonna Give You Up"
  }
}
```

### 6.2 Extract Cookies cho Facebook

```bash
curl -X POST https://firefox-api.taivideonhanh.vn/extract-cookies \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "facebook",
    "headless": false,
    "testAfterExtraction": true
  }'
```

### 6.3 Extract Cookies cho Instagram

```bash
curl -X POST https://firefox-api.taivideonhanh.vn/extract-cookies \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "instagram",
    "headless": false,
    "testAfterExtraction": true
  }'
```

### 6.4 Extract Cookies cho TikTok

```bash
curl -X POST https://firefox-api.taivideonhanh.vn/extract-cookies \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "tiktok",
    "headless": false,
    "testAfterExtraction": true
  }'
```

### 6.5 Extract Cookies cho Twitter

```bash
curl -X POST https://firefox-api.taivideonhanh.vn/extract-cookies \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "twitter",
    "headless": false,
    "testAfterExtraction": true
  }'
```

## ✅ Bước 7: Validate Cookies

### 7.1 Validate từng Platform

```bash
# Validate YouTube cookies
curl -X POST https://firefox-api.taivideonhanh.vn/validate-cookies/youtube

# Validate Facebook cookies
curl -X POST https://firefox-api.taivideonhanh.vn/validate-cookies/facebook

# Validate Instagram cookies
curl -X POST https://firefox-api.taivideonhanh.vn/validate-cookies/instagram

# Validate TikTok cookies
curl -X POST https://firefox-api.taivideonhanh.vn/validate-cookies/tiktok

# Validate Twitter cookies
curl -X POST https://firefox-api.taivideonhanh.vn/validate-cookies/twitter
```

### 7.2 Expected Validation Results

**Successful Validation**:
```json
{
  "isValid": true,
  "platform": "YouTube",
  "formatCount": 22,
  "title": "Test Video Title",
  "duration": 212
}
```

**Failed Validation**:
```json
{
  "isValid": false,
  "platform": "YouTube",
  "error": "Cookie file not found or invalid"
}
```

## 📥 Bước 8: Download Cookie Files

### 8.1 Download qua API

```bash
# Download YouTube cookies
curl -o youtube-cookies.txt \
  https://firefox-api.taivideonhanh.vn/cookies/youtube/download

# Download Facebook cookies
curl -o facebook-cookies.txt \
  https://firefox-api.taivideonhanh.vn/cookies/facebook/download
```

### 8.2 Verify Cookie Files

```bash
# Check cookie file format
head -5 youtube-cookies.txt

# Expected format:
# Netscape HTTP Cookie File
# This is a generated file! Do not edit.
#
# .youtube.com	TRUE	/	FALSE	1735689600	VISITOR_INFO1_LIVE	fPQ4jCL6EiE
# .youtube.com	TRUE	/	FALSE	1735689600	YSC	d4T_5U9BWjE
```

## ✅ Checklist Bước 4-8

- [ ] VNC interface accessible với password
- [ ] Firefox browser hoạt động trong VNC
- [ ] YouTube login thành công và session stable
- [ ] Facebook login thành công và session stable
- [ ] Instagram login thành công và session stable
- [ ] TikTok login thành công và session stable
- [ ] Twitter login thành công và session stable
- [ ] YouTube cookies extracted và validated
- [ ] Facebook cookies extracted và validated
- [ ] Instagram cookies extracted và validated
- [ ] TikTok cookies extracted và validated
- [ ] Twitter cookies extracted và validated
- [ ] Cookie files có thể download được

---

**Tiếp theo**: [Bước 9-12: Tích hợp và Vận hành](./HUONG-DAN-TICH-HOP-FIREFOX-SERVICE.md)
