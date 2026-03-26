import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquarePlus,
  Trash2,
  ExternalLink,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';

interface TrackedComment {
  id: string;
  comment_id: string;
  post_url: string;
  note: string;
  added_at: string;
  status: string;
  last_polled: string | null;
  engaged_count: number;
}

export default function OutreachPanel({ config }: { config: Record<string, unknown> }) {
  const [tracked, setTracked] = useState<TrackedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [urlOrId, setUrlOrId] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const fetchTracked = useCallback(() => {
    setLoading(true);
    apiClient
      .get('/api/outbound-comments?limit=100')
      .then((resp: any) => setTracked(resp.data?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTracked();
  }, [fetchTracked]);

  const handleAdd = async () => {
    if (!urlOrId.trim()) return;
    setAdding(true);
    setAddError(null);
    setAddSuccess(false);
    try {
      await apiClient.post('/api/outbound-comments', {
        url_or_id: urlOrId.trim(),
        note: note.trim(),
      });
      setUrlOrId('');
      setNote('');
      setAddSuccess(true);
      fetchTracked();
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Failed to add comment';
      setAddError(msg);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      await apiClient.delete(`/api/outbound-comments/${commentId}`);
      fetchTracked();
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const totalEngaged = tracked.reduce((sum, t) => sum + (t.engaged_count || 0), 0);

  return (
    <div className="space-y-5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Comment Outreach</h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Track your comments on other posts — AI prospects anyone who replies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalEngaged > 0 && (
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs px-2 py-0.5">
              <Users className="w-3 h-3 mr-1" />
              {totalEngaged} engaged
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTracked}
            disabled={loading}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* How it works — collapsible */}
      <div className="rounded-lg border border-zinc-700/50 overflow-hidden">
        <button
          onClick={() => setHowItWorksOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-800/50 text-zinc-300 text-sm font-medium hover:bg-zinc-800"
        >
          <span className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-pink-400" />
            How comment outreach works
          </span>
          {howItWorksOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {howItWorksOpen && (
          <div className="px-4 py-3 bg-zinc-900/50 space-y-2">
            {[
              ['1', 'You comment on a reel or post of a potential buyer'],
              ['2', 'They reply to your comment — showing real interest'],
              ['3', 'AI automatically DMs them to start a conversation'],
            ].map(([step, text]) => (
              <div key={step} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-pink-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {step}
                </span>
                <p className="text-sm text-zinc-300">{text}</p>
              </div>
            ))}
            <p className="text-xs text-zinc-500 mt-1 pt-1 border-t border-zinc-800">
              Paste the full Instagram URL or just the comment ID below. The worker checks for new replies every 5 minutes.
            </p>
          </div>
        )}
      </div>

      {/* Add comment form */}
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/30 p-4 space-y-3">
        <p className="text-sm font-medium text-zinc-300">Track a new comment</p>
        <div className="space-y-2">
          <Input
            value={urlOrId}
            onChange={e => setUrlOrId(e.target.value)}
            placeholder="Paste Instagram comment URL or comment ID..."
            className="h-9 text-sm bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Optional note (e.g. 'yoga mat reel comment')"
            className="h-9 text-sm bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!urlOrId.trim() || adding}
            className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white border-0"
          >
            {adding ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <MessageSquarePlus className="w-3.5 h-3.5 mr-1.5" />
            )}
            {adding ? 'Adding…' : 'Track Comment'}
          </Button>
          {addSuccess && (
            <span className="text-xs text-emerald-400">Comment added — AI will start monitoring replies.</span>
          )}
          {addError && (
            <span className="text-xs text-red-400">{addError}</span>
          )}
        </div>
      </div>

      {/* Tracked comments list */}
      {loading ? (
        <div className="flex items-center justify-center py-14">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      ) : tracked.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-zinc-500 gap-2">
          <MessageSquarePlus className="w-8 h-8 opacity-30" />
          <p className="text-sm">No comments tracked yet</p>
          <p className="text-xs text-zinc-600">Add a comment above to start prospecting</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
            Tracking {tracked.length} comment{tracked.length !== 1 ? 's' : ''}
          </p>
          {tracked.map(item => (
            <TrackedCommentCard
              key={item.comment_id}
              item={item}
              deleting={deletingId === item.comment_id}
              onDelete={() => handleDelete(item.comment_id)}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TrackedCommentCard({
  item,
  deleting,
  onDelete,
  formatDate,
}: {
  item: TrackedComment;
  deleting: boolean;
  onDelete: () => void;
  formatDate: (iso: string | null) => string;
}) {
  const displayUrl = item.post_url || `Comment ${item.comment_id}`;
  const truncatedUrl = displayUrl.length > 55 ? displayUrl.slice(0, 55) + '…' : displayUrl;

  return (
    <div className="rounded-lg border border-zinc-700/60 bg-zinc-900 p-3 flex items-start gap-3">
      {/* Engagement badge */}
      <div className="flex-shrink-0 mt-0.5">
        {item.engaged_count > 0 ? (
          <div className="flex items-center gap-1 bg-purple-500/15 border border-purple-500/25 rounded px-1.5 py-0.5">
            <Users className="w-3 h-3 text-purple-400" />
            <span className="text-[11px] font-semibold text-purple-300">{item.engaged_count}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5">
            <Clock className="w-3 h-3 text-zinc-500" />
            <span className="text-[11px] text-zinc-500">0</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {item.post_url ? (
              <a
                href={item.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-300 hover:text-white flex items-center gap-1 truncate"
              >
                <span className="truncate">{truncatedUrl}</span>
                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
              </a>
            ) : (
              <span className="text-xs text-zinc-400 font-mono">ID: {item.comment_id}</span>
            )}
            {item.note && (
              <p className="text-xs text-zinc-500 mt-0.5 italic">"{item.note}"</p>
            )}
          </div>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="flex-shrink-0 text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Stop tracking"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-600">
          <span>Added {formatDate(item.added_at)}</span>
          {item.last_polled && (
            <span>Last checked {formatDate(item.last_polled)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
