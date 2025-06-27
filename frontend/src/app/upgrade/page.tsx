'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Navigation } from '@/components/layout/Navigation';
import { AnnualPricingPlans } from '@/components/subscription/AnnualPricingPlans';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  Crown,
  Zap,
  Download,
  Video,
  Headphones,
  Shield,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function UpgradePage() {
  const { user, isAuthenticated } = useAuth();
  const { isPro, currentSubscription, createTestPayment } = useSubscription();

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
                  Vui lòng đăng nhập để nâng cấp tài khoản
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

  if (isPro()) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="space-y-4">
              <div className="flex justify-center">
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-lg px-6 py-2">
                  <Crown className="h-5 w-5 mr-2" />
                  Pro Member
                </Badge>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Bạn đã là thành viên Pro!
              </h1>
              <p className="text-xl text-muted-foreground">
                Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi
              </p>
            </div>

            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Thông tin đăng ký hiện tại</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentSubscription && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Trạng thái:</p>
                      <p className="font-medium capitalize">{currentSubscription.status}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Hết hạn:</p>
                      <p className="font-medium">
                        {new Date(currentSubscription.expiresAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Còn lại:</p>
                      <p className="font-medium">{currentSubscription.daysRemaining} ngày</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gia hạn tự động:</p>
                      <p className="font-medium">{currentSubscription.autoRenew ? 'Có' : 'Không'}</p>
                    </div>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex gap-4 justify-center">
                  <Button asChild>
                    <Link href="/subscription">Quản lý đăng ký</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/">Về trang chủ</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  const handleSelectPlan = async (planId: string) => {
    try {
      toast.info(`Đang xử lý thanh toán cho gói: ${planId}`);
      // In production, integrate with payment gateway
      // For now, use test payment
      await createTestPayment(planId);
      toast.success('Nâng cấp thành công! Chào mừng bạn đến với Pro!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xử lý thanh toán');
    }
  };



  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                <Zap className="h-4 w-4 mr-2" />
                Nâng cấp ngay
              </Badge>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              Nâng Cấp Lên Pro
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Mở khóa toàn bộ tính năng và trải nghiệm tải video không giới hạn với chất lượng cao nhất
            </p>
          </div>

          {/* Current Status */}
          <Card className="max-w-2xl mx-auto border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <Crown className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">Tài khoản hiện tại: Free</p>
                    <p className="text-sm text-muted-foreground">
                      Bạn đang sử dụng gói miễn phí với các giới hạn
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          {/* Pricing Plans Component */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Chọn gói phù hợp</CardTitle>
              <CardDescription>
                Bắt đầu với gói Pro ngay hôm nay - Tiết kiệm 20% với gói năm!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnnualPricingPlans
                onSelectPlan={handleSelectPlan}
                showTestPayment={process.env.NODE_ENV === 'development'}
              />
            </CardContent>
          </Card>

          {/* Benefits Section */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Tại sao nên chọn Pro?</CardTitle>
              <CardDescription>
                Những lợi ích vượt trội khi nâng cấp lên gói Pro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center space-y-2">
                  <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto">
                    <Video className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold">Chất lượng 4K</h3>
                  <p className="text-sm text-muted-foreground">
                    Tải video với chất lượng cao nhất có thể
                  </p>
                </div>

                <div className="text-center space-y-2">
                  <div className="p-3 bg-green-100 rounded-full w-fit mx-auto">
                    <Download className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold">Không giới hạn</h3>
                  <p className="text-sm text-muted-foreground">
                    Tải xuống bao nhiêu video cũng được
                  </p>
                </div>

                <div className="text-center space-y-2">
                  <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto">
                    <Headphones className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold">Hỗ trợ ưu tiên</h3>
                  <p className="text-sm text-muted-foreground">
                    Được hỗ trợ nhanh chóng khi cần
                  </p>
                </div>

                <div className="text-center space-y-2">
                  <div className="p-3 bg-orange-100 rounded-full w-fit mx-auto">
                    <Shield className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold">Không quảng cáo</h3>
                  <p className="text-sm text-muted-foreground">
                    Trải nghiệm mượt mà không bị gián đoạn
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </>
  );
}
