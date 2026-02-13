/**
 * Subscription state hook for SaaS mode.
 * Fetches and tracks the CA's subscription status.
 */

import { useState, useEffect, useCallback } from 'react';
import { saasApi } from '@/services/saasApiService';
import { useSaaS } from '@/contexts/SaaSContext';

export interface SubscriptionState {
  hasSubscription: boolean;
  isConfigured: boolean;
  subscriptionId: string | null;
  status: string | null;
  serviceStatus: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { subdomain } = useSaaS();
  const [state, setState] = useState<Omit<SubscriptionState, 'refetch'>>({
    hasSubscription: false,
    isConfigured: false,
    subscriptionId: null,
    status: null,
    serviceStatus: null,
    isLoading: true,
    error: null,
  });

  const fetchStatus = useCallback(async () => {
    if (!subdomain) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const subResp = await saasApi.getSubscription(subdomain);
      const sub = subResp.data;

      if (!sub) {
        setState({
          hasSubscription: false,
          isConfigured: false,
          subscriptionId: null,
          status: null,
          serviceStatus: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      // Also fetch config status
      let isConfigured = sub.is_configured || false;
      try {
        const configResp = await saasApi.getConfigStatus(subdomain);
        isConfigured = configResp.data?.is_configured || false;
      } catch {
        // Use subscription field as fallback
      }

      setState({
        hasSubscription: true,
        isConfigured,
        subscriptionId: sub.id || sub.subscription_id,
        status: sub.status,
        serviceStatus: sub.service_status,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      setState({
        hasSubscription: false,
        isConfigured: false,
        subscriptionId: null,
        status: null,
        serviceStatus: null,
        isLoading: false,
        error: err.message || 'Failed to check subscription',
      });
    }
  }, [subdomain]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { ...state, refetch: fetchStatus };
}
