'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Crown, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface PricingPlansProps {
  onSelectPlan?: (planId: string) => void;
  showTestPayment?: boolean;
}

export const PricingPlans: React.FC<PricingPlansProps> = ({ 
  onSelectPlan, 
  showTestPayment = false 
}) => {
  const { plans, loadingPlans, currentSubscription, createTestPayment } = useSubscription();
  const { user } = useAuth();

  const handleSelectPlan = (planId: string) => {
    if (onSelectPlan) {
      onSelectPlan(planId);
    }
  };

  const handleTestPayment = async (planId: string) => {
    try {
      await createTestPayment(planId);
      toast.success('Test payment successful! Your subscription has been activated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process test payment');
    }
  };

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'hd_download':
        return '🎬';
      case 'ad_free':
        return '🚫';
      case 'priority_support':
        return '⚡';
      case 'concurrent_streams':
        return '📱';
      default:
        return '✨';
    }
  };

  const getFeatureLabel = (feature: string) => {
    switch (feature) {
      case 'basic_download':
        return 'Tải Cơ Bản';
      case 'hd_download':
        return 'Tải HD';
      case 'ad_free':
        return 'Không Quảng Cáo';
      case 'priority_support':
        return 'Hỗ Trợ Ưu Tiên';
      case 'concurrent_streams':
        return 'Nhiều Stream Đồng Thời';
      default:
        return feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (loadingPlans) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {plans.map((plan) => {
        const isCurrentPlan = currentSubscription?.plan?.id === plan.id;
        const isFree = plan.price === 0;
        const isPro = !isFree;

        return (
          <Card 
            key={plan.id} 
            className={`relative ${isPro ? 'border-primary shadow-lg' : ''} ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
          >
            {isPro && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-3 py-1">
                  <Crown className="w-3 h-3 mr-1" />
                  Phổ Biến Nhất
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                {isFree ? (
                  <Zap className="w-5 h-5" />
                ) : (
                  <Crown className="w-5 h-5 text-primary" />
                )}
                {plan.name}
              </CardTitle>
              <CardDescription>
                {isFree
                  ? 'Hoàn hảo để bắt đầu'
                  : 'Tốt nhất cho người dùng chuyên nghiệp'
                }
              </CardDescription>
              
              <div className="mt-4">
                <div className="text-3xl font-bold">
                  {plan.displayPrice}
                  {!isFree && <span className="text-lg font-normal text-muted-foreground">/month</span>}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Downloads per day:</span>
                  <span className="font-medium">{plan.maxDownloadsPerDay}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Concurrent streams:</span>
                  <span className="font-medium">{plan.maxConcurrentStreams}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Max quality:</span>
                  <span className="font-medium">{plan.maxQuality}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Tính năng bao gồm:</h4>
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>{getFeatureIcon(feature)}</span>
                    <span>{getFeatureLabel(feature)}</span>
                  </div>
                ))}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
              {isCurrentPlan ? (
                <Button disabled className="w-full">
                  Gói Hiện Tại
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    className="w-full"
                    variant={isPro ? 'default' : 'outline'}
                    disabled={!user}
                  >
                    {!user ? 'Cần Đăng Nhập' : isFree ? 'Chọn Gói Miễn Phí' : 'Nâng Cấp Pro'}
                  </Button>

                  {showTestPayment && user && process.env.NODE_ENV === 'development' && (
                    <Button
                      onClick={() => handleTestPayment(plan.id)}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      Thanh Toán Thử (Dev)
                    </Button>
                  )}
                </>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};
