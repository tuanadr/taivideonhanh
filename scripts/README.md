# 🛠️ TaiVideoNhanh Deployment Scripts

This directory contains deployment and management scripts for the TaiVideoNhanh platform.

## 📋 Available Scripts

### 🚀 **deploy-production.sh**
Complete production deployment script that handles:
- Building frontend and backend
- Docker container management
- Health checks and verification
- Admin routes deployment

```bash
./scripts/deploy-production.sh
```

**Features:**
- ✅ Automated build process
- ✅ Docker container rebuild
- ✅ Health checks
- ✅ Admin routes verification
- ✅ Production URL testing

---

### 🏥 **health-check.sh**
Comprehensive health monitoring script for system status.

```bash
# Full health check
./scripts/health-check.sh

# Quick check
./scripts/health-check.sh --quick

# Admin routes only
./scripts/health-check.sh --admin-only

# API endpoints only
./scripts/health-check.sh --api-only
```

**Monitors:**
- ✅ System resources (disk, memory)
- ✅ Docker containers
- ✅ Network connectivity
- ✅ Admin routes accessibility
- ✅ API endpoints
- ✅ SSL certificate status

---

### 🧙‍♂️ **admin-setup-wizard.js**
Interactive setup wizard for initial system configuration.

```bash
node scripts/admin-setup-wizard.js
```

**Configures:**
- ✅ Environment variables
- ✅ Admin user creation
- ✅ Cookie system setup
- ✅ Database configuration
- ✅ Deployment guidance

---

## 🔧 Configuration Files

### **docker-compose.production.yml**
Production-ready Docker Compose configuration with:
- PostgreSQL database with health checks
- Redis cache
- Nginx reverse proxy with SSL
- Monitoring stack (optional)
- Persistent volumes
- Network isolation

```bash
# Start production stack
docker-compose -f docker-compose.production.yml up -d

# With monitoring
docker-compose -f docker-compose.production.yml --profile monitoring up -d
```

### **nginx.production.conf**
Production Nginx configuration featuring:
- SSL/TLS termination
- Rate limiting
- Security headers
- Caching strategies
- Admin route protection
- Health check endpoints

## 🚀 Quick Start Guide

### 1. Initial Setup
```bash
# Run the setup wizard
node scripts/admin-setup-wizard.js

# Or manual setup
cp .env.example .env.production
# Edit .env.production with your values
```

### 2. Deploy to Production
```bash
# Automated deployment
./scripts/deploy-production.sh

# Or manual deployment
docker-compose -f docker-compose.production.yml up -d --build
```

### 3. Verify Deployment
```bash
# Run health checks
./scripts/health-check.sh

# Check admin routes specifically
./scripts/health-check.sh --admin-only
```

### 4. Access Admin Panel
```
URL: https://taivideonhanh.vn/admin/login
Email: admin@taivideonhanh.vn
Password: admin123456
```

## 🔒 Security Features

### **Admin Route Protection**
- Rate limiting (5 requests/second)
- Admin-only access control
- Secure headers
- No indexing by search engines

### **API Security**
- Rate limiting (10 requests/second)
- CORS configuration
- Input validation
- Authentication required

### **SSL/TLS**
- Modern TLS protocols only
- HSTS headers
- Secure cipher suites
- Certificate validation

## 📊 Monitoring

### **Health Checks**
The health check script monitors:
- **System Resources**: Disk space, memory usage
- **Services**: Docker containers, database, cache
- **Network**: Connectivity, response times
- **Security**: SSL certificates, headers

### **Logging**
- Nginx access/error logs
- Application logs
- Docker container logs
- Health check results

### **Metrics** (Optional)
Enable monitoring stack:
```bash
docker-compose -f docker-compose.production.yml --profile monitoring up -d
```

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

## 🛠️ Troubleshooting

### **404 Admin Routes**
```bash
# Debug admin routes
./scripts/health-check.sh --admin-only

# Rebuild and deploy
./scripts/deploy-production.sh

# Check build output
ls -la frontend/.next/server/app/admin/
```

### **Docker Issues**
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs nginx

# Restart services
docker-compose restart
```

### **SSL Certificate Issues**
```bash
# Check certificate
openssl s_client -servername taivideonhanh.vn -connect taivideonhanh.vn:443

# Renew certificate (if using Let's Encrypt)
certbot renew
```

### **Database Connection Issues**
```bash
# Check database
docker-compose exec postgres psql -U postgres -d taivideonhanh_prod

# Check environment variables
docker-compose exec backend env | grep DB_
```

## 📝 Maintenance Tasks

### **Daily**
- Monitor health check results
- Check error logs
- Verify admin route accessibility

### **Weekly**
- Review security logs
- Update dependencies
- Test backup procedures

### **Monthly**
- Rotate admin passwords
- Update cookie files
- Review SSL certificates
- Update system packages

## 🆘 Emergency Procedures

### **Service Down**
```bash
# Quick restart
docker-compose restart

# Full rebuild
docker-compose down
docker-compose up -d --build
```

### **Admin Access Lost**
```bash
# Reset admin user
node create-admin-user.js

# Or use wizard
node scripts/admin-setup-wizard.js
```

### **Cookie Issues**
```bash
# Check cookie system
./scripts/health-check.sh --admin-only

# Reset cookie directories
rm -rf /tmp/cookies/*
node scripts/admin-setup-wizard.js
```

## 📞 Support

For issues with these scripts:
1. Check the logs: `docker-compose logs`
2. Run health checks: `./scripts/health-check.sh`
3. Review configuration files
4. Check environment variables

**Remember to change default passwords and update cookie files regularly for security!**
