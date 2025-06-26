'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Separator } from '@/components/ui/separator';
import { Navigation } from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Download, 
  Monitor, 
  Moon, 
  Sun, 
  Globe,
  Save,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface UserSettings {
  notifications: {
    downloadComplete: boolean;
    subscriptionExpiry: boolean;
    systemUpdates: boolean;
    emailNotifications: boolean;
  };
  download: {
    defaultQuality: string;
    autoDownload: boolean;
    downloadLocation: string;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
  privacy: {
    shareUsageData: boolean;
    allowAnalytics: boolean;
  };
}

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      downloadComplete: true,
      subscriptionExpiry: true,
      systemUpdates: false,
      emailNotifications: true,
    },
    download: {
      defaultQuality: 'best',
      autoDownload: false,
      downloadLocation: 'default',
    },
    appearance: {
      theme: 'system',
      language: 'vi',
    },
    privacy: {
      shareUsageData: false,
      allowAnalytics: true,
    },
  });

  useEffect(() => {
    // Load user settings from localStorage or API
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch {
        console.error('Failed to parse saved settings');
      }
    }
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-lg font-semibold mb-2">Cần đăng nhập</h2>
                <p className="text-muted-foreground mb-4">
                  Vui lòng đăng nhập để truy cập cài đặt
                </p>
                <Button asChild>
                  <Link href="/">Về trang chủ</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Save to localStorage (in real app, save to backend)
      localStorage.setItem('userSettings', JSON.stringify(settings));
      
      // Apply theme changes
      if (settings.appearance.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (settings.appearance.theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // System theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      
      toast.success('Cài đặt đã được lưu thành công!');
    } catch {
      toast.error('Không thể lưu cài đặt. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = (section: keyof UserSettings, key: string, value: string | boolean | number) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Cài Đặt
            </h1>
            <p className="text-muted-foreground">
              Tùy chỉnh trải nghiệm sử dụng theo ý muốn
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Thông báo
                </CardTitle>
                <CardDescription>
                  Quản lý các loại thông báo bạn muốn nhận
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Hoàn thành tải xuống</Label>
                    <p className="text-sm text-muted-foreground">
                      Thông báo khi video được tải xong
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.downloadComplete}
                    onCheckedChange={(checked) => updateSettings('notifications', 'downloadComplete', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Hết hạn đăng ký</Label>
                    <p className="text-sm text-muted-foreground">
                      Nhắc nhở trước khi gói Pro hết hạn
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.subscriptionExpiry}
                    onCheckedChange={(checked) => updateSettings('notifications', 'subscriptionExpiry', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cập nhật hệ thống</Label>
                    <p className="text-sm text-muted-foreground">
                      Thông báo về tính năng mới và cập nhật
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.systemUpdates}
                    onCheckedChange={(checked) => updateSettings('notifications', 'systemUpdates', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email thông báo</Label>
                    <p className="text-sm text-muted-foreground">
                      Nhận thông báo qua email
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.emailNotifications}
                    onCheckedChange={(checked) => updateSettings('notifications', 'emailNotifications', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Download Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Tải xuống
                </CardTitle>
                <CardDescription>
                  Cài đặt mặc định cho việc tải video
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Chất lượng mặc định</Label>
                  <Select
                    value={settings.download.defaultQuality}
                    onValueChange={(value) => updateSettings('download', 'defaultQuality', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="best">Tốt nhất có thể</SelectItem>
                      <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                      <SelectItem value="720p">720p (HD)</SelectItem>
                      <SelectItem value="480p">480p (SD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Tự động tải xuống</Label>
                    <p className="text-sm text-muted-foreground">
                      Tự động bắt đầu tải sau khi phân tích
                    </p>
                  </div>
                  <Switch
                    checked={settings.download.autoDownload}
                    onCheckedChange={(checked) => updateSettings('download', 'autoDownload', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Thư mục tải xuống</Label>
                  <Select
                    value={settings.download.downloadLocation}
                    onValueChange={(value) => updateSettings('download', 'downloadLocation', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Mặc định (Downloads)</SelectItem>
                      <SelectItem value="desktop">Desktop</SelectItem>
                      <SelectItem value="documents">Documents</SelectItem>
                      <SelectItem value="custom">Tùy chỉnh...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Giao diện
                </CardTitle>
                <CardDescription>
                  Tùy chỉnh giao diện và ngôn ngữ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Chủ đề</Label>
                  <Select
                    value={settings.appearance.theme}
                    onValueChange={(value) => updateSettings('appearance', 'theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          Sáng
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          Tối
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          Theo hệ thống
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ngôn ngữ</Label>
                  <Select
                    value={settings.appearance.language}
                    onValueChange={(value) => updateSettings('appearance', 'language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vi">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Tiếng Việt
                        </div>
                      </SelectItem>
                      <SelectItem value="en">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          English
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Privacy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Quyền riêng tư
                </CardTitle>
                <CardDescription>
                  Kiểm soát dữ liệu và quyền riêng tư
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Chia sẻ dữ liệu sử dụng</Label>
                    <p className="text-sm text-muted-foreground">
                      Giúp cải thiện dịch vụ bằng dữ liệu ẩn danh
                    </p>
                  </div>
                  <Switch
                    checked={settings.privacy.shareUsageData}
                    onCheckedChange={(checked) => updateSettings('privacy', 'shareUsageData', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cho phép phân tích</Label>
                    <p className="text-sm text-muted-foreground">
                      Thu thập dữ liệu để cải thiện trải nghiệm
                    </p>
                  </div>
                  <Switch
                    checked={settings.privacy.allowAnalytics}
                    onCheckedChange={(checked) => updateSettings('privacy', 'allowAnalytics', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Save Button */}
          <div className="flex justify-center pt-6">
            <Button onClick={handleSaveSettings} disabled={isLoading} size="lg">
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Đang lưu...' : 'Lưu cài đặt'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
