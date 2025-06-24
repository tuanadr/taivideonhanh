import { DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database';

interface AdminAttributes {
  id: string;
  email: string;
  password_hash: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: string[];
  is_active: boolean;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface AdminCreationAttributes extends Optional<AdminAttributes, 'id' | 'created_at' | 'updated_at' | 'last_login' | 'is_active'> {}

class Admin extends Model<AdminAttributes, AdminCreationAttributes> implements AdminAttributes {
  public id!: string;
  public email!: string;
  public password_hash!: string;
  public role!: 'super_admin' | 'admin' | 'moderator';
  public permissions!: string[];
  public is_active!: boolean;
  public last_login!: Date | null;
  public created_at!: Date;
  public updated_at!: Date;

  // Helper methods
  public async validatePassword(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password_hash);
  }

  public async updateLastLogin(): Promise<void> {
    this.last_login = new Date();
    await this.save();
  }

  public hasPermission(permission: string): boolean {
    return this.permissions.includes(permission) || this.role === 'super_admin';
  }

  public isSuperAdmin(): boolean {
    return this.role === 'super_admin';
  }

  public isAdmin(): boolean {
    return this.role === 'admin' || this.role === 'super_admin';
  }

  public isModerator(): boolean {
    return this.role === 'moderator' || this.isAdmin();
  }

  public toJSON(): Partial<AdminAttributes> {
    const values = Object.assign({}, this.get()) as any;
    delete values.password_hash;
    return values;
  }
}

Admin.init(
  {
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
  },
  {
    sequelize,
    tableName: 'admins',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: async (admin: Admin) => {
        if (admin.password_hash) {
          admin.password_hash = await bcrypt.hash(admin.password_hash, 12);
        }
      },
      beforeUpdate: async (admin: Admin) => {
        if (admin.changed('password_hash')) {
          admin.password_hash = await bcrypt.hash(admin.password_hash, 12);
        }
      },
    },
  }
);

export default Admin;
