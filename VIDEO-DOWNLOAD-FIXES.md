# 🔧 Video Download Fixes - YouTube & TikTok

## 📋 Tổng Quan Vấn Đề

### 1. **Lỗi YouTube Authentication**
```
ERROR: [youtube] U_kEC7kjA8k: Sign in to confirm you're not a bot. 
Use --cookies-from-browser or --cookies for the authentication.
```

### 2. **Lỗi TikTok Backend**
```
Backend không khả dụng. Đang thử endpoint dự phòng...
Dịch vụ backend không khả dụng. Vui lòng kiểm tra kết nối hoặc thử lại sau.
```

## 🛠️ Giải Pháp Đã Triển Khai

### **A. Cải Tiến StreamingService**

#### 1. **Platform-Specific Optimizations**
```typescript
// YouTube optimizations
if (isYouTube) {
  ytdlpArgs.push(
    '--extractor-args', 'youtube:skip=dash,hls',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  );
}

// TikTok optimizations  
if (isTikTok) {
  ytdlpArgs.push(
    '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  );
}
```

#### 2. **Enhanced Error Handling**
```typescript
// Enhanced error messages based on platform and error type
let userFriendlyError = 'Video streaming failed';

if (isYouTube && errorOutput.includes('Sign in to confirm')) {
  userFriendlyError = 'YouTube yêu cầu xác thực. Video có thể bị hạn chế hoặc cần đăng nhập.';
} else if (isTikTok && errorOutput.includes('Unable to extract')) {
  userFriendlyError = 'Không thể tải video TikTok. Video có thể bị riêng tư hoặc đã bị xóa.';
}
```

#### 3. **Fallback Strategies**
```typescript
// YouTube fallback with different extractor args
private static async getVideoInfoYouTubeFallback(url: string): Promise<VideoInfo> {
  const ytdlpArgs = [
    '--dump-json',
    '--no-warnings',
    '--extractor-args', 'youtube:skip=dash',
    '--user-agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    url
  ];
  // ... implementation
}

// TikTok fallback with mobile user agent
private static async getVideoInfoTikTokFallback(url: string): Promise<VideoInfo> {
  const ytdlpArgs = [
    '--dump-json',
    '--user-agent', 'TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2; en_US) Cronet',
    url
  ];
  // ... implementation
}
```

### **B. Cải Tiến Frontend Error Handling**

#### 1. **Intelligent Fallback Logic**
```typescript
const shouldTryFallback = errorMessage.includes('backend không khả dụng') || 
                         errorMessage.includes('Service is not reachable') ||
                         errorMessage.includes('YouTube yêu cầu xác thực') ||
                         errorMessage.includes('TikTok');

if (shouldTryFallback) {
  // Try alternative endpoint
  const fallbackResponse = await makeAuthenticatedRequest("/api/info/download", {
    method: "POST",
    body: JSON.stringify({ url, format_id, title }),
  });
}
```

#### 2. **User-Friendly Error Messages**
```typescript
if (errorMessage.includes('YouTube yêu cầu xác thực')) {
  errorMessage = 'YouTube yêu cầu xác thực. Vui lòng thử video khác hoặc kiểm tra URL.';
} else if (errorMessage.includes('TikTok')) {
  errorMessage = 'Không thể tải video TikTok. Video có thể bị riêng tư hoặc đã bị xóa.';
}
```

## 🧪 Testing & Validation

### **Chạy Test Script**
```bash
node test-video-fixes.js
```

### **Test Cases**
1. **YouTube Public Videos** - Kiểm tra video công khai
2. **YouTube Restricted Videos** - Kiểm tra video bị hạn chế
3. **TikTok Public Videos** - Kiểm tra video TikTok công khai
4. **TikTok Private Videos** - Kiểm tra video riêng tư
5. **Fallback Mechanisms** - Kiểm tra các phương pháp dự phòng

## 🔮 Giải Pháp Tương Lai

### **1. Cookie Authentication cho YouTube**
```typescript
// Future implementation
const ytdlpArgs = [
  '--cookies-from-browser', 'chrome',
  // hoặc
  '--cookies', '/path/to/cookies.txt',
  url
];
```

### **2. Proxy Support**
```typescript
// Future implementation
const ytdlpArgs = [
  '--proxy', 'http://proxy-server:port',
  url
];
```

### **3. Rate Limiting & Retry Logic**
```typescript
// Future implementation
class RetryableStreamingService {
  static async getVideoInfoWithRetry(url: string, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.getVideoInfo(url);
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.delay(1000 * (i + 1)); // Exponential backoff
      }
    }
  }
}
```

## 📊 Monitoring & Metrics

### **Key Metrics to Track**
1. **Success Rate by Platform**
   - YouTube success rate
   - TikTok success rate
   - Overall success rate

2. **Error Types**
   - Authentication errors
   - Network errors
   - Extraction errors

3. **Fallback Usage**
   - Fallback trigger rate
   - Fallback success rate

### **Logging Enhancements**
```typescript
console.log('Video info request:', {
  url,
  platform: isYouTube ? 'youtube' : isTikTok ? 'tiktok' : 'other',
  timestamp: new Date().toISOString(),
  userAgent: req.headers['user-agent']
});
```

## 🚀 Deployment Notes

### **Environment Variables**
```bash
# Optional: Add these for future cookie support
YOUTUBE_COOKIES_PATH=/path/to/youtube-cookies.txt
ENABLE_PROXY_SUPPORT=false
PROXY_URL=http://proxy-server:port
```

### **Docker Considerations**
```dockerfile
# Ensure yt-dlp is up to date
RUN pip3 install --break-system-packages --upgrade yt-dlp
```

## 📝 Changelog

### **v1.1.0 - Video Download Fixes**
- ✅ Added platform-specific yt-dlp optimizations
- ✅ Enhanced error handling with user-friendly messages
- ✅ Implemented fallback strategies for YouTube and TikTok
- ✅ Improved frontend error handling and retry logic
- ✅ Added comprehensive logging for debugging
- ✅ Created test script for validation

### **Next Steps**
- 🔄 Implement cookie authentication for YouTube
- 🔄 Add proxy support for geo-restricted content
- 🔄 Implement rate limiting and retry mechanisms
- 🔄 Add metrics collection and monitoring
- 🔄 Create automated testing pipeline

## 🆘 Troubleshooting

### **Common Issues**

1. **YouTube "Sign in to confirm" Error**
   - **Cause**: YouTube anti-bot measures
   - **Solution**: Use fallback method or implement cookie auth
   - **Workaround**: Try different user agents

2. **TikTok Extraction Failed**
   - **Cause**: TikTok API changes or private videos
   - **Solution**: Use mobile user agents
   - **Workaround**: Check if video is public

3. **Backend Not Available**
   - **Cause**: Network issues or server overload
   - **Solution**: Automatic fallback to alternative endpoint
   - **Workaround**: Retry after a few seconds

### **Debug Commands**
```bash
# Test yt-dlp directly
yt-dlp --dump-json --no-warnings "https://youtube.com/watch?v=VIDEO_ID"

# Test with enhanced args
yt-dlp --dump-json --no-warnings --extractor-args "youtube:skip=dash,hls" "URL"

# Test TikTok with mobile user agent
yt-dlp --dump-json --user-agent "TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2; en_US) Cronet" "TIKTOK_URL"
```
