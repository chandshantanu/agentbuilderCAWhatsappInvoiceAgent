/**
 * ConfigProvider — fetches dashboard + status config from the runtime.
 *
 * Provides:
 * - dashboardConfig: layout, tabs, widgets, branding
 * - configStatus: whether agent is configured, missing fields
 * - isLoading / error states
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/auth/AuthContext';
import type { DashboardConfig, ConfigStatusResponse } from './types';

interface ConfigState {
  dashboardConfig: DashboardConfig | null;
  configStatus: ConfigStatusResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const ConfigContext = createContext<ConfigState>({
  dashboardConfig: null,
  configStatus: null,
  isLoading: true,
  error: null,
  refetch: async () => {},
});

interface ConfigProviderProps {
  children: React.ReactNode;
  /** Skip auth check and fetch immediately (used in SaaS mode where auth is handled externally) */
  forceAuth?: boolean;
}

export function ConfigProvider({ children, forceAuth = false }: ConfigProviderProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig | null>(null);
  const [configStatus, setConfigStatus] = useState<ConfigStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [dashResp, statusResp] = await Promise.all([
        apiClient.get('/config/dashboard'),
        apiClient.get('/config/status'),
      ]);

      // Support both direct-mode ({dashboard: ...}) and SaaS-mode ({success: true, data: ...}) responses
      const dashData = dashResp.data?.data || dashResp.data?.dashboard || dashResp.data;
      setDashboardConfig(dashData);
      const statusData = statusResp.data?.data || statusResp.data;
      setConfigStatus(statusData);
    } catch (err: any) {
      console.error('Failed to fetch config:', err);
      setError(err?.response?.data?.detail || 'Failed to load dashboard configuration');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (forceAuth) {
      fetchConfig();
      return;
    }
    if (authLoading) return;
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    fetchConfig();
  }, [isAuthenticated, authLoading, forceAuth]);

  return (
    <ConfigContext.Provider
      value={{ dashboardConfig, configStatus, isLoading, error, refetch: fetchConfig }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
