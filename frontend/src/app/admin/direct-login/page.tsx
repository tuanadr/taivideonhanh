'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertCircle, CheckCircle } from 'lucide-react';

export default function DirectAdminLogin() {
  const [email, setEmail] = useState('admin@taivideonhanh.com');
  const [password, setPassword] = useState('admin123456');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [adminInfo, setAdminInfo] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('Đang đăng nhập...');
    setLoginSuccess(false);
    setAdminInfo(null);

    try {
      console.log('🔐 Direct login attempt:', { email, password: '***' });

      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        console.error('❌ Login failed:', response.status, errorData);
        setMessage(`❌ Lỗi: ${errorData.error || `Đăng nhập thất bại (${response.status})`}`);
        return;
      }

      const data = await response.json();
      console.log('✅ Response data:', data);

      if (data.token) {
        // Store token
        localStorage.setItem('adminToken', data.token);
        setLoginSuccess(true);
        setAdminInfo(data.admin);
        setMessage('✅ Đăng nhập thành công!');
        
        // Test verify endpoint
        await testVerifyEndpoint(data.token);
      } else {
        setMessage('❌ Không nhận được token từ server');
      }
    } catch (error) {
      console.error('💥 Login error:', error);
      setMessage(`💥 Lỗi kết nối: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testVerifyEndpoint = async (token: string) => {
    try {
      console.log('🔍 Testing verify endpoint...');
      
      const response = await fetch('/api/admin/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Verify endpoint working:', data);
        setMessage(prev => prev + '\n✅ Token verification successful!');
      } else {
        console.error('❌ Verify endpoint failed:', response.status);
        setMessage(prev => prev + '\n❌ Token verification failed');
      }
    } catch (error) {
      console.error('💥 Verify test error:', error);
      setMessage(prev => prev + '\n💥 Verify test error');
    }
  };

  const goToDashboard = () => {
    // Force navigation to dashboard
    window.location.href = '/admin';
  };

  const testCredentials = [
    { email: 'admin@taivideonhanh.com', password: 'admin123456', label: 'Admin (.com)' },
    { email: 'admin@taivideonhanh.vn', password: 'admin123456', label: 'Admin (.vn)' },
  ];

  const quickLogin = (creds: { email: string; password: string }) => {
    setEmail(creds.email);
    setPassword(creds.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl text-center">Direct Admin Login</CardTitle>
          <CardDescription className="text-center">
            Bypass redirect issues - Direct admin access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Login Buttons */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Login:</Label>
            <div className="grid grid-cols-1 gap-2">
              {testCredentials.map((creds, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => quickLogin(creds)}
                  className="justify-start"
                >
                  {creds.label}
                </Button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>

          {message && (
            <Alert className={loginSuccess ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              {loginSuccess ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className="whitespace-pre-line">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {loginSuccess && adminInfo && (
            <div className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div><strong>Email:</strong> {adminInfo.email}</div>
                    <div><strong>Role:</strong> {adminInfo.role}</div>
                    <div><strong>Permissions:</strong> {adminInfo.permissions?.join(', ')}</div>
                  </div>
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={goToDashboard}
                className="w-full"
                variant="default"
              >
                🚀 Go to Dashboard
              </Button>
            </div>
          )}

          <div className="text-center text-sm text-gray-500">
            <p>This page bypasses the redirect loop issue</p>
            <p>Use this for emergency admin access</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
