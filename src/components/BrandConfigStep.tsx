/**
 * Brand Configuration step for SaaS onboarding wizard.
 *
 * Collects brand identity from the customer:
 * - Brand name (required, validated against demo names)
 * - Primary language (English, Hindi, Hinglish)
 * - Business vertical (dropdown)
 * - Brand voice (radio: Friendly, Professional, Casual)
 */

import { useState } from 'react';
import {
  Store,
  Globe,
  Briefcase,
  MessageCircle,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { saasApi } from '@/services/saasApiService';

interface BrandConfigStepProps {
  subdomain: string;
  onComplete: (data: string) => void;
  primaryColor: string;
  initialValues?: {
    brand_name?: string;
    primary_language?: string;
    business_vertical?: string;
    brand_voice?: string;
  };
}

const DEMO_NAMES = new Set([
  'our store',
  'chatslytics demo store',
  'demo store',
  'your brand',
  'agent dashboard',
]);

const LANGUAGES = [
  { value: 'hinglish', label: 'Hinglish' },
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi' },
];

const VERTICALS = [
  'Fashion & Clothing',
  'Jewelry & Accessories',
  'Beauty & Skincare',
  'Home Decor',
  'Food & Beverages',
  'Health & Wellness',
  'Services',
  'Coaching & Education',
  'Other',
];

const VOICE_OPTIONS = [
  { value: 'friendly', label: 'Friendly', description: 'Warm, approachable, uses emojis' },
  { value: 'professional', label: 'Professional', description: 'Polished, formal, business-like' },
  { value: 'casual', label: 'Casual', description: 'Relaxed, conversational, like a friend' },
];

export default function BrandConfigStep({
  subdomain,
  onComplete,
  primaryColor,
  initialValues,
}: BrandConfigStepProps) {
  const [brandName, setBrandName] = useState(initialValues?.brand_name ?? '');
  const [language, setLanguage] = useState(initialValues?.primary_language ?? 'hinglish');
  const [vertical, setVertical] = useState(initialValues?.business_vertical ?? '');
  const [voice, setVoice] = useState(initialValues?.brand_voice ?? 'friendly');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = brandName.trim();
  const isDemoName = DEMO_NAMES.has(trimmedName.toLowerCase());

  const validate = (): string | null => {
    if (!trimmedName) return 'Brand name is required.';
    if (isDemoName) return 'Please enter your actual brand name, not a placeholder.';
    if (!vertical) return 'Please select a business vertical.';
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSaving(true);

    const config = {
      brand_name: trimmedName,
      primary_language: language,
      business_vertical: vertical,
      brand_voice: voice,
    };

    try {
      await saasApi.updateConfig(subdomain, config);
      setSaved(true);
      onComplete(JSON.stringify(config));
    } catch (err: any) {
      setError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <p className="font-medium text-slate-200">Brand configured!</p>
        <p className="text-sm text-slate-400 mt-1">
          Your AI agent will now respond as <span className="font-semibold text-slate-200">{trimmedName}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Brand Name */}
      <div>
        <label className="text-sm font-medium text-slate-200 mb-1.5 flex items-center gap-1.5">
          <Store className="w-4 h-4" /> Brand Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={brandName}
          onChange={(e) => {
            setBrandName(e.target.value);
            if (error) setError(null);
          }}
          placeholder="e.g., Priya's Boutique"
          className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
          style={{ focusRingColor: primaryColor } as React.CSSProperties}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = primaryColor;
            e.currentTarget.style.boxShadow = `0 0 0 2px ${primaryColor}40`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        {isDemoName && brandName.length > 0 && (
          <p className="mt-1 text-xs text-red-400">Please enter your actual brand name.</p>
        )}
      </div>

      {/* Primary Language */}
      <div>
        <label className="text-sm font-medium text-slate-200 mb-1.5 flex items-center gap-1.5">
          <Globe className="w-4 h-4" /> Primary Language <span className="text-red-400">*</span>
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-slate-200 text-sm focus:outline-none appearance-none"
          style={{ backgroundImage: 'none' }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = primaryColor;
            e.currentTarget.style.boxShadow = `0 0 0 2px ${primaryColor}40`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value} className="bg-[#070B14] text-slate-200">
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Business Vertical */}
      <div>
        <label className="text-sm font-medium text-slate-200 mb-1.5 flex items-center gap-1.5">
          <Briefcase className="w-4 h-4" /> Business Vertical <span className="text-red-400">*</span>
        </label>
        <select
          value={vertical}
          onChange={(e) => {
            setVertical(e.target.value);
            if (error) setError(null);
          }}
          className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-slate-200 text-sm focus:outline-none appearance-none"
          onFocus={(e) => {
            e.currentTarget.style.borderColor = primaryColor;
            e.currentTarget.style.boxShadow = `0 0 0 2px ${primaryColor}40`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <option value="" className="bg-[#070B14] text-slate-500">Select your industry...</option>
          {VERTICALS.map((v) => (
            <option key={v} value={v} className="bg-[#070B14] text-slate-200">
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* Brand Voice */}
      <div>
        <label className="text-sm font-medium text-slate-200 mb-1.5 flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4" /> Brand Voice <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {VOICE_OPTIONS.map((opt) => {
            const isSelected = voice === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVoice(opt.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  isSelected
                    ? 'bg-white/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/[0.07]'
                }`}
                style={isSelected ? { borderColor: primaryColor } : undefined}
              >
                <p className="text-sm font-medium text-slate-200">{opt.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{opt.description}</p>
                {isSelected && (
                  <CheckCircle2
                    className="w-4 h-4 mt-1.5"
                    style={{ color: primaryColor }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2.5 border border-red-500/20">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
        style={{ backgroundColor: primaryColor }}
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Saving...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4" /> Save Brand Config
          </>
        )}
      </button>
    </div>
  );
}
