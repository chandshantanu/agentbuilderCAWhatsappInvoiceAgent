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
  CheckCircle2,
  XCircle,
  Image,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/apiClient';

/** Strip raw JSON that comment pipeline stores before display was added. */
function cleanMessage(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    try {
      const p = JSON.parse(trimmed);
      return p.comment_reply_text || p.dm_greeting_text || p.generated_response || text;
    } catch { /* not JSON */ }
  }
  return text;
}

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

/* ─── Glass card wrapper ────────────────────────────────────── */

function GlassCard({
  children,
  className = '',
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(24px) saturate(200%)',
        WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '1rem',
        boxShadow:
          '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        transition: 'box-shadow 300ms ease, border-color 300ms ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          'rgba(255,255,255,0.14)';
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          'rgba(255,255,255,0.09)';
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)';
      }}
    >
      {children}
    </div>
  );
}

/* ─── KPI Card config ───────────────────────────────────────── */

const KPI_CONFIG = [
  {
    key: 'conversations',
    label: 'Conversations',
    Icon: MessageCircle,
    gradient: 'linear-gradient(135deg, rgba(167,139,250,0.25) 0%, rgba(129,140,248,0.1) 100%)',
    iconColor: '#A78BFA',
    glow: '0 0 16px rgba(167,139,250,0.5)',
    textGradient: 'linear-gradient(135deg, #A78BFA 0%, #C4B5FD 100%)',
    borderAccent: 'rgba(167,139,250,0.2)',
  },
  {
    key: 'products',
    label: 'Products',
    Icon: ShoppingBag,
    gradient: 'linear-gradient(135deg, rgba(34,211,238,0.2) 0%, rgba(96,165,250,0.08) 100%)',
    iconColor: '#22D3EE',
    glow: '0 0 16px rgba(34,211,238,0.45)',
    textGradient: 'linear-gradient(135deg, #22D3EE 0%, #67E8F9 100%)',
    borderAccent: 'rgba(34,211,238,0.2)',
  },
  {
    key: 'kb',
    label: 'KB Articles',
    Icon: BookOpen,
    gradient: 'linear-gradient(135deg, rgba(52,211,153,0.2) 0%, rgba(34,211,238,0.08) 100%)',
    iconColor: '#34D399',
    glow: '0 0 16px rgba(52,211,153,0.45)',
    textGradient: 'linear-gradient(135deg, #34D399 0%, #6EE7B7 100%)',
    borderAccent: 'rgba(52,211,153,0.2)',
  },
  {
    key: 'ig',
    label: 'Instagram',
    Icon: Instagram,
    gradient: 'linear-gradient(135deg, rgba(244,114,182,0.2) 0%, rgba(167,139,250,0.08) 100%)',
    iconColor: '#F472B6',
    glow: '0 0 16px rgba(244,114,182,0.45)',
    textGradient: 'linear-gradient(135deg, #F472B6 0%, #FBCFE8 100%)',
    borderAccent: 'rgba(244,114,182,0.2)',
  },
];

/* ─── Glowing progress bar ──────────────────────────────────── */

function GlowBar({
  pct,
  color,
  glowColor,
}: {
  pct: number;
  color: string;
  glowColor: string;
}) {
  return (
    <div
      className="w-full h-2.5 rounded-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.06)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.min(100, pct)}%`,
          background: color,
          boxShadow: glowColor,
        }}
      />
    </div>
  );
}

/* ─── Stage color map ───────────────────────────────────────── */

const stageConfig: Record<
  string,
  { fill: string; glow: string; label: string }
> = {
  new:         { fill: 'linear-gradient(90deg, #60A5FA, #818CF8)', glow: '0 0 8px rgba(96,165,250,0.5)',   label: 'New' },
  qualified:   { fill: 'linear-gradient(90deg, #A78BFA, #C4B5FD)', glow: '0 0 8px rgba(167,139,250,0.5)', label: 'Qualified' },
  proposal:    { fill: 'linear-gradient(90deg, #22D3EE, #67E8F9)', glow: '0 0 8px rgba(34,211,238,0.5)',  label: 'Proposal' },
  negotiation: { fill: 'linear-gradient(90deg, #FBBF24, #FDE68A)', glow: '0 0 8px rgba(251,191,36,0.5)',  label: 'Negotiation' },
  won:         { fill: 'linear-gradient(90deg, #34D399, #6EE7B7)', glow: '0 0 8px rgba(52,211,153,0.5)',  label: 'Won' },
  lost:        { fill: 'linear-gradient(90deg, #FB7185, #FCA5A5)', glow: '0 0 8px rgba(251,113,133,0.5)', label: 'Lost' },
};

/* ─── Score badge ────────────────────────────────────────────── */

function ScoreBadge({ score }: { score: number }) {
  const isHot  = score >= 70;
  const isWarm = score >= 30;

  const style = isHot
    ? {
        background: 'rgba(52,211,153,0.15)',
        color: '#34D399',
        border: '1px solid rgba(52,211,153,0.3)',
        boxShadow: '0 0 8px rgba(52,211,153,0.25)',
      }
    : isWarm
    ? {
        background: 'rgba(251,191,36,0.12)',
        color: '#FBBF24',
        border: '1px solid rgba(251,191,36,0.25)',
      }
    : {
        background: 'rgba(148,163,184,0.1)',
        color: '#94A3B8',
        border: '1px solid rgba(148,163,184,0.15)',
      };

  return (
    <span
      className="text-sm font-semibold px-2.5 py-1 rounded-full"
      style={style}
    >
      {score}
    </span>
  );
}

/* ─── Main component ─────────────────────────────────────────── */

export default function DashboardOverview({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unmappedPosts, setUnmappedPosts] = useState(0);

  useEffect(() => {
    apiClient
      .get('/api/dashboard/overview')
      .then((resp: any) => setData(resp.data))
      .catch((err: any) => console.error('Failed to load overview:', err))
      .finally(() => setLoading(false));

    apiClient
      .get('/api/posts/unmapped-count')
      .then((resp: any) => setUnmappedPosts(resp.data?.count ?? 0))
      .catch(() => { /* non-blocking */ });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: '#A78BFA' }}
          />
          <span className="text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>
            Loading dashboard...
          </span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="text-center py-10 text-base"
        style={{ color: 'rgba(148,163,184,0.5)' }}
      >
        Failed to load dashboard data
      </div>
    );
  }

  const { kpis, deal_funnel, lead_distribution, recent_conversations } = data;
  const total = Math.max(1, kpis.total_conversations);

  const kpiValues = [
    kpis.total_conversations,
    kpis.total_products,
    kpis.total_kb_articles,
    null, // ig_connected — special badge
  ];

  const stages = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

  return (
    <div className="space-y-6">

      {/* ── Unmapped Posts Banner ─────────────────────────────── */}
      {unmappedPosts > 0 && (
        <div
          className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl cursor-pointer"
          style={{
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.25)',
          }}
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('dashboard:navigate-tab', { detail: { tabId: 'posts' } })
            )
          }
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#FBBF24' }} />
            <span className="text-sm font-medium" style={{ color: '#FDE68A' }}>
              {unmappedPosts} new post{unmappedPosts !== 1 ? 's' : ''} need product tagging
              — link each post to the right SKU so the AI can answer buyers accurately
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0" style={{ color: '#FBBF24' }}>
            <span className="text-xs font-semibold">Tag Posts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* ── KPI Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {KPI_CONFIG.map((cfg, idx) => (
          <GlassCard
            key={cfg.key}
            className="p-5"
            style={{ borderColor: cfg.borderAccent }}
          >
            {/* Icon container with gradient bg */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: cfg.gradient,
                  boxShadow: cfg.glow,
                  border: `1px solid ${cfg.borderAccent}`,
                }}
              >
                <cfg.Icon
                  className="w-5 h-5"
                  style={{ color: cfg.iconColor, filter: `drop-shadow(0 0 4px ${cfg.iconColor}80)` }}
                />
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: 'rgba(148,163,184,0.8)' }}
              >
                {cfg.label}
              </span>
            </div>

            {/* Value */}
            {cfg.key === 'ig' ? (
              <div className="flex items-center gap-2 mt-1">
                {kpis.ig_connected ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" style={{ color: '#34D399' }} />
                    <span
                      className="text-base font-semibold"
                      style={{ color: '#34D399' }}
                    >
                      Connected
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5" style={{ color: '#FB7185' }} />
                    <span
                      className="text-base font-semibold"
                      style={{ color: '#FB7185' }}
                    >
                      Disconnected
                    </span>
                  </>
                )}
              </div>
            ) : (
              <p
                className="text-4xl font-bold tracking-tight"
                style={{
                  background: cfg.textGradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {kpiValues[idx]}
              </p>
            )}
          </GlassCard>
        ))}
      </div>

      {/* ── Lead Distribution + Deal Pipeline ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

        {/* Lead Distribution */}
        <GlassCard className="p-6">
          <h3 className="text-base font-semibold mb-5 flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'rgba(251,191,36,0.15)',
                border: '1px solid rgba(251,191,36,0.25)',
                boxShadow: '0 0 12px rgba(251,191,36,0.2)',
              }}
            >
              <Flame
                className="w-4 h-4"
                style={{ color: '#FBBF24', filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.8))' }}
              />
            </div>
            <span style={{ color: '#E2E8F0' }}>Lead Distribution</span>
          </h3>

          <div className="space-y-5">
            {/* Hot */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'rgba(148,163,184,0.8)' }}>
                  Hot Leads (70+)
                </span>
                <span
                  className="text-sm font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #34D399, #6EE7B7)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {lead_distribution.hot}
                </span>
              </div>
              <GlowBar
                pct={(lead_distribution.hot / total) * 100}
                color="linear-gradient(90deg, #34D399, #6EE7B7)"
                glowColor="0 0 8px rgba(52,211,153,0.5), 0 2px 12px rgba(52,211,153,0.2)"
              />
            </div>

            {/* Warm */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'rgba(148,163,184,0.8)' }}>
                  Warm Leads (30-69)
                </span>
                <span
                  className="text-sm font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #FBBF24, #FDE68A)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {lead_distribution.warm}
                </span>
              </div>
              <GlowBar
                pct={(lead_distribution.warm / total) * 100}
                color="linear-gradient(90deg, #FBBF24, #FDE68A)"
                glowColor="0 0 8px rgba(251,191,36,0.5), 0 2px 12px rgba(251,191,36,0.2)"
              />
            </div>

            {/* Cold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'rgba(148,163,184,0.8)' }}>
                  Cold Leads (&lt;30)
                </span>
                <span className="text-sm font-bold" style={{ color: '#94A3B8' }}>
                  {lead_distribution.cold}
                </span>
              </div>
              <GlowBar
                pct={(lead_distribution.cold / total) * 100}
                color="linear-gradient(90deg, #64748B, #94A3B8)"
                glowColor="0 0 6px rgba(100,116,139,0.35)"
              />
            </div>
          </div>
        </GlassCard>

        {/* Deal Pipeline */}
        <GlassCard className="p-6">
          <h3 className="text-base font-semibold mb-5 flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'rgba(34,211,238,0.15)',
                border: '1px solid rgba(34,211,238,0.25)',
                boxShadow: '0 0 12px rgba(34,211,238,0.2)',
              }}
            >
              <TrendingUp
                className="w-4 h-4"
                style={{ color: '#22D3EE', filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.8))' }}
              />
            </div>
            <span style={{ color: '#E2E8F0' }}>Deal Pipeline</span>
          </h3>

          <div className="space-y-3">
            {stages.map((stage) => {
              const cfg = stageConfig[stage] ?? {
                fill: 'linear-gradient(90deg, #94A3B8, #CBD5E1)',
                glow: '0 0 6px rgba(148,163,184,0.3)',
                label: stage,
              };
              const count = deal_funnel[stage] || 0;
              const pct = (count / total) * 100;

              return (
                <div key={stage} className="flex items-center gap-3 py-1">
                  <span
                    className="text-sm w-24 shrink-0 capitalize"
                    style={{ color: 'rgba(148,163,184,0.75)' }}
                  >
                    {cfg.label}
                  </span>
                  <div className="flex-1">
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          background: cfg.fill,
                          boxShadow: cfg.glow,
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className="text-sm font-semibold w-6 text-right shrink-0"
                    style={{ color: '#E2E8F0' }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* ── Recent Conversations ─────────────────────────────── */}
      <GlassCard className="p-6">
        <h3 className="text-base font-semibold mb-5 flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'rgba(167,139,250,0.15)',
              border: '1px solid rgba(167,139,250,0.25)',
              boxShadow: '0 0 12px rgba(167,139,250,0.2)',
            }}
          >
            <Users
              className="w-4 h-4"
              style={{ color: '#A78BFA', filter: 'drop-shadow(0 0 4px rgba(167,139,250,0.8))' }}
            />
          </div>
          <span style={{ color: '#E2E8F0' }}>Recent Conversations</span>
        </h3>

        {recent_conversations.length === 0 ? (
          <p
            className="text-sm text-center py-8"
            style={{ color: 'rgba(148,163,184,0.5)' }}
          >
            No conversations yet
          </p>
        ) : (
          <div className="space-y-1">
            {recent_conversations.map((conv, idx) => (
              <div
                key={conv.sender_id}
                className="flex items-center justify-between py-3.5 px-3 rounded-xl transition-all duration-200 cursor-pointer"
                style={{
                  borderBottom:
                    idx < recent_conversations.length - 1
                      ? '1px solid rgba(255,255,255,0.05)'
                      : 'none',
                }}
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('dashboard:navigate-tab', { detail: { tabId: 'conversations' } })
                  );
                  window.dispatchEvent(
                    new CustomEvent('dashboard:open-conversation', { detail: { senderId: conv.sender_id } })
                  );
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLDivElement).style.borderBottom =
                    '1px solid transparent';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    'transparent';
                  (e.currentTarget as HTMLDivElement).style.borderBottom =
                    idx < recent_conversations.length - 1
                      ? '1px solid rgba(255,255,255,0.05)'
                      : 'none';
                }}
              >
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                    style={{
                      background:
                        'linear-gradient(135deg, #F472B6 0%, #A78BFA 50%, #60A5FA 100%)',
                      boxShadow:
                        '0 0 16px rgba(167,139,250,0.3), 0 0 8px rgba(244,114,182,0.2)',
                    }}
                  >
                    {(conv.username || conv.sender_id).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: '#E2E8F0' }}
                    >
                      @{conv.username || conv.sender_id}
                    </p>
                    <p
                      className="text-xs truncate max-w-[280px] mt-0.5"
                      style={{ color: 'rgba(148,163,184,0.6)' }}
                    >
                      {cleanMessage(conv.lastMessage)}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1.5 shrink-0 ml-2 sm:ml-4 flex-wrap justify-end max-w-[160px] sm:max-w-none">
                  {conv.tags?.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full hidden sm:inline-block"
                      style={{
                        background: 'rgba(167,139,250,0.1)',
                        color: '#C4B5FD',
                        border: '1px solid rgba(167,139,250,0.2)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                  <ScoreBadge score={conv.lead_score} />
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
