'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnnualPricingPlans } from '@/components/subscription/AnnualPricingPlans';
import { Navigation } from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, Zap, Check, Star } from 'lucide-react';
import { toast } from 'sonner';

export default function PlansPage() {
  const { user } = useAuth();

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để đăng ký gói');
      return;
    }

    try {
      // In a real app, you would integrate with payment gateway here
      toast.info(`Tích hợp thanh toán sẽ được triển khai cho gói: ${planId}`);
      
      // Example of how you would create a payment intent:
      // const { clientSecret } = await createPaymentIntent(planId, 'card');
      // Then redirect to payment gateway or use payment elements

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xử lý thanh toán');
    }
  };

  return (
    <>
      <Navigation />
      <div className="container mx-auto py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Chọn Gói Phù Hợp Với Bạn
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tải video chất lượng cao với tốc độ nhanh. Nâng cấp hoặc hạ cấp bất cứ lúc nào.
          </p>
        </div>

        {/* Features Comparison */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              So Sánh Tính Năng
            </CardTitle>
            <CardDescription>
              Xem chi tiết các tính năng của từng gói
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Free Plan Features */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-500" />
                  <h3 className="text-lg font-semibold">Gói Miễn Phí</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>5 lượt tải/ngày</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Chất lượng tối đa 720p</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>1 tải đồng thời</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Hỗ trợ cơ bản</span>
                  </div>
                </div>
              </div>

              {/* Pro Plan Features */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-purple-500" />
                  <h3 className="text-lg font-semibold">Gói Pro</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Không giới hạn lượt tải</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Chất lượng tối đa 4K</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>5 tải đồng thời</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Hỗ trợ ưu tiên</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Tải playlist</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>API truy cập</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Plans */}
        <Card className="max-w-6xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Bảng Giá</CardTitle>
            <CardDescription>
              Chọn gói phù hợp với nhu cầu của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnnualPricingPlans
              onSelectPlan={handleSelectPlan}
              showTestPayment={process.env.NODE_ENV === 'development'}
            />
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Câu Hỏi Thường Gặp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h4 className="font-semibold">Tôi có thể hủy đăng ký bất cứ lúc nào không?</h4>
              <p className="text-sm text-muted-foreground">
                Có, bạn có thể hủy đăng ký bất cứ lúc nào. Gói của bạn sẽ tiếp tục hoạt động đến hết chu kỳ thanh toán hiện tại.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Tôi có thể nâng cấp hoặc hạ cấp gói không?</h4>
              <p className="text-sm text-muted-foreground">
                Có, bạn có thể thay đổi gói bất cứ lúc nào. Thay đổi sẽ có hiệu lực ngay lập tức và được tính theo tỷ lệ.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Các phương thức thanh toán nào được hỗ trợ?</h4>
              <p className="text-sm text-muted-foreground">
                Chúng tôi hỗ trợ thẻ tín dụng/ghi nợ, ví điện tử và chuyển khoản ngân hàng.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Dữ liệu của tôi có được bảo mật không?</h4>
              <p className="text-sm text-muted-foreground">
                Chúng tôi không lưu trữ video trên server. Tất cả video được stream trực tiếp từ nguồn đến thiết bị của bạn.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
