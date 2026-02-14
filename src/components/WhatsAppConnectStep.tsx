/**
 * WhatsAppConnectStep — Meta Embedded Signup v2 (popup-based).
 *
 * Loads the Facebook SDK, opens FB.login() with whatsapp_embedded_signup feature,
 * exchanges the returned code via backend, and shows the connected phone number.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { saasApi } from '@/services/saasApiService';
import { CheckCircle2, Loader2, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';

// Extend Window for FB SDK
declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (params: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
      login: (
        callback: (response: { authResponse?: { code?: string }; status?: string }) => void,
        params: Record<string, any>,
      ) => void;
    };
  }
}

interface WhatsAppConnectStepProps {
  facebookAppId: string;
  subscriptionId: string;
  subdomain: string;
  onConnected: (data: {
    phone_number: string;
    phone_number_id: string;
    verified_name: string;
    waba_id: string;
  }) => void;
  primaryColor?: string;
}

type ConnectState = 'loading' | 'idle' | 'connecting' | 'exchanging' | 'connected' | 'error';

export default function WhatsAppConnectStep({
  facebookAppId,
  subscriptionId,
  subdomain,
  onConnected,
  primaryColor = '#25D366',
}: WhatsAppConnectStepProps) {
  const [state, setState] = useState<ConnectState>('loading');
  const [error, setError] = useState('');
  const [connectedData, setConnectedData] = useState<{
    phone_number: string;
    verified_name: string;
  } | null>(null);
  const sdkLoaded = useRef(false);

  // Check existing connection on mount
  useEffect(() => {
    let cancelled = false;
    async function checkStatus() {
      try {
        const resp = await saasApi.getWhatsAppStatus(subdomain);
        if (!cancelled && resp.data?.connected) {
          setConnectedData({
            phone_number: resp.data.phone_number,
            verified_name: resp.data.verified_name || '',
          });
          onConnected({
            phone_number: resp.data.phone_number,
            phone_number_id: '',
            verified_name: resp.data.verified_name || '',
            waba_id: resp.data.waba_id || '',
          });
          setState('connected');
          return;
        }
      } catch {
        // Not connected yet, that's fine
      }
      if (!cancelled) {
        loadFBSdk();
      }
    }
    checkStatus();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  const loadFBSdk = useCallback(() => {
    if (sdkLoaded.current || window.FB) {
      initFB();
      return;
    }

    window.fbAsyncInit = () => {
      initFB();
    };

    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => {
      setState('error');
      setError('Failed to load Facebook SDK. Please check your internet connection and try again.');
    };
    document.body.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facebookAppId]);

  function initFB() {
    if (!window.FB) return;
    window.FB.init({
      appId: facebookAppId,
      cookie: true,
      xfbml: false,
      version: 'v18.0',
    });
    sdkLoaded.current = true;
    setState('idle');
  }

  const handleConnect = useCallback(() => {
    if (!window.FB) {
      setError('Facebook SDK not loaded. Please refresh and try again.');
      setState('error');
      return;
    }

    setState('connecting');
    setError('');

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (!code) {
          // User cancelled or denied
          setState('idle');
          return;
        }

        // Exchange code via backend
        setState('exchanging');
        saasApi
          .exchangeWhatsAppCode(subscriptionId, code)
          .then((resp: any) => {
            const data = resp.data;
            setConnectedData({
              phone_number: data.phone_number,
              verified_name: data.verified_name || '',
            });
            onConnected(data);
            setState('connected');
          })
          .catch((err: any) => {
            setError(err.message || 'Failed to connect WhatsApp. Please try again.');
            setState('error');
          });
      },
      {
        config_id: undefined,
        response_type: 'code',
        override_default_response_type: true,
        scope: 'whatsapp_business_management,whatsapp_business_messaging,business_management',
        extras: {
          feature: 'whatsapp_embedded_signup',
          version: 2,
        },
      },
    );
  }, [subscriptionId, onConnected]);

  const handleRetry = () => {
    setError('');
    if (!sdkLoaded.current) {
      setState('loading');
      loadFBSdk();
    } else {
      setState('idle');
    }
  };

  // Loading state
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center py-8 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">Loading WhatsApp connection...</p>
      </div>
    );
  }

  // Connected state
  if (state === 'connected' && connectedData) {
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900">WhatsApp Connected</h3>
            <p className="text-sm text-green-700">{connectedData.phone_number}</p>
          </div>
        </div>
        {connectedData.verified_name && (
          <p className="text-sm text-green-600 ml-[52px]">
            Verified as: {connectedData.verified_name}
          </p>
        )}
        <button
          onClick={handleConnect}
          className="mt-4 text-sm text-green-700 hover:text-green-900 underline flex items-center gap-1"
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
          style={{ backgroundColor: primaryColor }}
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  // Exchanging state (code sent to backend)
  if (state === 'exchanging') {
    return (
      <div className="flex flex-col items-center py-8 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
        <p className="text-sm text-gray-600 font-medium">
          Setting up your WhatsApp Business account...
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
          Complete the signup in the Meta popup...
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
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <MessageSquare className="w-5 h-5" style={{ color: primaryColor }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Connect your WhatsApp Business
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              A popup will open to connect your Meta Business account. You'll need
              access to your Facebook account that manages your WhatsApp Business.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleConnect}
        className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
        style={{ backgroundColor: primaryColor }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        Connect WhatsApp Business
      </button>
    </div>
  );
}
