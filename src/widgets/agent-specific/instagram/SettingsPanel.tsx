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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/apiClient';

export default function SettingsPanel({ config }: { config: Record<string, unknown> }) {
  const [triggers, setTriggers] = useState<string[]>([]);
  const [newTrigger, setNewTrigger] = useState('');
  const [igStatus, setIgStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.get('/api/settings/triggers').then((r: any) => setTriggers(r.data?.triggers || [])),
      apiClient.get('/api/instagram/status').then((r: any) => setIgStatus(r.data)),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
    <div className="space-y-6">
      {/* Instagram Connection */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Instagram className="w-5 h-5 text-pink-500" />
          Instagram Connection
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Status</span>
            <Badge className={igStatus?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
              {igStatus?.connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Total Conversations</span>
            <span className="text-sm font-medium text-neutral-900">{igStatus?.total_conversations || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Total Messages</span>
            <span className="text-sm font-medium text-neutral-900">{igStatus?.total_messages || 0}</span>
          </div>
          {igStatus?.webhook_url && (
            <div className="mt-2">
              <span className="text-xs text-neutral-500">Webhook URL</span>
              <div className="bg-neutral-50 rounded-lg p-2 mt-1">
                <code className="text-xs text-neutral-700 break-all">{igStatus.webhook_url}</code>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comment Triggers */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-500" />
          Comment Keyword Triggers
          {saving && <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />}
        </h3>
        <p className="text-sm text-neutral-500 mb-4">
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
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-500" />
          Rate Limiting
        </h3>
        <p className="text-sm text-neutral-500 mb-3">
          Built-in rate limiting protects your Instagram account from API limits.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Max DMs per hour</span>
            <span className="text-sm font-medium text-neutral-900">150</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Max DMs per minute</span>
            <span className="text-sm font-medium text-neutral-900">15</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Protection</span>
            <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
