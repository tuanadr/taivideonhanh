# 🚀 QUICK DEPLOYMENT GUIDE - TAIVIDEONHANH

## 📋 **PRE-DEPLOYMENT CHECKLIST**

- ✅ EasyPanel account setup
- ✅ Domain taivideonhanh.vn configured
- ✅ GitHub repository access
- ✅ Stripe account for payments
- ✅ Email service for notifications

---

## 🎯 **DEPLOYMENT STEPS**

### **Step 1: EasyPanel Setup (5 minutes)**

1. **Login to EasyPanel**
   ```
   URL: https://your-easypanel-domain.com
   ```

2. **Create New Project**
   - Project Name: `taivideonhanh`
   - Repository: `https://github.com/tuanadr/taivideonhanh`
   - Branch: `main`

### **Step 2: Service Configuration (10 minutes)**

#### **Database Service**
```yaml
Name: taivideonhanh-db
Image: postgres:14
Environment:
  POSTGRES_DB: taivideonhanh
  POSTGRES_USER: dbuser
  POSTGRES_PASSWORD: [SECURE_PASSWORD]
Volumes:
  - postgres_data:/var/lib/postgresql/data
```

#### **Redis Service**
```yaml
Name: taivideonhanh-redis
Image: redis:7-alpine
Volumes:
  - redis_data:/data
```

#### **Main Application**
```yaml
Name: taivideonhanh-app
Build: Dockerfile.monorepo
Environment:
  # Database
  DB_HOST: taivideonhanh-db
  DB_USER: dbuser
  DB_PASSWORD: [SECURE_PASSWORD]
  DB_NAME: taivideonhanh
  
  # Redis
  REDIS_URL: redis://taivideonhanh-redis:6379
  
  # JWT Secrets
  JWT_ACCESS_SECRET: [GENERATE_SECURE_SECRET]
  JWT_REFRESH_SECRET: [GENERATE_SECURE_SECRET]
  JWT_ACCESS_EXPIRES_IN: 15m
  JWT_REFRESH_EXPIRES_IN: 7d
  
  # Admin
  ADMIN_EMAILS: admin@taivideonhanh.vn
  
  # Stripe (Production)
  STRIPE_SECRET_KEY: sk_live_[YOUR_STRIPE_SECRET]
  STRIPE_WEBHOOK_SECRET: whsec_[YOUR_WEBHOOK_SECRET]
  
  # Environment
  NODE_ENV: production
  NEXT_TELEMETRY_DISABLED: 1

Domains:
  - taivideonhanh.vn
  - www.taivideonhanh.vn
  - api.taivideonhanh.vn
```

### **Step 3: Domain Configuration (5 minutes)**

#### **DNS Records**
```
Type: A
Name: @
Value: [EASYPANEL_SERVER_IP]

Type: A  
Name: www
Value: [EASYPANEL_SERVER_IP]

Type: A
Name: api
Value: [EASYPANEL_SERVER_IP]
```

#### **Traefik Labels**
```yaml
traefik.enable: true
traefik.http.routers.frontend.rule: Host(`taivideonhanh.vn`) || Host(`www.taivideonhanh.vn`)
traefik.http.routers.api.rule: Host(`api.taivideonhanh.vn`)
traefik.http.services.app.loadbalancer.server.port: 3000
```

### **Step 4: SSL Configuration (Automatic)**
EasyPanel sẽ tự động cấu hình SSL certificates qua Let's Encrypt.

---

## 🔧 **POST-DEPLOYMENT SETUP**

### **Step 1: Database Initialization (2 minutes)**

1. **Access Application Container**
   ```bash
   # Via EasyPanel terminal
   cd /app/backend
   npm run migrate
   ```

2. **Create Admin User**
   ```bash
   node scripts/create-admin-user.js
   # Email: admin@taivideonhanh.vn
   # Password: [SECURE_PASSWORD]
   ```

### **Step 2: Stripe Webhook Setup (3 minutes)**

1. **Stripe Dashboard**
   - Go to Developers > Webhooks
   - Add endpoint: `https://api.taivideonhanh.vn/api/webhook/stripe`
   - Select events: `payment_intent.succeeded`, `invoice.payment_succeeded`

2. **Test Webhook**
   ```bash
   curl -X POST https://api.taivideonhanh.vn/api/webhook/stripe/test
   ```

### **Step 3: Health Check (1 minute)**

```bash
# API Health
curl https://api.taivideonhanh.vn/api/health

# Frontend Health  
curl https://taivideonhanh.vn

# Admin Panel
curl https://taivideonhanh.vn/admin/login
```

---

## 🧪 **TESTING CHECKLIST**

### **Frontend Testing**
- [ ] Homepage loads correctly
- [ ] User registration works
- [ ] User login works
- [ ] Video analysis works
- [ ] Download functionality works
- [ ] Subscription page loads
- [ ] Payment flow works (test mode)

### **Admin Testing**
- [ ] Admin login works
- [ ] Dashboard displays data
- [ ] User management works
- [ ] Cookie upload works
- [ ] Analytics display correctly

### **API Testing**
- [ ] All endpoints respond
- [ ] Authentication works
- [ ] Database connections stable
- [ ] Redis connections stable
- [ ] Stripe webhooks working

---

## 📊 **MONITORING SETUP**

### **Health Monitoring**
```bash
# Add to crontab for monitoring
*/5 * * * * curl -f https://api.taivideonhanh.vn/api/health || echo "API Down"
```

### **Log Monitoring**
- EasyPanel provides built-in log viewing
- Check application logs regularly
- Monitor error rates

### **Performance Monitoring**
- Monitor response times
- Check database performance
- Monitor Redis memory usage

---

## 🔒 **SECURITY CHECKLIST**

- [ ] All environment variables secured
- [ ] Database passwords strong
- [ ] JWT secrets generated securely
- [ ] Stripe keys in production mode
- [ ] Admin passwords changed from defaults
- [ ] HTTPS enforced everywhere
- [ ] CORS configured properly

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues**

#### **Database Connection Failed**
```bash
# Check database service status
# Verify environment variables
# Check network connectivity
```

#### **Redis Connection Failed**
```bash
# Check Redis service status
# Verify REDIS_URL format
# Check memory limits
```

#### **Build Failed**
```bash
# Check Dockerfile syntax
# Verify all dependencies installed
# Check build logs in EasyPanel
```

#### **SSL Certificate Issues**
```bash
# Verify DNS records
# Check domain configuration
# Wait for Let's Encrypt propagation
```

---

## 📞 **SUPPORT CONTACTS**

### **Technical Issues**
- Check EasyPanel documentation
- Review application logs
- Contact EasyPanel support if needed

### **Business Issues**
- Monitor user feedback
- Check payment processing
- Review analytics data

---

## 🎉 **LAUNCH CHECKLIST**

### **Pre-Launch**
- [ ] All services deployed
- [ ] Domain configured
- [ ] SSL certificates active
- [ ] Database initialized
- [ ] Admin user created
- [ ] Stripe configured
- [ ] Testing completed

### **Launch Day**
- [ ] Monitor all services
- [ ] Check error logs
- [ ] Verify payment processing
- [ ] Monitor user registrations
- [ ] Check performance metrics

### **Post-Launch**
- [ ] Daily health checks
- [ ] Weekly performance reviews
- [ ] Monthly security audits
- [ ] Quarterly feature updates

---

## 🚀 **READY TO LAUNCH!**

Sau khi hoàn thành tất cả các bước trên, TaiVideoNhanh sẽ sẵn sàng phục vụ khách hàng và tạo ra doanh thu.

**Estimated Total Deployment Time: 30 minutes**

*Good luck with your launch! 🎊*
