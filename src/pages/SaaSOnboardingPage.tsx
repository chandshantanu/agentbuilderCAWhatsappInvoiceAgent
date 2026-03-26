/**
 * SaaS Onboarding Page.
 * After payment, guides the customer through agent configuration.
 * Premium step-by-step wizard with visual progress and brand-consistent design.
 *
 * Instagram agents: Hardcoded 7-step flow (5 required + 2 optional)
 * CA/WhatsApp agents: Schema-driven flow (backward compatible)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSubscription } from '@/hooks/useSubscription';
import { saasApi } from '@/services/saasApiService';
import { apiClient } from '@/lib/apiClient';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Shield,
  Circle,
  Instagram,
  Store,
  ShoppingBag,
  BookOpen,
  Bot,
  Settings,
  Rocket,
  Mic2,
  Check,
} from 'lucide-react';
import WhatsAppConnectStep from '@/components/WhatsAppConnectStep';
import WhatsAppPhoneSelectStep from '@/components/WhatsAppPhoneSelectStep';
import WhatsAppOTPVerifyStep from '@/components/WhatsAppOTPVerifyStep';
import InstagramConnectStep from '@/components/InstagramConnectStep';
import KnowledgeBaseUploadStep from '@/components/KnowledgeBaseUploadStep';
import BrandConfigStep from '@/components/BrandConfigStep';
import ProductsStep from '@/components/ProductsStep';
import TestAgentStep from '@/components/TestAgentStep';

function detectAgentType(config: any): 'instagram' | 'ca' | 'generic' {
  const name = (config?.branding?.brand_name || '').toLowerCase();
  const tagline = (config?.branding?.tagline || '').toLowerCase();
  const agentId = (config?.agent_id || '').toLowerCase();
  if (name.includes('instagram') || tagline.includes('instagram') || tagline.includes('dm') || agentId.includes('instagram')) return 'instagram';
  if (name.includes('invoice') || name.includes('ca ') || tagline.includes('tally') || tagline.includes('gst')) return 'ca';
  return 'generic';
}

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

/** Instagram-specific wizard steps — hardcoded, not schema-driven */
const INSTAGRAM_STEPS: ConfigField[] = [
  {
    key: 'instagram_connect',
    label: 'Connect Instagram',
    type: 'instagram_connect',
    required: true,
    description: 'Connect your Instagram Business account to enable AI-powered DM responses',
  },
  {
    key: 'brand_config',
    label: 'Your Brand',
    type: 'brand_config',
    required: true,
    description: 'Tell us about your brand so the AI speaks in your voice',
  },
  {
    key: 'personality',
    label: 'Your Voice',
    type: 'personality_step',
    required: false,
    description: 'Train the AI to sound exactly like you — tone, phrases, selling style',
  },
  {
    key: 'products',
    label: 'Add Products',
    type: 'products_step',
    required: true,
    description: 'Add at least 1 product so your AI can recommend and sell',
  },
  {
    key: 'knowledge_base',
    label: 'Knowledge Base',
    type: 'knowledge_base_upload',
    required: true,
    description: 'Add FAQs so your AI can answer customer questions about shipping, returns, etc.',
  },
  {
    key: 'test_agent',
    label: 'Test Your Agent',
    type: 'test_agent',
    required: true,
    description: 'See your AI agent in action with your own products',
  },
  {
    key: 'settings',
    label: 'Settings',
    type: 'settings_group',
    required: false,
    description: 'Optional: Configure follow-up messages and outreach preferences',
  },
  {
    key: 'go_live',
    label: 'Go Live!',
    type: 'go_live',
    required: true,
    description: 'Review your setup and activate your AI sales agent',
  },
];

const STEP_ICONS = [Instagram, Store, Mic2, ShoppingBag, BookOpen, Bot, Settings, Rocket];

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
  const [isInstagramAgent, setIsInstagramAgent] = useState(false);

  // Personality step local state
  const [personalityTone, setPersonalityTone] = useState('');
  const [personalityEmoji, setPersonalityEmoji] = useState('moderate');
  const [personalitySellingStyle, setPersonalitySellingStyle] = useState('');
  const [personalityOpener, setPersonalityOpener] = useState('');
  const [personalityPhrases, setPersonalityPhrases] = useState('');
  const [personalitySaving, setPersonalitySaving] = useState(false);
  const [personalitySaved, setPersonalitySaved] = useState(false);

  // Redirect if already configured
  useEffect(() => {
    if (isConfigured) {
      navigate('/dashboard');
    }
  }, [isConfigured, navigate]);

  // Load configuration schema
  useEffect(() => {
    if (!config || !subdomain) return;

    const agentType = detectAgentType(config);
    setIsInstagramAgent(agentType === 'instagram');

    if (agentType === 'instagram') {
      // Instagram agents use the hardcoded 7-step wizard
      setFields(INSTAGRAM_STEPS);
    } else {
      // CA/WhatsApp/generic agents use schema-driven flow
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
    }
    setLoading(false);
  }, [config, subdomain]);

  // Auto-mark go_live as ready when all required steps are complete
  useEffect(() => {
    if (!isInstagramAgent || fields.length === 0) return;
    const requiredSteps = fields.filter((f) => f.required && f.type !== 'go_live');
    const allDone = requiredSteps.every((f) => !!values[f.key]);
    if (allDone && !values.go_live) {
      setValues((v) => ({ ...v, go_live: 'ready' }));
    }
  }, [values, fields, isInstagramAgent]);

  if (!config || !subdomain) return null;

  const branding = config.branding || {};
  const primary = branding.primary_color || '#2563eb';
  const rgb = hexToRgb(primary);
  const totalSteps = fields.length;
  const currentField = fields[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  /** Check if an Instagram wizard step is complete */
  const isStepComplete = (stepIndex: number): boolean => {
    const field = fields[stepIndex];
    if (!field) return false;
    if (!field.required) return true; // optional steps always "complete"
    return !!values[field.key];
  };

  /** Validate go-live: all required steps must be complete */
  const canGoLive = (): boolean => {
    return fields.every((f, i) => !f.required || !!values[f.key]);
  };

  const handleNext = async () => {
    if (!currentField) return;

    // For custom step types (Instagram flow), the child component handles its own validation
    // and calls onComplete — we just check that values[key] is set
    const customTypes = [
      'instagram_connect', 'brand_config', 'products_step',
      'knowledge_base_upload', 'test_agent',
      'whatsapp_connect', 'whatsapp_phone_select', 'whatsapp_verify',
    ];

    if (customTypes.includes(currentField.type)) {
      if (currentField.required && !values[currentField.key]) {
        const messages: Record<string, string> = {
          instagram_connect: 'Please connect your Instagram Business account to continue',
          brand_config: 'Please complete your brand configuration to continue',
          products_step: 'Please add at least 1 product to continue',
          knowledge_base_upload: 'Please add at least 1 FAQ or template to continue',
          test_agent: 'Please test your agent before going live',
          whatsapp_connect: 'Please connect your WhatsApp Business account to continue',
          whatsapp_phone_select: 'Please select a WhatsApp number to continue',
          whatsapp_verify: 'Please verify your WhatsApp number to continue',
        };
        setError(messages[currentField.type] || `${currentField.label} is required`);
        return;
      }
    } else if (currentField.type === 'go_live') {
      // Go-live step — validate all required steps are done
      if (!canGoLive()) {
        setError('Please complete all required steps before going live');
        return;
      }
    } else if (currentField.type === 'settings_group' || currentField.type === 'personality_step') {
      // Settings and personality are optional — always allow skip
    } else {
      const value = values[currentField.key]?.trim();
      if (currentField.required && !value) {
        setError(`${currentField.label} is required`);
        return;
      }
    }

    setError('');

    // Auto-save current step's values before advancing
    setSaving(true);
    try {
      await saasApi.updateConfig(subdomain, values);
    } catch (err: any) {
      setError(err.message || 'Failed to save progress');
      setSaving(false);
      return;
    }

    if (isLastStep || currentField.type === 'go_live') {
      try {
        await saasApi.completeConfig(subdomain);
        // Poll for pod readiness before redirecting
        const maxWait = 60000;
        const startTime = Date.now();
        while (Date.now() - startTime < maxWait) {
          try {
            const status = await saasApi.getConfigStatus(subdomain);
            if (status?.data?.configured) break;
          } catch {
            // Pod may not be up yet, keep polling
          }
          await new Promise((r) => setTimeout(r, 3000));
        }
        await refetch();
        navigate('/dashboard');
      } catch (err: any) {
        const detail = err?.response?.data?.detail;
        const msg =
          typeof detail === 'object' && detail?.message
            ? detail.message
            : err.message || 'Failed to complete setup';
        setError(msg);
      } finally {
        setSaving(false);
      }
    } else {
      setSaving(false);
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070B14' }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: primary }} />
          <p className="text-sm text-slate-400">Loading setup...</p>
        </div>
      </div>
    );
  }

  if (totalSteps === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#070B14' }}>
        <div className="text-center max-w-sm">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: `rgba(${rgb}, 0.1)` }}
          >
            <CheckCircle2 className="w-8 h-8" style={{ color: primary }} />
          </div>
          <h2 className="text-xl font-semibold text-slate-100 mb-2">
            You're all set!
          </h2>
          <p className="text-sm text-slate-400 mb-6">
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

  /** Render the step content based on field type */
  const renderStepContent = () => {
    if (!currentField) return null;

    switch (currentField.type) {
      case 'instagram_connect':
        return (
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
        );

      case 'brand_config':
        return (
          <BrandConfigStep
            subdomain={subdomain || ''}
            onComplete={(data) =>
              setValues((v) => ({ ...v, [currentField.key]: data }))
            }
            primaryColor={primary}
            initialValues={
              values.brand_config
                ? (() => { try { return JSON.parse(values.brand_config); } catch { return undefined; } })()
                : undefined
            }
          />
        );

      case 'products_step':
        return (
          <ProductsStep
            subdomain={subdomain || ''}
            onComplete={(data) =>
              setValues((v) => ({ ...v, [currentField.key]: data }))
            }
            primaryColor={primary}
          />
        );

      case 'knowledge_base_upload':
        return (
          <KnowledgeBaseUploadStep
            subdomain={subdomain || ''}
            onComplete={(data) =>
              setValues((v) => ({ ...v, [currentField.key]: data }))
            }
            primaryColor={primary}
          />
        );

      case 'test_agent':
        return (
          <TestAgentStep
            subdomain={subdomain || ''}
            onComplete={(data) =>
              setValues((v) => ({ ...v, [currentField.key]: data }))
            }
            primaryColor={primary}
          />
        );

      case 'personality_step': {
        const savePersonality = async () => {
          if (personalitySaving) return;
          setPersonalitySaving(true);
          try {
            const profile = {
              ...(personalityTone && { tone: personalityTone }),
              emoji_usage: personalityEmoji,
              ...(personalitySellingStyle && { selling_style: personalitySellingStyle }),
              ...(personalityOpener && { signature_opener: personalityOpener }),
              signature_phrases: personalityPhrases.split(',').map(s => s.trim()).filter(Boolean),
            };
            await apiClient.put('/api/settings/personality', { personality_profile: profile });
            setPersonalitySaved(true);
            setValues(v => ({ ...v, [currentField.key]: 'saved' }));
          } catch {
            // Non-blocking — still allow advancing
            setValues(v => ({ ...v, [currentField.key]: 'skipped' }));
          } finally {
            setPersonalitySaving(false);
          }
        };

        return (
          <div className="space-y-5">
            <p className="text-sm text-slate-400">
              Help the AI sound exactly like <strong className="text-slate-200">you</strong> — not a generic bot.
              You can always refine this later in Settings.
            </p>

            {/* Tone */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Your Tone</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: 'casual_hinglish', label: '🤙 Casual Hinglish' },
                  { v: 'warm_friendly', label: '🤗 Warm & Friendly' },
                  { v: 'fun_playful', label: '🎉 Fun & Playful' },
                  { v: 'professional', label: '💼 Professional' },
                ].map(({ v, label }) => (
                  <button
                    key={v}
                    onClick={() => setPersonalityTone(t => t === v ? '' : v)}
                    className={`px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${
                      personalityTone === v
                        ? 'border-violet-500/60 bg-violet-500/15 text-violet-200'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Emoji usage */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Emoji Usage</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { v: 'heavy', label: '🔥 Heavy' },
                  { v: 'moderate', label: '✨ Moderate' },
                  { v: 'minimal', label: '🙂 Minimal' },
                  { v: 'none', label: 'None' },
                ].map(({ v, label }) => (
                  <button
                    key={v}
                    onClick={() => setPersonalityEmoji(v)}
                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                      personalityEmoji === v
                        ? 'border-violet-500/60 bg-violet-500/15 text-violet-200'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selling style */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Selling Style</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 'soft_sell', label: '🌱 Soft Sell', desc: 'Relationship first' },
                  { v: 'direct', label: '⚡ Direct', desc: 'Get to the point' },
                  { v: 'consultative', label: '🔍 Consultative', desc: 'Ask & recommend' },
                ].map(({ v, label, desc }) => (
                  <button
                    key={v}
                    onClick={() => setPersonalitySellingStyle(s => s === v ? '' : v)}
                    className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                      personalitySellingStyle === v
                        ? 'border-pink-500/60 bg-pink-500/15 text-pink-200'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="font-medium">{label}</div>
                    <div className="text-xs opacity-60 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Signature opener */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Signature Opener <span className="text-slate-600 normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={personalityOpener}
                onChange={e => setPersonalityOpener(e.target.value)}
                placeholder='e.g. "Heyy! 😊" or "Hi there! ✨"'
                className="w-full px-4 py-2.5 border border-white/10 bg-white/5 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>

            {/* Signature phrases */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Your Signature Words <span className="text-slate-600 normal-case">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={personalityPhrases}
                onChange={e => setPersonalityPhrases(e.target.value)}
                placeholder="yaar, bilkul, bestie, ekdum sahi"
                className="w-full px-4 py-2.5 border border-white/10 bg-white/5 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>

            {/* Save / skip row */}
            {personalitySaved ? (
              <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                <Check className="w-4 h-4" /> Personality saved! Click Next to continue.
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={savePersonality}
                  disabled={personalitySaving}
                  className="flex items-center gap-2 h-10 px-6 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all bg-gradient-to-r from-violet-600 to-pink-600 hover:brightness-110"
                >
                  {personalitySaving
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                    : <><Mic2 className="w-3.5 h-3.5" /> Save My Voice</>}
                </button>
                <button
                  onClick={() => setValues(v => ({ ...v, [currentField.key]: 'skipped' }))}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            )}
          </div>
        );
      }

      case 'settings_group':
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              These settings are optional. Your agent will use sensible defaults.
              You can always change them later from the dashboard.
            </p>
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <p className="text-sm text-slate-200">Auto follow-up messages</p>
                  <p className="text-xs text-slate-500">Send reminders on Day 3 and Day 7</p>
                </div>
                <div className="text-xs text-green-400 font-medium">On by default</div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <p className="text-sm text-slate-200">Smart lead scoring</p>
                  <p className="text-xs text-slate-500">Rank leads by purchase intent</p>
                </div>
                <div className="text-xs text-green-400 font-medium">On by default</div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <p className="text-sm text-slate-200">Proactive outreach</p>
                  <p className="text-xs text-slate-500">Re-engage past visitors</p>
                </div>
                <div className="text-xs text-slate-500 font-medium">Off by default</div>
              </div>
            </div>
            {/* Mark as complete so Next works */}
            {!values[currentField.key] && (
              <button
                onClick={() => setValues((v) => ({ ...v, [currentField.key]: 'defaults_accepted' }))}
                className="text-sm font-medium mt-2"
                style={{ color: primary }}
              >
                Accept defaults and continue
              </button>
            )}
          </div>
        );

      case 'go_live': {
        const requiredSteps = fields.filter((f) => f.required && f.type !== 'go_live');
        const completedSteps = requiredSteps.filter((f) => !!values[f.key]);
        const allDone = completedSteps.length === requiredSteps.length;

        return (
          <div className="space-y-4">
            <div className="space-y-2">
              {requiredSteps.map((step, i) => {
                const done = !!values[step.key];
                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      done ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-red-400 shrink-0" />
                    )}
                    <span className={`text-sm ${done ? 'text-slate-200' : 'text-red-400'}`}>
                      {step.label}
                    </span>
                    {!done && (
                      <button
                        onClick={() => {
                          const stepIndex = fields.findIndex((f) => f.key === step.key);
                          if (stepIndex >= 0) setCurrentStep(stepIndex);
                        }}
                        className="ml-auto text-xs font-medium"
                        style={{ color: primary }}
                      >
                        Complete
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {allDone ? (
              <div className="text-center py-4">
                <Rocket className="w-10 h-10 mx-auto mb-3" style={{ color: primary }} />
                <p className="text-lg font-semibold text-slate-100">Your agent is ready!</p>
                <p className="text-sm text-slate-400 mt-1">
                  Click "Go Live" to activate your AI sales agent.
                </p>
              </div>
            ) : (
              <p className="text-sm text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/20">
                Complete all required steps above before going live.
              </p>
            )}
          </div>
        );
      }

      // WhatsApp step types (backward compatible)
      case 'whatsapp_verify':
        return (
          <WhatsAppOTPVerifyStep
            subdomain={subdomain || ''}
            onVerified={(data) =>
              setValues((v) => ({
                ...v,
                [currentField.key]: data.display_phone_number,
                whatsapp_phone_number: data.display_phone_number,
                whatsapp_verified_name: data.verified_name,
                ...(data.phone_number_id ? { whatsapp_phone_number_id: data.phone_number_id } : {}),
              }))
            }
            primaryColor={primary}
          />
        );

      case 'whatsapp_phone_select':
        return (
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
        );

      case 'whatsapp_connect':
        return (
          <WhatsAppConnectStep
            facebookAppId={config.facebook_app_id || ''}
            subscriptionId={subscriptionId || ''}
            subdomain={subdomain || ''}
            onConnected={(data) =>
              setValues((v) => ({ ...v, [currentField.key]: JSON.stringify(data) }))
            }
            primaryColor={primary}
          />
        );

      case 'toggle':
        return (
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
              className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
              style={values[currentField.key] === 'true' ? { backgroundColor: primary } : {}}
            />
            <span className="ms-3 text-sm font-medium text-slate-300">
              {values[currentField.key] === 'true' ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        );

      case 'select':
        return (
          <select
            value={values[currentField.key] || ''}
            onChange={(e) =>
              setValues((v) => ({ ...v, [currentField.key]: e.target.value }))
            }
            className="w-full px-4 py-3 border border-white/10 rounded-xl text-sm text-slate-200 bg-white/5 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
            style={{ '--tw-ring-color': `rgba(${rgb}, 0.4)` } as any}
          >
            <option value="">Select...</option>
            {currentField.options?.map((opt: any) => {
              const val = typeof opt === 'string' ? opt : opt.value;
              const label = typeof opt === 'string' ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt.label;
              return (
                <option key={val} value={val}>{label}</option>
              );
            })}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            value={values[currentField.key] || ''}
            onChange={(e) =>
              setValues((v) => ({ ...v, [currentField.key]: e.target.value }))
            }
            placeholder={currentField.placeholder}
            rows={4}
            className="w-full px-4 py-3 border border-white/10 rounded-xl text-sm text-slate-200 bg-white/5 focus:outline-none focus:ring-2 focus:border-transparent resize-none transition-shadow"
            style={{ '--tw-ring-color': `rgba(${rgb}, 0.4)` } as any}
          />
        );

      default:
        return (
          <input
            type={currentField.type || 'text'}
            value={values[currentField.key] || ''}
            onChange={(e) =>
              setValues((v) => ({ ...v, [currentField.key]: e.target.value }))
            }
            placeholder={currentField.placeholder}
            className="w-full px-4 py-3 border border-white/10 rounded-xl text-sm text-slate-200 bg-white/5 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
            style={{ '--tw-ring-color': `rgba(${rgb}, 0.4)` } as any}
          />
        );
    }
  };

  // Get step icon for Instagram wizard
  const StepIcon = isInstagramAgent && STEP_ICONS[currentStep] ? STEP_ICONS[currentStep] : Sparkles;

  return (
    <div className="min-h-screen" style={{ background: '#070B14', fontFamily: "'Inter', system-ui, sans-serif" }}>
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
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5" />
            Secure setup
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {/* Step indicators */}
        <div className="mb-8">
          <div className="flex items-center gap-1 sm:gap-2 mb-4 overflow-x-auto">
            {fields.map((field, i) => (
              <div key={i} className="flex items-center gap-1 sm:gap-2">
                {i > 0 && (
                  <div
                    className="h-px w-4 sm:w-8 transition-colors duration-300 shrink-0"
                    style={{
                      backgroundColor: i <= currentStep ? primary : 'rgba(255,255,255,0.15)',
                    }}
                  />
                )}
                <button
                  onClick={() => {
                    // Allow jumping back to completed steps
                    if (i < currentStep) setCurrentStep(i);
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 shrink-0"
                  style={
                    i < currentStep
                      ? { backgroundColor: primary, color: 'white', cursor: 'pointer' }
                      : i === currentStep
                        ? {
                            backgroundColor: `rgba(${rgb}, 0.1)`,
                            color: primary,
                            border: `2px solid ${primary}`,
                          }
                        : { backgroundColor: 'rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'default' }
                  }
                >
                  {i < currentStep ? (
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    i + 1
                  )}
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Step {currentStep + 1} of {totalSteps}{isInstagramAgent && currentField?.required === false ? ' (optional)' : ''}
            </span>
            <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}% complete</span>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-2">
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
          className="rounded-2xl p-7 sm:p-8"
          style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        >
          {/* Step header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ backgroundColor: `rgba(${rgb}, 0.08)` }}
              >
                <StepIcon className="w-3.5 h-3.5" style={{ color: primary }} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: primary }}>
                Step {currentStep + 1}{currentField?.required === false ? ' · Optional' : ''}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-slate-100">
              {currentField?.label}
            </h2>
            {currentField?.description && (
              <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                {currentField.description}
              </p>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3 mb-5 border border-red-500/20">
              {error}
            </div>
          )}

          {/* Field input */}
          <div className="mb-6">
            {renderStepContent()}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex-1 h-11 rounded-xl text-sm font-medium text-slate-300 border border-white/10 hover:bg-white/10 flex items-center justify-center gap-2 transition-colors"
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
                  <Loader2 className="w-4 h-4 animate-spin" /> {currentField?.type === 'go_live' ? 'Activating...' : 'Saving...'}
                </>
              ) : currentField?.type === 'go_live' ? (
                <>
                  Go Live! <Rocket className="w-4 h-4" />
                </>
              ) : currentField?.required === false ? (
                <>
                  {values[currentField?.key] ? 'Continue' : 'Skip'} <ArrowRight className="w-4 h-4" />
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
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Coming next
            </p>
            {fields.slice(currentStep + 1, currentStep + 3).map((field, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm text-slate-400 bg-white/5 rounded-lg px-4 py-2.5 border border-white/10"
              >
                <Circle className="w-3.5 h-3.5 shrink-0" />
                <span>{field.label}</span>
                {!field.required && (
                  <span className="ml-auto text-xs text-slate-600">Optional</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
