/**
 * OnboardingFlow — shown in direct-mode when the agent is not yet configured.
 *
 * Guided wizard with:
 * - Welcome screen explaining what the agent does
 * - Step-by-step configuration with contextual help
 * - Proper handling of instagram_connect type (OAuth popup)
 * - Completion/success screen with clear next steps
 */

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useConfig } from '@/config/ConfigProvider';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Shield,
  MessageCircle,
  Zap,
  TrendingUp,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import InstagramConnectStep from '@/components/InstagramConnectStep';

interface ConfigField {
  key: string;
  label: string;
  sensitive?: boolean;
  setup_type?: string;
  type?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
}

// ── Contextual help copy for known field types ──────────────────────────────

const FIELD_HELP: Record<string, { icon: string; tip: string }> = {
  instagram_connect: {
    icon: '📱',
    tip: 'A popup will open and ask you to log in with your Instagram username and password. No Facebook Page is required.',
  },
  instagram_access_token: {
    icon: '🔑',
    tip: 'Your Instagram long-lived access token. You can obtain this from your Meta App dashboard under "Instagram > Access Tokens".',
  },
  instagram_app_id: {
    icon: '🔑',
    tip: 'Your Meta App ID from developers.facebook.com. Found in your app\'s settings overview.',
  },
  instagram_app_secret: {
    icon: '🔐',
    tip: 'Your Meta App Secret. Keep this private — never share it publicly.',
  },
  system_prompt: {
    icon: '🤖',
    tip: 'This is your agent\'s personality and instructions. Be specific about your brand voice and what the agent should and should not do.',
  },
};

function getFieldHelp(field: ConfigField) {
  const byKey = FIELD_HELP[field.key];
  if (byKey) return byKey;
  if (field.setup_type === 'oauth') return { icon: '🔗', tip: 'This requires connecting to an external service via OAuth.' };
  if (field.type === 'instagram_connect') return FIELD_HELP.instagram_connect;
  return null;
}

// ── Instagram Connect (inline OAuth popup) ─────────────────────────────────

function InstagramFieldWrapper({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: string;
  onChange: (v: string) => void;
}) {
  // Read instagramAppId from URL subdomain-derived config or env
  const instagramAppId = (window as any).__AGENT_CONFIG__?.facebook_app_id || '';
  const subscriptionId = window.location.hostname.split('.')[0] || 'local';
  const subdomain = window.location.hostname;

  return (
    <InstagramConnectStep
      instagramAppId={instagramAppId}
      subscriptionId={subscriptionId}
      subdomain={subdomain}
      onConnected={(data) =>
        onChange(
          JSON.stringify({
            instagram_username: data.instagram_username,
            instagram_user_id: data.instagram_user_id,
          }),
        )
      }
    />
  );
}

// ── Welcome Screen ─────────────────────────────────────────────────────────

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-6">
      <div className="w-full max-w-lg">
        {/* Logo / header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Set up your AI Sales Agent
          </h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Your Instagram DM agent will automatically respond to leads,<br />
            qualify prospects, and drive conversions — 24/7.
          </p>
        </div>

        {/* What you'll get */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            What your agent does
          </p>
          {[
            { icon: MessageCircle, text: 'Instantly replies to every DM — no lead goes cold' },
            { icon: TrendingUp, text: 'Qualifies leads and tracks buyer intent automatically' },
            { icon: Zap, text: 'Schedules follow-ups and re-engages cold conversations' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-pink-600" />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {/* Setup takes ~2 mins */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-6 justify-center">
          <Shield className="w-3.5 h-3.5" />
          Setup takes about 2 minutes · Your credentials are encrypted
        </div>

        <button
          onClick={onStart}
          className="w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 transition-opacity shadow-md"
        >
          Get Started <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Success Screen ─────────────────────────────────────────────────────────

function SuccessScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-6">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Your agent is live! 🎉
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Your Instagram AI Sales Agent is now active. It will automatically
          respond to DMs, qualify leads, and schedule follow-ups.
        </p>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left space-y-3 mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            What happens next
          </p>
          {[
            'New DMs will be handled instantly by the agent',
            'Check the Conversations tab to see leads and agent reasoning',
            'The agent will send follow-ups to cold leads automatically',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-sm text-gray-700">{step}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 animate-pulse">
          Redirecting to your dashboard...
        </p>
      </div>
    </div>
  );
}

// ── Main Wizard ────────────────────────────────────────────────────────────

export default function OnboardingFlow() {
  const { configStatus, refetch } = useConfig();

  const [screen, setScreen] = useState<'welcome' | 'steps' | 'success'>('welcome');
  const [schema, setSchema] = useState<ConfigField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get('/config/schema')
      .then((resp) => {
        const fields = resp.data?.configuration_schema?.required_fields || [];
        setSchema(fields);
      })
      .catch((err) => console.error('Failed to load schema:', err));
  }, []);

  const missingFields: ConfigField[] = configStatus?.missing_fields?.length
    ? configStatus.missing_fields
    : schema;

  const field = missingFields[currentStep];
  const totalSteps = missingFields.length;
  const isLastStep = currentStep === totalSteps - 1;

  const isFieldComplete = useCallback(
    (f: ConfigField) => {
      if (!f) return false;
      const v = values[f.key];
      return !!v && v.trim() !== '';
    },
    [values],
  );

  const handleNext = async () => {
    if (!field) return;

    const isOAuth =
      field.type === 'instagram_connect' ||
      field.setup_type === 'oauth';

    if (isOAuth) {
      if (!values[field.key]) {
        setError('Please complete this step before continuing.');
        return;
      }
    } else {
      const value = values[field.key]?.trim();
      if (!value && field.required !== false) {
        setError(`${field.label} is required`);
        return;
      }
    }

    setError(null);

    if (isLastStep) {
      setSubmitting(true);
      try {
        // Save all values at once
        await apiClient.post('/config/update', values);
        await apiClient.post('/config/complete');
        setScreen('success');
        // Let success screen show briefly then refetch
        setTimeout(async () => {
          await refetch();
        }, 2000);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Failed to save configuration');
      } finally {
        setSubmitting(false);
      }
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleSaveAndNext = async () => {
    if (!field) return;
    const value = values[field.key];
    if (value) {
      // Save individual field eagerly (optional — non-blocking)
      apiClient
        .post('/config/update', { [field.key]: value })
        .catch(() => {}); // non-blocking
    }
    await handleNext();
  };

  // ── Screens ──

  if (screen === 'welcome') {
    return <WelcomeScreen onStart={() => setScreen('steps')} />;
  }

  if (screen === 'success') {
    return <SuccessScreen />;
  }

  if (totalSteps === 0 || !field) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const help = getFieldHelp(field);
  const isInstagramConnect =
    field.type === 'instagram_connect' || field.key === 'instagram_connect';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-6 flex items-start justify-center">
      <div className="w-full max-w-md mt-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-700">Agent Setup</span>
          <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Encrypted
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Step {currentStep + 1} of {totalSteps}</span>
            <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}% complete</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
          {/* Step dots */}
          <div className="flex gap-1.5 mt-3">
            {missingFields.map((f, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  i < currentStep
                    ? 'bg-purple-500'
                    : i === currentStep
                      ? 'bg-pink-500'
                      : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
          {/* Step label */}
          <p className="text-xs font-semibold uppercase tracking-wider text-pink-500 mb-1.5">
            Step {currentStep + 1}
          </p>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {field.label}
          </h2>
          {field.description && (
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              {field.description}
            </p>
          )}

          {/* Contextual help */}
          {help && (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5">
              <span className="text-lg leading-none">{help.icon}</span>
              <p className="text-xs text-blue-700 leading-relaxed">{help.tip}</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Field input */}
          <div className="mb-6">
            {isInstagramConnect ? (
              <InstagramFieldWrapper
                field={field}
                value={values[field.key] || ''}
                onChange={(v) => {
                  setValues((prev) => ({ ...prev, [field.key]: v }));
                  setError(null);
                }}
              />
            ) : (
              <input
                type={field.sensitive ? 'password' : 'text'}
                value={values[field.key] || ''}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, [field.key]: e.target.value }));
                  setError(null);
                }}
                placeholder={field.placeholder || `Enter ${field.label}...`}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-shadow"
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={() => {
                  setCurrentStep((s) => Math.max(0, s - 1));
                  setError(null);
                }}
                className="h-11 px-4 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            <button
              onClick={handleSaveAndNext}
              disabled={submitting}
              className="flex-1 h-11 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : isLastStep ? (
                <>
                  Complete Setup <CheckCircle2 className="w-4 h-4" />
                </>
              ) : (
                <>
                  Continue <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Coming next */}
        {currentStep < totalSteps - 1 && (
          <div className="mt-5 space-y-2">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider px-1">
              Coming next
            </p>
            {missingFields.slice(currentStep + 1, currentStep + 3).map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm text-gray-400 bg-white/70 rounded-xl px-4 py-2.5 border border-gray-100"
              >
                <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-[10px] text-gray-400">
                  {currentStep + i + 2}
                </div>
                <span>{f.label}</span>
                {isFieldComplete(f) && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
