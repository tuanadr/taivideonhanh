import { User, RefreshToken } from '../models';
import JWTService, { TokenPair } from '../utils/jwt';
import { UserCreationAttributes } from '../models/User';

interface RegisterData {
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  user: Partial<User>;
  tokens: TokenPair;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

class AuthService {
  /**
   * Register a new user
   */
  public static async register(data: RegisterData): Promise<AuthResponse> {
    const { email, password } = data;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate password strength
    this.validatePassword(password);

    // Hash password
    const password_hash = await User.hashPassword(password);

    // Create user
    const userData: UserCreationAttributes = {
      email,
      password_hash,
    };

    const user = await User.create(userData);

    // Generate tokens
    const tokens = JWTService.generateTokenPair(user);

    // Store refresh token in database
    const { token: refreshTokenString } = await RefreshToken.createRefreshToken(user.id);

    return {
      user: user.toJSON(),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: refreshTokenString,
      },
    };
  }

  /**
   * Login user
   */
  public static async login(data: LoginData): Promise<AuthResponse> {
    const { email, password } = data;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Revoke existing refresh tokens (optional - for single session)
    // await RefreshToken.revokeAllUserTokens(user.id);

    // Generate tokens
    const tokens = JWTService.generateTokenPair(user);

    // Store refresh token in database
    const { token: refreshTokenString } = await RefreshToken.createRefreshToken(user.id);

    return {
      user: user.toJSON(),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: refreshTokenString,
      },
    };
  }

  /**
   * Refresh access token
   */
  public static async refreshToken(refreshTokenString: string): Promise<RefreshResponse> {
    // Find refresh token in database
    const refreshToken = await RefreshToken.findByToken(refreshTokenString);
    if (!refreshToken) {
      throw new Error('Invalid refresh token');
    }

    // Check if token is active
    if (!refreshToken.isActive()) {
      throw new Error('Refresh token expired or revoked');
    }

    // Get user
    const user = await User.findByPk(refreshToken.user_id);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new access token
    const accessToken = JWTService.generateAccessToken(user);

    // Optionally rotate refresh token (recommended for security)
    const shouldRotateRefreshToken = process.env.ROTATE_REFRESH_TOKENS === 'true';
    let newRefreshToken: string | undefined;

    if (shouldRotateRefreshToken) {
      // Create new refresh token
      const { token: newRefreshTokenString } = await RefreshToken.createRefreshToken(user.id);
      newRefreshToken = newRefreshTokenString;

      // Revoke old refresh token
      await refreshToken.revoke(newRefreshToken);
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout user (revoke refresh token)
   */
  public static async logout(refreshTokenString: string): Promise<void> {
    const refreshToken = await RefreshToken.findByToken(refreshTokenString);
    if (refreshToken) {
      await refreshToken.revoke();
    }
  }

  /**
   * Logout from all devices (revoke all refresh tokens)
   */
  public static async logoutAll(userId: string): Promise<void> {
    await RefreshToken.revokeAllUserTokens(userId);
  }

  /**
   * Get user profile
   */
  public static async getProfile(userId: string): Promise<Partial<User>> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return user.toJSON();
  }

  /**
   * Update user profile
   */
  public static async updateProfile(userId: string, data: Partial<UserCreationAttributes>): Promise<Partial<User>> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Only allow certain fields to be updated
    const allowedFields = ['email'] as const;
    const updateData: Partial<UserCreationAttributes> = {};

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        (updateData as any)[field] = data[field];
      }
    }

    // If email is being updated, check for uniqueness
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findByEmail(updateData.email);
      if (existingUser) {
        throw new Error('Email already in use');
      }
    }

    await user.update(updateData);
    return user.toJSON();
  }

  /**
   * Change password
   */
  public static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate current password
    const isValidPassword = await user.validatePassword(currentPassword);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Hash new password
    const password_hash = await User.hashPassword(newPassword);

    // Update password
    await user.update({ password_hash });

    // Revoke all refresh tokens to force re-login
    await RefreshToken.revokeAllUserTokens(userId);
  }

  /**
   * Validate password strength
   */
  private static validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      throw new Error('Password must contain at least one special character (@$!%*?&)');
    }
  }

  /**
   * Cleanup expired tokens (should be run periodically)
   */
  public static async cleanupExpiredTokens(): Promise<number> {
    return RefreshToken.cleanupExpiredTokens();
  }
}

export default AuthService;
export { RegisterData, LoginData, AuthResponse, RefreshResponse };
