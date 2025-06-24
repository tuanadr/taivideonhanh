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
      // In a real app, you would integrate with Stripe Elements here
      // For now, we'll just show a message
      toast.info(`Payment integration would be implemented here for plan: ${planId}`);

      // Example of how you would create a payment intent:
      // const { clientSecret } = await createPaymentIntent(planId, 'card');
      // Then redirect to Stripe checkout or use Stripe Elements

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process payment');
    }
  };

  if (!user) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Subscription Plans</h1>
            <p className="text-muted-foreground">
              Choose the perfect plan for your video downloading needs
            </p>
          </div>

          <Card className="text-center py-12">
            <CardContent>
              <Crown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Login Required</h2>
              <p className="text-muted-foreground mb-6">
                Please login to view and manage your subscription
              </p>
              <Button>
                Login to Continue
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
          <h1 className="text-3xl font-bold mb-4">Subscription Management</h1>
          <p className="text-muted-foreground">
            Manage your subscription, view payment history, and upgrade your plan
          </p>
        </div>

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Plans
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Status
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Choose Your Plan</CardTitle>
                <CardDescription>
                  Select the plan that best fits your needs. You can upgrade or downgrade at any time.
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
                <CardTitle>Subscription History</CardTitle>
                <CardDescription>
                  View your complete subscription history and changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Subscription history coming soon</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    This feature will show your subscription changes over time
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
