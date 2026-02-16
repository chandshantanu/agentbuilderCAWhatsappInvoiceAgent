/**
 * InstagramConnectStep — Facebook OAuth popup for Instagram Business connection.
 *
 * Loads the Facebook SDK, opens FB.login() with Instagram permissions,
 * exchanges the returned code via backend, shows a page selector,
 * and finalizes the connection.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { saasApi } from '@/services/saasApiService';
import { CheckCircle2, Loader2, AlertCircle, RefreshCw, Instagram } from 'lucide-react';

// Window.FB type is declared in WhatsAppConnectStep.tsx

interface InstagramConnectStepProps {
  facebookAppId: string;
  subscriptionId: string;
  subdomain: string;
  onConnected: (data: {
    page_name: string;
    instagram_username: string;
    instagram_business_account_id: string;
  }) => void;
  primaryColor?: string;
}

interface PageOption {
  page_id: string;
  page_name: string;
  instagram_business_account: {
    id: string;
    username: string;
  };
}

type ConnectState =
  | 'loading'
  | 'idle'
  | 'connecting'
  | 'selecting'
  | 'exchanging'
  | 'connected'
  | 'error';

export default function InstagramConnectStep({
  facebookAppId,
  subscriptionId,
  subdomain,
  onConnected,
  primaryColor = '#E1306C',
}: InstagramConnectStepProps) {
  const [state, setState] = useState<ConnectState>('loading');
  const [error, setError] = useState('');
  const [pages, setPages] = useState<PageOption[]>([]);
  const [connectedData, setConnectedData] = useState<{
    page_name: string;
    instagram_username: string;
  } | null>(null);
  const sdkLoaded = useRef(false);

  // Check existing connection on mount
  useEffect(() => {
    let cancelled = false;
    async function checkStatus() {
      try {
        const resp = await saasApi.getInstagramStatus(subdomain);
        if (!cancelled && resp.data?.connected) {
          setConnectedData({
            page_name: resp.data.page_name || '',
            instagram_username: resp.data.instagram_username || '',
          });
          onConnected({
            page_name: resp.data.page_name || '',
            instagram_username: resp.data.instagram_username || '',
            instagram_business_account_id: resp.data.instagram_business_account_id || '',
          });
          setState('connected');
          return;
        }
      } catch {
        // Not connected yet
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

        // Exchange code for pages list
        setState('exchanging');
        saasApi
          .exchangeInstagramCode(subdomain, code)
          .then((resp: any) => {
            const data = resp.data;
            if (!data.has_pages || !data.pages?.length) {
              setError(
                'No Facebook Pages with Instagram Business accounts found. ' +
                'Please connect an Instagram Business or Creator account to a Facebook Page first.'
              );
              setState('error');
              return;
            }

            if (data.pages.length === 1) {
              // Only one page — auto-select it
              handleSelectPage(data.pages[0]);
            } else {
              // Multiple pages — show selector
              setPages(data.pages);
              setState('selecting');
            }
          })
          .catch((err: any) => {
            setError(err.message || 'Failed to connect Instagram. Please try again.');
            setState('error');
          });
      },
      {
        response_type: 'code',
        override_default_response_type: true,
        scope: 'instagram_basic,instagram_manage_messages,pages_show_list,pages_read_engagement,pages_manage_metadata',
      },
    );
  }, [subdomain]);

  const handleSelectPage = useCallback(
    (page: PageOption) => {
      setState('exchanging');
      setError('');

      saasApi
        .selectInstagramPage(subdomain, page.page_id)
        .then((resp: any) => {
          const data = resp.data;
          setConnectedData({
            page_name: data.page_name,
            instagram_username: data.instagram_username || '',
          });
          onConnected({
            page_name: data.page_name,
            instagram_username: data.instagram_username || '',
            instagram_business_account_id: data.instagram_business_account_id || '',
          });
          setState('connected');
        })
        .catch((err: any) => {
          setError(err.message || 'Failed to connect page. Please try again.');
          setState('error');
        });
    },
    [subdomain, onConnected],
  );

  const handleRetry = () => {
    setError('');
    setPages([]);
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
        {connectedData.page_name && (
          <p className="text-sm text-gray-600 ml-[52px]">
            Page: {connectedData.page_name}
          </p>
        )}
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
          style={{ backgroundColor: primaryColor }}
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  // Page selector state
  if (state === 'selecting' && pages.length > 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 font-medium">
          Select the Facebook Page connected to your Instagram account:
        </p>
        <div className="space-y-2">
          {pages.map((page) => (
            <button
              key={page.page_id}
              onClick={() => handleSelectPage(page)}
              className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #E1306C, #833AB4)' }}
                >
                  <Instagram className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{page.page_name}</p>
                  {page.instagram_business_account.username && (
                    <p className="text-xs text-gray-500">
                      @{page.instagram_business_account.username}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={handleRetry}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
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
          Complete authorization in the Facebook popup...
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
            <Instagram className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Connect your Instagram Business
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              A popup will open to connect your Facebook account. You'll need a Facebook
              Page linked to an Instagram Business or Creator account.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleConnect}
        className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #E1306C, #833AB4)' }}
      >
        <Instagram className="w-5 h-5" />
        Connect Instagram Business
      </button>
    </div>
  );
}
