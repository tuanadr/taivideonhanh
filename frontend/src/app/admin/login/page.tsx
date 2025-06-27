'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  Mail,
  Lock,
  LogIn,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  Clock
} from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('admin@taivideonhanh.vn');
  const [password, setPassword] = useState('admin123456');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  // Debug logging
  console.log('AdminLoginPage rendered at:', new Date().toISOString());
  console.log('Current URL:', window?.location?.href);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('Đang đăng nhập...');

    try {
      console.log('Attempting login with:', { email, password: '***' });

      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        console.error('Login failed:', response.status, errorData);
        setMessage(`❌ Lỗi: ${errorData.error || `Đăng nhập thất bại (${response.status})`}`);
        return;
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (data.token) {
        localStorage.setItem('adminToken', data.token);
        setMessage('✅ Đăng nhập thành công! Đang chuyển hướng...');
        setTimeout(() => {
          router.push('/admin');
        }, 1000);
      } else {
        setMessage('❌ Không nhận được token từ server');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage(`❌ Lỗi kết nối: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <p className="text-muted-foreground">
            Truy cập bảng điều khiển quản trị hệ thống
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-semibold">Đăng nhập</CardTitle>
            <CardDescription>
              Nhập thông tin đăng nhập để tiếp tục
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@taivideonhanh.vn"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Mật khẩu
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="admin123456"
                  required
                  className="h-11"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Đăng nhập
                  </>
                )}
              </Button>
            </form>

            {message && (
              <Alert className={message.includes('✅') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {message.includes('✅') ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={message.includes('✅') ? 'text-green-800' : 'text-red-800'}>
                  {message.replace(/[✅❌]/g, '').trim()}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Debug Info Card */}
        <Card className="bg-slate-50/50 border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4" />
              Thông tin Debug
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Badge variant="outline" className="text-xs">API URL</Badge>
                <p className="mt-1">/api/admin/login</p>
              </div>
              <div>
                <Badge variant="outline" className="text-xs">Environment</Badge>
                <p className="mt-1">{typeof window !== 'undefined' ? 'client' : 'server'}</p>
              </div>
            </div>

            <Separator />

            <div>
              <Badge variant="outline" className="text-xs mb-2">Default Credentials</Badge>
              <div className="space-y-1">
                <p><strong>Email:</strong> admin@taivideonhanh.vn</p>
                <p><strong>Password:</strong> admin123456</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3 w-3" />
              <span>{new Date().toLocaleString('vi-VN')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
