'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Navigation } from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { 
  User, 
  Mail, 
  Calendar, 
  Crown, 
  Shield, 
  Edit2, 
  Save, 
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, updateProfile, changePassword, isAuthenticated } = useAuth();
  const { currentSubscription, isPro } = useSubscription();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    email: user?.email || '',
    displayName: user?.email?.split('@')[0] || ''
  });
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

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
                  Vui lòng đăng nhập để xem thông tin cá nhân
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

  const handleProfileUpdate = async () => {
    setIsLoading(true);
    try {
      await updateProfile(profileData);
      setIsEditing(false);
      toast.success('Cập nhật thông tin thành công!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Cập nhật thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Đổi mật khẩu thành công!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Đổi mật khẩu thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Thông Tin Cá Nhân
            </h1>
            <p className="text-muted-foreground">
              Quản lý thông tin tài khoản và cài đặt bảo mật
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Thông tin cơ bản
                    </CardTitle>
                    <CardDescription>
                      Thông tin tài khoản và liên hệ của bạn
                    </CardDescription>
                  </div>
                  {!isEditing && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Chỉnh sửa
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Email không thể thay đổi
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="displayName">Tên hiển thị</Label>
                        <Input
                          id="displayName"
                          value={profileData.displayName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                          placeholder="Nhập tên hiển thị"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleProfileUpdate} disabled={isLoading}>
                          <Save className="h-4 w-4 mr-2" />
                          {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setIsEditing(false);
                            setProfileData({
                              email: user.email,
                              displayName: user.email.split('@')[0]
                            });
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Hủy
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {user.email_verified ? (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Đã xác thực
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Chưa xác thực
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Tham gia từ</p>
                          <p className="font-medium">{formatDate(user.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Security Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Bảo mật
                  </CardTitle>
                  <CardDescription>
                    Quản lý mật khẩu và cài đặt bảo mật
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!isChangingPassword ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Mật khẩu</p>
                          <p className="text-sm text-muted-foreground">
                            Cập nhật lần cuối: {user.last_login ? formatDate(user.last_login) : 'Chưa xác định'}
                          </p>
                        </div>
                        <Button variant="outline" onClick={() => setIsChangingPassword(true)}>
                          Đổi mật khẩu
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Mật khẩu mới</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handlePasswordChange} disabled={isLoading}>
                          <Save className="h-4 w-4 mr-2" />
                          {isLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setIsChangingPassword(false);
                            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Hủy
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Subscription Info Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    Gói đăng ký
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <Badge 
                      variant={isPro() ? 'default' : 'secondary'} 
                      className={`text-lg px-4 py-2 ${isPro() ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : ''}`}
                    >
                      {isPro() ? (
                        <>
                          <Crown className="h-4 w-4 mr-2" />
                          Pro
                        </>
                      ) : (
                        'Free'
                      )}
                    </Badge>
                  </div>

                  {currentSubscription ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Trạng thái:</span>
                        <span className="font-medium capitalize">{currentSubscription.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Chu kỳ:</span>
                        <span className="font-medium">
                          {currentSubscription.billingCycle === 'annual' ? 'Hàng năm' : 'Hàng tháng'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hết hạn:</span>
                        <span className="font-medium">{formatDate(currentSubscription.expiresAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Còn lại:</span>
                        <span className="font-medium">{currentSubscription.daysRemaining} ngày</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">
                      Chưa có gói đăng ký nào
                    </p>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <Button asChild className="w-full">
                      <Link href="/subscription">Quản lý đăng ký</Link>
                    </Button>
                    {!isPro() && (
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/upgrade">Nâng cấp Pro</Link>
                      </Button>
                    )}
                    {isPro() && currentSubscription?.billingCycle === 'monthly' && (
                      <Button asChild variant="outline" className="w-full text-green-600 border-green-600 hover:bg-green-50">
                        <Link href="/upgrade">Chuyển sang gói năm - Tiết kiệm 20%</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Thống kê sử dụng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tổng lượt tải:</span>
                    <span className="font-medium">-</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tháng này:</span>
                    <span className="font-medium">-</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Chất lượng cao nhất:</span>
                    <span className="font-medium">{isPro() ? '4K' : '720p'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
