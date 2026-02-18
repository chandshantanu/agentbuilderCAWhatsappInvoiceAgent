/**
 * App — root component for the agent dashboard.
 *
 * Two modes:
 * 1. Direct mode (existing): token in URL hash → DashboardHome
 * 2. SaaS mode (new): subdomain detected → Landing → Signup → Checkout → Onboarding → Dashboard
 */

import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';
import { useAuth } from '@/auth/AuthContext';
import { useConfig } from '@/config/ConfigProvider';
import { SupabaseAuthProvider } from '@/auth/SupabaseAuthContext';
import DashboardHome from '@/pages/DashboardHome';
import OnboardingFlow from '@/pages/OnboardingFlow';
import { RequireAuth, RequireSubscription, RequireConfigured } from '@/components/RouteGuards';

// Lazy-loaded SaaS pages
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SignupPage = lazy(() => import('@/pages/SignupPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const SaaSOnboardingPage = lazy(() => import('@/pages/SaaSOnboardingPage'));
const SaaSDashboardPage = lazy(() => import('@/pages/SaaSDashboardPage'));
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage'));

// ── Shared UI ──

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">Loading dashboard...</p>
      </div>
    </div>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h2>
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}

function ConfigError({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Configuration Error</h2>
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}

function SaaSError({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Site Not Found</h2>
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}

// ── Instagram OAuth Callback (popup) ──

function InstagramCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (window.opener) {
      window.opener.postMessage(
        { type: 'instagram_auth', code, error },
        window.location.origin,
      );
      window.close();
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">Connecting Instagram... This window will close automatically.</p>
      </div>
    </div>
  );
}

// ── Direct Mode (existing behavior) ──

function DirectModeApp() {
  const { isAuthenticated, isLoading: authLoading, error: authError } = useAuth();
  const { configStatus, isLoading: configLoading, error: configError } = useConfig();

  if (authLoading || configLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <AuthError message={authError || 'Please log in.'} />;
  if (configError) return <ConfigError message={configError} />;
  if (configStatus && !configStatus.configured) return <OnboardingFlow />;

  return <DashboardHome />;
}

// ── SaaS Mode (white-label) ──

function SaaSModeApp() {
  const { config, error } = useSaaS();

  if (error) return <SaaSError message={error} />;
  if (!config) return <LoadingScreen />;

  return (
    <SupabaseAuthProvider>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route
            path="/checkout"
            element={
              <RequireAuth>
                <CheckoutPage />
              </RequireAuth>
            }
          />
          <Route
            path="/onboarding"
            element={
              <RequireSubscription>
                <SaaSOnboardingPage />
              </RequireSubscription>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireConfigured>
                <SaaSDashboardPage />
              </RequireConfigured>
            }
          />
        </Routes>
      </Suspense>
    </SupabaseAuthProvider>
  );
}

// ── Root App ──

export default function App() {
  const { mode } = useSaaS();

  // Instagram OAuth callback route — rendered in popup, no auth needed
  if (window.location.pathname === '/instagram-callback') {
    return <InstagramCallbackPage />;
  }

  if (mode === 'loading') return <LoadingScreen />;
  if (mode === 'saas') return <SaaSModeApp />;
  return <DirectModeApp />;
}
