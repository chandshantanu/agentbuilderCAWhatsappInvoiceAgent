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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/apiClient';
import { saasApi } from '@/services/saasApiService';
import { useSaaS } from '@/contexts/SaaSContext';
import InstagramConnectStep from '@/components/InstagramConnectStep';

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

  useEffect(() => {
    const subdomain = saasConfig?.subdomain;
    Promise.all([
      apiClient.get('/api/settings/triggers').then((r: any) => setTriggers(r.data?.triggers || [])),
      apiClient.get('/api/instagram/status').then((r: any) => setIgStatus(r.data)),
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
