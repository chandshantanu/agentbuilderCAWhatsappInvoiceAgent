/**
 * Route guards for SaaS mode.
 * - RequireAuth: redirect to /login if not authenticated
 * - RequireSubscription: redirect to /checkout if no subscription, or redirect to /trial-expired
 * - RequireConfigured: redirect to /onboarding if not configured
 */

import { Navigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';
import { useSubscription } from '@/hooks/useSubscription';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useSupabaseAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequireSubscription({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useSupabaseAuth();
  const { hasSubscription, trialExpired, expiryReason, isLoading: subLoading } = useSubscription();

  if (authLoading || subLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (trialExpired || expiryReason) return <Navigate to="/trial-expired" replace />;
  if (!hasSubscription) return <Navigate to="/checkout" replace />;
  return <>{children}</>;
}

export function RequireConfigured({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useSupabaseAuth();
  const { hasSubscription, isConfigured, trialExpired, expiryReason, isLoading: subLoading } = useSubscription();

  if (authLoading || subLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasSubscription) {
    if (trialExpired || expiryReason) {
      return <Navigate to="/trial-expired" replace />;
    }
    // RequireConfigured wraps dashboard — if no sub, let RequireSubscription handle via /onboarding
    return <Navigate to="/onboarding" replace />;
  }
  if (!isConfigured) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
