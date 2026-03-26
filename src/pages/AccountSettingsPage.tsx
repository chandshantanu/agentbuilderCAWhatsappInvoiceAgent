/**
 * AccountSettingsPage — Full account management.
 *
 * Sections:
 * 1. Profile (name, email display)
 * 2. Password change
 * 3. Instagram connection (if applicable)
 * 4. Subscription info (plan, trial end, status)
 * 5. Danger zone (delete account)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaaS } from '@/contexts/SaaSContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useSupabaseAuth } from '@/auth/SupabaseAuthContext';
import { saasApi } from '@/services/saasApiService';
import { apiClient } from '@/lib/apiClient';
import {
  ArrowLeft,
  Settings,
  User,
  Lock,
  CreditCard,
  AlertTriangle,
  Check,
  Loader2,
  Mic2,
  Smile,
  Target,
  DollarSign,
  MessageCircle,
  Save,
} from 'lucide-react';
import InstagramConnectStep from '@/components/InstagramConnectStep';

interface PersonalityProfile {
  tone?: string;
  emoji_usage?: string;
  selling_style?: string;
  price_handling?: string;
  signature_opener?: string;
  signature_closer?: string;
  signature_phrases?: string[];
  negotiation_style?: string;
  no_go_topics?: string[];
  min_price?: number;
  vocabulary_samples?: string;
}

export default function AccountSettingsPage() {
  const { config, subdomain } = useSaaS();
  const { subscriptionId, status, isConfigured } = useSubscription();
  const { user, updatePassword } = useSupabaseAuth();
  const navigate = useNavigate();

  // Personality profile
  const [personality, setPersonality] = useState<PersonalityProfile>({});
  const [personalityLoading, setPersonalityLoading] = useState(true);
  const [personalitySaving, setPersonalitySaving] = useState(false);
  const [personalitySuccess, setPersonalitySuccess] = useState('');
  const [personalityError, setPersonalityError] = useState('');
  const [signaturePhraseInput, setSignaturePhraseInput] = useState('');
  const [noGoTopicInput, setNoGoTopicInput] = useState('');

  // Instagram reconnect
  const [reconnected, setReconnected] = useState(false);
  const initialCheckDoneRef = useRef(false);
  const handleConnected = useCallback(() => {
    if (initialCheckDoneRef.current) setReconnected(true);
    initialCheckDoneRef.current = true;
  }, []);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Load personality profile from agent-runtime
  useEffect(() => {
    apiClient.get('/api/settings/personality')
      .then((resp: any) => {
        const p = resp.data?.personality_profile || {};
        setPersonality(p);
        setSignaturePhraseInput((p.signature_phrases || []).join(', '));
        setNoGoTopicInput((p.no_go_topics || []).join(', '));
      })
      .catch(() => {})
      .finally(() => setPersonalityLoading(false));
  }, []);

  const handleSavePersonality = async () => {
    setPersonalitySaving(true);
    setPersonalitySuccess('');
    setPersonalityError('');
    try {
      const payload = {
        ...personality,
        signature_phrases: signaturePhraseInput
          .split(',').map(s => s.trim()).filter(Boolean),
        no_go_topics: noGoTopicInput
          .split(',').map(s => s.trim()).filter(Boolean),
      };
      await apiClient.put('/api/settings/personality', { personality_profile: payload });
      setPersonality(payload);
      setPersonalitySuccess('Personality saved! AI will use this voice from now on.');
      setTimeout(() => setPersonalitySuccess(''), 4000);
    } catch {
      setPersonalityError('Failed to save. Please try again.');
    } finally {
      setPersonalitySaving(false);
    }
  };

  if (!config || !subdomain) return null;

  const branding = config.branding || {};
  const primary = branding.primary_color || '#2563eb';
  const pricing = config.pricing || {};

  const schema_fields = (config.configuration_schema?.required_fields ?? []) as Array<{
    type: string; key: string;
  }>;
  const instagramField = schema_fields.find((f) => f.type === 'instagram_connect');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      await updatePassword(newPassword);
      setPasswordSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await saasApi.deleteAccount(subdomain);
      window.location.href = '/';
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account');
      setDeleteLoading(false);
    }
  };

  const cardStyle = {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  };

  // Calculate trial days remaining
  const trialEnd = status === 'trialing' ? (() => {
    // subscription data not directly available here — show from config
    return pricing.trial_days ? `${pricing.trial_days}-day trial` : 'Trial active';
  })() : null;

  return (
    <div className="min-h-screen" style={{ background: '#070B14', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logo_url && <img src={branding.logo_url} alt="" className="h-8 w-auto" />}
            <span className="font-semibold text-[17px] text-slate-200">{branding.brand_name || subdomain}</span>
          </div>
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-8">
        {/* Page title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primary}20` }}>
            <Settings className="w-5 h-5" style={{ color: primary }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Account Settings</h1>
            <p className="text-sm text-slate-400">Manage your account, security, and subscription</p>
          </div>
        </div>

        {/* Section 1: Profile */}
        <div className="rounded-2xl p-7" style={cardStyle}>
          <div className="flex items-center gap-2 mb-5">
            <User className="w-4 h-4 text-slate-400" />
            <h2 className="text-base font-semibold text-slate-100">Profile</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Email</label>
              <div className="px-4 py-2.5 bg-white/5 rounded-lg text-sm text-slate-300 border border-white/10">
                {user?.email || 'Not set'}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Name</label>
              <div className="px-4 py-2.5 bg-white/5 rounded-lg text-sm text-slate-300 border border-white/10">
                {user?.user_metadata?.full_name || 'Not set'}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Password */}
        <div className="rounded-2xl p-7" style={cardStyle}>
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4 text-slate-400" />
            <h2 className="text-base font-semibold text-slate-100">Change Password</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            {passwordError && (
              <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3 border border-red-500/20">{passwordError}</div>
            )}
            {passwordSuccess && (
              <div className="text-sm text-green-400 bg-green-500/10 rounded-lg p-3 border border-green-500/20 flex items-center gap-2">
                <Check className="w-4 h-4" /> {passwordSuccess}
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-500 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-2.5 border border-white/10 bg-white/5 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-4 py-2.5 border border-white/10 bg-white/5 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={passwordLoading || !newPassword || !confirmPassword}
              className="h-10 px-6 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-all hover:brightness-110"
              style={{ background: primary }}
            >
              {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Section 3: Instagram (if applicable) */}
        {instagramField && (
          <div className="rounded-2xl p-7" style={cardStyle}>
            <div className="mb-5">
              <h2 className="text-base font-semibold text-slate-100 mb-1">Instagram Account</h2>
              <p className="text-sm text-slate-400">Reconnect if your token expired or you need to switch accounts.</p>
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
        )}

        {/* Section 4: Personality */}
        <div className="rounded-2xl p-7" style={cardStyle}>
          <div className="flex items-center gap-2 mb-2">
            <Mic2 className="w-4 h-4 text-violet-400" />
            <h2 className="text-base font-semibold text-slate-100">AI Personality</h2>
          </div>
          <p className="text-sm text-slate-400 mb-6">
            Train the AI to sound exactly like you — your tone, phrases, and selling style.
            Every response will feel handwritten, not automated.
          </p>

          {personalityLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : (
            <div className="space-y-6">

              {/* Tone */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  <span className="flex items-center gap-1.5"><Smile className="w-3.5 h-3.5" /> Tone</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { v: 'casual_hinglish', label: 'Casual Hinglish', desc: 'Mix Hindi + English naturally' },
                    { v: 'warm_friendly', label: 'Warm & Friendly', desc: 'Like a trusted friend' },
                    { v: 'fun_playful', label: 'Fun & Playful', desc: 'Light-hearted, high energy' },
                    { v: 'professional', label: 'Professional', desc: 'Structured, trustworthy' },
                    { v: 'formal_english', label: 'Formal English', desc: 'Polished, no slang' },
                  ].map(({ v, label, desc }) => (
                    <button
                      key={v}
                      onClick={() => setPersonality(p => ({ ...p, tone: v }))}
                      className={`text-left px-4 py-3 rounded-xl border transition-all ${
                        personality.tone === v
                          ? 'border-violet-500/60 bg-violet-500/15 text-violet-200'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-sm font-medium">{label}</div>
                      <div className="text-xs opacity-60 mt-0.5">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Emoji usage */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Emoji Usage</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: 'heavy', label: '🔥🔥 Heavy' },
                    { v: 'moderate', label: '✨ Moderate' },
                    { v: 'minimal', label: '🙂 Minimal' },
                    { v: 'none', label: 'None' },
                  ].map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => setPersonality(p => ({ ...p, emoji_usage: v }))}
                      className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                        personality.emoji_usage === v
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
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Selling Style</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { v: 'soft_sell', label: 'Soft Sell', desc: 'Build relationship first' },
                    { v: 'direct', label: 'Direct', desc: 'Get to the point fast' },
                    { v: 'consultative', label: 'Consultative', desc: 'Ask, understand, recommend' },
                  ].map(({ v, label, desc }) => (
                    <button
                      key={v}
                      onClick={() => setPersonality(p => ({ ...p, selling_style: v }))}
                      className={`text-left px-4 py-3 rounded-xl border transition-all ${
                        personality.selling_style === v
                          ? 'border-pink-500/60 bg-pink-500/15 text-pink-200'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-sm font-medium">{label}</div>
                      <div className="text-xs opacity-60 mt-0.5">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price handling */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Price Handling</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { v: 'always_dm', label: 'Always DM for price', desc: '"DM me for price" in comments' },
                    { v: 'quote_openly', label: 'Quote openly', desc: 'State price confidently' },
                    { v: 'quote_on_ask', label: 'Quote when asked', desc: 'Only if customer asks' },
                    { v: 'never_negotiate', label: 'Fixed price', desc: 'Never offer discounts' },
                  ].map(({ v, label, desc }) => (
                    <button
                      key={v}
                      onClick={() => setPersonality(p => ({ ...p, price_handling: v }))}
                      className={`text-left px-4 py-3 rounded-xl border transition-all ${
                        personality.price_handling === v
                          ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-sm font-medium">{label}</div>
                      <div className="text-xs opacity-60 mt-0.5">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Negotiation style */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Negotiation Style</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: 'firm', label: 'Firm — no discounts' },
                    { v: 'flexible', label: 'Flexible — reasonable offers' },
                    { v: 'empathetic_firm', label: 'Empathetic but firm' },
                  ].map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => setPersonality(p => ({ ...p, negotiation_style: v }))}
                      className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                        personality.negotiation_style === v
                          ? 'border-amber-500/60 bg-amber-500/15 text-amber-200'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Min price */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Price Floor (₹)</label>
                <p className="text-xs text-slate-500 mb-2">AI will never offer below this amount, even when pressured.</p>
                <input
                  type="number"
                  value={personality.min_price || ''}
                  onChange={e => setPersonality(p => ({ ...p, min_price: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="e.g. 499"
                  className="w-40 px-4 py-2.5 border border-white/10 bg-white/5 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </div>

              {/* Signature opener / closer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    <span className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> Signature Opener</span>
                  </label>
                  <input
                    type="text"
                    value={personality.signature_opener || ''}
                    onChange={e => setPersonality(p => ({ ...p, signature_opener: e.target.value }))}
                    placeholder='e.g. "Heyy! 😊"'
                    className="w-full px-4 py-2.5 border border-white/10 bg-white/5 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Signature Closer</label>
                  <input
                    type="text"
                    value={personality.signature_closer || ''}
                    onChange={e => setPersonality(p => ({ ...p, signature_closer: e.target.value }))}
                    placeholder='e.g. "Reply karo, waiting! ❤️"'
                    className="w-full px-4 py-2.5 border border-white/10 bg-white/5 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
              </div>

              {/* Signature phrases */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Signature Phrases</label>
                <p className="text-xs text-slate-500 mb-2">Words you always use. Comma-separated. e.g. yaar, bilkul, bestie</p>
                <input
                  type="text"
                  value={signaturePhraseInput}
                  onChange={e => setSignaturePhraseInput(e.target.value)}
                  placeholder="yaar, bilkul, bestie, ekdum"
                  className="w-full px-4 py-2.5 border border-white/10 bg-white/5 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </div>

              {/* No-go topics */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">No-Go Topics</label>
                <p className="text-xs text-slate-500 mb-2">Topics AI should never bring up. Comma-separated.</p>
                <input
                  type="text"
                  value={noGoTopicInput}
                  onChange={e => setNoGoTopicInput(e.target.value)}
                  placeholder="don't mention competitors, no politics"
                  className="w-full px-4 py-2.5 border border-white/10 bg-white/5 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </div>

              {/* Vocabulary samples */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Your DM Style Samples</label>
                <p className="text-xs text-slate-500 mb-2">
                  Paste 2–5 actual DMs you've sent. The AI will learn your vocabulary, sentence structure, and energy from these.
                </p>
                <textarea
                  value={personality.vocabulary_samples || ''}
                  onChange={e => setPersonality(p => ({ ...p, vocabulary_samples: e.target.value }))}
                  placeholder={"Heyy! ✨ Thanks for asking about the kurti!\nYe available hai size S se L tak.\nSize batao, main confirm karta/karti hoon!"}
                  rows={5}
                  className="w-full px-4 py-3 border border-white/10 bg-white/5 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none font-mono"
                />
              </div>

              {/* Save button + feedback */}
              {personalityError && (
                <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3 border border-red-500/20">{personalityError}</div>
              )}
              {personalitySuccess && (
                <div className="text-sm text-emerald-400 bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20 flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" /> {personalitySuccess}
                </div>
              )}
              <button
                onClick={handleSavePersonality}
                disabled={personalitySaving}
                className="flex items-center gap-2 h-11 px-7 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all hover:brightness-110 bg-gradient-to-r from-violet-600 to-pink-600"
              >
                {personalitySaving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Save className="w-4 h-4" /> Save Personality</>
                }
              </button>
            </div>
          )}
        </div>

        {/* Section 5: Subscription */}
        <div className="rounded-2xl p-7" style={cardStyle}>
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="w-4 h-4 text-slate-400" />
            <h2 className="text-base font-semibold text-slate-100">Subscription</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-400">Status</span>
              <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${
                status === 'active' ? 'text-green-400 bg-green-500/10' :
                status === 'trialing' ? 'text-blue-400 bg-blue-500/10' :
                'text-yellow-400 bg-yellow-500/10'
              }`}>
                {status === 'trialing' ? 'Free Trial' : status === 'active' ? 'Active' : status || 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-400">Plan</span>
              <span className="text-sm text-slate-200">{pricing.monthly_price ? `₹${Number(pricing.monthly_price).toLocaleString('en-IN')}/mo` : 'Free'}</span>
            </div>
            {status === 'trialing' && (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-400">Trial</span>
                <span className="text-sm text-slate-200">{trialEnd}</span>
              </div>
            )}
            <p className="text-xs text-slate-500 pt-2">
              To cancel your subscription or request a refund, email{' '}
              <a href="mailto:support@chatslytics.com" className="text-violet-400 hover:underline">support@chatslytics.com</a>
            </p>
          </div>
        </div>

        {/* Section 6: Danger Zone */}
        <div className="rounded-2xl p-7 border border-red-500/20" style={{ ...cardStyle, border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="text-base font-semibold text-red-400">Danger Zone</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone. Your conversations, products, analytics, and settings will be permanently removed.
          </p>
          {deleteError && (
            <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3 mb-4 border border-red-500/20">{deleteError}</div>
          )}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="h-10 px-6 rounded-lg text-red-400 text-sm font-medium border border-red-500/30 hover:bg-red-500/10 transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-300 font-medium">Are you sure? This will permanently delete:</p>
              <ul className="text-xs text-slate-400 space-y-1 pl-4 list-disc">
                <li>Your account and profile</li>
                <li>All conversation history</li>
                <li>Products and knowledge base</li>
                <li>Analytics and CRM data</li>
                <li>Instagram connection</li>
              </ul>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="h-10 px-6 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Delete Everything'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="h-10 px-6 rounded-lg text-slate-300 text-sm border border-white/10 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
