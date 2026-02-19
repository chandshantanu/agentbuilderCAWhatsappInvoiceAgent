/**
 * Subscription state hook for SaaS mode.
 * Fetches and tracks the CA's subscription status.
 */

import { useState, useEffect, useCallback } from 'react';
import { saasApi } from '@/services/saasApiService';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';

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
  const { isAuthenticated } = useSupabaseAuth();
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
    if (!subdomain || !isAuthenticated) return;

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

      // Trust platform's is_configured first; only check runtime if platform says false
      let isConfigured = sub.is_configured || false;
      if (!isConfigured) {
        try {
          const configResp = await saasApi.getConfigStatus(subdomain);
          if (configResp.data?.is_configured) {
            isConfigured = true;
          }
        } catch {
          // Use subscription field as fallback
        }
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
  }, [subdomain, isAuthenticated]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { ...state, refetch: fetchStatus };
}
