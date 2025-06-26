'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSubscription } from '@/contexts/SubscriptionContext';
// import { useAuth } from '@/contexts/AuthContext';
import { Check, Crown, Zap, Star, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  displayPrice: string;
  durationDays: number;
  billingCycle: 'monthly' | 'annual';
  discountPercentage: number;
  features: string[];
  maxDownloadsPerDay: number;
  maxConcurrentStreams: number;
  maxQuality: string;
}

interface GroupedPlans {
  monthly: Plan[];
  annual: Plan[];
}

interface Savings {
  savingsAmount: number;
  savingsPercentage: number;
  monthlyEquivalent: number;
}

interface AnnualPricingPlansProps {
  onSelectPlan?: (planId: string) => void;
  showTestPayment?: boolean;
}

export const AnnualPricingPlans: React.FC<AnnualPricingPlansProps> = ({ 
  onSelectPlan, 
  showTestPayment = false 
}) => {
  const { createTestPayment } = useSubscription();
  // const { user } = useAuth();
  
  const [isAnnual, setIsAnnual] = useState(false);
  const [groupedPlans, setGroupedPlans] = useState<GroupedPlans>({ monthly: [], annual: [] });
  const [savings, setSavings] = useState<Savings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscription/plans');
      const data = await response.json();
      
      if (data.grouped) {
        setGroupedPlans(data.grouped);
      }
      
      if (data.savings) {
        setSavings(data.savings);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      toast.error('Không thể tải danh sách gói đăng ký');
    } finally {
      setLoading(false);
    }
  };

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
    const icons: Record<string, string> = {
      'unlimited_downloads': '⬇️',
      '4k_quality': '🎬',
      'concurrent_streams': '📱',
      'priority_support': '⚡',
      'no_ads': '🚫',
      'playlist_download': '📋',
      'api_access': '🔌',
      'annual_bonus': '🎁',
      'basic_download': '📥',
    };
    return icons[feature] || '✅';
  };

  const getFeatureLabel = (feature: string) => {
    const labels: Record<string, string> = {
      'unlimited_downloads': 'Tải không giới hạn',
      '4k_quality': 'Chất lượng 4K',
      'concurrent_streams': 'Tải đồng thời',
      'priority_support': 'Hỗ trợ ưu tiên',
      'no_ads': 'Không quảng cáo',
      'playlist_download': 'Tải playlist',
      'api_access': 'Truy cập API',
      'annual_bonus': 'Tính năng bonus',
      'basic_download': 'Tải cơ bản',
    };
    return labels[feature] || feature;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const currentPlans = isAnnual ? groupedPlans.annual : groupedPlans.monthly;
  const proPlans = currentPlans.filter(plan => plan.name.toLowerCase().includes('pro'));
  const freePlans = currentPlans.filter(plan => plan.name.toLowerCase().includes('free'));

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-2">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center space-x-4 p-4 bg-gray-50 rounded-lg">
        <Label htmlFor="billing-toggle" className={`font-medium ${!isAnnual ? 'text-primary' : 'text-muted-foreground'}`}>
          <Calendar className="w-4 h-4 inline mr-2" />
          Hàng tháng
        </Label>
        <Switch
          id="billing-toggle"
          checked={isAnnual}
          onCheckedChange={setIsAnnual}
        />
        <Label htmlFor="billing-toggle" className={`font-medium ${isAnnual ? 'text-primary' : 'text-muted-foreground'}`}>
          <Star className="w-4 h-4 inline mr-2" />
          Hàng năm
        </Label>
        {isAnnual && savings && (
          <Badge variant="destructive" className="bg-green-500 hover:bg-green-600">
            Tiết kiệm {savings.savingsPercentage}%
          </Badge>
        )}
      </div>

      {/* Savings Banner for Annual */}
      {isAnnual && savings && (
        <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-center gap-2 text-green-700 font-semibold">
            <DollarSign className="w-5 h-5" />
            <span>
              Tiết kiệm {formatPrice(savings.savingsAmount)} khi chọn gói năm!
            </span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            Tương đương {formatPrice(savings.monthlyEquivalent)}/tháng
          </p>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Plan */}
        {freePlans.map((plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                {plan.name}
              </CardTitle>
              <CardDescription>
                Gói miễn phí với các tính năng cơ bản
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">
                {formatPrice(plan.price)}
                <span className="text-lg font-normal text-muted-foreground">
                  /{isAnnual ? 'năm' : 'tháng'}
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  • {plan.maxDownloadsPerDay} lượt tải/ngày
                </div>
                <div className="text-sm text-muted-foreground">
                  • Chất lượng tối đa {plan.maxQuality}
                </div>
                <div className="text-sm text-muted-foreground">
                  • {plan.maxConcurrentStreams} tải đồng thời
                </div>
                
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span>{getFeatureIcon(feature)}</span>
                    <span>{getFeatureLabel(feature)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                disabled
              >
                Gói hiện tại
              </Button>
            </CardFooter>
          </Card>
        ))}

        {/* Pro Plan */}
        {proPlans.map((plan) => (
          <Card key={plan.id} className="relative border-primary shadow-lg">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <Star className="h-3 w-3 mr-1" />
                {isAnnual ? 'Tiết kiệm nhất' : 'Phổ biến'}
              </Badge>
            </div>
            
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-orange-500" />
                {plan.name}
                {isAnnual && (
                  <Badge variant="secondary" className="text-xs">
                    -{plan.discountPercentage}%
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isAnnual 
                  ? 'Gói Pro hàng năm với ưu đãi lớn' 
                  : 'Trải nghiệm hoàn hảo với tất cả tính năng'
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-primary">
                  {formatPrice(plan.price)}
                  <span className="text-lg font-normal text-muted-foreground">
                    /{isAnnual ? 'năm' : 'tháng'}
                  </span>
                </div>
                {isAnnual && savings && (
                  <div className="text-sm text-green-600">
                    Tiết kiệm {formatPrice(savings.savingsAmount)} so với gói tháng
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="text-sm font-medium text-green-600">
                  • Tải không giới hạn
                </div>
                <div className="text-sm font-medium text-green-600">
                  • Chất lượng tối đa {plan.maxQuality}
                </div>
                <div className="text-sm font-medium text-green-600">
                  • {plan.maxConcurrentStreams} tải đồng thời
                </div>
                
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{getFeatureLabel(feature)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            
            <CardFooter className="space-y-2">
              <Button 
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                onClick={() => handleSelectPlan(plan.id)}
              >
                <Crown className="h-4 w-4 mr-2" />
                {isAnnual ? 'Chọn gói năm' : 'Chọn gói tháng'}
              </Button>
              
              {showTestPayment && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleTestPayment(plan.id)}
                >
                  Test Payment
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Additional Info */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Tất cả gói đều có thể hủy bất cứ lúc nào. Không có phí ẩn.</p>
        {isAnnual && (
          <p className="mt-1 text-green-600 font-medium">
            Gói năm được thanh toán một lần và tự động gia hạn sau 12 tháng.
          </p>
        )}
      </div>
    </div>
  );
};
