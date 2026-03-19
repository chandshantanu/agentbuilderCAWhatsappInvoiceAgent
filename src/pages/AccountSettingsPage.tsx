/**
 * AccountSettingsPage — Manage Instagram connection for existing subscribers.
 *
 * Accessible at /settings after onboarding is complete.
 * Allows users to reconnect their Instagram account (e.g. after token expiry
 * or if they missed the OAuth step during initial setup).
 */

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSubscription } from '@/hooks/useSubscription';
import { ArrowLeft, Settings } from 'lucide-react';
import InstagramConnectStep from '@/components/InstagramConnectStep';

export default function AccountSettingsPage() {
  const { config, subdomain } = useSaaS();
  const { subscriptionId } = useSubscription();
  const navigate = useNavigate();

  const [reconnected, setReconnected] = useState(false);
  // Track whether the initial mount check has fired — only show banner for user-triggered reconnects
  const initialCheckDoneRef = useRef(false);

  const handleConnected = useCallback(() => {
    if (initialCheckDoneRef.current) {
      setReconnected(true);
    }
    initialCheckDoneRef.current = true;
  }, []);

  if (!config || !subdomain) return null;

  const branding = config.branding || {};
  const primary = branding.primary_color || '#2563eb';

  // Only render the Instagram section if the agent actually requires it
  const schema_fields = (config.configuration_schema?.required_fields ?? []) as Array<{
    type: string;
    key: string;
    label?: string;
    required?: boolean;
  }>;
  const instagramField = schema_fields.find((f) => f.type === 'instagram_connect');

  return (
    <div
      className="min-h-screen"
      style={{ background: '#070B14', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="" className="h-8 w-auto" />
            )}
            <span className="font-semibold text-[17px] text-slate-200 tracking-[-0.01em]">
              {branding.brand_name || subdomain}
            </span>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {/* Page title */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${primary}20` }}
          >
            <Settings className="w-5 h-5" style={{ color: primary }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Account Settings</h1>
            <p className="text-sm text-slate-400">Manage your connected accounts and credentials</p>
          </div>
        </div>

        {/* Instagram section */}
        {instagramField ? (
          <div
            className="rounded-2xl p-7"
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <div className="mb-5">
              <h2 className="text-base font-semibold text-slate-100 mb-1">Instagram Account</h2>
              <p className="text-sm text-slate-400">
                Connect or reconnect the Instagram Business account that this agent manages.
                Use this if your token expired or you need to switch accounts.
              </p>
            </div>

            {reconnected && (
              <div className="text-sm text-green-400 bg-green-500/10 rounded-lg p-3 mb-5 border border-green-500/20">
                Instagram account reconnected successfully.
              </div>
            )}

            <InstagramConnectStep
              instagramAppId={config.facebook_app_id || ''}
              subscriptionId={subscriptionId || ''}
              subdomain={subdomain}
              onConnected={handleConnected}
              primaryColor={primary}
            />
          </div>
        ) : (
          <div
            className="rounded-2xl p-7 text-center"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <p className="text-sm text-slate-400">No account settings available for this agent.</p>
          </div>
        )}
      </div>
    </div>
  );
}
