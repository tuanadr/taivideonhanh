'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Calendar, Crown, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export const SubscriptionStatus: React.FC = () => {
  const {
    currentSubscription,
    loadingSubscription,
    limits,
    cancelSubscription,
    isPro
  } = useSubscription();

  const handleCancelSubscription = async () => {
    if (!currentSubscription) return;
    
    if (confirm('Bạn có chắc chắn muốn hủy đăng ký? Bạn sẽ mất quyền truy cập vào các tính năng Pro vào cuối chu kỳ thanh toán.')) {
      try {
        await cancelSubscription(currentSubscription.id);
        toast.success('Hủy đăng ký thành công');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Không thể hủy đăng ký');
      }
    }
  };

  if (loadingSubscription) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-yellow-500';
      case 'expired':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <AlertTriangle className="w-4 h-4" />;
      case 'expired':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isPro() ? (
              <>
                <Crown className="w-5 h-5 text-primary" />
                Đăng Ký Hiện Tại
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Gói Miễn Phí
              </>
            )}
          </CardTitle>
          <CardDescription>
            {currentSubscription
              ? 'Chi tiết và trạng thái đăng ký của bạn'
              : 'Bạn hiện đang sử dụng gói miễn phí'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {currentSubscription ? (
            <>
              <div className="flex items-center justify-between">
                <span className="font-medium">Gói:</span>
                <div className="flex items-center gap-2">
                  <span>{currentSubscription.plan?.name}</span>
                  <Badge className={getStatusColor(currentSubscription.status)}>
                    {getStatusIcon(currentSubscription.status)}
                    {currentSubscription.status}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium">Giá:</span>
                <span>{currentSubscription.plan?.displayPrice}/tháng</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium">Hết hạn:</span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(currentSubscription.expiresAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Số ngày còn lại:</span>
                  <span className={currentSubscription.daysRemaining <= 7 ? 'text-red-500 font-medium' : ''}>
                    {currentSubscription.daysRemaining} ngày
                  </span>
                </div>
                
                {currentSubscription.daysRemaining <= 30 && (
                  <Progress 
                    value={(currentSubscription.daysRemaining / 30) * 100} 
                    className="h-2"
                  />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium">Tự động gia hạn:</span>
                <Badge variant={currentSubscription.autoRenew ? 'default' : 'secondary'}>
                  {currentSubscription.autoRenew ? 'Bật' : 'Tắt'}
                </Badge>
              </div>

              {currentSubscription.status === 'active' && (
                <div className="pt-4 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleCancelSubscription}
                  >
                    Hủy Đăng Ký
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                Bạn hiện đang sử dụng gói miễn phí với các tính năng cơ bản.
              </p>
              <Button>
                Nâng Cấp Pro
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Limits */}
      {limits && (
        <Card>
          <CardHeader>
            <CardTitle>Giới Hạn Sử Dụng</CardTitle>
            <CardDescription>
              Giới hạn và tính năng của gói hiện tại
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {limits.maxDownloadsPerDay}
                </div>
                <div className="text-sm text-muted-foreground">
                  Lượt tải/ngày
                </div>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {limits.maxConcurrentStreams}
                </div>
                <div className="text-sm text-muted-foreground">
                  Stream đồng thời
                </div>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {limits.maxQuality}
                </div>
                <div className="text-sm text-muted-foreground">
                  Chất lượng tối đa
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Tính Năng Có Sẵn:</h4>
              <div className="flex flex-wrap gap-2">
                {limits.features.map((feature) => (
                  <Badge key={feature} variant="secondary">
                    {feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
