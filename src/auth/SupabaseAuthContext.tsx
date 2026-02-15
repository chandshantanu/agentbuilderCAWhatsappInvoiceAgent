/**
 * Supabase Auth Context for SaaS mode.
 *
 * In SaaS mode, CAs sign up and log in via Supabase Auth.
 * The Supabase URL and anon key come from the SaaS config.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import { useSaaS } from '@/contexts/SaaSContext';
import { setSaaSAuthToken } from '@/services/saasApiService';

interface SupabaseAuthState {
  supabase: SupabaseClient | null;
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isLoading: boolean;
  error: string | null;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthState>({
  supabase: null,
  session: null,
  user: null,
  isAuthenticated: false,
  isEmailVerified: false,
  isLoading: true,
  error: null,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
});

const PLATFORM_API_URL =
  import.meta.env.VITE_PLATFORM_API_URL || 'https://agentsapi.chatslytics.com';

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const { config, subdomain } = useSaaS();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Supabase client from SaaS config
  useEffect(() => {
    if (!config) {
      setIsLoading(false);
      return;
    }

    const url = config.supabase_url || import.meta.env.VITE_SUPABASE_URL;
    const key = config.supabase_anon_key || import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
      setError('Supabase configuration missing');
      setIsLoading(false);
      return;
    }

    const client = createClient(url, key);
    setSupabase(client);

    // Check existing session
    client.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setSaaSAuthToken(s?.access_token ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setSaaSAuthToken(s?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, [config]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (!supabase) throw new Error('Supabase not initialized');
    setError(null);

    // Build redirect URL: use agent subdomain if in SaaS mode, else default
    const redirectUrl = subdomain
      ? `https://${subdomain}.agents.chatslytics.com/checkout`
      : undefined;

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        ...(redirectUrl && { emailRedirectTo: redirectUrl }),
      },
    });

    if (authError) {
      setError(authError.message);
      throw authError;
    }

    // Register in MongoDB via core-api
    if (data.user) {
      try {
        await fetch(`${PLATFORM_API_URL}/api/v1/saas/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supabase_uid: data.user.id,
            email: data.user.email,
            full_name: fullName || '',
            subdomain: subdomain || '',
          }),
        });
      } catch (err) {
        console.warn('MongoDB registration failed (non-fatal):', err);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not initialized');
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      throw authError;
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  return (
    <SupabaseAuthContext.Provider
      value={{
        supabase,
        session,
        user,
        isAuthenticated: !!session,
        isEmailVerified: !!user?.email_confirmed_at,
        isLoading,
        error,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  return useContext(SupabaseAuthContext);
}
