#!/usr/bin/env node

/**
 * Complete Health Check Script for TaiVideoNhanh Platform
 * Kiểm tra toàn bộ hệ thống trước khi triển khai production
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 TaiVideoNhanh - Complete Health Check');
console.log('==========================================\n');

const checks = [];
let totalChecks = 0;
let passedChecks = 0;

function addCheck(name, status, details = '') {
  totalChecks++;
  if (status) passedChecks++;
  
  checks.push({
    name,
    status,
    details,
    icon: status ? '✅' : '❌'
  });
  
  console.log(`${status ? '✅' : '❌'} ${name}${details ? ` - ${details}` : ''}`);
}

// 1. Kiểm tra cấu trúc dự án
console.log('📁 Kiểm tra cấu trúc dự án...');
const requiredFiles = [
  'package.json',
  'frontend/package.json',
  'backend/package.json',
  'docker-compose.yml',
  'frontend/Dockerfile',
  'backend/Dockerfile'
];

requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  addCheck(`File ${file}`, exists);
});

// 2. Kiểm tra dependencies
console.log('\n📦 Kiểm tra dependencies...');
try {
  // Frontend dependencies
  const frontendPackage = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
  const frontendNodeModules = fs.existsSync('frontend/node_modules');
  addCheck('Frontend dependencies installed', frontendNodeModules);
  
  // Backend dependencies
  const backendPackage = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
  const backendNodeModules = fs.existsSync('backend/node_modules');
  addCheck('Backend dependencies installed', backendNodeModules);
  
} catch (error) {
  addCheck('Dependencies check', false, error.message);
}

// 3. Kiểm tra build
console.log('\n🔨 Kiểm tra build...');
try {
  // Frontend build
  const frontendBuild = fs.existsSync('frontend/.next');
  addCheck('Frontend build exists', frontendBuild);
  
  // Backend build
  const backendBuild = fs.existsSync('backend/build');
  addCheck('Backend build exists', backendBuild);
  
} catch (error) {
  addCheck('Build check', false, error.message);
}

// 4. Kiểm tra cấu hình Docker
console.log('\n🐳 Kiểm tra cấu hình Docker...');
try {
  const dockerCompose = fs.readFileSync('docker-compose.yml', 'utf8');
  const hasTraefik = dockerCompose.includes('traefik');
  const hasFrontend = dockerCompose.includes('frontend');
  const hasBackend = dockerCompose.includes('backend');
  const hasDatabase = dockerCompose.includes('postgres');
  const hasRedis = dockerCompose.includes('redis');
  
  addCheck('Traefik configuration', hasTraefik);
  addCheck('Frontend service', hasFrontend);
  addCheck('Backend service', hasBackend);
  addCheck('Database service', hasDatabase);
  addCheck('Redis service', hasRedis);
  
} catch (error) {
  addCheck('Docker configuration', false, error.message);
}

// 5. Kiểm tra environment variables
console.log('\n🔧 Kiểm tra environment variables...');
const envVars = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'REDIS_URL'
];

// Kiểm tra trong docker-compose.yml
try {
  const dockerCompose = fs.readFileSync('docker-compose.yml', 'utf8');
  envVars.forEach(envVar => {
    const hasEnvVar = dockerCompose.includes(envVar);
    addCheck(`Environment variable ${envVar}`, hasEnvVar);
  });
} catch (error) {
  addCheck('Environment variables check', false, error.message);
}

// 6. Kiểm tra API routes
console.log('\n🛣️ Kiểm tra API routes...');
const apiRoutes = [
  'backend/src/routes/auth.ts',
  'backend/src/routes/streaming.ts',
  'backend/src/routes/subscription.ts',
  'backend/src/routes/admin.ts',
  'backend/src/routes/health.ts'
];

apiRoutes.forEach(route => {
  const exists = fs.existsSync(route);
  addCheck(`API route ${path.basename(route)}`, exists);
});

// 7. Kiểm tra frontend pages
console.log('\n📄 Kiểm tra frontend pages...');
const frontendPages = [
  'frontend/src/app/page.tsx',
  'frontend/src/app/subscription/page.tsx',
  'frontend/src/app/plans/page.tsx',
  'frontend/src/app/admin/page.tsx',
  'frontend/src/app/admin/login/page.tsx'
];

frontendPages.forEach(page => {
  const exists = fs.existsSync(page);
  addCheck(`Page ${path.basename(page)}`, exists);
});

// 8. Kiểm tra components
console.log('\n🧩 Kiểm tra components...');
const components = [
  'frontend/src/components/layout/Navigation.tsx',
  'frontend/src/components/auth/AuthModal.tsx',
  'frontend/src/components/subscription/PricingPlans.tsx',
  'frontend/src/contexts/AuthContext.tsx',
  'frontend/src/contexts/SubscriptionContext.tsx'
];

components.forEach(component => {
  const exists = fs.existsSync(component);
  addCheck(`Component ${path.basename(component)}`, exists);
});

// 9. Kiểm tra database models
console.log('\n🗄️ Kiểm tra database models...');
const models = [
  'backend/src/models/User.ts',
  'backend/src/models/SubscriptionPlan.ts',
  'backend/src/models/UserSubscription.ts',
  'backend/src/models/Payment.ts',
  'backend/src/models/Admin.ts'
];

models.forEach(model => {
  const exists = fs.existsSync(model);
  addCheck(`Model ${path.basename(model)}`, exists);
});

// 10. Kiểm tra services
console.log('\n⚙️ Kiểm tra services...');
const services = [
  'backend/src/services/authService.ts',
  'backend/src/services/streamingService.ts',
  'backend/src/services/subscriptionService.ts',
  'backend/src/services/paymentService.ts',
  'backend/src/services/adminService.ts'
];

services.forEach(service => {
  const exists = fs.existsSync(service);
  addCheck(`Service ${path.basename(service)}`, exists);
});

// Tổng kết
console.log('\n📊 KẾT QUẢ TỔNG KẾT');
console.log('==================');
console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks`);
console.log(`❌ Failed: ${totalChecks - passedChecks}/${totalChecks} checks`);

const successRate = (passedChecks / totalChecks * 100).toFixed(1);
console.log(`📈 Success Rate: ${successRate}%`);

if (successRate >= 95) {
  console.log('\n🎉 EXCELLENT! Dự án sẵn sàng cho production deployment!');
} else if (successRate >= 85) {
  console.log('\n👍 GOOD! Dự án gần như sẵn sàng, cần khắc phục một số vấn đề nhỏ.');
} else if (successRate >= 70) {
  console.log('\n⚠️ WARNING! Cần khắc phục một số vấn đề trước khi deploy.');
} else {
  console.log('\n🚨 CRITICAL! Nhiều vấn đề cần được khắc phục trước khi deploy.');
}

// Khuyến nghị
console.log('\n💡 KHUYẾN NGHỊ:');
if (successRate >= 95) {
  console.log('- Chạy docker-compose up để test local deployment');
  console.log('- Kiểm tra EasyPanel deployment configuration');
  console.log('- Setup monitoring và logging');
  console.log('- Chuẩn bị SSL certificates');
} else {
  console.log('- Khắc phục các lỗi được đánh dấu ❌');
  console.log('- Chạy lại health check sau khi sửa lỗi');
  console.log('- Test từng component riêng biệt');
}

console.log('\n🔗 NEXT STEPS:');
console.log('1. Fix any failed checks above');
console.log('2. Run: docker-compose up --build');
console.log('3. Test all functionality locally');
console.log('4. Deploy to EasyPanel');
console.log('5. Configure domain and SSL');

process.exit(successRate >= 95 ? 0 : 1);
