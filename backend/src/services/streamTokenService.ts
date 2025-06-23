import { StreamToken } from '../models';
import { Request } from 'express';

interface CreateStreamTokenData {
  userId: string;
  videoUrl: string;
  formatId: string;
  expiresInMinutes?: number;
  ipAddress?: string;
  userAgent?: string;
}

interface ValidateStreamTokenData {
  token: string;
  ipAddress?: string;
  userAgent?: string;
}

interface StreamTokenValidationResult {
  isValid: boolean;
  streamToken?: StreamToken;
  error?: string;
}

class StreamTokenService {
  // Rate limiting constants
  private static readonly MAX_TOKENS_PER_USER = 5;
  private static readonly MAX_RATE_LIMIT_COUNT = 100;
  private static readonly DEFAULT_EXPIRES_MINUTES = 30;

  /**
   * Create a new stream token for video streaming
   */
  public static async createStreamToken(data: CreateStreamTokenData): Promise<{ token: string; streamToken: StreamToken }> {
    const { userId, videoUrl, formatId, expiresInMinutes = this.DEFAULT_EXPIRES_MINUTES, ipAddress, userAgent } = data;

    // Check if user has too many active tokens
    const activeTokensCount = await StreamToken.getUserActiveTokensCount(userId);
    if (activeTokensCount >= this.MAX_TOKENS_PER_USER) {
      throw new Error(`Maximum number of active stream tokens (${this.MAX_TOKENS_PER_USER}) exceeded`);
    }

    // Create the stream token
    const { token, streamToken } = await StreamToken.createStreamToken(
      userId,
      videoUrl,
      formatId,
      expiresInMinutes
    );

    // Update additional metadata if provided
    if (ipAddress || userAgent) {
      streamToken.ip_address = ipAddress || null;
      streamToken.user_agent = userAgent || null;
      await streamToken.save();
    }

    return { token, streamToken };
  }

  /**
   * Validate a stream token for streaming access
   */
  public static async validateStreamToken(data: ValidateStreamTokenData): Promise<StreamTokenValidationResult> {
    const { token, ipAddress, userAgent } = data;

    try {
      // Find the token
      const streamToken = await StreamToken.findValidToken(token);
      
      if (!streamToken) {
        return {
          isValid: false,
          error: 'Invalid or expired stream token'
        };
      }

      // Check rate limiting
      if (streamToken.rate_limit_count >= this.MAX_RATE_LIMIT_COUNT) {
        return {
          isValid: false,
          error: 'Rate limit exceeded for this stream token'
        };
      }

      // Optional: Check IP address consistency (if originally set)
      if (streamToken.ip_address && ipAddress && streamToken.ip_address !== ipAddress) {
        return {
          isValid: false,
          error: 'IP address mismatch'
        };
      }

      // Update access tracking
      await streamToken.incrementRateLimit();

      return {
        isValid: true,
        streamToken
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Token validation failed'
      };
    }
  }

  /**
   * Refresh a stream token (extend expiration)
   */
  public static async refreshStreamToken(token: string, expiresInMinutes: number = this.DEFAULT_EXPIRES_MINUTES): Promise<StreamToken> {
    const streamToken = await StreamToken.findValidToken(token);
    
    if (!streamToken) {
      throw new Error('Invalid or expired stream token');
    }

    // Extend expiration time
    const newExpiresAt = new Date();
    newExpiresAt.setMinutes(newExpiresAt.getMinutes() + expiresInMinutes);
    
    streamToken.expires_at = newExpiresAt;
    await streamToken.save();

    return streamToken;
  }

  /**
   * Revoke a specific stream token
   */
  public static async revokeStreamToken(token: string): Promise<void> {
    const streamToken = await StreamToken.findByToken(token);
    
    if (!streamToken) {
      throw new Error('Stream token not found');
    }

    await streamToken.markAsUsed();
  }

  /**
   * Revoke all stream tokens for a user
   */
  public static async revokeUserStreamTokens(userId: string): Promise<number> {
    return StreamToken.revokeUserTokens(userId);
  }

  /**
   * Get user's active stream tokens
   */
  public static async getUserActiveTokens(userId: string): Promise<StreamToken[]> {
    return StreamToken.findAll({
      where: {
        user_id: userId,
        used: false,
        expires_at: {
          [require('sequelize').Op.gt]: new Date(),
        },
      },
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Cleanup expired tokens (should be run periodically)
   */
  public static async cleanupExpiredTokens(): Promise<number> {
    return StreamToken.cleanupExpiredTokens();
  }

  /**
   * Extract client information from request
   */
  public static extractClientInfo(req: Request): { ipAddress: string; userAgent: string } {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || 
                     (req.headers['x-real-ip'] as string) || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress || 
                     'unknown';

    const userAgent = req.headers['user-agent'] || 'unknown';

    return {
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    };
  }

  /**
   * Get stream token statistics for monitoring
   */
  public static async getTokenStatistics(): Promise<{
    totalActive: number;
    totalExpired: number;
    totalUsed: number;
    averageRateLimit: number;
  }> {
    const [totalActive, totalExpired, totalUsed, rateLimitStats] = await Promise.all([
      StreamToken.count({
        where: {
          used: false,
          expires_at: {
            [require('sequelize').Op.gt]: new Date(),
          },
        },
      }),
      StreamToken.count({
        where: {
          expires_at: {
            [require('sequelize').Op.lt]: new Date(),
          },
        },
      }),
      StreamToken.count({
        where: {
          used: true,
        },
      }),
      StreamToken.findAll({
        attributes: [
          [require('sequelize').fn('AVG', require('sequelize').col('rate_limit_count')), 'avgRateLimit'],
        ],
        raw: true,
      }),
    ]);

    return {
      totalActive,
      totalExpired,
      totalUsed,
      averageRateLimit: parseFloat(rateLimitStats[0]?.avgRateLimit || '0'),
    };
  }

  /**
   * Validate token format
   */
  public static isValidTokenFormat(token: string): boolean {
    // Stream tokens should be 64 character hex strings
    return /^[a-f0-9]{64}$/i.test(token);
  }
}

export default StreamTokenService;
export { StreamTokenService, CreateStreamTokenData, ValidateStreamTokenData, StreamTokenValidationResult };
