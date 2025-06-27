'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  Users, 
  Shield,
  Loader2,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

interface AdminStatus {
  totalAdmins: number;
  activeAdmins: number;
  hasVnAdmin: boolean;
  hasComAdmin: boolean;
  systemHealthy: boolean;
  timestamp: string;
}

export default function AdminSetup() {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAdminStatus();
  }, []);

  const fetchAdminStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/status');
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
      } else {
        setMessage('❌ Không thể lấy thông tin admin system');
      }
    } catch (error) {
      console.error('Error fetching admin status:', error);
      setMessage('❌ Lỗi kết nối khi lấy thông tin admin');
    } finally {
      setIsLoading(false);
    }
  };

  const createVnAdmin = async () => {
    try {
      setIsCreating(true);
      setMessage('🔧 Đang tạo admin user...');

      const response = await fetch('/api/admin/create-vn-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await response.json();
        setMessage('✅ Tạo admin user thành công!');

        // Refresh status
        setTimeout(() => {
          fetchAdminStatus();
        }, 1000);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Lỗi: ${errorData.error || 'Không thể tạo admin user'}`);
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      setMessage('❌ Lỗi kết nối khi tạo admin user');
    } finally {
      setIsCreating(false);
    }
  };

  const goToLogin = () => {
    window.location.href = '/admin/direct-login';
  };

  const goToDashboard = () => {
    window.location.href = '/admin/simple-dashboard';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p>Đang kiểm tra hệ thống admin...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Admin System Setup</CardTitle>
            <CardDescription>
              Quản lý và cấu hình hệ thống admin TaiVideoNhanh
            </CardDescription>
          </CardHeader>
        </Card>

        {/* System Status */}
        {status && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Trạng Thái Hệ Thống
              </CardTitle>
              <CardDescription>
                Cập nhật lần cuối: {new Date(status.timestamp).toLocaleString('vi-VN')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{status.totalAdmins}</div>
                  <div className="text-sm text-gray-600">Tổng Admin</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{status.activeAdmins}</div>
                  <div className="text-sm text-gray-600">Admin Hoạt Động</div>
                </div>
                <div className="text-center">
                  <Badge variant={status.hasComAdmin ? "default" : "secondary"}>
                    {status.hasComAdmin ? "✅" : "❌"} .com Admin
                  </Badge>
                </div>
                <div className="text-center">
                  <Badge variant={status.hasVnAdmin ? "default" : "secondary"}>
                    {status.hasVnAdmin ? "✅" : "❌"} .vn Admin
                  </Badge>
                </div>
              </div>

              <Alert className={status.systemHealthy ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {status.systemHealthy ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  {status.systemHealthy 
                    ? 'Hệ thống admin đang hoạt động bình thường' 
                    : 'Hệ thống admin cần được cấu hình'}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Create VN Admin */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Tạo Admin .vn
              </CardTitle>
              <CardDescription>
                Tạo admin user với email @taivideonhanh.vn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status?.hasVnAdmin ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    Admin user với email .vn đã tồn tại
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription>
                    Chưa có admin user với email @taivideonhanh.vn
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={createVnAdmin}
                disabled={isCreating || status?.hasVnAdmin}
                className="w-full"
              >
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {status?.hasVnAdmin ? 'Đã Tồn Tại' : 'Tạo Admin .vn'}
              </Button>

              <div className="text-sm text-gray-600">
                <p><strong>Email:</strong> admin@taivideonhanh.vn</p>
                <p><strong>Password:</strong> admin123456</p>
                <p><strong>Role:</strong> super_admin</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                Truy Cập Nhanh
              </CardTitle>
              <CardDescription>
                Các trang admin quan trọng
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={goToLogin} variant="outline" className="w-full justify-start">
                🔐 Direct Login
              </Button>
              <Button onClick={goToDashboard} variant="outline" className="w-full justify-start">
                📊 Simple Dashboard
              </Button>
              <Button
                onClick={() => window.location.href = '/admin/cookies'}
                variant="outline"
                className="w-full justify-start"
              >
                🍪 Cookie Management
              </Button>
              <Button 
                onClick={fetchAdminStatus} 
                variant="outline" 
                className="w-full justify-start"
                disabled={isLoading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Làm Mới Trạng Thái
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Message */}
        {message && (
          <Alert className={message.includes('✅') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Footer */}
        <Card>
          <CardContent className="p-4 text-center text-sm text-gray-600">
            <p>Admin System Setup - TaiVideoNhanh v1.0</p>
            <p>Sử dụng trang này để quản lý và cấu hình hệ thống admin</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
