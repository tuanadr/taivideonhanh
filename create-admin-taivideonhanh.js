#!/usr/bin/env node

/**
 * Script để tạo admin user cho taivideonhanh.vn
 */

require('dotenv').config({ path: '.env.production' });
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Database connection với thông tin production
const sequelize = new Sequelize(
  process.env.DB_NAME || 'taivideonhanh_prod',
  process.env.DB_USER || 'taivideonhanh_user', 
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'postgres',
    dialect: 'postgres',
    logging: false,
  }
);

// Admin model definition
const Admin = sequelize.define('Admin', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('super_admin', 'admin', 'moderator'),
    allowNull: false,
    defaultValue: 'moderator',
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  tableName: 'admins',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (admin) => {
      if (admin.password_hash) {
        admin.password_hash = await bcrypt.hash(admin.password_hash, 12);
      }
    },
    beforeUpdate: async (admin) => {
      if (admin.changed('password_hash')) {
        admin.password_hash = await bcrypt.hash(admin.password_hash, 12);
      }
    },
  },
});

async function createAdminUser() {
  try {
    logInfo('🔌 Connecting to database...');
    await sequelize.authenticate();
    logSuccess('Database connection established');

    // Kiểm tra admin users hiện tại
    logInfo('🔍 Checking existing admin users...');
    const existingAdmins = await Admin.findAll({
      attributes: ['email', 'role', 'is_active', 'created_at']
    });

    if (existingAdmins.length > 0) {
      logInfo('📋 Existing admin users:');
      existingAdmins.forEach(admin => {
        console.log(`   - ${admin.email} (${admin.role}) - ${admin.is_active ? 'Active' : 'Inactive'}`);
      });
    } else {
      logInfo('No existing admin users found');
    }

    // Tạo admin user mới với email taivideonhanh.vn
    const adminEmail = 'admin@taivideonhanh.vn';
    const adminPassword = 'admin123456';

    logInfo(`👤 Creating admin user: ${adminEmail}`);

    // Kiểm tra xem admin với email này đã tồn tại chưa
    const existingAdmin = await Admin.findOne({ where: { email: adminEmail } });
    
    if (existingAdmin) {
      logWarning(`Admin user ${adminEmail} already exists`);
      
      // Cập nhật password nếu cần
      logInfo('🔄 Updating password...');
      existingAdmin.password_hash = adminPassword; // Will be hashed by hook
      await existingAdmin.save();
      logSuccess('Password updated successfully');
    } else {
      // Tạo admin user mới
      const admin = await Admin.create({
        email: adminEmail,
        password_hash: adminPassword, // Will be hashed by hook
        role: 'super_admin',
        permissions: [
          'user_management',
          'subscription_management',
          'payment_management',
          'system_settings',
          'analytics_view',
        ],
        is_active: true,
      });

      logSuccess(`Admin user created successfully: ${admin.email}`);
    }

    // Test login
    logInfo('🧪 Testing login...');
    const testAdmin = await Admin.findOne({ where: { email: adminEmail } });
    if (testAdmin) {
      const isValidPassword = await bcrypt.compare(adminPassword, testAdmin.password_hash);
      if (isValidPassword) {
        logSuccess('Login test passed ✓');
      } else {
        logError('Login test failed ✗');
      }
    }

    logSuccess('🎉 Admin setup completed successfully!');
    logInfo(`📧 Email: ${adminEmail}`);
    logInfo(`🔑 Password: ${adminPassword}`);
    logInfo(`🌐 Login URL: https://taivideonhanh.vn/admin/login`);

  } catch (error) {
    logError(`Error: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
createAdminUser();
