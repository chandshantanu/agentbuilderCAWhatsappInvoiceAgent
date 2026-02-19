/**
 * InstagramConnectStep — Instagram Login OAuth popup flow.
 *
 * Uses Instagram's "Instagram API with Instagram Login" (api.instagram.com)
 * instead of the old Facebook Login flow. Users log in with their
 * Instagram username/password — no Facebook Page required, no page selector.
 *
 * Flow:
 * 1. Check existing connection via status endpoint
 * 2. Open popup to api.instagram.com/oauth/authorize
 * 3. Instagram redirects popup to /instagram-callback with ?code=xxx
 * 4. Callback page sends code to parent via postMessage
 * 5. Parent sends code to backend /instagram/connect endpoint
 * 6. Backend exchanges code -> tokens -> stores credentials
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { saasApi } from '@/services/saasApiService';
import { CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

interface InstagramConnectStepProps {
  instagramAppId: string;
  subscriptionId: string;
  subdomain: string;
  onConnected: (data: {
    instagram_username: string;
    instagram_user_id: string;
  }) => void;
  primaryColor?: string;
}

type ConnectState =
  | 'loading'
  | 'idle'
  | 'connecting'
  | 'exchanging'
  | 'connected'
  | 'error';

export default function InstagramConnectStep({
  instagramAppId,
  subscriptionId,
  subdomain,
  onConnected,
  primaryColor = '#E1306C',
}: InstagramConnectStepProps) {
  const [state, setState] = useState<ConnectState>('loading');
  const [error, setError] = useState('');
  const [connectedData, setConnectedData] = useState<{
    instagram_username: string;
    instagram_user_id: string;
  } | null>(null);
  const popupRef = useRef<Window | null>(null);
  const popupCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check existing connection on mount
  useEffect(() => {
    let cancelled = false;
    async function checkStatus() {
      try {
        const resp = await saasApi.getInstagramStatus(subdomain);
        if (!cancelled && resp.data?.connected) {
          const data = {
            instagram_username: resp.data.instagram_username || '',
            instagram_user_id: resp.data.instagram_user_id || '',
          };
          setConnectedData(data);
          onConnected(data);
          setState('connected');
          return;
        }
      } catch {
        // Not connected yet
      }
      if (!cancelled) {
        setState('idle');
      }
    }
    checkStatus();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  // Listen for postMessage from callback popup
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'instagram_auth') return;

      const { code, error: authError } = event.data;

      // Clean up popup
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      popupRef.current = null;
      if (popupCheckInterval.current) {
        clearInterval(popupCheckInterval.current);
        popupCheckInterval.current = null;
      }

      if (authError || !code) {
        setError(authError || 'Instagram authorization was cancelled.');
        setState('error');
        return;
      }

      // Exchange code via backend
      setState('exchanging');
      const redirectUri = `${window.location.origin}/instagram-callback`;

      saasApi
        .connectInstagram(subdomain, code, redirectUri)
        .then((resp: any) => {
          const data = resp.data;
          const connected = {
            instagram_username: data.instagram_username || '',
            instagram_user_id: data.instagram_user_id || '',
          };
          setConnectedData(connected);
          onConnected(connected);
          setState('connected');
        })
        .catch((err: any) => {
          setError(err.message || 'Failed to connect Instagram. Please try again.');
          setState('error');
        });
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain, onConnected]);

  // Clean up popup check interval on unmount
  useEffect(() => {
    return () => {
      if (popupCheckInterval.current) {
        clearInterval(popupCheckInterval.current);
      }
    };
  }, []);

  const handleConnect = useCallback(() => {
    if (!instagramAppId) {
      setError('Instagram App ID not configured. Please contact support.');
      setState('error');
      return;
    }

    setState('connecting');
    setError('');

    const redirectUri = `${window.location.origin}/instagram-callback`;
    const scope = 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments';
    // Business Login for Instagram uses www.instagram.com (NOT api.instagram.com)
    // See: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
    const authUrl =
      `https://www.instagram.com/oauth/authorize` +
      `?client_id=${encodeURIComponent(instagramAppId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&response_type=code` +
      `&force_reauth=true` +
      `&enable_fb_login=false` +
      `&state=${encodeURIComponent(subscriptionId)}`;

    // Open popup
    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    popupRef.current = window.open(
      authUrl,
      'instagram_auth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=yes`,
    );

    // Monitor popup close (user might close without completing)
    popupCheckInterval.current = setInterval(() => {
      if (popupRef.current && popupRef.current.closed) {
        if (popupCheckInterval.current) {
          clearInterval(popupCheckInterval.current);
          popupCheckInterval.current = null;
        }
        popupRef.current = null;
        // Only reset to idle if we're still in connecting state
        setState((prev) => (prev === 'connecting' ? 'idle' : prev));
      }
    }, 500);
  }, [instagramAppId, subscriptionId]);

  const handleRetry = () => {
    setError('');
    setState('idle');
  };

  // Loading state
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center py-8 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">Loading Instagram connection...</p>
      </div>
    );
  }

  // Connected state
  if (state === 'connected' && connectedData) {
    return (
      <div className="rounded-xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-pink-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Instagram Connected</h3>
            {connectedData.instagram_username && (
              <p className="text-sm text-pink-700">@{connectedData.instagram_username}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleConnect}
          className="mt-4 text-sm text-pink-700 hover:text-pink-900 underline flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Reconnect with a different account
        </button>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Connection Failed</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleRetry}
          className="w-full py-3 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #E1306C, #833AB4)' }}
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  // Exchanging state
  if (state === 'exchanging') {
    return (
      <div className="flex flex-col items-center py-8 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
        <p className="text-sm text-gray-600 font-medium">
          Connecting your Instagram account...
        </p>
        <p className="text-xs text-gray-400">This may take a few seconds</p>
      </div>
    );
  }

  // Connecting state (popup open)
  if (state === 'connecting') {
    return (
      <div className="flex flex-col items-center py-8 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
        <p className="text-sm text-gray-600 font-medium">
          Complete authorization in the Instagram popup...
        </p>
        <p className="text-xs text-gray-400">
          If you don't see a popup, check your browser's popup blocker
        </p>
      </div>
    );
  }

  // Idle state — show connect button
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #E1306C, #833AB4)' }}
          >
            <InstagramIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Connect your Instagram Account
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              A popup will open where you can log in with your Instagram username
              and password. No Facebook Page is required.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleConnect}
        className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #E1306C, #833AB4)' }}
      >
        <InstagramIcon className="w-5 h-5" />
        Connect Instagram
      </button>
    </div>
  );
}
