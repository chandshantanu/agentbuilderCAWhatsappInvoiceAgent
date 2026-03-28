import React, { useState, useEffect } from 'react';
import {
  Settings,
  Instagram,
  MessageCircle,
  Plus,
  X,
  Loader2,
  Check,
  Shield,
  LogOut,
  AlertTriangle,
  Trash2,
  Sparkles,
  Lock,
  Users,
  Zap,
  Bell,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/apiClient';
import { saasApi } from '@/services/saasApiService';
import { useSaaS } from '@/contexts/SaaSContext';
import InstagramConnectStep from '@/components/InstagramConnectStep';

const PLAN_ORDER: Record<string, number> = { starter: 0, pro: 1, agency: 2 };

function FeatureToggleRow({
  icon,
  label,
  description,
  enabled,
  available,
  plan,
  requiredPlan,
  onChange,
  comingSoon = false,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  available: boolean;
  plan: string;
  requiredPlan: string;
  onChange: (next: boolean) => void;
  comingSoon?: boolean;
}) {
  const isLocked = !available || (PLAN_ORDER[plan] ?? 0) < (PLAN_ORDER[requiredPlan] ?? 0);
  const planLabel: Record<string, string> = { pro: 'Pro', agency: 'Agency' };

  return (
    <div className={`flex items-start justify-between gap-4 ${isLocked ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium text-slate-300">{label}</p>
            {isLocked && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-white/8 text-slate-500">
                <Lock className="w-2.5 h-2.5" />
                {planLabel[requiredPlan] ?? requiredPlan}+
              </span>
            )}
            {comingSoon && !isLocked && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-400">
                Coming soon
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled && !isLocked}
        disabled={isLocked || comingSoon}
        onClick={() => !isLocked && !comingSoon && onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:cursor-not-allowed ${
          enabled && !isLocked ? 'bg-purple-500' : 'bg-white/10'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            enabled && !isLocked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPanel({ config }: { config: Record<string, unknown> }) {
  const { config: saasConfig } = useSaaS();
  const [triggers, setTriggers] = useState<string[]>([]);
  const [newTrigger, setNewTrigger] = useState('');
  const [igStatus, setIgStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancellingDelete, setCancellingDelete] = useState(false);
  const [deletionScheduledAt, setDeletionScheduledAt] = useState<string | null>(null);
  const [storyAutoDMEnabled, setStoryAutoDMEnabled] = useState(true);
  const [storyAutoDMTemplate, setStoryAutoDMTemplate] = useState('');
  const [savingStoryAutoDM, setSavingStoryAutoDM] = useState(false);

  // Plan + advanced features
  const [plan, setPlan] = useState<string>('pro');
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [followGateEnabled, setFollowGateEnabled] = useState(false);
  const [followUpEnabled, setFollowUpEnabled] = useState(true);
  const [proactiveOutreachEnabled, setProactiveOutreachEnabled] = useState(false);
  const [savingAdvanced, setSavingAdvanced] = useState(false);

  const planLabel: Record<string, string> = {
    starter: 'Starter',
    pro: 'Pro',
    agency: 'Agency',
  };
  const planColor: Record<string, string> = {
    starter: 'bg-slate-500/20 text-slate-300',
    pro: 'bg-purple-500/20 text-purple-300',
    agency: 'bg-sky-500/20 text-sky-300',
  };

  useEffect(() => {
    const subdomain = saasConfig?.subdomain;
    Promise.all([
      apiClient.get('/api/settings/triggers').then((r: any) => setTriggers(r.data?.triggers || [])),
      apiClient.get('/api/instagram/status').then((r: any) => setIgStatus(r.data)),
      apiClient.get('/api/settings/story-autodm').then((r: any) => {
        setStoryAutoDMEnabled(r.data?.story_autodm_enabled ?? true);
        setStoryAutoDMTemplate(r.data?.story_autodm_template || '');
      }),
      apiClient.get('/api/settings/features').then((r: any) => {
        setPlan(r.data?.plan || 'pro');
        setFeatures(r.data?.features || {});
      }),
      apiClient.get('/api/settings/advanced').then((r: any) => {
        setFollowGateEnabled(r.data?.follow_gate_enabled ?? false);
        setFollowUpEnabled(r.data?.follow_up_enabled ?? true);
        setProactiveOutreachEnabled(r.data?.proactive_outreach_enabled ?? false);
      }),
      subdomain
        ? saasApi.getConfigStatus(subdomain).then((r: any) => {
            if (r.data?.status === 'pending_deletion' && r.data?.deletion_scheduled_at) {
              setDeletionScheduledAt(r.data.deletion_scheduled_at);
            }
          })
        : Promise.resolve(),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [saasConfig?.subdomain]);

  const saveAdvanced = async (updates: {
    follow_gate_enabled?: boolean;
    follow_up_enabled?: boolean;
    proactive_outreach_enabled?: boolean;
  }) => {
    setSavingAdvanced(true);
    try {
      await apiClient.put('/api/settings/advanced', {
        follow_gate_enabled: followGateEnabled,
        comment_autodm_enabled: true,
        follow_up_enabled: followUpEnabled,
        proactive_outreach_enabled: proactiveOutreachEnabled,
        ...updates,
      });
    } catch (err) {
      console.error('Save advanced settings failed:', err);
    } finally {
      setSavingAdvanced(false);
    }
  };

  const saveStoryAutoDM = async (enabled: boolean, template: string) => {
    setSavingStoryAutoDM(true);
    try {
      await apiClient.put('/api/settings/story-autodm', {
        story_autodm_enabled: enabled,
        story_autodm_template: template,
      });
    } catch (err) {
      console.error('Save story autodm failed:', err);
    } finally {
      setSavingStoryAutoDM(false);
    }
  };

  const addTrigger = () => {
    if (!newTrigger.trim() || triggers.includes(newTrigger.trim().toLowerCase())) return;
    const updated = [...triggers, newTrigger.trim().toLowerCase()];
    setTriggers(updated);
    setNewTrigger('');
    saveTriggers(updated);
  };

  const removeTrigger = (t: string) => {
    const updated = triggers.filter(x => x !== t);
    setTriggers(updated);
    saveTriggers(updated);
  };

  const handleDisconnect = async () => {
    const subdomain = saasConfig?.subdomain;
    if (!subdomain) return;
    setDisconnecting(true);
    try {
      await saasApi.disconnectInstagram(subdomain);
      setIgStatus((prev: any) => ({ ...prev, connected: false }));
      setShowDisconnectConfirm(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to disconnect Instagram. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const subdomain = saasConfig?.subdomain;
    if (!subdomain) return;
    setDeleting(true);
    try {
      const resp = await saasApi.deleteAccount(subdomain);
      if (resp.deletion_scheduled_at) {
        setDeletionScheduledAt(resp.deletion_scheduled_at);
      }
      setShowDeleteConfirm(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to schedule account deletion. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = async () => {
    const subdomain = saasConfig?.subdomain;
    if (!subdomain) return;
    setCancellingDelete(true);
    try {
      await saasApi.cancelDeleteAccount(subdomain);
      setDeletionScheduledAt(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel deletion. Please try again.');
    } finally {
      setCancellingDelete(false);
    }
  };

  const saveTriggers = async (triggerList: string[]) => {
    setSaving(true);
    try {
      await apiClient.put('/api/settings/triggers', { triggers: triggerList });
    } catch (err) {
      console.error('Save triggers failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Instagram Connection */}
      <div className="glass-card rounded-xl p-4 sm:p-5">
        <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Instagram className="w-5 h-5 text-pink-500" />
          Instagram Connection
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Status</span>
            <Badge className={igStatus?.connected ? 'bg-emerald-500/20 text-emerald-400 border-0' : 'bg-red-500/20 text-red-400 border-0'}>
              {igStatus?.connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Total Conversations</span>
            <span className="text-sm font-medium text-slate-200">{igStatus?.total_conversations || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Total Messages</span>
            <span className="text-sm font-medium text-slate-200">{igStatus?.total_messages || 0}</span>
          </div>
          {igStatus?.webhook_url && (
            <div className="mt-2">
              <span className="text-xs text-neutral-500">Webhook URL</span>
              <div className="bg-white/5 rounded-lg p-2 mt-1">
                <code className="text-xs text-slate-400 break-all">{igStatus.webhook_url}</code>
              </div>
            </div>
          )}

          {!igStatus?.connected && saasConfig && (
            <div className="pt-3 border-t border-white/10">
              <InstagramConnectStep
                instagramAppId={saasConfig.facebook_app_id || ''}
                subscriptionId={saasConfig.agent_id || ''}
                subdomain={saasConfig.subdomain}
                primaryColor={saasConfig.branding?.primary_color || '#E1306C'}
                onConnected={() => {
                  setIgStatus((prev: any) => ({ ...prev, connected: true }));
                }}
              />
            </div>
          )}

          {igStatus?.connected && (
            <div className="pt-2 border-t border-white/10">
              {!showDisconnectConfirm ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
                  onClick={() => setShowDisconnectConfirm(true)}
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect Instagram
                </Button>
              ) : (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-300">
                      This will disconnect your Instagram account and stop the AI agent. All existing conversation data will be preserved.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-slate-400 hover:text-slate-200"
                      onClick={() => setShowDisconnectConfirm(false)}
                      disabled={disconnecting}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 gap-2"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                    >
                      {disconnecting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <LogOut className="w-3 h-3" />
                      )}
                      {disconnecting ? 'Disconnecting…' : 'Yes, Disconnect'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comment Triggers */}
      <div className="glass-card rounded-xl p-4 sm:p-5">
        <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-500" />
          Comment Keyword Triggers
          {saving && <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />}
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          When a comment contains any of these keywords, the AI will automatically reply and initiate a DM conversation.
        </p>

        <div className="flex gap-2 mb-4">
          <Input
            value={newTrigger}
            onChange={e => setNewTrigger(e.target.value)}
            placeholder="Add keyword (e.g. price, available, buy)"
            onKeyDown={e => e.key === 'Enter' && addTrigger()}
          />
          <Button onClick={addTrigger} disabled={!newTrigger.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {triggers.length === 0 ? (
            <p className="text-sm text-neutral-400">No triggers configured. All purchase-intent comments will be handled by AI.</p>
          ) : (
            triggers.map(t => (
              <Badge key={t} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                {t}
                <button onClick={() => removeTrigger(t)} className="ml-1 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
      </div>

      {/* Story AutoDM */}
      <div className={`glass-card rounded-xl p-4 sm:p-5 ${features.story_autodm === false ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Story AutoDM
            {savingStoryAutoDM ? (
              <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
            ) : null}
            {features.story_autodm === false && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-white/8 text-slate-500">
                <Lock className="w-2.5 h-2.5" /> Pro+
              </span>
            )}
          </h3>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          When someone replies to your story — instant DM, then AI picks up the conversation.
        </p>

        {/* Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-slate-300">Enable Story AutoDM</p>
            <p className="text-xs text-slate-500 mt-0.5">Replies to your stories trigger an instant DM</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={storyAutoDMEnabled}
            disabled={features.story_autodm === false}
            onClick={() => {
              if (features.story_autodm === false) return;
              const next = !storyAutoDMEnabled;
              setStoryAutoDMEnabled(next);
              saveStoryAutoDM(next, storyAutoDMTemplate);
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:cursor-not-allowed ${
              storyAutoDMEnabled && features.story_autodm !== false ? 'bg-purple-500' : 'bg-white/10'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                storyAutoDMEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {storyAutoDMEnabled ? (
          <div className="space-y-4">
            {/* How it works — flow preview */}
            <div className="rounded-lg bg-purple-500/5 border border-purple-500/15 p-3 space-y-2">
              <p className="text-xs font-medium text-purple-300">How it works</p>
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">1.</span>
                  <span>Someone replies to your story → instant template DM fires immediately</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">2.</span>
                  <span>
                    <strong className="text-slate-300">New leads</strong> get warm intro + Browse button (if catalog set) or product chips
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">3.</span>
                  <span>
                    <strong className="text-slate-300">Returning leads</strong> get a recognition message — no cold intro
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">4.</span>
                  <span>When they reply back → AI takes over with full story context</span>
                </div>
              </div>
            </div>

            {/* Custom template (optional override) */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">
                Custom reply message{' '}
                <span className="text-slate-600">— leave blank for smart auto-message</span>
              </label>
              <Input
                value={storyAutoDMTemplate}
                onChange={e => setStoryAutoDMTemplate(e.target.value)}
                placeholder="Hey! 👋 Thanks for checking out our story! Here's our collection: {catalog_link}"
                onBlur={() => saveStoryAutoDM(storyAutoDMEnabled, storyAutoDMTemplate)}
              />
              <p className="text-xs text-slate-600">
                Use{' '}
                <code className="text-purple-400">&#123;catalog_link&#125;</code>
                {' '}to auto-insert your catalog URL.
                Set <strong className="text-slate-500">catalog_link</strong> in your agent config to enable the Browse button.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-white/3 border border-white/8 p-3">
            <p className="text-xs text-slate-500">
              Story replies will still reach the AI pipeline — no instant template DM will be sent first.
            </p>
          </div>
        )}
      </div>

      {/* Advanced Features */}
      <div className="glass-card rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Advanced Features
            {savingAdvanced && <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />}
          </h3>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${planColor[plan] ?? planColor.pro}`}>
            {planLabel[plan] ?? 'Pro'} plan
          </span>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          Automation features that run in the background on every conversation.
        </p>

        <div className="space-y-4">
          {/* Follow Gate */}
          <FeatureToggleRow
            icon={<Lock className="w-4 h-4 text-violet-400" />}
            label="Follow Gate"
            description="New story repliers must follow you to unlock catalog access"
            enabled={followGateEnabled}
            available={features.follow_gate !== false}
            plan={plan}
            requiredPlan="pro"
            onChange={(next) => {
              setFollowGateEnabled(next);
              saveAdvanced({ follow_gate_enabled: next });
            }}
          />

          {/* Follow-up Scheduler */}
          <FeatureToggleRow
            icon={<Bell className="w-4 h-4 text-blue-400" />}
            label="Follow-up Scheduler"
            description="Re-engage leads who didn't reply after 24h"
            enabled={followUpEnabled}
            available={features.follow_up_scheduler !== false}
            plan={plan}
            requiredPlan="pro"
            onChange={(next) => {
              setFollowUpEnabled(next);
              saveAdvanced({ follow_up_enabled: next });
            }}
          />

          {/* Proactive Outreach */}
          <FeatureToggleRow
            icon={<Users className="w-4 h-4 text-emerald-400" />}
            label="Proactive Outreach"
            description="AI-initiated messages to warm leads based on engagement patterns"
            enabled={proactiveOutreachEnabled}
            available={features.proactive_outreach !== false}
            plan={plan}
            requiredPlan="pro"
            onChange={(next) => {
              setProactiveOutreachEnabled(next);
              saveAdvanced({ proactive_outreach_enabled: next });
            }}
          />

          {/* Advanced Analytics — Agency only */}
          <FeatureToggleRow
            icon={<Crown className="w-4 h-4 text-amber-400" />}
            label="Advanced Analytics"
            description="Revenue attribution, funnel drop-off, customer LTV tracking"
            enabled={false}
            available={features.advanced_analytics === true}
            plan={plan}
            requiredPlan="agency"
            onChange={() => {}}
            comingSoon={features.advanced_analytics === true}
          />
        </div>

        {plan === 'starter' && (
          <div className="mt-4 rounded-lg bg-purple-500/8 border border-purple-500/20 p-3 flex items-start gap-2">
            <Crown className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-400">
              <span className="text-purple-300 font-medium">Upgrade to Pro (₹2,999/mo)</span> to unlock Story AutoDM, Follow Gate, scheduled follow-ups, and proactive outreach.
            </p>
          </div>
        )}
      </div>

      {/* Rate Limits Info */}
      <div className="glass-card rounded-xl p-4 sm:p-5">
        <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-500" />
          Rate Limiting
        </h3>
        <p className="text-sm text-neutral-500 mb-3">
          Built-in rate limiting protects your Instagram account from API limits.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Max DMs per hour</span>
            <span className="text-sm font-medium text-slate-200">150</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Max DMs per minute</span>
            <span className="text-sm font-medium text-slate-200">15</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Protection</span>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-0">Active</Badge>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-card rounded-xl p-4 sm:p-5 border border-red-500/20">
        <h3 className="font-semibold text-red-400 mb-4 flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          Danger Zone
        </h3>

        {deletionScheduledAt ? (
          /* Pending deletion state — show countdown banner + cancel option */
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-300">Account deletion scheduled</p>
                <p className="text-xs text-red-400/80">
                  Your account and all data will be permanently deleted after{' '}
                  <span className="font-semibold text-red-300">
                    {new Date(deletionScheduledAt).toLocaleString()}
                  </span>
                  . You can cancel before then.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="w-full border border-slate-500/40 text-slate-300 hover:text-slate-100 hover:bg-white/5 gap-2"
              onClick={handleCancelDelete}
              disabled={cancellingDelete}
            >
              {cancellingDelete ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {cancellingDelete ? 'Cancelling…' : 'Cancel Deletion'}
            </Button>
          </div>
        ) : (
          /* Normal state — show delete button */
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Permanently delete your account and all associated data. You will have a{' '}
              <span className="text-slate-400 font-medium">12-hour grace period</span> to cancel
              before the data is irreversibly removed.
            </p>

            {!showDeleteConfirm ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 gap-2"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
                Delete My Account
              </Button>
            ) : (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-300">
                    This will schedule deletion of your account, all conversation history, invoices,
                    and client records. The agent will be deprovisioned. This action takes effect
                    after 12 hours — you can cancel during that window.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-slate-400 hover:text-slate-200"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 gap-2"
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    {deleting ? 'Scheduling…' : 'Yes, Delete My Account'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
