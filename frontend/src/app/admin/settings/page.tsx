'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
// import { Separator } from '@/components/ui/separator';
import {
  // Settings as SettingsIcon,
  Server,
  Shield,
  // Mail,
  CreditCard,
  Save,
  AlertTriangle,
  // Database,
  Globe,
  // Key
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

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt hệ thống</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt hệ thống</h1>
        <Button onClick={saveSettings} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </Button>
      </div>

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
                  Tạm thời tắt website để bảo trì
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxConcurrent">Tải đồng thời tối đa</Label>
                <Input
                  id="maxConcurrent"
                  type="number"
                  value={settings.general.maxConcurrentDownloads}
                  onChange={(e) => updateSetting('general', 'maxConcurrentDownloads', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDaily">Tải tối đa/ngày</Label>
                <Input
                  id="maxDaily"
                  type="number"
                  value={settings.general.maxDailyDownloads}
                  onChange={(e) => updateSetting('general', 'maxDailyDownloads', parseInt(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streaming Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Cài đặt streaming
            </CardTitle>
            <CardDescription>
              Cấu hình tải và xử lý video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultQuality">Chất lượng mặc định</Label>
              <select
                id="defaultQuality"
                value={settings.streaming.defaultQuality}
                onChange={(e) => updateSetting('streaming', 'defaultQuality', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="best">Tốt nhất</option>
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Cho phép chất lượng cao</Label>
                <p className="text-sm text-muted-foreground">
                  Hỗ trợ 4K và chất lượng cao
                </p>
              </div>
              <Switch
                checked={settings.streaming.enableHighQuality}
                onCheckedChange={(checked) => updateSetting('streaming', 'enableHighQuality', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxFileSize">Kích thước file tối đa (MB)</Label>
              <Input
                id="maxFileSize"
                type="number"
                value={settings.streaming.maxFileSize}
                onChange={(e) => updateSetting('streaming', 'maxFileSize', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Platforms hỗ trợ</Label>
              <div className="text-sm text-muted-foreground">
                YouTube, TikTok, Facebook
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Cài đặt thanh toán
            </CardTitle>
            <CardDescription>
              Cấu hình Stripe và thanh toán
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stripePublicKey">Stripe Public Key</Label>
              <Input
                id="stripePublicKey"
                type="password"
                value={settings.payment.stripePublicKey}
                onChange={(e) => updateSetting('payment', 'stripePublicKey', e.target.value)}
                placeholder="pk_..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stripeWebhookSecret">Stripe Webhook Secret</Label>
              <Input
                id="stripeWebhookSecret"
                type="password"
                value={settings.payment.stripeWebhookSecret}
                onChange={(e) => updateSetting('payment', 'stripeWebhookSecret', e.target.value)}
                placeholder="whsec_..."
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Chế độ test</Label>
                <p className="text-sm text-muted-foreground">
                  Sử dụng Stripe test mode
                </p>
              </div>
              <Switch
                checked={settings.payment.enableTestMode}
                onCheckedChange={(checked) => updateSetting('payment', 'enableTestMode', checked)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Tiền tệ</Label>
                <Input
                  id="currency"
                  value={settings.payment.currency}
                  onChange={(e) => updateSetting('payment', 'currency', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proPriceMonthly">Giá Pro/tháng</Label>
                <Input
                  id="proPriceMonthly"
                  type="number"
                  value={settings.payment.proPriceMonthly}
                  onChange={(e) => updateSetting('payment', 'proPriceMonthly', parseInt(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Cài đặt bảo mật
            </CardTitle>
            <CardDescription>
              Cấu hình JWT và bảo mật
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jwtAccessExpiry">JWT Access Expiry</Label>
                <Input
                  id="jwtAccessExpiry"
                  value={settings.security.jwtAccessExpiry}
                  onChange={(e) => updateSetting('security', 'jwtAccessExpiry', e.target.value)}
                  placeholder="15m"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jwtRefreshExpiry">JWT Refresh Expiry</Label>
                <Input
                  id="jwtRefreshExpiry"
                  value={settings.security.jwtRefreshExpiry}
                  onChange={(e) => updateSetting('security', 'jwtRefreshExpiry', e.target.value)}
                  placeholder="7d"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Giới hạn tốc độ</Label>
                <p className="text-sm text-muted-foreground">
                  Bảo vệ khỏi spam và abuse
                </p>
              </div>
              <Switch
                checked={settings.security.enableRateLimit}
                onCheckedChange={(checked) => updateSetting('security', 'enableRateLimit', checked)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxLoginAttempts">Thử đăng nhập tối đa</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  value={settings.security.maxLoginAttempts}
                  onChange={(e) => updateSetting('security', 'maxLoginAttempts', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Timeout session (giờ)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-900">Lưu ý quan trọng</h3>
              <p className="text-sm text-orange-700 mt-1">
                Một số thay đổi có thể yêu cầu khởi động lại server để có hiệu lực. 
                Hãy cẩn thận khi thay đổi cài đặt bảo mật và thanh toán.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
