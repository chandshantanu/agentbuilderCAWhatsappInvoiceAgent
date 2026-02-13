/**
 * Auth context for the agent dashboard.
 *
 * Reads JWT token from URL fragment (#token=...) on first load,
 * stores in memory (not localStorage for security), and sets it
 * on the API client for all subsequent requests.
 *
 * Includes automatic token refresh to prevent expiry during long sessions.
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { setAuthToken, getAuthToken } from '@/lib/apiClient';

// Platform API base URL (for token refresh — goes to core-api, not the local runtime)
const PLATFORM_API_URL = import.meta.env.VITE_PLATFORM_API_URL || 'https://agentsapi.chatslytics.com';

// Refresh token 5 minutes before expiry (JWT default is 1 hour)
const REFRESH_INTERVAL_MS = 50 * 60 * 1000; // 50 minutes

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthState>({
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refresh token by calling the platform's auth refresh endpoint
  const refreshToken = async () => {
    const currentToken = getAuthToken();
    if (!currentToken) return;

    try {
      const resp = await fetch(`${PLATFORM_API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (resp.ok) {
        const data = await resp.json();
        const newToken = data.access_token || data.token;
        if (newToken) {
          setAuthToken(newToken);
          setState((prev) => ({ ...prev, token: newToken }));
        }
      } else {
        console.warn('Token refresh failed:', resp.status);
        // Don't log out — the existing token may still be valid
      }
    } catch (err) {
      console.warn('Token refresh error:', err);
    }
  };

  useEffect(() => {
    // Extract token from URL fragment: .../#token=eyJhbGc...
    const hash = window.location.hash;
    const tokenMatch = hash.match(/token=([^&]+)/);

    if (tokenMatch) {
      const token = decodeURIComponent(tokenMatch[1]);
      setAuthToken(token);

      // Clear token from URL (security — don't leave it in browser history)
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      setState({
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Start periodic token refresh
      refreshTimerRef.current = setInterval(refreshToken, REFRESH_INTERVAL_MS);
    } else {
      setState({
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'No authentication token provided. Please access this dashboard from the platform.',
      });
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
