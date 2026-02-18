import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  ShoppingBag,
  BookOpen,
  Instagram,
  TrendingUp,
  Users,
  Flame,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/apiClient';

interface OverviewData {
  kpis: {
    total_conversations: number;
    total_products: number;
    total_kb_articles: number;
    ig_connected: boolean;
  };
  deal_funnel: Record<string, number>;
  lead_distribution: { hot: number; warm: number; cold: number };
  recent_conversations: Array<{
    sender_id: string;
    username: string;
    lastMessage: string;
    lastMessageTime: string;
    lead_score: number;
    tags: string[];
    deal_stage: string;
  }>;
}

export default function DashboardOverview({ config }: { config: Record<string, unknown> }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/dashboard/overview')
      .then((resp: any) => setData(resp.data))
      .catch((err: any) => console.error('Failed to load overview:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-neutral-500 py-8">Failed to load dashboard data</div>;
  }

  const { kpis, deal_funnel, lead_distribution, recent_conversations } = data;

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600 bg-emerald-50';
    if (score >= 30) return 'text-amber-600 bg-amber-50';
    return 'text-neutral-500 bg-neutral-50';
  };

  const stages = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center gap-2 text-neutral-500 mb-2">
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Conversations</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">{kpis.total_conversations}</p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center gap-2 text-neutral-500 mb-2">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-xs font-medium">Products</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">{kpis.total_products}</p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center gap-2 text-neutral-500 mb-2">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs font-medium">KB Articles</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">{kpis.total_kb_articles}</p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center gap-2 text-neutral-500 mb-2">
            <Instagram className="w-4 h-4" />
            <span className="text-xs font-medium">Instagram</span>
          </div>
          <Badge className={kpis.ig_connected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
            {kpis.ig_connected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Distribution */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            Lead Distribution
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Hot Leads (70+)</span>
              <span className="text-sm font-semibold text-emerald-600">{lead_distribution.hot}</span>
            </div>
            <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (lead_distribution.hot / Math.max(1, kpis.total_conversations)) * 100)}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Warm Leads (30-69)</span>
              <span className="text-sm font-semibold text-amber-600">{lead_distribution.warm}</span>
            </div>
            <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (lead_distribution.warm / Math.max(1, kpis.total_conversations)) * 100)}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Cold Leads (&lt;30)</span>
              <span className="text-sm font-semibold text-neutral-500">{lead_distribution.cold}</span>
            </div>
            <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div className="h-full bg-neutral-400 rounded-full" style={{ width: `${Math.min(100, (lead_distribution.cold / Math.max(1, kpis.total_conversations)) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Deal Funnel */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Deal Pipeline
          </h3>
          <div className="space-y-2">
            {stages.map((stage) => (
              <div key={stage} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-neutral-600 capitalize">{stage}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(100, ((deal_funnel[stage] || 0) / Math.max(1, kpis.total_conversations)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-neutral-900 w-8 text-right">{deal_funnel[stage] || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-500" />
          Recent Conversations
        </h3>
        {recent_conversations.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-4">No conversations yet</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {recent_conversations.map((conv) => (
              <div key={conv.sender_id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                    {(conv.username || conv.sender_id).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">@{conv.username || conv.sender_id}</p>
                    <p className="text-xs text-neutral-500 truncate max-w-[200px]">{conv.lastMessage}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {conv.tags?.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                  <Badge className={getScoreColor(conv.lead_score)}>
                    {conv.lead_score}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
