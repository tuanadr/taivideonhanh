'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import {
  Save,
  AlertTriangle,
  Globe,
  RefreshCw,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    maxConcurrentDownloads: number;
    maxDailyDownloads: number;
  };
  streaming: {
    defaultQuality: string;
    enableHighQuality: boolean;
    maxFileSize: number;
    supportedPlatforms: string[];
  };
  payment: {
    stripePublicKey: string;
    stripeWebhookSecret: string;
    enableTestMode: boolean;
    currency: string;
    proPriceMonthly: number;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    enableEmailNotifications: boolean;
  };
  security: {
    jwtAccessExpiry: string;
    jwtRefreshExpiry: string;
    enableRateLimit: boolean;
    maxLoginAttempts: number;
    sessionTimeout: number;
  };
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      siteName: 'TaiVideoNhanh',
      siteDescription: 'Tải video nhanh chóng và chất lượng cao',
      maintenanceMode: false,
      registrationEnabled: true,
      maxConcurrentDownloads: 3,
      maxDailyDownloads: 50,
    },
    streaming: {
      defaultQuality: 'best',
      enableHighQuality: true,
      maxFileSize: 1024,
      supportedPlatforms: ['youtube', 'tiktok', 'facebook'],
    },
    payment: {
      stripePublicKey: '',
      stripeWebhookSecret: '',
      enableTestMode: true,
      currency: 'VND',
      proPriceMonthly: 99000,
    },
    email: {
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      fromEmail: 'noreply@taivideonhanh.vn',
      enableEmailNotifications: true,
    },
    security: {
      jwtAccessExpiry: '15m',
      jwtRefreshExpiry: '7d',
      enableRateLimit: true,
      maxLoginAttempts: 5,
      sessionTimeout: 24,
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use default settings for development
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings })
      });

      if (response.ok) {
        toast.success('Cài đặt đã được lưu thành công!');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Không thể lưu cài đặt. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (section: keyof SystemSettings, key: string, value: string | boolean | number | string[]) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Cài đặt hệ thống
          </h1>
          <p className="text-muted-foreground">
            Cấu hình và tùy chỉnh hệ thống
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={loadSettings}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <Button
            onClick={() => setShowSaveDialog(true)}
            disabled={isSaving || !hasChanges}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </Button>
        </div>
      </div>

      {/* Changes Alert */}
      {hasChanges && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Bạn có thay đổi chưa được lưu. Nhớ lưu cài đặt trước khi rời khỏi trang.
          </AlertDescription>
        </Alert>
      )}

      {/* Settings Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Cài đặt chung
            </CardTitle>
            <CardDescription>
              Cấu hình cơ bản của website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Tên website</Label>
              <Input
                id="siteName"
                value={settings.general.siteName}
                onChange={(e) => updateSetting('general', 'siteName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteDescription">Mô tả website</Label>
              <Textarea
                id="siteDescription"
                value={settings.general.siteDescription}
                onChange={(e) => updateSetting('general', 'siteDescription', e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Chế độ bảo trì</Label>
                <p className="text-sm text-muted-foreground">
                  Tạm thời tắt website cho người dùng
                </p>
              </div>
              <Switch
                checked={settings.general.maintenanceMode}
                onCheckedChange={(checked) => updateSetting('general', 'maintenanceMode', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Cho phép đăng ký</Label>
                <p className="text-sm text-muted-foreground">
                  Người dùng mới có thể tạo tài khoản
                </p>
              </div>
              <Switch
                checked={settings.general.registrationEnabled}
                onCheckedChange={(checked) => updateSetting('general', 'registrationEnabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Thông tin hệ thống
            </CardTitle>
            <CardDescription>
              Trạng thái và thông tin hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Phiên bản:</span>
                <Badge variant="outline">v1.0.0</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Trạng thái:</span>
                <Badge className="bg-green-100 text-green-800">Hoạt động</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Uptime:</span>
                <span className="text-sm">24h 15m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Người dùng online:</span>
                <span className="text-sm">12</span>
              </div>
            </div>

            <Separator />

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Lưu ý:</strong> Một số thay đổi có thể yêu cầu khởi động lại server để có hiệu lực.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Save Dialog */}
      <ConfirmDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        title="Lưu cài đặt"
        description="Bạn có chắc chắn muốn lưu các thay đổi? Một số cài đặt có thể yêu cầu khởi động lại hệ thống."
        confirmText="Lưu"
        cancelText="Hủy"
        variant="default"
        onConfirm={saveSettings}
        isLoading={isSaving}
      />
    </div>
  );
}
