/**
 * SaaS Onboarding Page.
 * After payment, guides the CA through agent configuration.
 * Premium step-by-step wizard with visual progress and brand-consistent design.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSubscription } from '@/hooks/useSubscription';
import { saasApi } from '@/services/saasApiService';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Shield,
  Circle,
} from 'lucide-react';
import WhatsAppConnectStep from '@/components/WhatsAppConnectStep';
import WhatsAppPhoneSelectStep from '@/components/WhatsAppPhoneSelectStep';
import WhatsAppOTPVerifyStep from '@/components/WhatsAppOTPVerifyStep';
import InstagramConnectStep from '@/components/InstagramConnectStep';
import KnowledgeBaseUploadStep from '@/components/KnowledgeBaseUploadStep';

interface ConfigField {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  required?: boolean;
  description?: string;
  options?: Array<{ label: string; value: string }>;
  default?: string | boolean | number;
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function lightenColor(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) + Math.round(255 * amount));
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) + Math.round(255 * amount));
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) + Math.round(255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default function SaaSOnboardingPage() {
  const { config, subdomain } = useSaaS();
  const { isConfigured, subscriptionId, refetch } = useSubscription();
  const navigate = useNavigate();

  const [fields, setFields] = useState<ConfigField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already configured
  useEffect(() => {
    if (isConfigured) {
      navigate('/dashboard');
    }
  }, [isConfigured, navigate]);

  // Load configuration schema
  useEffect(() => {
    if (!config || !subdomain) return;

    const schema = config.configuration_schema;
    if (schema?.required_fields) {
      setFields(schema.required_fields);
      const defaults: Record<string, string> = {};
      for (const field of schema.required_fields) {
        if (field.default !== undefined && field.default !== null) {
          defaults[field.key] = String(field.default);
        }
      }
      if (Object.keys(defaults).length > 0) {
        setValues((prev) => ({ ...defaults, ...prev }));
      }
    } else {
      setFields([
        {
          key: 'whatsapp_business_name',
          label: 'Business Name',
          type: 'text',
          placeholder: 'e.g. Sharma Tax Consultants',
          required: true,
          description: 'Your business name as it appears to clients',
        },
        {
          key: 'whatsapp_phone',
          label: 'WhatsApp Business Number',
          type: 'text',
          placeholder: '+91 9876543210',
          required: true,
          description: 'The phone number connected to WhatsApp Business',
        },
      ]);
    }
    setLoading(false);
  }, [config, subdomain]);

  if (!config || !subdomain) return null;

  const branding = config.branding || {};
  const primary = branding.primary_color || '#2563eb';
  const rgb = hexToRgb(primary);
  const totalSteps = fields.length;
  const currentField = fields[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  const handleNext = async () => {
    if (!currentField) return;

    if (
      currentField.type === 'whatsapp_connect' ||
      currentField.type === 'whatsapp_phone_select' ||
      currentField.type === 'whatsapp_verify' ||
      currentField.type === 'instagram_connect' ||
      currentField.type === 'knowledge_base_upload'
    ) {
      if (currentField.required && !values[currentField.key]) {
        setError(
          currentField.type === 'instagram_connect'
            ? 'Please connect your Instagram Business account to continue'
            : currentField.type === 'whatsapp_verify'
              ? 'Please verify your WhatsApp number to continue'
              : currentField.type === 'whatsapp_phone_select'
                ? 'Please select a WhatsApp number to continue'
                : 'Please connect your WhatsApp Business account to continue'
        );
        return;
      }
    } else {
      const value = values[currentField.key]?.trim();
      if (currentField.required && !value) {
        setError(`${currentField.label} is required`);
        return;
      }
    }

    setError('');

    if (isLastStep) {
      setSaving(true);
      try {
        await saasApi.updateConfig(subdomain, values);
        await saasApi.completeConfig(subdomain);
        await refetch();
        navigate('/dashboard');
      } catch (err: any) {
        setError(err.message || 'Failed to save configuration');
      } finally {
        setSaving(false);
      }
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setError('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: primary }} />
          <p className="text-sm text-gray-500">Loading setup...</p>
        </div>
      </div>
    );
  }

  if (totalSteps === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: `rgba(${rgb}, 0.1)` }}
          >
            <CheckCircle2 className="w-8 h-8" style={{ color: primary }} />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            You're all set!
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Your agent is ready to use. Head to the dashboard to get started.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="h-11 px-8 rounded-xl text-white font-medium text-sm transition-all hover:brightness-110"
            style={{
              background: `linear-gradient(135deg, ${primary}, ${lightenColor(primary, 0.12)})`,
              boxShadow: `0 4px 16px rgba(${rgb}, 0.3)`,
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200/60">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="" className="h-8 w-auto" />
            )}
            <span className="font-semibold text-[17px] text-gray-900 tracking-[-0.01em]">
              {branding.brand_name || subdomain}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5" />
            Secure setup
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {/* Step indicators */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            {fields.map((field, i) => (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && (
                  <div
                    className="h-px w-6 sm:w-10 transition-colors duration-300"
                    style={{
                      backgroundColor: i <= currentStep ? primary : '#e5e7eb',
                    }}
                  />
                )}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 shrink-0"
                  style={
                    i < currentStep
                      ? { backgroundColor: primary, color: 'white' }
                      : i === currentStep
                        ? {
                            backgroundColor: `rgba(${rgb}, 0.1)`,
                            color: primary,
                            border: `2px solid ${primary}`,
                          }
                        : { backgroundColor: '#f3f4f6', color: '#9ca3af' }
                  }
                >
                  {i < currentStep ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    i + 1
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}% complete</span>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden mt-2">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((currentStep + 1) / totalSteps) * 100}%`,
                backgroundColor: primary,
              }}
            />
          </div>
        </div>

        {/* Step content card */}
        <div
          className="bg-white rounded-2xl p-7 sm:p-8"
          style={{
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)',
          }}
        >
          {/* Step header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ backgroundColor: `rgba(${rgb}, 0.08)` }}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: primary }} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: primary }}>
                Step {currentStep + 1}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {currentField.label}
            </h2>
            {currentField.description && (
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                {currentField.description}
              </p>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-5 border border-red-100">
              {error}
            </div>
          )}

          {/* Field input */}
          <div className="mb-6">
            {currentField.type === 'knowledge_base_upload' ? (
              <KnowledgeBaseUploadStep
                subdomain={subdomain || ''}
                onComplete={(data) =>
                  setValues((v) => ({ ...v, [currentField.key]: data }))
                }
                primaryColor={primary}
              />
            ) : currentField.type === 'instagram_connect' ? (
              <InstagramConnectStep
                instagramAppId={config.facebook_app_id || ''}
                subscriptionId={subscriptionId || ''}
                subdomain={subdomain || ''}
                onConnected={(data) =>
                  setValues((v) => ({
                    ...v,
                    [currentField.key]: JSON.stringify(data),
                    instagram_username: data.instagram_username,
                    instagram_user_id: data.instagram_user_id,
                  }))
                }
                primaryColor={primary}
              />
            ) : currentField.type === 'whatsapp_verify' ? (
              <WhatsAppOTPVerifyStep
                subdomain={subdomain || ''}
                onVerified={(data) =>
                  setValues((v) => ({
                    ...v,
                    [currentField.key]: data.display_phone_number,
                    whatsapp_phone_number: data.display_phone_number,
                    whatsapp_verified_name: data.verified_name,
                    ...(data.phone_number_id
                      ? { whatsapp_phone_number_id: data.phone_number_id }
                      : {}),
                  }))
                }
                primaryColor={primary}
              />
            ) : currentField.type === 'whatsapp_phone_select' ? (
              <WhatsAppPhoneSelectStep
                subdomain={subdomain || ''}
                onSelected={(data) =>
                  setValues((v) => ({
                    ...v,
                    [currentField.key]: data.phone_number_id,
                    whatsapp_phone_number_id: data.phone_number_id,
                    whatsapp_phone_number: data.display_phone_number,
                    whatsapp_verified_name: data.verified_name,
                  }))
                }
                primaryColor={primary}
              />
            ) : currentField.type === 'whatsapp_connect' ? (
              <WhatsAppConnectStep
                facebookAppId={config.facebook_app_id || ''}
                subscriptionId={subscriptionId || ''}
                subdomain={subdomain || ''}
                onConnected={(data) =>
                  setValues((v) => ({ ...v, [currentField.key]: JSON.stringify(data) }))
                }
                primaryColor={primary}
              />
            ) : currentField.type === 'toggle' ? (
              <label className="relative inline-flex items-center cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={values[currentField.key] === 'true'}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [currentField.key]: e.target.checked ? 'true' : 'false' }))
                  }
                  className="sr-only peer"
                />
                <div
                  className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                  style={values[currentField.key] === 'true' ? { backgroundColor: primary } : {}}
                />
                <span className="ms-3 text-sm font-medium text-gray-700">
                  {values[currentField.key] === 'true' ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            ) : currentField.type === 'select' && currentField.options ? (
              <select
                value={values[currentField.key] || ''}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [currentField.key]: e.target.value }))
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white transition-shadow"
                style={{ '--tw-ring-color': `rgba(${rgb}, 0.4)` } as any}
              >
                <option value="">Select...</option>
                {currentField.options.map((opt: any) => {
                  const val = typeof opt === 'string' ? opt : opt.value;
                  const label = typeof opt === 'string' ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt.label;
                  return (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  );
                })}
              </select>
            ) : currentField.type === 'textarea' ? (
              <textarea
                value={values[currentField.key] || ''}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [currentField.key]: e.target.value }))
                }
                placeholder={currentField.placeholder}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none transition-shadow"
                style={{ '--tw-ring-color': `rgba(${rgb}, 0.4)` } as any}
              />
            ) : (
              <input
                type={currentField.type || 'text'}
                value={values[currentField.key] || ''}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [currentField.key]: e.target.value }))
                }
                placeholder={currentField.placeholder}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
                style={{ '--tw-ring-color': `rgba(${rgb}, 0.4)` } as any}
              />
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex-1 h-11 rounded-xl text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={saving}
              className="flex-1 h-11 rounded-xl text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-300 hover:brightness-105 hover:shadow-md active:scale-[0.99]"
              style={{
                background: `linear-gradient(135deg, ${primary}, ${lightenColor(primary, 0.12)})`,
                boxShadow: `0 2px 8px rgba(${rgb}, 0.25)`,
              }}
            >
              {saving ? (
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

        {/* Upcoming steps preview */}
        {currentStep < totalSteps - 1 && (
          <div className="mt-6 space-y-2">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              Coming next
            </p>
            {fields.slice(currentStep + 1, currentStep + 3).map((field, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm text-gray-400 bg-white/60 rounded-lg px-4 py-2.5 border border-gray-100"
              >
                <Circle className="w-3.5 h-3.5 shrink-0" />
                <span>{field.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
