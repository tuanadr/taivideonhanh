'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  displayPrice: string;
  durationDays: number;
  features: string[];
  maxDownloadsPerDay: number;
  maxConcurrentStreams: number;
  maxQuality: string;
}

interface UserSubscription {
  id: string;
  status: string;
  startsAt: string;
  expiresAt: string;
  autoRenew: boolean;
  daysRemaining: number;
  plan: {
    id: string;
    name: string;
    price: number;
    displayPrice: string;
    features: string[];
  } | null;
}

interface SubscriptionLimits {
  maxDownloadsPerDay: number;
  maxConcurrentStreams: number;
  maxQuality: string;
  features: string[];
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  displayAmount: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
  subscription: {
    id: string;
    plan: {
      name: string;
    } | null;
  } | null;
}

interface SubscriptionContextType {
  // Plans
  plans: SubscriptionPlan[];
  loadingPlans: boolean;
  
  // Current subscription
  currentSubscription: UserSubscription | null;
  loadingSubscription: boolean;
  
  // Limits
  limits: SubscriptionLimits | null;
  
  // Payments
  payments: Payment[];
  loadingPayments: boolean;
  
  // Actions
  fetchPlans: () => Promise<void>;
  fetchCurrentSubscription: () => Promise<void>;
  fetchPayments: () => Promise<void>;
  createPaymentIntent: (planId: string, paymentMethod: string) => Promise<{ clientSecret: string; paymentId: string }>;
  createTestPayment: (planId: string) => Promise<void>;
  cancelSubscription: (subscriptionId: string) => Promise<void>;
  
  // Helpers
  canAccessFeature: (feature: string) => boolean;
  canAccessQuality: (quality: string) => boolean;
  isPro: () => boolean;
  isFree: () => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, tokens } = useAuth();
  
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Get API base URL - use production URL in browser, fallback to localhost in development
  const getApiUrl = () => {
    if (typeof window !== 'undefined') {
      // In browser - use current domain for production
      return process.env.NEXT_PUBLIC_API_URL || `${window.location.protocol}//${window.location.host}/api`;
    }
    // In server - use environment variable or localhost for development
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  };

  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/subscription/plans`);
      const data = await response.json();
      
      if (response.ok) {
        setPlans(data.plans);
      } else {
        console.error('Failed to fetch plans:', data.error);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  const fetchCurrentSubscription = useCallback(async () => {
    if (!tokens?.accessToken) return;

    setLoadingSubscription(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/subscription/current`, {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      });
      const data = await response.json();
      
      if (response.ok) {
        setCurrentSubscription(data.subscription);
        setLimits(data.limits);
      } else {
        console.error('Failed to fetch current subscription:', data.error);
      }
    } catch (error) {
      console.error('Error fetching current subscription:', error);
    } finally {
      setLoadingSubscription(false);
    }
  }, [tokens]);

  const fetchPayments = useCallback(async () => {
    if (!tokens?.accessToken) return;

    setLoadingPayments(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/subscription/payments`, {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      });
      const data = await response.json();
      
      if (response.ok) {
        setPayments(data.payments);
      } else {
        console.error('Failed to fetch payments:', data.error);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoadingPayments(false);
    }
  }, [tokens]);

  const createPaymentIntent = async (planId: string, paymentMethod: string) => {
    if (!tokens?.accessToken) throw new Error('Authentication required');

    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/subscription/payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.accessToken}`,
      },
      body: JSON.stringify({ planId, paymentMethod }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create payment intent');
    }
    
    return {
      clientSecret: data.clientSecret,
      paymentId: data.paymentId,
    };
  };

  const createTestPayment = async (planId: string) => {
    if (!tokens?.accessToken) throw new Error('Authentication required');

    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/subscription/test-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.accessToken}`,
      },
      body: JSON.stringify({ planId, paymentMethod: 'test' }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create test payment');
    }
    
    // Refresh subscription data
    await fetchCurrentSubscription();
    await fetchPayments();
  };

  const cancelSubscription = async (subscriptionId: string) => {
    if (!tokens?.accessToken) throw new Error('Authentication required');

    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/subscription/${subscriptionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to cancel subscription');
    }
    
    // Refresh subscription data
    await fetchCurrentSubscription();
  };

  // Helper functions
  const canAccessFeature = (feature: string): boolean => {
    if (!limits) return false;
    return limits.features.includes(feature);
  };

  const canAccessQuality = (quality: string): boolean => {
    if (!limits) return false;
    
    const qualityLevels = ['720p', '1080p', '1440p', '2160p', 'best'];
    const userQualityIndex = qualityLevels.indexOf(limits.maxQuality);
    const requiredQualityIndex = qualityLevels.indexOf(quality);
    
    return userQualityIndex >= requiredQualityIndex;
  };

  const isPro = (): boolean => {
    return canAccessFeature('hd_download') || canAccessFeature('ad_free');
  };

  const isFree = (): boolean => {
    return !isPro();
  };

  // Load data when user changes
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    if (user && tokens) {
      fetchCurrentSubscription();
      fetchPayments();
    } else {
      setCurrentSubscription(null);
      setLimits(null);
      setPayments([]);
    }
  }, [user, tokens, fetchCurrentSubscription, fetchPayments]);

  const value: SubscriptionContextType = {
    plans,
    loadingPlans,
    currentSubscription,
    loadingSubscription,
    limits,
    payments,
    loadingPayments,
    fetchPlans,
    fetchCurrentSubscription,
    fetchPayments,
    createPaymentIntent,
    createTestPayment,
    cancelSubscription,
    canAccessFeature,
    canAccessQuality,
    isPro,
    isFree,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
