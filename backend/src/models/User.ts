import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';

interface UserAttributes {
  id: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  subscription_tier: 'free' | 'pro';
  is_active: boolean;
  is_suspended: boolean;
  created_at: Date;
  updated_at: Date;
  email_verified: boolean;
  last_login: Date | null;
  deleted_at?: Date | null;
  deletion_reason?: string;
  deleted_by?: string;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'created_at' | 'updated_at' | 'subscription_tier' | 'email_verified' | 'last_login' | 'is_active' | 'is_suspended' | 'first_name' | 'last_name'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public password_hash!: string;
  public first_name?: string;
  public last_name?: string;
  public subscription_tier!: 'free' | 'pro';
  public is_active!: boolean;
  public is_suspended!: boolean;
  public created_at!: Date;
  public updated_at!: Date;
  public email_verified!: boolean;
  public last_login!: Date | null;
  public deleted_at?: Date | null;
  public deletion_reason?: string;
  public deleted_by?: string;

  // Instance methods
  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password_hash);
  }

  public toJSON(): Partial<UserAttributes> {
    const values = Object.assign({}, this.get()) as any;
    delete values.password_hash;
    return values;
  }

  public async updateLastLogin(): Promise<void> {
    this.last_login = new Date();
    await this.save();
  }

  public isPro(): boolean {
    return this.subscription_tier === 'pro';
  }

  public isFree(): boolean {
    return this.subscription_tier === 'free';
  }

  public async upgradeToPro(): Promise<void> {
    this.subscription_tier = 'pro';
    await this.save();
  }

  public async downgradeToFree(): Promise<void> {
    this.subscription_tier = 'free';
    await this.save();
  }

  // Static methods
  public static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  public static async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email: email.toLowerCase() } });
  }
}

User.init(
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
      set(value: string) {
        this.setDataValue('email', value.toLowerCase());
      },
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [60, 60], // bcrypt hash length
      },
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 50],
      },
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 50],
      },
    },
    subscription_tier: {
      type: DataTypes.ENUM('free', 'pro'),
      allowNull: false,
      defaultValue: 'free',
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    is_suspended: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deletion_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    deleted_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['email'],
      },
    ],
  }
);

export default User;
export { UserAttributes, UserCreationAttributes };
