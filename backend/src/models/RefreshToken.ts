import { DataTypes, Model, Optional, Op } from 'sequelize';
import sequelize from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

interface RefreshTokenAttributes {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  revoked: boolean;
  revoked_at: Date | null;
  replaced_by: string | null;
}

interface RefreshTokenCreationAttributes extends Optional<RefreshTokenAttributes, 'id' | 'created_at' | 'revoked' | 'revoked_at' | 'replaced_by'> {}

class RefreshToken extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes> implements RefreshTokenAttributes {
  public id!: string;
  public user_id!: string;
  public token_hash!: string;
  public expires_at!: Date;
  public created_at!: Date;
  public revoked!: boolean;
  public revoked_at!: Date | null;
  public replaced_by!: string | null;

  // Instance methods
  public isExpired(): boolean {
    return Date.now() >= this.expires_at.getTime();
  }

  public isActive(): boolean {
    return !this.revoked && !this.isExpired();
  }

  public async revoke(replacedBy?: string): Promise<void> {
    this.revoked = true;
    this.revoked_at = new Date();
    if (replacedBy) {
      this.replaced_by = replacedBy;
    }
    await this.save();
  }

  // Static methods
  public static generateToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  public static async createRefreshToken(userId: string, expiresInDays: number = 7): Promise<{ token: string; refreshToken: RefreshToken }> {
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const refreshToken = await this.create({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    return { token, refreshToken };
  }

  public static async findByToken(token: string): Promise<RefreshToken | null> {
    const tokenHash = this.hashToken(token);
    return this.findOne({
      where: {
        token_hash: tokenHash,
        revoked: false,
      },
    });
  }

  public static async revokeAllUserTokens(userId: string): Promise<void> {
    await this.update(
      {
        revoked: true,
        revoked_at: new Date(),
      },
      {
        where: {
          user_id: userId,
          revoked: false,
        },
      }
    );
  }

  public static async cleanupExpiredTokens(): Promise<number> {
    const result = await this.destroy({
      where: {
        expires_at: {
          [Op.lt]: new Date(),
        },
      },
    });
    return result;
  }
}

RefreshToken.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    token_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    revoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    replaced_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'RefreshToken',
    tableName: 'refresh_tokens',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['token_hash'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['expires_at'],
      },
    ],
  }
);

export default RefreshToken;
export { RefreshTokenAttributes, RefreshTokenCreationAttributes };
