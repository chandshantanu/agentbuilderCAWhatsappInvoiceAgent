/**
 * SaaS Dashboard Page.
 * Wraps the existing DashboardHome but with the SaaS API client
 * pointing to core-api's runtime proxy instead of the local runtime.
 */

import { useEffect, useState } from 'react';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';
import { apiClient, setAuthToken } from '@/lib/apiClient';
import DashboardHome from '@/pages/DashboardHome';
import { ConfigProvider } from '@/config/ConfigProvider';
import { BrandingProvider } from '@/branding/BrandingProvider';
import { Loader2 } from 'lucide-react';

/**
 * In SaaS mode, the apiClient needs to point to the runtime proxy
 * and use the Supabase JWT instead of the URL-fragment token.
 */
export default function SaaSDashboardPage() {
  const { apiBaseUrl } = useSaaS();
  const { session } = useSupabaseAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!session?.access_token || !apiBaseUrl) return;

    // Point the apiClient to the SaaS runtime proxy
    apiClient.defaults.baseURL = apiBaseUrl;
    setAuthToken(session.access_token);
    setReady(true);
  }, [session, apiBaseUrl]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Re-render ConfigProvider + BrandingProvider now that apiClient is configured
  return (
    <ConfigProvider forceAuth>
      <BrandingProvider>
        <DashboardHome />
      </BrandingProvider>
    </ConfigProvider>
  );
}
