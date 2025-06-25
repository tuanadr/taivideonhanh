/**
 * API Configuration Utility
 * Provides consistent API URL resolution for all components
 */

// Get API base URL with environment-aware resolution
export const getApiBaseUrl = (): string => {
  // In browser environment
  if (typeof window !== 'undefined') {
    // Use environment variable first, fallback to current domain
    return process.env.NEXT_PUBLIC_API_URL || `${window.location.protocol}//${window.location.host}/api`;
  }
  
  // In server environment (SSR)
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

// API fetch wrapper with automatic URL handling
export const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : `${baseUrl}/${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };
  
  try {
    const response = await fetch(url, defaultOptions);
    return response;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};

// Specific API functions for common endpoints
export const api = {
  // Subscription APIs
  subscription: {
    getPlans: () => apiCall('/subscription/plans'),
    getCurrent: (token: string) => apiCall('/subscription/current', {
      headers: { Authorization: `Bearer ${token}` }
    }),
    getPayments: (token: string) => apiCall('/subscription/payments', {
      headers: { Authorization: `Bearer ${token}` }
    }),
    createPaymentIntent: (planId: string, paymentMethod: string, token: string) => 
      apiCall('/subscription/payment-intent', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId, paymentMethod })
      }),
    createTestPayment: (planId: string, token: string) => 
      apiCall('/subscription/test-payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId })
      }),
    cancel: (subscriptionId: string, token: string) => 
      apiCall(`/subscription/${subscriptionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
  },

  // Health check
  health: () => apiCall('/health'),
};

export default api;
