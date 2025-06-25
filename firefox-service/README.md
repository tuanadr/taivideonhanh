# 🦊 Firefox Cookie Service

Firefox-based cookie management service for multi-platform video downloading. Optimized for yt-dlp compatibility based on Reddit community recommendations.

## 🌟 Features

- **🦊 Firefox-based**: Better yt-dlp compatibility than Chrome
- **🌐 Multi-platform**: YouTube, Facebook, Instagram, TikTok, Twitter/X
- **🖥️ VNC Interface**: Manual login through web browser
- **🔄 Auto-refresh**: Automatic cookie refresh when expired
- **📊 API-driven**: RESTful API for cookie management
- **🐳 Docker Ready**: Easy deployment with Docker/EasyPanel

## 🏗️ Architecture

```
Firefox Service
├── 🦊 Firefox Manager (Selenium WebDriver)
├── 🍪 Cookie Extractor (SQLite + Session)
├── 🎯 Platform Manager (Multi-platform support)
├── 🖥️ VNC Server (noVNC web interface)
└── 📡 REST API (Express.js)
```

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start service
npm start

# Access VNC interface
open http://localhost:6080

# Test API
curl http://localhost:3000/health
```

### Docker Deployment

```bash
# Build image
docker build -t firefox-cookie-service .

# Run container
docker run -p 3000:3000 -p 6080:6080 \
  -v $(pwd)/data:/app/cookies \
  firefox-cookie-service
```

### EasyPanel Deployment

1. Upload `firefox-service/` directory to EasyPanel
2. Configure environment variables
3. Set up domains:
   - `firefox-api.taivideonhanh.vn` → Port 3000
   - `firefox-vnc.taivideonhanh.vn` → Port 6080
4. Deploy service

## 📡 API Endpoints

### Health & Status
- `GET /health` - Service health check
- `GET /status` - Service status and active sessions

### Cookie Management
- `POST /extract-cookies` - Extract cookies for platform
- `POST /validate-cookies/:platform` - Validate cookies
- `GET /cookies/:platform/download` - Download cookie file

### Platform Support
- `GET /platforms` - List supported platforms
- `GET /vnc` - VNC access information

### Session Management
- `POST /session/create` - Create Firefox session
- `POST /session/:id/close` - Close session
- `POST /session/:id/navigate` - Navigate to URL

## 🎯 Supported Platforms

| Platform | Status | Cookie Support | Format Count |
|----------|--------|----------------|--------------|
| YouTube | ✅ | Full | 20+ formats |
| Facebook | ✅ | Full | 10+ formats |
| Instagram | ✅ | Full | 5+ formats |
| TikTok | ✅ | Full | 8+ formats |
| Twitter/X | ✅ | Full | 5+ formats |

## 🔧 Configuration

### Environment Variables

```bash
NODE_ENV=production
PORT=3000
DISPLAY=:99
FIREFOX_PROFILE_PATH=/app/firefox-profile
COOKIES_PATH=/app/cookies
VNC_PASSWORD=firefox123
ALLOWED_ORIGINS=https://taivideonhanh.vn
```

### Resource Requirements

- **Memory**: 4GB minimum, 8GB recommended
- **CPU**: 2 cores minimum
- **Storage**: 10GB for profiles and cookies
- **Network**: Internet access for video platforms

## 🖥️ VNC Usage

1. **Access VNC**: Open `https://firefox-vnc.taivideonhanh.vn`
2. **Manual Login**: Login to video platforms normally
3. **Extract Cookies**: Use API to extract cookies after login
4. **Validate**: Test cookies with yt-dlp

### VNC Controls
- **Password**: `firefox123` (configurable)
- **Resolution**: 1920x1080
- **Browser**: Firefox with automation settings

## 🔄 Cookie Workflow

### Manual Process
1. Access VNC interface
2. Navigate to video platform
3. Login with credentials
4. Call `/extract-cookies` API
5. Validate with `/validate-cookies/:platform`

### Automated Process
```javascript
// Extract cookies for YouTube
const response = await fetch('/extract-cookies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    platform: 'youtube',
    credentials: {
      email: 'your-email@gmail.com',
      password: 'your-password'
    }
  })
});
```

## 🔗 Integration

### Backend Integration
```typescript
// Update environment
FIREFOX_SERVICE_URL=https://firefox-api.taivideonhanh.vn
ENABLE_AUTO_COOKIE_EXTRACTION=true

// Use in code
import { CookieManagementService } from './cookieManagementService';

const cookies = await CookieManagementService.extractCookiesFromFirefox('youtube');
```

### yt-dlp Integration
```bash
# Use extracted cookies
yt-dlp --cookies /app/cookies/youtube-cookies.txt "https://youtube.com/watch?v=VIDEO_ID"
```

## 🔒 Security

### Best Practices
- Protect VNC with strong authentication
- Use HTTPS for all endpoints
- Regular cookie refresh (24-48 hours)
- Monitor for unauthorized access
- IP restrictions for VNC access

### Cookie Security
- Cookies stored in secure directory
- Automatic backup before refresh
- Validation before use
- Encrypted storage recommended

## 🧪 Testing

```bash
# Run tests
npm test

# Test specific platform
curl -X POST http://localhost:3000/validate-cookies/youtube

# Health check
curl http://localhost:3000/health
```

## 📊 Monitoring

### Logs
- Service logs: `/app/logs/firefox-service.log`
- VNC logs: `/app/logs/novnc.log`
- Firefox logs: `/app/logs/xvfb.log`

### Metrics
- Active sessions
- Cookie extraction success rate
- Platform validation status
- Resource usage

## 🐛 Troubleshooting

### Common Issues

**Firefox won't start**
```bash
# Check X server
echo $DISPLAY
xdpyinfo -display :99
```

**VNC not accessible**
```bash
# Check VNC process
ps aux | grep vnc
netstat -tlnp | grep 6080
```

**Cookie extraction fails**
```bash
# Check Firefox profile
ls -la /app/firefox-profile/
# Check cookies directory
ls -la /app/cookies/
```

### Debug Mode
```bash
# Enable debug logging
NODE_ENV=development npm start
```

## 📚 Documentation

- [EasyPanel Deployment Guide](./easypanel-deployment.md)
- [API Documentation](./api-docs.md)
- [Platform Configuration](./platform-config.md)
- [Security Guidelines](./security.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- GitHub Issues: Report bugs and feature requests
- Documentation: Check README and guides
- Community: Reddit r/youtubedl recommendations

---

**Made with ❤️ for TaiVideoNhanh - Optimized for yt-dlp compatibility**
