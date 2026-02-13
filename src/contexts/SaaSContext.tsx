/**
 * SaaS Context — detects whether the dashboard is in "direct" mode
 * (token in URL fragment) or "saas" mode (subdomain-based white-label site).
 *
 * In SaaS mode, fetches the public config from core-api for branding,
 * pricing, Supabase config, etc.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

export type SaaSMode = 'direct' | 'saas' | 'loading';

export interface SaaSConfig {
  subdomain: string;
  branding: Record<string, any>;
  landing_page: Record<string, any>;
  pricing: Record<string, any>;
  supabase_url: string | null;
  supabase_anon_key: string | null;
  agent_id: string;
  seller_name: string;
  status: string;
  configuration_schema: Record<string, any> | null;
}

interface SaaSContextValue {
  mode: SaaSMode;
  subdomain: string | null;
  config: SaaSConfig | null;
  error: string | null;
  apiBaseUrl: string;
}

const PLATFORM_API_URL =
  import.meta.env.VITE_PLATFORM_API_URL || 'https://agentsapi.chatslytics.com';

const SaaSContext = createContext<SaaSContextValue>({
  mode: 'loading',
  subdomain: null,
  config: null,
  error: null,
  apiBaseUrl: '',
});

export function SaaSProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SaaSContextValue>({
    mode: 'loading',
    subdomain: null,
    config: null,
    error: null,
    apiBaseUrl: '',
  });

  useEffect(() => {
    const hostname = window.location.hostname;
    const isSaaSSubdomain =
      hostname.endsWith('.agents.chatslytics.com') &&
      hostname !== 'agents.chatslytics.com';

    // Also allow localhost testing with ?saas_subdomain= query param
    const params = new URLSearchParams(window.location.search);
    const testSubdomain = params.get('saas_subdomain');

    if (isSaaSSubdomain) {
      const subdomain = hostname.split('.')[0];
      fetchConfig(subdomain);
    } else if (testSubdomain) {
      fetchConfig(testSubdomain);
    } else {
      // Direct mode (existing behavior — token in URL hash)
      setState({
        mode: 'direct',
        subdomain: null,
        config: null,
        error: null,
        apiBaseUrl: '',
      });
    }
  }, []);

  async function fetchConfig(subdomain: string) {
    try {
      const resp = await fetch(
        `${PLATFORM_API_URL}/api/v1/saas/config/${subdomain}`
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        setState({
          mode: 'saas',
          subdomain,
          config: null,
          error: err.detail || 'SaaS site not found',
          apiBaseUrl: `${PLATFORM_API_URL}/api/v1/saas/runtime/${subdomain}`,
        });
        return;
      }
      const data = await resp.json();
      setState({
        mode: 'saas',
        subdomain,
        config: data.data,
        error: null,
        apiBaseUrl: `${PLATFORM_API_URL}/api/v1/saas/runtime/${subdomain}`,
      });
    } catch (err: any) {
      setState({
        mode: 'saas',
        subdomain,
        config: null,
        error: err.message || 'Failed to load SaaS config',
        apiBaseUrl: `${PLATFORM_API_URL}/api/v1/saas/runtime/${subdomain}`,
      });
    }
  }

  return <SaaSContext.Provider value={state}>{children}</SaaSContext.Provider>;
}

export function useSaaS() {
  return useContext(SaaSContext);
}
