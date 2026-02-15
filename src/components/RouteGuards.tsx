/**
 * Route guards for SaaS mode.
 * - RequireAuth: redirect to /login if not authenticated
 * - RequireSubscription: redirect to /checkout if no active subscription
 * - RequireConfigured: redirect to /onboarding if not configured
 */

import React from 'react';
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
  const { isAuthenticated, isEmailVerified, isLoading } = useSupabaseAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isEmailVerified) return <Navigate to="/verify-email" replace />;
  return <>{children}</>;
}

export function RequireSubscription({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isEmailVerified, isLoading: authLoading } = useSupabaseAuth();
  const { hasSubscription, isLoading: subLoading } = useSubscription();

  if (authLoading || subLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isEmailVerified) return <Navigate to="/verify-email" replace />;
  if (!hasSubscription) return <Navigate to="/checkout" replace />;
  return <>{children}</>;
}

export function RequireConfigured({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isEmailVerified, isLoading: authLoading } = useSupabaseAuth();
  const { hasSubscription, isConfigured, isLoading: subLoading } = useSubscription();

  if (authLoading || subLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isEmailVerified) return <Navigate to="/verify-email" replace />;
  if (!hasSubscription) return <Navigate to="/checkout" replace />;
  if (!isConfigured) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
