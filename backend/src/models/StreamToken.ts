import { DataTypes, Model, Optional, Op } from 'sequelize';
import sequelize from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

interface StreamTokenAttributes {
  id: string;
  user_id: string;
  token_hash: string;
  video_url: string;
  format_id: string;
  expires_at: Date;
  created_at: Date;
  used: boolean;
  used_at: Date | null;
  ip_address: string | null;
  user_agent: string | null;
  rate_limit_count: number;
  last_access: Date | null;
}

interface StreamTokenCreationAttributes extends Optional<StreamTokenAttributes, 'id' | 'created_at' | 'used' | 'used_at' | 'ip_address' | 'user_agent' | 'rate_limit_count' | 'last_access'> {}

class StreamToken extends Model<StreamTokenAttributes, StreamTokenCreationAttributes> implements StreamTokenAttributes {
  public id!: string;
  public user_id!: string;
  public token_hash!: string;
  public video_url!: string;
  public format_id!: string;
  public expires_at!: Date;
  public created_at!: Date;
  public used!: boolean;
  public used_at!: Date | null;
  public ip_address!: string | null;
  public user_agent!: string | null;
  public rate_limit_count!: number;
  public last_access!: Date | null;

  // Instance methods
  public isExpired(): boolean {
    return Date.now() >= this.expires_at.getTime();
  }

  public isValid(): boolean {
    return !this.used && !this.isExpired();
  }

  public async markAsUsed(): Promise<void> {
    this.used = true;
    this.used_at = new Date();
    await this.save();
  }

  public async incrementRateLimit(): Promise<void> {
    this.rate_limit_count += 1;
    this.last_access = new Date();
    await this.save();
  }

  // Static methods
  public static async createStreamToken(
    userId: string,
    videoUrl: string,
    formatId: string,
    expiresInMinutes: number = 30
  ): Promise<{ token: string; streamToken: StreamToken }> {
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    // Create stream token record
    const streamToken = await StreamToken.create({
      user_id: userId,
      token_hash: tokenHash,
      video_url: videoUrl,
      format_id: formatId,
      expires_at: expiresAt,
    });

    return { token, streamToken };
  }

  public static async findByToken(token: string): Promise<StreamToken | null> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return StreamToken.findOne({
      where: {
        token_hash: tokenHash,
      },
    });
  }

  public static async findValidToken(token: string): Promise<StreamToken | null> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return StreamToken.findOne({
      where: {
        token_hash: tokenHash,
        used: false,
        expires_at: {
          [Op.gt]: new Date(),
        },
      },
    });
  }

  public static async cleanupExpiredTokens(): Promise<number> {
    const result = await StreamToken.destroy({
      where: {
        expires_at: {
          [Op.lt]: new Date(),
        },
      },
    });
    return result;
  }

  public static async revokeUserTokens(userId: string): Promise<number> {
    const result = await StreamToken.update(
      { used: true, used_at: new Date() },
      {
        where: {
          user_id: userId,
          used: false,
        },
      }
    );
    return result[0];
  }

  public static async getUserActiveTokensCount(userId: string): Promise<number> {
    return StreamToken.count({
      where: {
        user_id: userId,
        used: false,
        expires_at: {
          [Op.gt]: new Date(),
        },
      },
    });
  }
}

StreamToken.init(
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
    video_url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    format_id: {
      type: DataTypes.STRING,
      allowNull: false,
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
    used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rate_limit_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    last_access: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'StreamToken',
    tableName: 'stream_tokens',
    timestamps: false,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['token_hash'],
        unique: true,
      },
      {
        fields: ['expires_at'],
      },
      {
        fields: ['used'],
      },
    ],
  }
);

export default StreamToken;
export { StreamToken, StreamTokenAttributes, StreamTokenCreationAttributes };
