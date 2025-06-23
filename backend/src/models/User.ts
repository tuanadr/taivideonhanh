import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';

interface UserAttributes {
  id: string;
  email: string;
  password_hash: string;
  subscription_tier: 'free' | 'pro';
  created_at: Date;
  updated_at: Date;
  email_verified: boolean;
  last_login: Date | null;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'created_at' | 'updated_at' | 'subscription_tier' | 'email_verified' | 'last_login'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public password_hash!: string;
  public subscription_tier!: 'free' | 'pro';
  public created_at!: Date;
  public updated_at!: Date;
  public email_verified!: boolean;
  public last_login!: Date | null;

  // Instance methods
  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password_hash);
  }

  public toJSON(): Partial<UserAttributes> {
    const values = Object.assign({}, this.get()) as any;
    delete values.password_hash;
    return values;
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
