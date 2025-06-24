# 🚀 Production Deployment Guide - YouTube Cookie Authentication

## 📋 Overview

This guide provides step-by-step instructions for deploying the YouTube cookie authentication solution to production environments.

## ✅ Pre-Deployment Checklist

### **System Requirements**
- [x] Node.js 18+ installed
- [x] yt-dlp installed and accessible in PATH
- [x] PostgreSQL database configured
- [x] Redis server running
- [x] Environment variables configured

### **Code Deployment**
- [x] Pull Request #18 merged to main
- [x] Latest code deployed to production server
- [x] Dependencies installed (`npm install`)
- [x] Application built (`npm run build`)

## 🔧 Environment Configuration

### **Required Environment Variables**
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/taivideonhanh
REDIS_URL=redis://localhost:6379

# YouTube Cookie Authentication (Optional)
ENABLE_COOKIE_AUTH=true                    # Enable cookie authentication
SKIP_COOKIE_AUTH=false                     # Don't skip in production
YOUTUBE_COOKIES_PATH=/secure/cookies.txt   # Cookie file path
CHROME_USER_DATA_DIR=/secure/chrome-profile # Chrome profile directory

# Application
NODE_ENV=production
PORT=5000
```

### **Optional Cookie Authentication Setup**

#### **Method 1: Browser Cookies (Recommended)**
```bash
# 1. Install Chrome on production server
sudo apt update
sudo apt install -y google-chrome-stable

# 2. Create secure profile directory
sudo mkdir -p /opt/chrome-profile
sudo chown -R app:app /opt/chrome-profile
sudo chmod 755 /opt/chrome-profile

# 3. Setup Chrome profile (one-time manual step)
# Login to server with GUI access or use X11 forwarding
google-chrome --user-data-dir=/opt/chrome-profile
# Navigate to youtube.com and login with your account

# 4. Test cookie extraction
yt-dlp --cookies-from-browser chrome --dump-json "https://youtube.com/watch?v=jNQXAC9IVRw"
```

#### **Method 2: Cookie File**
```bash
# 1. Export cookies from browser (using browser extension)
# Install "Get cookies.txt" extension in Chrome/Firefox
# Export YouTube cookies to cookies.txt

# 2. Upload to secure location
sudo cp cookies.txt /opt/youtube-cookies.txt
sudo chown app:app /opt/youtube-cookies.txt
sudo chmod 600 /opt/youtube-cookies.txt

# 3. Configure environment
export YOUTUBE_COOKIES_PATH=/opt/youtube-cookies.txt
```

## 🐳 Docker Deployment

### **Dockerfile Enhancement**
```dockerfile
FROM node:18-alpine

# Install Chrome for cookie authentication (optional)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Chrome path
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_USER_DATA_DIR=/opt/chrome-profile

# Install yt-dlp
RUN apk add --no-cache python3 py3-pip
RUN pip3 install yt-dlp

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Create secure directories
RUN mkdir -p /opt/chrome-profile /opt/cookies
RUN chown -R node:node /opt/chrome-profile /opt/cookies

# Switch to non-root user
USER node

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "start"]
```

### **Docker Compose Configuration**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/taivideonhanh
      - REDIS_URL=redis://redis:6379
      - ENABLE_COOKIE_AUTH=true
      - CHROME_USER_DATA_DIR=/opt/chrome-profile
      - YOUTUBE_COOKIES_PATH=/opt/cookies/youtube.txt
    volumes:
      - chrome-profile:/opt/chrome-profile
      - cookies-data:/opt/cookies
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=taivideonhanh
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

volumes:
  postgres-data:
  redis-data:
  chrome-profile:
  cookies-data:
```

## 🔍 Production Testing

### **Pre-Deployment Testing**
```bash
# 1. Test production build
npm run build
npm start

# 2. Run production validation tests
node test-production-validation.js

# 3. Test API endpoints
curl -X POST http://localhost:5000/api/info \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=U_kEC7kjA8k"}'

# 4. Test cookie authentication (if setup)
yt-dlp --cookies-from-browser chrome --dump-json \
  "https://www.youtube.com/watch?v=U_kEC7kjA8k"
```

### **Post-Deployment Verification**
```bash
# 1. Health check
curl http://your-domain.com/api/health

# 2. Test original failing video
curl -X POST http://your-domain.com/api/info \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=U_kEC7kjA8k"}'

# 3. Monitor logs
tail -f /var/log/app.log | grep -E "(SUCCESS|ERROR|🍪)"
```

## 📊 Monitoring & Alerting

### **Key Metrics to Monitor**
```bash
# Success rate
grep "SUCCESS" /var/log/app.log | wc -l

# Authentication errors
grep "Sign in to confirm" /var/log/app.log

# Cookie authentication usage
grep "🍪 Using" /var/log/app.log

# Response times
grep "duration" /var/log/app.log | awk '{print $NF}' | sort -n
```

### **Alert Thresholds**
- Success rate < 95%: Investigate immediately
- Response time > 10s: Performance issue
- Authentication errors > 5%: Consider cookie refresh
- Cookie failures > 10%: Browser setup issue

### **Log Monitoring Setup**
```bash
# Setup log rotation
sudo tee /etc/logrotate.d/taivideonhanh << EOF
/var/log/app.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 app app
}
EOF

# Setup monitoring script
sudo tee /opt/monitor-youtube-auth.sh << EOF
#!/bin/bash
LOG_FILE="/var/log/app.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check success rate in last hour
SUCCESS_COUNT=$(grep "SUCCESS" $LOG_FILE | grep "$(date '+%Y-%m-%d %H')" | wc -l)
ERROR_COUNT=$(grep "ERROR" $LOG_FILE | grep "$(date '+%Y-%m-%d %H')" | wc -l)

if [ $ERROR_COUNT -gt 0 ]; then
    TOTAL=$((SUCCESS_COUNT + ERROR_COUNT))
    SUCCESS_RATE=$((SUCCESS_COUNT * 100 / TOTAL))
    
    if [ $SUCCESS_RATE -lt 95 ]; then
        echo "$DATE: WARNING - Success rate: $SUCCESS_RATE%" >> /var/log/monitoring.log
        # Send alert (email, Slack, etc.)
    fi
fi
EOF

chmod +x /opt/monitor-youtube-auth.sh

# Add to crontab
echo "0 * * * * /opt/monitor-youtube-auth.sh" | sudo crontab -
```

## 🔒 Security Considerations

### **Cookie Security**
```bash
# Secure file permissions
sudo chmod 600 /opt/youtube-cookies.txt
sudo chmod 700 /opt/chrome-profile

# Regular cookie refresh (recommended monthly)
sudo tee /opt/refresh-cookies.sh << EOF
#!/bin/bash
# Backup old cookies
cp /opt/youtube-cookies.txt /opt/youtube-cookies.txt.backup

# Instructions for manual refresh
echo "Please refresh YouTube cookies:"
echo "1. Open Chrome with profile: google-chrome --user-data-dir=/opt/chrome-profile"
echo "2. Navigate to youtube.com and re-login"
echo "3. Test: yt-dlp --cookies-from-browser chrome --dump-json 'https://youtube.com/watch?v=jNQXAC9IVRw'"
EOF

chmod +x /opt/refresh-cookies.sh
```

### **Environment Security**
```bash
# Secure environment file
sudo chmod 600 /etc/environment
sudo chown root:root /etc/environment

# Use secrets management (recommended)
# - AWS Secrets Manager
# - HashiCorp Vault
# - Kubernetes Secrets
```

## 🚀 Deployment Steps

### **Step 1: Prepare Environment**
```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
sudo apt install -y nodejs npm postgresql redis-server

# 3. Install yt-dlp
sudo pip3 install yt-dlp

# 4. Create application user
sudo useradd -m -s /bin/bash app
```

### **Step 2: Deploy Application**
```bash
# 1. Clone repository
sudo -u app git clone https://github.com/tuanadr/taivideonhanh.git /opt/taivideonhanh
cd /opt/taivideonhanh

# 2. Install dependencies
sudo -u app npm install

# 3. Build application
sudo -u app npm run build

# 4. Configure environment
sudo cp .env.example .env.production
sudo nano .env.production  # Configure variables
```

### **Step 3: Setup Services**
```bash
# 1. Create systemd service
sudo tee /etc/systemd/system/taivideonhanh.service << EOF
[Unit]
Description=Tai Video Nhanh Application
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=app
WorkingDirectory=/opt/taivideonhanh
Environment=NODE_ENV=production
EnvironmentFile=/opt/taivideonhanh/.env.production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 2. Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable taivideonhanh
sudo systemctl start taivideonhanh
```

### **Step 4: Setup Reverse Proxy**
```nginx
# /etc/nginx/sites-available/taivideonhanh
server {
    listen 80;
    server_name taivideonhanh.vn;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

### **Step 5: SSL Setup**
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d taivideonhanh.vn

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## ✅ Post-Deployment Checklist

- [ ] Application starts successfully
- [ ] Database connection working
- [ ] Redis connection working
- [ ] API endpoints responding
- [ ] Original failing video (U_kEC7kjA8k) works
- [ ] Cookie authentication available (if setup)
- [ ] SSL certificate installed
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Log rotation configured

## 🆘 Troubleshooting

### **Common Issues**

#### **yt-dlp not found**
```bash
# Check PATH
echo $PATH
which yt-dlp

# Install globally
sudo pip3 install yt-dlp
sudo ln -s /usr/local/bin/yt-dlp /usr/bin/yt-dlp
```

#### **Cookie authentication fails**
```bash
# Check Chrome installation
google-chrome --version

# Check profile directory
ls -la /opt/chrome-profile

# Test cookie extraction
yt-dlp --cookies-from-browser chrome --list-formats "https://youtube.com/watch?v=jNQXAC9IVRw"
```

#### **Permission errors**
```bash
# Fix file permissions
sudo chown -R app:app /opt/taivideonhanh
sudo chmod -R 755 /opt/taivideonhanh
sudo chmod 600 /opt/youtube-cookies.txt
```

### **Emergency Rollback**
```bash
# Stop application
sudo systemctl stop taivideonhanh

# Rollback to previous version
cd /opt/taivideonhanh
git checkout main~1

# Restart
sudo systemctl start taivideonhanh
```

## 📞 Support

For production support:
- Check logs: `sudo journalctl -u taivideonhanh -f`
- Monitor metrics: `node test-production-validation.js`
- Review documentation: `YOUTUBE-COOKIE-AUTHENTICATION-GUIDE.md`

---

**Production deployment guide for YouTube cookie authentication solution** 🚀
