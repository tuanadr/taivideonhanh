"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  subscription_tier: 'free' | 'pro';
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const TOKEN_STORAGE_KEY = 'auth_tokens';
const USER_STORAGE_KEY = 'auth_user';

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!tokens;

  // Load stored auth data on mount
  useEffect(() => {
    loadStoredAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh token before expiration
  useEffect(() => {
    if (tokens?.accessToken) {
      const refreshInterval = setInterval(() => {
        refreshToken();
      }, 14 * 60 * 1000); // Refresh every 14 minutes (token expires in 15 minutes)

      return () => clearInterval(refreshInterval);
    }
  }, [tokens?.accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStoredAuth = async () => {
    try {
      const storedTokens = localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);

      if (storedTokens && storedUser) {
        const parsedTokens = JSON.parse(storedTokens);
        const parsedUser = JSON.parse(storedUser);

        setTokens(parsedTokens);
        setUser(parsedUser);

        // Verify token is still valid
        const isValid = await verifyToken(parsedTokens.accessToken);
        if (!isValid) {
          // Try to refresh token
          const refreshed = await refreshTokenWithStored(parsedTokens.refreshToken);
          if (!refreshed) {
            clearAuth();
          }
        }
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const saveAuth = (user: User, tokens: AuthTokens) => {
    setUser(user);
    setTokens(tokens);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  };

  const clearAuth = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If token expired, try to refresh
    if (response.status === 401 && tokens?.refreshToken) {
      const refreshed = await refreshToken();
      if (refreshed && tokens?.accessToken) {
        // Retry request with new token
        headers['Authorization'] = `Bearer ${tokens.accessToken}`;
        return fetch(url, {
          ...options,
          headers,
        });
      }
    }

    return response;
  };

  const verifyToken = async (accessToken: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const refreshTokenWithStored = async (refreshTokenString: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenString }),
      });

      if (response.ok) {
        const data = await response.json();
        const newTokens = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || refreshTokenString,
        };
        
        setTokens(newTokens);
        localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(newTokens));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      saveAuth(data.user, data.tokens);
      toast.success('Đăng nhập thành công!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Đăng nhập thất bại';
      toast.error(errorMessage);
      throw error;
    }
  };

  const register = async (email: string, password: string): Promise<void> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const data = await response.json();
      saveAuth(data.user, data.tokens);
      toast.success('Đăng ký thành công!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Đăng ký thất bại';
      toast.error(errorMessage);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (tokens?.refreshToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      clearAuth();
      toast.success('Đăng xuất thành công!');
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    if (!tokens?.refreshToken) return false;
    return refreshTokenWithStored(tokens.refreshToken);
  };

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    try {
      const response = await makeAuthenticatedRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Profile update failed');
      }

      const responseData = await response.json();
      const updatedUser = { ...user, ...responseData.user };
      setUser(updatedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      toast.success('Cập nhật thông tin thành công!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Cập nhật thông tin thất bại';
      toast.error(errorMessage);
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      const response = await makeAuthenticatedRequest('/api/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Password change failed');
      }

      // Clear auth to force re-login with new password
      clearAuth();
      toast.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Đổi mật khẩu thất bại';
      toast.error(errorMessage);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    tokens,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
