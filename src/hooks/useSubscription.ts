/**
 * Subscription state hook for SaaS mode.
 * Fetches and tracks the CA's subscription status.
 * Detects trial expiry both server-side (status=expired) and client-side (trial_end check).
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
  trialExpired: boolean;
  expiryReason: string | null;
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
    trialExpired: false,
    expiryReason: null,
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
          trialExpired: false,
          expiryReason: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      // Server-side expiry detection (backend now returns status="expired")
      if (sub.status === 'expired') {
        setState({
          hasSubscription: false,
          isConfigured: false,
          subscriptionId: sub.id || sub.subscription_id,
          status: 'expired',
          serviceStatus: sub.service_status,
          trialExpired: sub.expiry_reason === 'trial_ended',
          expiryReason: sub.expiry_reason || 'expired',
          isLoading: false,
          error: null,
        });
        return;
      }

      // Client-side safety net: check trial_end date
      if (sub.is_trial && sub.trial_end) {
        const trialEnd = new Date(sub.trial_end);
        if (trialEnd < new Date()) {
          setState({
            hasSubscription: false,
            isConfigured: false,
            subscriptionId: sub.id || sub.subscription_id,
            status: 'expired',
            serviceStatus: sub.service_status,
            trialExpired: true,
            expiryReason: 'trial_ended',
            isLoading: false,
            error: null,
          });
          return;
        }
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
        trialExpired: false,
        expiryReason: null,
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
        trialExpired: false,
        expiryReason: null,
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
