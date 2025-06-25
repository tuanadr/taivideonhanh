#!/usr/bin/env node

/**
 * Admin User Management Script
 * Creates, updates, and manages admin users for the TaiVideoNhanh system
 */

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
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

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'taivideonhanh_dev',
  process.env.DB_USER || 'user', 
  process.env.DB_PASSWORD || 'pass',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: false, // Disable SQL logging
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

// Readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function questionHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let password = '';
    process.stdin.on('data', function(char) {
      char = char + '';
      
      switch(char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
}

async function connectDatabase() {
  try {
    await sequelize.authenticate();
    logSuccess('Database connection established');
    
    // Sync the Admin model
    await Admin.sync();
    logSuccess('Admin table synchronized');
    
    return true;
  } catch (error) {
    logError(`Database connection failed: ${error.message}`);
    return false;
  }
}

async function createDefaultAdmin() {
  log('\n🔧 Creating Default Admin User...', 'cyan');
  
  try {
    const existingAdmins = await Admin.count();
    if (existingAdmins > 0) {
      logWarning('Admin users already exist in the database');
      const overwrite = await question('Do you want to create another admin? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        return false;
      }
    }

    const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@taivideonhanh.com';
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456';

    const admin = await Admin.create({
      email: defaultEmail,
      password_hash: defaultPassword,
      role: 'super_admin',
      permissions: [
        'user_management',
        'subscription_management', 
        'payment_management',
        'system_settings',
        'analytics_view',
      ],
    });

    logSuccess(`Default admin created successfully!`);
    logInfo(`Email: ${defaultEmail}`);
    logInfo(`Password: ${defaultPassword}`);
    logWarning('Please change the password after first login!');
    
    return admin;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      logError('Admin with this email already exists');
    } else {
      logError(`Failed to create admin: ${error.message}`);
    }
    return false;
  }
}

async function createCustomAdmin() {
  log('\n👤 Creating Custom Admin User...', 'cyan');
  
  try {
    const email = await question('Enter admin email: ');
    if (!email || !email.includes('@')) {
      logError('Invalid email address');
      return false;
    }

    const password = await questionHidden('Enter admin password: ');
    if (!password || password.length < 6) {
      logError('Password must be at least 6 characters');
      return false;
    }

    const confirmPassword = await questionHidden('Confirm password: ');
    if (password !== confirmPassword) {
      logError('Passwords do not match');
      return false;
    }

    log('\nSelect admin role:');
    log('1. Super Admin (full access)');
    log('2. Admin (limited access)');
    log('3. Moderator (basic access)');
    
    const roleChoice = await question('Enter choice (1-3): ');
    const roles = ['super_admin', 'admin', 'moderator'];
    const role = roles[parseInt(roleChoice) - 1] || 'moderator';

    const permissions = role === 'super_admin' ? [
      'user_management',
      'subscription_management',
      'payment_management', 
      'system_settings',
      'analytics_view',
    ] : role === 'admin' ? [
      'user_management',
      'analytics_view',
    ] : [
      'analytics_view',
    ];

    const admin = await Admin.create({
      email,
      password_hash: password,
      role,
      permissions,
    });

    logSuccess(`Admin user created successfully!`);
    logInfo(`Email: ${email}`);
    logInfo(`Role: ${role}`);
    logInfo(`Permissions: ${permissions.join(', ')}`);
    
    return admin;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      logError('Admin with this email already exists');
    } else {
      logError(`Failed to create admin: ${error.message}`);
    }
    return false;
  }
}

async function listAdmins() {
  log('\n📋 Current Admin Users:', 'cyan');
  
  try {
    const admins = await Admin.findAll({
      attributes: ['id', 'email', 'role', 'permissions', 'is_active', 'last_login', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    if (admins.length === 0) {
      logWarning('No admin users found');
      return;
    }

    console.log('\n' + '='.repeat(80));
    admins.forEach((admin, index) => {
      log(`${index + 1}. ${admin.email}`, 'bright');
      log(`   Role: ${admin.role}`);
      log(`   Active: ${admin.is_active ? 'Yes' : 'No'}`);
      log(`   Permissions: ${admin.permissions.join(', ')}`);
      log(`   Last Login: ${admin.last_login ? admin.last_login.toLocaleString() : 'Never'}`);
      log(`   Created: ${admin.created_at.toLocaleString()}`);
      console.log('');
    });
    console.log('='.repeat(80));
    
  } catch (error) {
    logError(`Failed to list admins: ${error.message}`);
  }
}

async function changePassword() {
  log('\n🔑 Change Admin Password...', 'cyan');
  
  try {
    const email = await question('Enter admin email: ');
    const admin = await Admin.findOne({ where: { email } });
    
    if (!admin) {
      logError('Admin not found');
      return false;
    }

    const newPassword = await questionHidden('Enter new password: ');
    if (!newPassword || newPassword.length < 6) {
      logError('Password must be at least 6 characters');
      return false;
    }

    const confirmPassword = await questionHidden('Confirm new password: ');
    if (newPassword !== confirmPassword) {
      logError('Passwords do not match');
      return false;
    }

    admin.password_hash = newPassword;
    await admin.save();

    logSuccess('Password changed successfully!');
    return true;
  } catch (error) {
    logError(`Failed to change password: ${error.message}`);
    return false;
  }
}

async function showMenu() {
  log('\n🎛️  Admin User Management', 'magenta');
  log('='.repeat(30), 'magenta');
  log('1. Create default admin user');
  log('2. Create custom admin user');
  log('3. List all admin users');
  log('4. Change admin password');
  log('5. Exit');
  
  const choice = await question('\nEnter your choice (1-5): ');
  return choice;
}

async function main() {
  log('🚀 TaiVideoNhanh Admin Management Tool', 'bright');
  log('='.repeat(50), 'bright');
  
  // Connect to database
  const connected = await connectDatabase();
  if (!connected) {
    process.exit(1);
  }

  try {
    while (true) {
      const choice = await showMenu();
      
      switch (choice) {
        case '1':
          await createDefaultAdmin();
          break;
        case '2':
          await createCustomAdmin();
          break;
        case '3':
          await listAdmins();
          break;
        case '4':
          await changePassword();
          break;
        case '5':
          log('\nGoodbye! 👋', 'green');
          process.exit(0);
        default:
          logWarning('Invalid choice. Please try again.');
      }
      
      await question('\nPress Enter to continue...');
    }
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
  } finally {
    rl.close();
    await sequelize.close();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\nExiting...', 'yellow');
  rl.close();
  sequelize.close();
  process.exit(0);
});

// Run the script
main().catch(error => {
  logError(`Script failed: ${error.message}`);
  process.exit(1);
});
