'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PricingPlans } from '@/components/subscription/PricingPlans';
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus';
import { PaymentHistory } from '@/components/subscription/PaymentHistory';
import { Navigation } from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, CreditCard, History, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function SubscriptionPage() {
  const { user } = useAuth();

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      toast.error('Please login to subscribe to a plan');
      return;
    }

    try {
      // In a real app, you would integrate with payment gateway here
      // For now, we'll just show a message
      toast.info(`Tích hợp thanh toán sẽ được triển khai cho gói: ${planId}`);

      // Example of how you would create a payment intent:
      // const { clientSecret } = await createPaymentIntent(planId, 'card');
      // Then redirect to payment gateway or use payment elements

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xử lý thanh toán');
    }
  };

  if (!user) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Gói Đăng Ký
              </h1>
              <p className="text-muted-foreground text-lg">
                Chọn gói hoàn hảo cho nhu cầu tải video của bạn
              </p>
            </div>

          <Card className="text-center py-12">
            <CardContent>
              <Crown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Cần Đăng Nhập</h2>
              <p className="text-muted-foreground mb-6">
                Vui lòng đăng nhập để xem và quản lý đăng ký của bạn
              </p>
              <Button>
                Đăng Nhập Để Tiếp Tục
              </Button>
            </CardContent>
          </Card>
        </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Quản Lý Đăng Ký
          </h1>
          <p className="text-muted-foreground text-lg">
            Quản lý đăng ký, xem lịch sử thanh toán và nâng cấp gói của bạn
          </p>
        </div>

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Gói
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Trạng Thái
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Thanh Toán
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Lịch Sử
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Chọn Gói Của Bạn</CardTitle>
                <CardDescription>
                  Chọn gói phù hợp nhất với nhu cầu của bạn. Bạn có thể nâng cấp hoặc hạ cấp bất cứ lúc nào.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PricingPlans 
                  onSelectPlan={handleSelectPlan}
                  showTestPayment={process.env.NODE_ENV === 'development'}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status" className="space-y-6">
            <SubscriptionStatus />
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <PaymentHistory />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lịch Sử Đăng Ký</CardTitle>
                <CardDescription>
                  Xem lịch sử đăng ký đầy đủ và các thay đổi của bạn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Lịch sử đăng ký sẽ có sớm</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Tính năng này sẽ hiển thị các thay đổi đăng ký của bạn theo thời gian
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </>
  );
}
