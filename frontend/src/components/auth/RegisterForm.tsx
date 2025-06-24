"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
  onSuccess?: () => void;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'Ít nhất 8 ký tự', test: (p) => p.length >= 8 },
  { label: 'Có chữ thường', test: (p) => /[a-z]/.test(p) },
  { label: 'Có chữ hoa', test: (p) => /[A-Z]/.test(p) },
  { label: 'Có số', test: (p) => /\d/.test(p) },
  { label: 'Có ký tự đặc biệt (@$!%*?&)', test: (p) => /[@$!%*?&]/.test(p) },
];

export function RegisterForm({ onSwitchToLogin, onSuccess }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ 
    email?: string; 
    password?: string; 
    confirmPassword?: string; 
    general?: string 
  }>({});

  const { register } = useAuth();

  const validateForm = () => {
    const newErrors: { 
      email?: string; 
      password?: string; 
      confirmPassword?: string; 
    } = {};

    // Email validation
    if (!email) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else {
      const failedRequirements = passwordRequirements.filter(req => !req.test(password));
      if (failedRequirements.length > 0) {
        newErrors.password = 'Mật khẩu không đáp ứng yêu cầu';
      }
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await register(email, password);
      onSuccess?.();
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Đăng ký thất bại'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const passedRequirements = passwordRequirements.filter(req => req.test(password)).length;
    if (passedRequirements === 0) return { strength: 0, label: '', color: '' };
    if (passedRequirements <= 2) return { strength: 25, label: 'Yếu', color: 'bg-red-500' };
    if (passedRequirements <= 3) return { strength: 50, label: 'Trung bình', color: 'bg-yellow-500' };
    if (passedRequirements <= 4) return { strength: 75, label: 'Mạnh', color: 'bg-blue-500' };
    return { strength: 100, label: 'Rất mạnh', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Đăng ký</CardTitle>
        <CardDescription className="text-center">
          Tạo tài khoản mới để sử dụng TaiVideoNhanh
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errors.general && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {errors.general}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {password && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Độ mạnh mật khẩu:</span>
                  <span className={`font-medium ${
                    passwordStrength.strength === 100 ? 'text-green-600' :
                    passwordStrength.strength >= 75 ? 'text-blue-600' :
                    passwordStrength.strength >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.strength}%` }}
                  />
                </div>
                <div className="space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center text-xs">
                      {req.test(password) ? (
                        <Check className="h-3 w-3 text-green-500 mr-2" />
                      ) : (
                        <X className="h-3 w-3 text-red-500 mr-2" />
                      )}
                      <span className={req.test(password) ? 'text-green-600' : 'text-red-600'}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-6">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang đăng ký...
              </>
            ) : (
              'Đăng ký'
            )}
          </Button>
          
          {onSwitchToLogin && (
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Đã có tài khoản? </span>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto font-normal"
                onClick={onSwitchToLogin}
                disabled={isLoading}
              >
                Đăng nhập ngay
              </Button>
            </div>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
