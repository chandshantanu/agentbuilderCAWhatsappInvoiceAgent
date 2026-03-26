import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Send, Bot, User, Instagram, Search, Loader2, X,
  Pause, Play, Brain, ChevronDown, ChevronRight, Flame, Target,
  TrendingUp, AlertCircle, Clock, Zap, Star, ArrowRight, ArrowLeft,
  Calendar, MessageSquare, CheckCircle, XCircle, Lightbulb,
  BarChart2, Heart, DollarSign, Eye, RefreshCw, Sparkles,
  Check, CheckCheck, ShoppingCart, Package, AtSign, Hash,
  MessageSquareDot, Image as ImageIcon, Filter, Mic2, Globe,
  Cpu, UserCircle2, Film, Layers, SplitSquareHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';

// ── Types ─────────────────────────────────────────────────────

interface MessageMetadata {
  response_mode?: string;
  governor_reason?: string;
  intent?: string;
  stage?: string;
  lead_score?: number;
  products_referenced?: string[];
  kb_articles_used?: string[];
  tags?: string[];
  trigger?: string;
  internal_assessment?: string;
  selling_strategy?: string;
  suggested_question?: string;
  emotional_state?: string;
  lead_priority?: string;
}

interface InstagramMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source?: string;
  metadata?: MessageMetadata;
  send_status?: 'sent' | 'failed' | 'unknown' | 'rate_limited';
  send_error?: string;
  send_error_code?: number;
  delivery_status?: 'sent' | 'delivered' | 'read' | 'failed' | 'not_sent';
}

interface CartItem {
  product_id: string;
  name: string;
  price: number;
  qty: number;
  size?: string;
  variant?: string;
  image_url?: string;
  added_at?: string;
}

interface InstagramConversation {
  id: string;
  sender_id?: string;
  username?: string;
  full_name?: string;
  lastMessage?: string;
  updated_at?: string;
  messages: InstagramMessage[];
  tags?: string[];
  sentiment?: string;
  lead_score?: number;
  deal_stage?: string;
  ai_paused?: boolean;
  conversation_stage?: string;
  notes?: Array<{ id: string; text: string; created_at: string }>;
  cart?: CartItem[];
  trigger_context?: string;
  /** Origin of first contact: "dm" | "comment" | "story_reply" | "reel_share" | "ad_click" | "mention" */
  source?: string;
  /** Products linked to the post that triggered this conversation */
  post_products?: Array<{ name: string; price?: string | number; sku?: string }>;
  /** Classified intent of the triggering comment: "purchase_intent" | "soft_engagement" | "general" | "spam" */
  comment_intent?: string;
  /** Post type from Instagram (IMAGE, VIDEO, REEL, CAROUSEL_ALBUM) */
  post_type?: string;
  /** Caption of the post that triggered this conversation */
  post_caption?: string;
}

type EngagementFilter = 'all' | 'dm' | 'comment' | 'mention' | 'away_game';

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

interface Qualification {
  completeness: number;
  business_type: string;
  niche: string;
  instagram_followers: string;
  daily_dm_volume: string;
  current_pain: string;
  purchase_timeline: string;
  budget_signals: string;
  buying_readiness: number;
  communication_style: string;
  price_sensitivity: string;
  key_motivator: string;
  objections: string[];
  interests: string[];
  personal_details: string;
}

interface NextAction {
  next_question_topic: string;
  latest_strategy: string;
  latest_assessment: string;
  suggested_question: string;
  emotional_state: string;
  lead_priority: string;
}

interface FollowUpEntry {
  scheduled_at: string;
  follow_up_number: number;
  stage: string;
  source: string;
}

interface ScorePoint {
  timestamp: string;
  score: number;
  stage: string;
}

interface ReasoningTrace {
  decision_factors?: string[];
  alternatives_considered?: string[];
  research_basis?: string;
  confidence_level?: number;
  next_best_action?: string;
  lead_temperature?: string;
  avg_response_hours?: number;
  temperature_reasoning?: string;
  context_snapshot?: Record<string, unknown>;
}

interface StrategistEntry {
  timestamp: string;
  text_preview: string;
  internal_assessment: string;
  selling_strategy: string;
  suggested_question: string;
  emotional_state: string;
  lead_priority: string;
  lead_temperature?: string;
  stage: string;
  intent: string;
  source?: string;
  reasoning_trace?: ReasoningTrace;
  timing_reasoning?: string;
}

interface Intelligence {
  sender_id: string;
  username: string;
  lead_score: number;
  conversation_stage: string;
  qualification: Qualification;
  next_action: NextAction;
  follow_up_schedule: FollowUpEntry[];
  score_trajectory: ScorePoint[];
  stage_progression: Array<{ stage: string; timestamp: string }>;
  strategist_log: StrategistEntry[];
  opted_out: boolean;
  disengaged: boolean;
  ai_paused: boolean;
  tags: string[];
  last_sender: string;
  last_agent_message_at: string;
  scope?: string;
  messages_analysed?: number;
  total_messages?: number;
}

// ── Helpers ────────────────────────────────────────────────────

const formatTime = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

const scoreColor = (score: number) =>
  score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-slate-500';

const scoreBg = (score: number) =>
  score >= 70 ? 'bg-emerald-500/10 border-emerald-500/30' : score >= 40 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10';

const priorityColor = (p?: string) => {
  switch (p) {
    case 'high': return 'bg-red-500/20 text-red-400';
    case 'medium': return 'bg-amber-500/20 text-amber-400';
    default: return 'bg-white/10 text-slate-400';
  }
};

const emotionIcon = (e?: string) => {
  switch (e) {
    case 'excited': return '🔥';
    case 'hesitant': return '🤔';
    case 'frustrated': return '😤';
    case 'curious': return '🧐';
    case 'impatient': return '⚡';
    case 'skeptical': return '🤨';
    default: return '😐';
  }
};

/**
 * Cleans up legacy raw-JSON message text produced when output_json_fields parsing
 * succeeded but generated_response wasn't overwritten before store_conversation ran.
 * Extracts dm_greeting_text or comment_reply_text from the JSON, falls back to raw text.
 */
const cleanMessageText = (text: string): string => {
  if (!text || !text.trimStart().startsWith('{')) return text;
  try {
    const parsed = JSON.parse(text);
    return parsed.dm_greeting_text || parsed.comment_reply_text || text;
  } catch {
    return text;
  }
};

/** Returns icon + color for conversation source/origin */
const sourceLabel = (source?: string): { label: string; color: string } => {
  switch (source) {
    case 'comment': return { label: 'Comment', color: 'text-blue-400' };
    case 'mention': return { label: 'Mention', color: 'text-pink-400' };
    case 'story_reply': return { label: 'Story', color: 'text-amber-400' };
    case 'reel_share': return { label: 'Reel', color: 'text-purple-400' };
    case 'ad_click': return { label: 'Ad', color: 'text-emerald-400' };
    default: return { label: 'DM', color: 'text-slate-400' };
  }
};

/** Maps engagement filter to source field values */
const filterToSources: Record<EngagementFilter, string[]> = {
  all: [],
  dm: ['dm', ''],
  comment: ['comment'],
  mention: ['mention'],
  away_game: ['away_game', 'cross_post_mention'],
};

const engagementFilterTabs: Array<{ id: EngagementFilter; label: string; icon: React.ElementType }> = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'dm', label: 'DMs', icon: MessageCircle },
  { id: 'comment', label: 'Comments', icon: MessageSquareDot },
  { id: 'mention', label: 'Mentions', icon: AtSign },
  { id: 'away_game', label: 'Away', icon: Globe },
];

const intentLabel = (intent?: string): { label: string; color: string; bg: string } => {
  switch (intent) {
    case 'purchase_intent': return { label: 'Purchase Intent', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' };
    case 'soft_engagement': return { label: 'Soft Engagement', color: 'text-sky-400', bg: 'bg-sky-500/20 border-sky-500/30' };
    case 'general': return { label: 'General', color: 'text-slate-400', bg: 'bg-white/10 border-white/20' };
    case 'spam': return { label: 'Spam', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' };
    default: return { label: 'Unknown', color: 'text-slate-500', bg: 'bg-white/5 border-white/10' };
  }
};

const postTypeBadge = (postType?: string): { label: string; icon: React.ElementType; color: string } => {
  switch (postType?.toUpperCase()) {
    case 'REEL': return { label: 'Reel', icon: Film, color: 'text-purple-400' };
    case 'VIDEO': return { label: 'Video', icon: Film, color: 'text-blue-400' };
    case 'CAROUSEL_ALBUM': return { label: 'Carousel', icon: SplitSquareHorizontal, color: 'text-pink-400' };
    default: return { label: 'Post', icon: ImageIcon, color: 'text-slate-400' };
  }
};

const personalitySummary = (p?: PersonalityProfile | null): string => {
  if (!p) return '';
  const parts: string[] = [];
  const toneMap: Record<string, string> = {
    casual_hinglish: 'Casual Hinglish',
    formal_english: 'Formal',
    fun_playful: 'Playful',
    professional: 'Professional',
    warm_friendly: 'Warm',
  };
  if (p.tone && toneMap[p.tone]) parts.push(toneMap[p.tone]);
  const emojiMap: Record<string, string> = { heavy: '🔥🔥', moderate: '✨', minimal: '🙂', none: 'No emoji' };
  if (p.emoji_usage && emojiMap[p.emoji_usage]) parts.push(emojiMap[p.emoji_usage]);
  return parts.join(' · ');
};

const stageColor = (stage?: string) => {
  const map: Record<string, string> = {
    greeting: 'bg-white/10 text-slate-400',
    discovery: 'bg-blue-500/20 text-blue-400',
    recommendation: 'bg-purple-500/20 text-purple-400',
    objection_handling: 'bg-orange-500/20 text-orange-400',
    closing: 'bg-green-500/20 text-green-400',
    follow_up: 'bg-sky-500/20 text-sky-400',
    nurturing: 'bg-pink-500/20 text-pink-400',
    win_back: 'bg-violet-500/20 text-violet-400',
    churned: 'bg-red-500/20 text-red-400',
  };
  return map[stage || ''] || 'bg-white/10 text-slate-400';
};

// ── Intelligence Sidebar ───────────────────────────────────────

function IntelligenceSidebar({
  conversation,
  intelligence,
  loadingIntel,
  personalityProfile,
}: {
  conversation: InstagramConversation;
  intelligence: Intelligence | null;
  loadingIntel: boolean;
  personalityProfile?: PersonalityProfile | null;
}) {
  const [activeSection, setActiveSection] = useState<string>('plan');

  if (loadingIntel) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const q = intelligence?.qualification;
  const next = intelligence?.next_action;
  const stage = intelligence?.conversation_stage || conversation.conversation_stage;
  const score = intelligence?.lead_score ?? conversation.lead_score ?? 0;

  const sections = [
    { id: 'plan', label: "Plan", icon: Brain },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'followups', label: 'Follow-ups', icon: Calendar },
    { id: 'reasoning', label: 'Reasoning', icon: BarChart2 },
    { id: 'engagement', label: 'Engagement', icon: Cpu },
  ];

  return (
    <div className="flex flex-col h-full bg-[#070B14]/50">
      {/* Score header */}
      <div className={cn('p-4 border-b', scoreBg(score))}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Lead Intelligence</span>
          <div className="flex items-center gap-1">
            {intelligence?.scope && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-medium">
                {intelligence.scope === 'all'
                  ? `all ${intelligence.total_messages || ''}msgs`
                  : `last ${intelligence.messages_analysed || 50}`}
              </span>
            )}
            <Badge className={cn('text-xs', stageColor(stage))}>
              {stage?.replace('_', ' ') || 'greeting'}
            </Badge>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <div className={cn('text-3xl font-bold', scoreColor(score))}>{score}</div>
            <div className="text-xs text-slate-500">Lead Score</div>
          </div>
          {score > 0 && (
            <div className="flex-1 mb-1">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700',
                    score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-slate-600'
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                <span>Cold</span><span>Warm</span><span>Hot</span>
              </div>
            </div>
          )}
        </div>
        {q && q.completeness > 0 && (
          <div className="mt-2 text-xs text-slate-500">
            Qualification: <span className="font-medium text-slate-200">{q.completeness}% complete</span>
          </div>
        )}
        {intelligence?.opted_out && (
          <Badge className="mt-2 bg-red-500/20 text-red-400 text-xs">Opted Out</Badge>
        )}
        {intelligence?.disengaged && !intelligence.opted_out && (
          <Badge className="mt-2 bg-orange-500/20 text-orange-400 text-xs">Disengaged</Badge>
        )}
        {intelligence?.last_sender === 'assistant' && intelligence?.last_agent_message_at && (
          <div className="mt-2 flex items-center gap-1 text-xs text-amber-400">
            <Clock className="w-3 h-3" />
            Agent waiting — {formatTime(intelligence.last_agent_message_at)}
          </div>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex border-b border-white/10 bg-white/5 overflow-x-auto">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2',
              activeSection === id
                ? 'border-violet-400 text-violet-300 bg-violet-500/10'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">

          {/* ── Agent's Plan ── */}
          {activeSection === 'plan' && (
            <div className="space-y-3">
              {next?.latest_assessment && (
                <div className="bg-violet-500/10 rounded-xl border border-violet-500/20 p-3">
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-violet-300">
                    <Eye className="w-3.5 h-3.5" />
                    Internal Assessment
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    "{next.latest_assessment}"
                  </p>
                  {next.lead_priority && (
                    <Badge className={cn('mt-2 text-xs', priorityColor(next.lead_priority))}>
                      {next.lead_priority} priority
                    </Badge>
                  )}
                </div>
              )}

              {next?.latest_strategy && (
                <div className="bg-blue-500/10 rounded-xl border border-blue-500/20 p-3">
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-blue-300">
                    <Target className="w-3.5 h-3.5" />
                    Current Strategy
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{next.latest_strategy}</p>
                </div>
              )}

              {next?.suggested_question && (
                <div className="bg-amber-500/10 rounded-xl border border-amber-500/25 p-3">
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-amber-300">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Next Question to Ask
                  </div>
                  <p className="text-xs text-amber-200 leading-relaxed font-medium">
                    "{next.suggested_question}"
                  </p>
                </div>
              )}

              {next?.emotional_state && next.emotional_state !== 'neutral' && (
                <div className="bg-white/5 rounded-xl border border-white/10 p-3">
                  <div className="text-xs font-medium text-slate-400 mb-1">Customer Mood</div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{emotionIcon(next.emotional_state)}</span>
                    <span className="text-sm font-medium text-slate-200 capitalize">
                      {next.emotional_state}
                    </span>
                  </div>
                </div>
              )}

              {/* Products mentioned across this conversation */}
              {(() => {
                const mentioned = new Map<string, number>();
                (conversation.messages || []).forEach(m => {
                  (m.metadata?.products_referenced || []).forEach(p => {
                    if (p) mentioned.set(p, (mentioned.get(p) || 0) + 1);
                  });
                });
                if (mentioned.size === 0) return null;
                const sorted = [...mentioned.entries()].sort((a, b) => b[1] - a[1]);
                return (
                  <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-3">
                    <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-emerald-300">
                      <Package className="w-3.5 h-3.5" />
                      Products Referenced
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sorted.slice(0, 6).map(([name, count]) => (
                        <span key={name} className="text-xs bg-emerald-500/10 text-emerald-200 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          {name}
                          {count > 1 && <span className="ml-1 opacity-60">×{count}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Post products (comment origin) */}
              {conversation.post_products && conversation.post_products.length > 0 && (
                <div className="bg-blue-500/10 rounded-xl border border-blue-500/20 p-3">
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-blue-300">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Post Products (comment origin)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {conversation.post_products.slice(0, 4).map((p, i) => (
                      <span key={i} className="text-xs bg-blue-500/10 text-blue-200 border border-blue-500/20 px-2 py-0.5 rounded-full">
                        {p.name}{p.price ? ` · ₹${p.price}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!next?.latest_assessment && !next?.latest_strategy && (
                <div className="text-center py-8 text-slate-500">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Agent reasoning will appear here after the next conversation.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Lead Profile ── */}
          {activeSection === 'profile' && (
            <div className="space-y-3">
              {q?.business_type && (
                <div className="bg-white/5 rounded-xl border border-white/10 p-3 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Business</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {q.business_type && <Row label="Type" value={q.business_type} />}
                    {q.niche && <Row label="Niche" value={q.niche} />}
                    {q.instagram_followers && <Row label="Followers" value={q.instagram_followers} />}
                    {q.daily_dm_volume && <Row label="Daily DMs" value={q.daily_dm_volume} />}
                  </div>
                </div>
              )}

              {(q?.current_pain || q?.purchase_timeline) && (
                <div className="bg-white/5 rounded-xl border border-white/10 p-3 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Buying Signals</div>
                  {q.current_pain && (
                    <div>
                      <div className="text-xs text-slate-500 mb-0.5">Pain Point</div>
                      <div className="text-xs text-slate-200 font-medium">{q.current_pain}</div>
                    </div>
                  )}
                  {q.purchase_timeline && (
                    <div>
                      <div className="text-xs text-slate-500 mb-0.5">Timeline</div>
                      <div className="text-xs text-slate-200 font-medium">{q.purchase_timeline}</div>
                    </div>
                  )}
                  {q.budget_signals && (
                    <div>
                      <div className="text-xs text-slate-500 mb-0.5">Budget</div>
                      <div className="text-xs text-slate-200 font-medium">{q.budget_signals}</div>
                    </div>
                  )}
                </div>
              )}

              {q?.buying_readiness != null && q.buying_readiness > 0 && (
                <div className="bg-white/5 rounded-xl border border-white/10 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Buying Readiness</div>
                    <span className={cn('text-sm font-bold',
                      q.buying_readiness >= 7 ? 'text-emerald-400' :
                      q.buying_readiness >= 4 ? 'text-amber-400' : 'text-slate-400'
                    )}>
                      {q.buying_readiness}/10
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn('flex-1 h-1.5 rounded-full',
                          i < q.buying_readiness
                            ? q.buying_readiness >= 7 ? 'bg-emerald-500' : q.buying_readiness >= 4 ? 'bg-amber-500' : 'bg-slate-600'
                            : 'bg-white/10'
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              {(q?.communication_style || q?.price_sensitivity || q?.key_motivator) && (
                <div className="bg-white/5 rounded-xl border border-white/10 p-3 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Psychology</div>
                  <div className="grid grid-cols-1 gap-1.5 text-xs">
                    {q.communication_style && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Style</span>
                        <Badge variant="outline" className="border-white/20 text-slate-300 text-xs capitalize">{q.communication_style}</Badge>
                      </div>
                    )}
                    {q.price_sensitivity && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Price Sensitivity</span>
                        <Badge variant="outline" className={cn('text-xs capitalize',
                          q.price_sensitivity === 'high' ? 'border-red-500/40 text-red-400' :
                          q.price_sensitivity === 'low' ? 'border-green-500/40 text-green-400' : 'border-white/20 text-slate-300'
                        )}>{q.price_sensitivity}</Badge>
                      </div>
                    )}
                    {q.key_motivator && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Motivated By</span>
                        <Badge variant="outline" className="border-white/20 text-slate-300 text-xs capitalize">{q.key_motivator}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {q?.objections && q.objections.length > 0 && (
                <div className="bg-red-500/10 rounded-xl border border-red-500/20 p-3">
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-red-400">
                    <XCircle className="w-3.5 h-3.5" />
                    Objections Raised
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {q.objections.map((obj, i) => (
                      <Badge key={i} className="bg-red-500/20 text-red-300 border border-red-500/30 text-xs">{obj}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {q?.interests && q.interests.length > 0 && (
                <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-3">
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Interests & Hooks
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {q.interests.map((int, i) => (
                      <Badge key={i} className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs">{int}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {q?.personal_details && (
                <div className="bg-white/5 rounded-xl border border-white/10 p-3">
                  <div className="text-xs font-medium text-slate-400 mb-1">Personal Context</div>
                  <p className="text-xs text-slate-300">{q.personal_details}</p>
                </div>
              )}

              {!q?.business_type && !q?.current_pain && (
                <div className="text-center py-8 text-slate-500">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Qualification data collected as the conversation progresses.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Follow-ups ── */}
          {activeSection === 'followups' && (
            <div className="space-y-3">
              {/* Stage timeline */}
              {intelligence?.stage_progression && intelligence.stage_progression.length > 0 && (
                <div className="bg-white/5 rounded-xl border border-white/10 p-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Stage Journey</div>
                  <div className="relative">
                    {intelligence.stage_progression.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
                        <div className={cn('w-2 h-2 rounded-full mt-0.5 flex-shrink-0', stageColor(s.stage).replace('text-', 'bg-').split(' ')[0])} />
                        <div className="flex-1">
                          <span className={cn('text-xs font-medium capitalize px-1.5 py-0.5 rounded', stageColor(s.stage))}>
                            {s.stage.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">{formatTime(s.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active follow-ups */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-3">
                <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <Calendar className="w-3.5 h-3.5" />
                  Scheduled Follow-ups
                </div>
                {intelligence?.follow_up_schedule && intelligence.follow_up_schedule.length > 0 ? (
                  <div className="space-y-2">
                    {intelligence.follow_up_schedule.map((fu, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-violet-500/10 rounded-lg px-3 py-2">
                        <div>
                          <div className="font-medium text-violet-300">Follow-up #{fu.follow_up_number}</div>
                          <div className="text-violet-400 capitalize">{fu.stage.replace('_', ' ')} stage</div>
                          {fu.source === 'watchdog' && (
                            <Badge className="mt-1 bg-amber-500/20 text-amber-400 text-xs">Proactive nudge</Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-violet-300 font-medium">{formatTime(fu.scheduled_at)}</div>
                          <div className="text-violet-400">scheduled</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-400">
                    <Clock className="w-6 h-6 mx-auto mb-1 opacity-30" />
                    <p className="text-xs">No follow-ups queued</p>
                    <p className="text-xs mt-0.5 text-slate-500">Watchdog will queue a nudge if the lead goes cold</p>
                  </div>
                )}
              </div>

              {/* Score trajectory mini chart */}
              {intelligence?.score_trajectory && intelligence.score_trajectory.length > 1 && (
                <div className="bg-white/5 rounded-xl border border-white/10 p-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Score Trajectory</div>
                  <div className="flex items-end gap-1 h-12">
                    {intelligence.score_trajectory.slice(-12).map((pt, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm transition-all"
                        style={{
                          height: `${Math.max(8, pt.score)}%`,
                          backgroundColor: pt.score >= 70 ? '#10b981' : pt.score >= 40 ? '#f59e0b' : '#d1d5db',
                        }}
                        title={`${pt.score} — ${pt.stage}`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Start</span>
                    <span>Latest: {intelligence.score_trajectory[intelligence.score_trajectory.length - 1]?.score ?? 0}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Engagement Context ── */}
          {activeSection === 'engagement' && (
            <div className="space-y-3">
              {/* Source type */}
              {conversation.source && (
                <div className="bg-white/5 rounded-xl border border-white/10 p-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Engagement Source</div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const { label, color } = sourceLabel(conversation.source);
                      const IconMap: Record<string, React.ElementType> = {
                        comment: MessageSquareDot, mention: AtSign, story_reply: ImageIcon,
                        reel_share: Film, away_game: Globe, dm: MessageCircle,
                      };
                      const Icon = IconMap[conversation.source] || MessageCircle;
                      return (
                        <>
                          <div className={`p-2 rounded-lg bg-white/10`}>
                            <Icon className={`w-4 h-4 ${color}`} />
                          </div>
                          <div>
                            <div className={`text-sm font-semibold ${color}`}>{label}</div>
                            <div className="text-xs text-slate-500 capitalize">{conversation.source?.replace('_', ' ')}</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Comment intent classification */}
              {conversation.comment_intent && conversation.comment_intent !== 'general' && (
                <div className={`rounded-xl border p-3 ${intentLabel(conversation.comment_intent).bg}`}>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Comment Intent</div>
                  <div className="flex items-center gap-2">
                    <Target className={`w-4 h-4 ${intentLabel(conversation.comment_intent).color}`} />
                    <span className={`text-sm font-semibold ${intentLabel(conversation.comment_intent).color}`}>
                      {intentLabel(conversation.comment_intent).label}
                    </span>
                  </div>
                  {conversation.comment_intent === 'soft_engagement' && (
                    <p className="text-xs text-slate-400 mt-2">
                      AI replied publicly on the post to encourage a follow. No DM was sent.
                    </p>
                  )}
                  {conversation.comment_intent === 'purchase_intent' && (
                    <p className="text-xs text-slate-400 mt-2">
                      Comment showed purchase signals. AI acknowledged publicly and moved to DM.
                    </p>
                  )}
                </div>
              )}

              {/* Post context */}
              {(conversation.post_type || conversation.post_caption) && (
                <div className="bg-white/5 rounded-xl border border-white/10 p-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Source Post</div>
                  {conversation.post_type && (() => {
                    const { label, icon: PostIcon, color } = postTypeBadge(conversation.post_type);
                    return (
                      <div className="flex items-center gap-1.5 mb-2">
                        <PostIcon className={`w-3.5 h-3.5 ${color}`} />
                        <span className={`text-xs font-medium ${color}`}>{label}</span>
                      </div>
                    );
                  })()}
                  {conversation.post_caption && (
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      "{conversation.post_caption.slice(0, 120)}{conversation.post_caption.length > 120 ? '…' : ''}"
                    </p>
                  )}
                </div>
              )}

              {/* Post products */}
              {conversation.post_products && conversation.post_products.length > 0 && (
                <div className="bg-blue-500/10 rounded-xl border border-blue-500/20 p-3">
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-blue-300">
                    <Package className="w-3.5 h-3.5" />
                    Products in Post
                  </div>
                  <div className="space-y-1">
                    {conversation.post_products.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">{p.name}</span>
                        {p.price && <span className="text-blue-300 font-medium">₹{p.price}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active personality */}
              {personalityProfile && Object.keys(personalityProfile).length > 0 ? (
                <div className="bg-violet-500/10 rounded-xl border border-violet-500/20 p-3">
                  <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-violet-300">
                    <UserCircle2 className="w-3.5 h-3.5" />
                    Active Personality
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {personalityProfile.tone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Tone</span>
                        <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs capitalize">
                          {personalityProfile.tone.replace('_', ' ')}
                        </Badge>
                      </div>
                    )}
                    {personalityProfile.emoji_usage && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Emoji</span>
                        <Badge className="bg-white/10 text-slate-300 border-white/20 text-xs capitalize">
                          {personalityProfile.emoji_usage}
                        </Badge>
                      </div>
                    )}
                    {personalityProfile.selling_style && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Style</span>
                        <Badge className="bg-white/10 text-slate-300 border-white/20 text-xs capitalize">
                          {personalityProfile.selling_style.replace('_', ' ')}
                        </Badge>
                      </div>
                    )}
                    {personalityProfile.signature_opener && (
                      <div className="mt-2">
                        <div className="text-slate-500 mb-0.5">Opens with</div>
                        <div className="text-slate-200 font-medium italic">"{personalityProfile.signature_opener}"</div>
                      </div>
                    )}
                    {personalityProfile.min_price && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-slate-500">Price Floor</span>
                        <span className="text-emerald-400 font-semibold">₹{personalityProfile.min_price.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <UserCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No personality profile configured.</p>
                  <p className="text-xs mt-0.5 text-slate-600">Set up your personality in Settings → Personality.</p>
                </div>
              )}

              {/* Trigger context raw */}
              {conversation.trigger_context && (
                <div className="bg-white/5 rounded-xl border border-white/10 p-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Raw Trigger</div>
                  <p className="text-xs text-slate-500 font-mono leading-relaxed">{conversation.trigger_context}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Reasoning Log ── */}
          {activeSection === 'reasoning' && (
            <div className="space-y-2">
              {intelligence?.strategist_log && intelligence.strategist_log.length > 0 ? (
                [...intelligence.strategist_log].reverse().map((entry, i) => (
                  <div key={i} className="bg-white/5 rounded-xl border border-white/10 p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{emotionIcon(entry.emotional_state)}</span>
                        <Badge className={cn('text-xs', stageColor(entry.stage))}>
                          {entry.stage?.replace('_', ' ')}
                        </Badge>
                        <Badge className={cn('text-xs', priorityColor(entry.lead_priority))}>
                          {entry.lead_priority}
                        </Badge>
                      </div>
                      <span className="text-slate-500">{formatTime(entry.timestamp)}</span>
                    </div>

                    {entry.text_preview && (
                      <div className="bg-white/5 rounded-lg px-2 py-1.5 text-slate-400 italic">
                        "{entry.text_preview}…"
                      </div>
                    )}

                    {entry.internal_assessment && (
                      <div>
                        <span className="font-medium text-violet-300">Assessment: </span>
                        <span className="text-slate-300">{entry.internal_assessment}</span>
                      </div>
                    )}

                    {entry.selling_strategy && (
                      <div>
                        <span className="font-medium text-blue-300">Strategy: </span>
                        <span className="text-slate-300">{entry.selling_strategy}</span>
                      </div>
                    )}

                    {entry.suggested_question && (
                      <div className="bg-amber-500/10 rounded px-2 py-1 border border-amber-500/20">
                        <span className="font-medium text-amber-300">Asked: </span>
                        <span className="text-amber-200">{entry.suggested_question}</span>
                      </div>
                    )}

                    {/* Full reasoning trace (v5.0+) */}
                    {entry.reasoning_trace && (
                      <details className="mt-1">
                        <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300 select-none">
                          Why this answer? ({entry.reasoning_trace.confidence_level ?? '?'}% confidence)
                        </summary>
                        <div className="mt-2 space-y-2 text-xs border-l-2 border-violet-500/30 pl-2">
                          {entry.reasoning_trace.decision_factors && entry.reasoning_trace.decision_factors.length > 0 && (
                            <div>
                              <p className="font-medium text-slate-400 mb-0.5">Data used:</p>
                              {entry.reasoning_trace.decision_factors.map((f, i) => (
                                <p key={i} className="text-slate-300">• {f}</p>
                              ))}
                            </div>
                          )}
                          {entry.reasoning_trace.alternatives_considered && entry.reasoning_trace.alternatives_considered.length > 0 && (
                            <div>
                              <p className="font-medium text-slate-400 mb-0.5">Alternatives rejected:</p>
                              {entry.reasoning_trace.alternatives_considered.map((a, i) => (
                                <p key={i} className="text-slate-500 line-through decoration-slate-600">• {a}</p>
                              ))}
                            </div>
                          )}
                          {entry.reasoning_trace.research_basis && (
                            <div className="bg-blue-500/10 rounded px-2 py-1 text-blue-400">
                              <p className="font-medium mb-0.5">Research basis:</p>
                              <p>{entry.reasoning_trace.research_basis}</p>
                            </div>
                          )}
                          {entry.reasoning_trace.next_best_action && (
                            <div className="bg-emerald-500/10 rounded px-2 py-1 text-emerald-400">
                              <p className="font-medium mb-0.5">If no reply:</p>
                              <p>{entry.reasoning_trace.next_best_action}</p>
                            </div>
                          )}
                          {entry.timing_reasoning && (
                            <div className="bg-violet-500/10 rounded px-2 py-1 text-violet-400">
                              <p className="font-medium mb-0.5">Follow-up timing:</p>
                              <p>{entry.timing_reasoning}</p>
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Reasoning log appears as the agent works through conversations.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-slate-500">{label}</div>
      <div className="font-medium text-slate-200 truncate">{value}</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

interface AnalysisStats {
  total_scanned: number;
  backfilled: number;
  already_complete: number;
  nudges_queued: number;
  nudges_skipped_already_queued: number;
  nudges_skipped_too_recent: number;
  nudges_skipped_low_score: number;
  backfill_details: Array<{ sender_id: string; username: string; fields: string[] }>;
  nudge_details: Array<{
    sender_id: string;
    username: string;
    stage: string;
    lead_score: number;
    silence_hours: number;
    threshold_hours: number;
  }>;
}

interface AnalysisResult {
  success: boolean;
  ran_at: string;
  stats: AnalysisStats;
}

export default function ConversationsPanel({ config }: { config: Record<string, unknown> }) {
  const [conversations, setConversations] = useState<InstagramConversation[]>([]);
  const [selected, setSelected] = useState<InstagramConversation | null>(null);
  const [intelligence, setIntelligence] = useState<Intelligence | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showIntel, setShowIntel] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [analyseScope, setAnalyseScope] = useState<'recent' | 'all'>('recent');
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [showScopeMenu, setShowScopeMenu] = useState(false);
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list');
  const [engagementFilter, setEngagementFilter] = useState<EngagementFilter>('all');
  const [personalityProfile, setPersonalityProfile] = useState<PersonalityProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const endpoint = (config?.endpoint as string) || '/api/conversations';

  // Load conversations
  useEffect(() => {
    setLoading(true);
    apiClient.get(endpoint)
      .then((resp: any) => {
        const raw = resp.data?.data || resp.data || [];
        setConversations(raw);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [endpoint]);

  // Load intelligence when conversation selected
  useEffect(() => {
    if (!selected) { setIntelligence(null); return; }
    const sid = selected.sender_id || selected.id;
    if (!sid) return;
    setLoadingIntel(true);
    apiClient.get(`/api/conversations/${sid}/intelligence?scope=all`)
      .then((resp: any) => setIntelligence(resp.data))
      .catch(() => setIntelligence(null))
      .finally(() => setLoadingIntel(false));
  }, [selected]);

  // Load personality profile once on mount
  useEffect(() => {
    apiClient.get('/api/settings/personality')
      .then((resp: any) => setPersonalityProfile(resp.data?.personality_profile || null))
      .catch(() => {}); // Non-critical — personality is a best-effort enhancement
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages]);

  const reloadSelectedConversation = useCallback(async (sid: string) => {
    try {
      const [msgResp, cartResp] = await Promise.allSettled([
        apiClient.get(`/api/conversations/${sid}/messages`),
        apiClient.get(`/api/conversations/${sid}/cart`),
      ]);
      const { conversation, messages } = msgResp.status === 'fulfilled' ? msgResp.value.data : { conversation: {}, messages: [] };
      const cart = cartResp.status === 'fulfilled' ? (cartResp.value.data?.data?.cart ?? []) : [];
      const updated = { ...conversation, messages, cart };
      setSelected(updated);
      setConversations(prev => prev.map(c => (c.sender_id || c.id) === sid ? { ...c, ...conversation } : c));
    } catch (err) {
      console.error('Reload failed:', err);
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!selected || !replyText.trim()) return;
    const sid = selected.sender_id || selected.id;
    const optimisticMsg: InstagramMessage = {
      id: `opt-${Date.now()}`,
      role: 'assistant',
      text: replyText,
      timestamp: new Date().toISOString(),
      source: 'human',
    };
    // Optimistic update — show message immediately
    setSelected(prev => prev ? { ...prev, messages: [...prev.messages, optimisticMsg] } : prev);
    setReplyText('');
    setSending(true);
    try {
      await apiClient.post(`/api/conversations/${sid}/reply`, { message: optimisticMsg.text });
      // Reload from server to get authoritative state
      await reloadSelectedConversation(sid);
    } catch (err) {
      console.error('Send failed:', err);
      // Rollback optimistic update on failure
      setSelected(prev => prev ? { ...prev, messages: prev.messages.filter(m => m.id !== optimisticMsg.id) } : prev);
    } finally {
      setSending(false);
    }
  }, [selected, replyText, reloadSelectedConversation]);

  const handleAiToggle = useCallback(async () => {
    if (!selected) return;
    const sid = selected.sender_id || selected.id;
    const newState = !selected.ai_paused;
    // Optimistic update
    setSelected(prev => prev ? { ...prev, ai_paused: newState } : prev);
    setConversations(prev => prev.map(c => (c.sender_id || c.id) === sid ? { ...c, ai_paused: newState } : c));
    try {
      await apiClient.put(`/api/conversations/${sid}/handoff`, { ai_paused: newState });
    } catch (err) {
      console.error('Handoff failed:', err);
      // Rollback on failure
      setSelected(prev => prev ? { ...prev, ai_paused: !newState } : prev);
      setConversations(prev => prev.map(c => (c.sender_id || c.id) === sid ? { ...c, ai_paused: !newState } : c));
    }
  }, [selected]);

  const handleAddNote = useCallback(async () => {
    if (!selected || !noteText.trim()) return;
    const sid = selected.sender_id || selected.id;
    setSavingNote(true);
    try {
      const resp = await apiClient.put(`/api/conversations/${sid}/notes`, { text: noteText });
      const note = resp.data?.note;
      if (note) {
        setSelected(prev => prev ? { ...prev, notes: [...(prev.notes || []), note] } : prev);
      }
      setNoteText('');
    } catch (err) {
      console.error('Add note failed:', err);
    } finally {
      setSavingNote(false);
    }
  }, [selected, noteText]);

  // Per-conversation analyse — recalculates lead score then loads full intelligence
  const handleRunAnalysis = useCallback(async (scope: 'recent' | 'all') => {
    if (!selected) return;
    const sid = selected.sender_id || selected.id;
    setAnalyseScope(scope);
    setShowScopeMenu(false);
    setRunningAnalysis(true);
    setShowIntel(true); // ensure sidebar is visible
    try {
      // Recalculate lead score from stored signals before fetching intelligence
      await apiClient.post(`/api/conversations/${sid}/recalculate-score`);
      const resp = await apiClient.get(`/api/conversations/${sid}/intelligence?scope=${scope}`);
      setIntelligence(resp.data);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setRunningAnalysis(false);
    }
  }, [selected]);

  const loadConversations = useCallback(async () => {
    try {
      const resp = await apiClient.get(endpoint);
      setConversations(resp.data?.data || resp.data || []);
    } catch (err) {
      console.error('Load conversations failed:', err);
    }
  }, [endpoint]);

  // Auto-refresh conversation list every 30s
  useEffect(() => {
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Auto-refresh messages for the open conversation every 5s
  useEffect(() => {
    if (!selected) return;
    const sid = selected.sender_id || selected.id;
    const msgInterval = setInterval(() => {
      reloadSelectedConversation(sid).catch(() => {}); // Silent fail — no error toast for background poll
    }, 5000);
    return () => clearInterval(msgInterval);
  }, [selected?.sender_id, reloadSelectedConversation]);

  const filteredConvs = conversations.filter(c => {
    const u = c.username || c.sender_id || '';
    const matchesSearch = u.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (engagementFilter === 'all') return true;
    const sources = filterToSources[engagementFilter];
    const src = c.source || 'dm';
    return sources.includes(src);
  });

  // Mini-funnel stats computed from all conversations
  const funnelStats = {
    total: conversations.length,
    engaged: conversations.filter(c => (c.messages?.length ?? 0) > 0).length,
    dmConversions: conversations.filter(c => c.source === 'comment' && (c.messages?.length ?? 0) > 1).length,
    hot: conversations.filter(c => (c.lead_score ?? 0) >= 70).length,
  };

  return (
    <div className={cn(
      "flex bg-white/5 rounded-xl border border-white/10 overflow-hidden relative",
      "h-[calc(100vh-6rem)] sm:h-[calc(100vh-8rem)] lg:h-[calc(100vh-10rem)]",
      "min-h-[400px] sm:min-h-[480px]",
      "max-h-[800px] sm:max-h-[920px]",
    )}>

      {/* ── Column 1: Conversation List ── */}
      <div className={cn(
        'flex-shrink-0 border-r border-white/10 flex flex-col',
        'w-full md:w-64 lg:w-72',
        mobilePane === 'chat' ? 'hidden md:flex' : 'flex'
      )}>
        <div className="border-b border-white/10">
          {/* Header row */}
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <Instagram className="w-4 h-4 text-pink-500 flex-shrink-0" />
            <span className="font-semibold text-sm">Engagement Hub</span>
            <Badge variant="secondary" className="ml-auto text-xs">{conversations.length}</Badge>
            <button
              onClick={loadConversations}
              title="Refresh"
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mini-funnel bar */}
          <div className="px-4 pb-2.5 flex items-center gap-3">
            {[
              { label: 'Total', value: funnelStats.total, color: 'text-slate-400' },
              { label: 'Active', value: funnelStats.engaged, color: 'text-blue-400' },
              { label: 'DM\'d', value: funnelStats.dmConversions, color: 'text-purple-400' },
              { label: '🔥 Hot', value: funnelStats.hot, color: 'text-emerald-400' },
            ].map(({ label, value, color }, i, arr) => (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center min-w-0">
                  <span className={`text-base font-bold leading-none ${color}`}>{value}</span>
                  <span className="text-xs text-slate-500 mt-0.5">{label}</span>
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-700 flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Search */}
          <div className="px-4 pb-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-sm bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Engagement filter tabs */}
          <div className="flex border-t border-white/10 overflow-x-auto scrollbar-none">
            {engagementFilterTabs.map(({ id, label, icon: Icon }) => {
              const count = id === 'all' ? conversations.length :
                conversations.filter(c => filterToSources[id].includes(c.source || 'dm')).length;
              return (
                <button
                  key={id}
                  onClick={() => setEngagementFilter(id)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-2 text-xs whitespace-nowrap flex-shrink-0 border-b-2 transition-colors',
                    engagementFilter === id
                      ? 'border-pink-500 text-pink-400 bg-pink-500/10'
                      : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  )}
                >
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                  {count > 0 && (
                    <span className={cn('text-xs rounded-full px-1 py-px leading-none',
                      engagementFilter === id ? 'bg-pink-500/30 text-pink-300' : 'bg-white/10 text-slate-500'
                    )}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 px-4 text-center">
              {engagementFilter === 'away_game' ? (
                <>
                  <Globe className="w-7 h-7 mb-2 opacity-40" />
                  <p className="text-xs font-medium text-slate-300">No Away Game engagements yet</p>
                  <p className="text-xs mt-1 text-slate-500 leading-relaxed">
                    When your comments on others' reels receive @mentions in reply, they'll appear here.
                  </p>
                </>
              ) : engagementFilter === 'mention' ? (
                <>
                  <AtSign className="w-7 h-7 mb-2 opacity-40" />
                  <p className="text-xs font-medium text-slate-300">No @mentions yet</p>
                  <p className="text-xs mt-1 text-slate-500">People who tag your account in their posts or comments will appear here.</p>
                </>
              ) : (
                <>
                  <MessageCircle className="w-6 h-6 mb-1" />
                  <p className="text-xs">No conversations</p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredConvs.map(conv => {
                const sid = conv.sender_id || conv.id;
                const score = conv.lead_score ?? 0;
                return (
                  <button
                    key={sid}
                    onClick={() => {
                      setSelected(conv);
                      setShowNotes(false);
                      setNoteText('');
                      setMobilePane('chat');
                      // Lazy-load cart for this conversation
                      const cid = conv.sender_id || conv.id;
                      apiClient.get(`/api/conversations/${cid}/cart`).then(r => {
                        const cart = r.data?.data?.cart ?? [];
                        setSelected(prev => prev ? { ...prev, cart } : prev);
                      }).catch(() => {});
                    }}
                    className={cn(
                      'w-full p-3 flex items-start gap-2.5 text-left hover:bg-white/[0.07] transition-colors',
                      selected?.sender_id === sid && 'bg-violet-500/15 border-r-2 border-violet-400'
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white text-xs">
                          {(conv.username || '??').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {score >= 70 && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border border-white" />
                      )}
                      {score >= 40 && score < 70 && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full border border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-slate-200 truncate">@{conv.username || sid?.slice(-6)}</span>
                        <span className="text-xs text-slate-500 flex-shrink-0">{formatTime(conv.updated_at || '')}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{conv.lastMessage || '—'}</p>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {conv.conversation_stage && (
                          <Badge className={cn('text-xs px-1.5 py-0', stageColor(conv.conversation_stage))}>
                            {conv.conversation_stage?.replace('_', ' ')}
                          </Badge>
                        )}
                        {conv.source && conv.source !== 'dm' && (() => {
                          const { label, color } = sourceLabel(conv.source);
                          return (
                            <span className={cn('text-xs font-medium flex items-center gap-0.5', color)}>
                              <MessageSquareDot className="w-2.5 h-2.5" />
                              {label}
                            </span>
                          );
                        })()}
                        {conv.comment_intent === 'soft_engagement' && (
                          <span className="text-xs text-sky-400 flex items-center gap-0.5">
                            <Heart className="w-2.5 h-2.5" />
                            Soft
                          </span>
                        )}
                        {conv.comment_intent === 'purchase_intent' && (
                          <span className="text-xs text-emerald-400 flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" />
                            Intent
                          </span>
                        )}
                        {score > 0 && (
                          <span className={cn('text-xs font-bold ml-auto', scoreColor(score))}>{score}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── Column 2: Chat ── */}
      <div className={cn(
        'flex-1 flex-col min-w-[300px] border-r border-white/10 relative',
        mobilePane === 'chat' ? 'flex' : 'hidden md:flex'
      )}>
        {selected ? (
          <>
            {/* Chat header — two-row layout to prevent button/badge collision */}
            <div className="px-3 py-2 border-b border-white/10 bg-white/5 flex flex-col gap-1.5">
              {/* Row 1: identity */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobilePane('list')}
                  className="md:hidden p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white text-xs">
                    {(selected.username || '??').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-semibold truncate min-w-0">@{selected.username || selected.sender_id}</p>
                {selected.conversation_stage && (
                  <Badge className={cn('text-xs px-1.5 py-0 flex-shrink-0', stageColor(selected.conversation_stage))}>
                    {selected.conversation_stage?.replace('_', ' ')}
                  </Badge>
                )}
                {selected.source && selected.source !== 'dm' && (() => {
                  const { label, color } = sourceLabel(selected.source);
                  return (
                    <span className={cn('text-xs font-medium flex items-center gap-0.5 flex-shrink-0', color)}>
                      <MessageSquareDot className="w-3 h-3" />
                      {label}
                    </span>
                  );
                })()}
                {/* Personality indicator */}
                {personalityProfile && personalitySummary(personalityProfile) && (
                  <span className="hidden sm:flex items-center gap-1 text-xs text-violet-400 bg-violet-500/15 border border-violet-500/25 rounded-full px-2 py-0.5 flex-shrink-0 ml-auto">
                    <UserCircle2 className="w-3 h-3" />
                    {personalitySummary(personalityProfile)}
                  </span>
                )}
              </div>
              {/* Row 2: actions */}
              <div className="flex items-center gap-1 flex-wrap">
                <Button
                  variant={selected.ai_paused ? 'default' : 'outline'}
                  size="sm"
                  className={cn('h-7 px-2 text-xs', selected.ai_paused ? 'bg-orange-500 hover:bg-orange-600 text-white' : '')}
                  onClick={handleAiToggle}
                >
                  {selected.ai_paused
                    ? <><Play className="w-3 h-3" /><span className="ml-1">Resume AI</span></>
                    : <><Pause className="w-3 h-3" /><span className="ml-1">Pause AI</span></>
                  }
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn('h-7 px-2 text-xs', showNotes ? 'bg-amber-500/20 text-amber-400' : '')}
                  onClick={() => setShowNotes(v => !v)}
                >
                  <MessageSquare className="w-3 h-3" /><span className="ml-1">Notes{selected.notes && selected.notes.length > 0 ? ` (${selected.notes.length})` : ''}</span>
                </Button>
                {/* Analyse button with scope dropdown — per conversation */}
                <div className="relative">
                  <div className="flex items-center rounded-md overflow-hidden shadow-sm">
                    <button
                      onClick={() => handleRunAnalysis(analyseScope)}
                      disabled={runningAnalysis}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:opacity-90 disabled:opacity-50 transition-opacity h-7"
                    >
                      {runningAnalysis
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Sparkles className="w-3 h-3" />}
                      <span className="ml-1">{runningAnalysis ? 'Analysing…' : `Analyse (${analyseScope})`}</span>
                    </button>
                    <button
                      onClick={() => setShowScopeMenu(v => !v)}
                      disabled={runningAnalysis}
                      className="px-1.5 py-1 text-xs font-medium bg-gradient-to-r from-pink-500 to-violet-600 text-white hover:opacity-90 disabled:opacity-50 transition-opacity h-7 border-l border-white/20"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                  {showScopeMenu && (
                    <div className="absolute right-0 top-8 z-20 bg-[#0d1525] rounded-lg shadow-xl border border-white/10 py-1 min-w-[140px]">
                      {(['recent', 'all'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => handleRunAnalysis(s)}
                          className={cn(
                            'w-full text-left px-3 py-2 text-xs hover:bg-white/10 flex items-center gap-2',
                            s === analyseScope ? 'text-violet-400 font-medium' : 'text-slate-300'
                          )}
                        >
                          {s === 'recent'
                            ? <><Clock className="w-3 h-3" /> Recent (last 50 msgs)</>
                            : <><Eye className="w-3 h-3" /> All messages</>
                          }
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowIntel(v => !v)}
                >
                  <Brain className="w-3 h-3" /><span className="ml-1">{showIntel ? 'Hide Intel' : 'Intel'}</span>
                </Button>
              </div>
            </div>

            {/* Comment / Story origin banner — pinned above message thread */}
            {(() => {
              // Detect comment conversations: use source field (new) or trigger_context (historical).
              // trigger_context format: "Comment on post {media_id}: {comment_text}"
              const isCommentConversation =
                selected.source === 'comment' ||
                /comment/i.test(selected.trigger_context || '');
              const { label, color } = sourceLabel(selected.source);

              // Extract the original comment text for the pinned banner.
              // Priority: per-message source='comment' → trigger_context colon split → none.
              let originalComment = '';
              if (selected.messages?.[0]?.source === 'comment') {
                originalComment = selected.messages[0].text;
              } else if (selected.trigger_context) {
                const colonIdx = selected.trigger_context.indexOf(': ');
                if (colonIdx !== -1) originalComment = selected.trigger_context.slice(colonIdx + 2);
              }

              if (!isCommentConversation && !(selected.source && selected.source !== 'dm' && selected.trigger_context)) {
                return null;
              }

              // For non-comment origin (story, reel, mention) keep compact bar
              if (!isCommentConversation && selected.source && selected.source !== 'dm') {
                return (
                  <div className="border-b border-blue-500/20 bg-blue-500/5 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <MessageSquareDot className={cn('w-3.5 h-3.5 flex-shrink-0', color)} />
                      <span className={cn('text-xs font-semibold', color)}>{label} origin</span>
                    </div>
                  </div>
                );
              }

              // Comment origin: prominent pinned banner with post type + intent
              const intent = selected.comment_intent;
              const { label: intentLbl, color: intentColor, bg: intentBg } = intentLabel(intent);
              const { label: postTypeLbl, icon: PostTypeIcon, color: postTypeColor } = postTypeBadge(selected.post_type);
              const isSoftEngagement = intent === 'soft_engagement';

              return (
                <div className="px-3 pt-3 pb-0">
                  <div className={cn(
                    'border rounded-xl px-3.5 py-2.5',
                    isSoftEngagement
                      ? 'bg-sky-500/10 border-sky-500/20'
                      : 'bg-blue-500/10 border-blue-500/20'
                  )}>
                    {/* Banner header row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <MessageSquareDot className={cn('w-3.5 h-3.5', isSoftEngagement ? 'text-sky-400' : 'text-blue-400')} />
                        <span className={cn('text-xs font-semibold', isSoftEngagement ? 'text-sky-400' : 'text-blue-400')}>
                          {label || 'Comment'} on
                        </span>
                      </div>
                      {/* Post type badge */}
                      <div className="flex items-center gap-1">
                        <PostTypeIcon className={cn('w-3 h-3', postTypeColor)} />
                        <span className={cn('text-xs font-medium', postTypeColor)}>{postTypeLbl}</span>
                      </div>
                      {/* Intent badge */}
                      {intent && (
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border ml-auto', intentBg, intentColor)}>
                          {intentLbl}
                        </span>
                      )}
                    </div>

                    {/* Original comment text */}
                    {originalComment ? (
                      <p className="text-sm text-slate-200 leading-relaxed italic">"{originalComment}"</p>
                    ) : selected.trigger_context ? (
                      <p className="text-xs text-slate-400 italic">{selected.trigger_context}</p>
                    ) : null}

                    {/* Caption excerpt */}
                    {selected.post_caption && (
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">
                        Post: "{selected.post_caption.slice(0, 80)}{selected.post_caption.length > 80 ? '…' : ''}"
                      </p>
                    )}

                    {/* Soft engagement note */}
                    {isSoftEngagement && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-sky-400">
                        <Heart className="w-3 h-3" />
                        <span>AI replied publicly to encourage follow — no DM sent</span>
                      </div>
                    )}

                    {/* Post products */}
                    {selected.post_products && selected.post_products.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <Package className="w-3 h-3 text-slate-500" />
                        {selected.post_products.slice(0, 3).map((p, i) => (
                          <span key={i} className="text-xs bg-white/10 text-slate-300 px-1.5 py-0.5 rounded-full">
                            {p.name}{p.price ? ` · ₹${p.price}` : ''}
                          </span>
                        ))}
                        {selected.post_products.length > 3 && (
                          <span className="text-xs text-slate-500">+{selected.post_products.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {(() => {
                  const msgs = selected.messages || [];
                  const isCommentConversation =
                    selected.source === 'comment' ||
                    /comment/i.test(selected.trigger_context || '');

                  // Find index where DM thread starts (after public comment reply)
                  const dmStartIdx = isCommentConversation
                    ? msgs.findIndex((m, i) => i > 0 && m.source !== 'comment' && m.role === 'assistant' && m.metadata?.trigger !== 'comment_reply')
                    : -1;

                  return msgs.map((msg, idx) => {
                    // Skip the original comment message — it's shown in the pinned banner above
                    const isOriginalComment =
                      msg.source === 'comment' ||
                      (idx === 0 && isCommentConversation && msg.role === 'user');
                    if (isOriginalComment) return null;

                    // Show "→ Moved to DM" separator before first DM message
                    const isDmTransition = isCommentConversation && idx === dmStartIdx && dmStartIdx > 0;

                    // Emoji reaction / comment-like events → compact pill
                    const isEmojiReaction = msg.source === 'dm_reaction' ||
                      msg.text?.startsWith('[Reacted ') || msg.text?.startsWith('[Liked');

                    return (
                      <React.Fragment key={msg.id}>
                        {/* DM transition marker */}
                        {isDmTransition && (
                          <div className="flex items-center gap-2 my-2">
                            <div className="flex-1 h-px bg-white/10" />
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                              <ArrowRight className="w-3 h-3 text-violet-400" />
                              <span>Moved to DM</span>
                              <MessageCircle className="w-3 h-3 text-violet-400" />
                            </div>
                            <div className="flex-1 h-px bg-white/10" />
                          </div>
                        )}
                        <div className={cn('flex flex-col', msg.role === 'assistant' ? 'items-end' : 'items-start')}>
                          {isEmojiReaction ? (
                            /* ── Emoji reaction pill ── */
                            <div className={cn('flex flex-col', msg.role === 'assistant' ? 'items-end' : 'items-start')}>
                              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-sm">
                                <Heart className="w-3 h-3 text-pink-400" />
                                <span className="text-slate-300">{msg.text.replace(/^\[|\]$/g, '')}</span>
                                <span className="text-xs text-slate-500">{formatTime(msg.timestamp)}</span>
                              </div>
                            </div>
                          ) : (
                            /* ── Standard DM bubble (all AI messages purple, regardless of origin) ── */
                            <div className={cn(
                              'max-w-[78%] rounded-2xl px-3.5 py-2.5',
                              msg.role === 'assistant'
                                ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                                : 'bg-white/10 text-slate-200'
                            )}>
                              <div className="flex items-center gap-1 text-xs mb-1 opacity-70">
                                {msg.role === 'assistant' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                <span>
                                  {msg.role === 'assistant' ? 'AI Agent' : `@${selected.username || 'user'}`}
                                </span>
                              </div>
                              <p className="text-sm leading-relaxed">{cleanMessageText(msg.text)}</p>
                              <div className="text-right text-xs opacity-60 mt-1">{formatTime(msg.timestamp)}</div>
                            </div>
                          )}

                          {/* Delivery status indicator */}
                          {msg.role === 'assistant' && (() => {
                            const status = msg.delivery_status || (msg.send_status === 'failed' ? 'failed' : msg.send_status === 'rate_limited' ? 'not_sent' : msg.send_status === 'sent' ? 'sent' : undefined);
                            if (status === 'read') return (
                              <div className="flex items-center gap-1 text-xs text-violet-400 mt-0.5 justify-end">
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span className="opacity-70">Seen</span>
                              </div>
                            );
                            if (status === 'delivered') return (
                              <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5 justify-end">
                                <CheckCheck className="w-3.5 h-3.5" />
                              </div>
                            );
                            if (status === 'sent') return (
                              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 justify-end">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            );
                            if (status === 'failed') return (
                              <div className="flex items-center gap-1 text-xs text-red-400 mt-0.5">
                                <AlertCircle className="w-3 h-3" />
                                <span>Not delivered{msg.send_error ? `: ${msg.send_error}` : ''}</span>
                              </div>
                            );
                            if (status === 'not_sent') return (
                              <div className="flex items-center gap-1 text-xs text-yellow-500 mt-0.5">
                                <AlertCircle className="w-3 h-3" />
                                <span>Rate limited</span>
                              </div>
                            );
                            return null;
                          })()}

                          {/* Inline reasoning pill below agent messages */}
                          {msg.role === 'assistant' && msg.metadata?.internal_assessment && (
                            <div className="mt-1 mr-1 flex items-center gap-1.5 text-xs text-slate-400">
                              <Eye className="w-3 h-3" />
                              <span className="italic">{msg.metadata.internal_assessment}</span>
                            </div>
                          )}
                          {msg.role === 'assistant' && !msg.metadata?.internal_assessment && msg.metadata?.governor_reason && (
                            <div className="mt-1 mr-1 flex items-center gap-1 text-xs text-slate-400">
                              <Zap className="w-3 h-3" />
                              <span>{msg.metadata.response_mode} · {msg.metadata.governor_reason}</span>
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  });
                })()}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Notes panel */}
            <AnimatePresence>
              {showNotes && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="border-t border-amber-500/20 bg-amber-500/10 overflow-hidden"
                >
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Internal Notes
                    </div>
                    {(selected.notes || []).length > 0 ? (
                      <div className="space-y-1.5 max-h-28 overflow-y-auto">
                        {(selected.notes || []).map(note => (
                          <div key={note.id} className="bg-white/5 rounded-lg px-3 py-2 text-xs border border-amber-500/20">
                            <p className="text-slate-300">{note.text}</p>
                            <p className="text-slate-500 mt-0.5">{formatTime(note.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-400/70 italic">No notes yet</p>
                    )}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a note…"
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }}
                        className="h-7 text-xs bg-white/5 border-amber-500/30 text-slate-200 placeholder:text-slate-500 flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={handleAddNote}
                        disabled={!noteText.trim() || savingNote}
                        className="h-7 text-xs px-3 bg-amber-500 hover:bg-amber-600"
                      >
                        {savingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cart summary (shown when cart has items) */}
            {selected.cart && selected.cart.length > 0 && (
              <div className="border-t border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Cart ({selected.cart.length} item{selected.cart.length !== 1 ? 's' : ''})
                  </div>
                  <span className="text-xs font-semibold text-emerald-300">
                    ₹{selected.cart.reduce((sum, i) => sum + i.price * i.qty, 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {selected.cart.map((item, idx) => (
                    <div key={`${item.product_id}-${idx}`} className="flex items-center gap-2 text-xs">
                      <Package className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="text-slate-300 truncate flex-1">{item.name}</span>
                      {item.size && <span className="text-slate-500 shrink-0">{item.size}</span>}
                      <span className="text-slate-400 shrink-0">×{item.qty}</span>
                      <span className="text-emerald-400 shrink-0 font-medium">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply box */}
            <div className="p-3 border-t border-white/10">
              <div className="flex items-end gap-2">
                <Textarea
                  placeholder="Type a reply..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  className="min-h-[40px] max-h-[100px] resize-none text-sm"
                  rows={1}
                />
                <Button
                  onClick={handleSend}
                  disabled={!replyText.trim() || sending}
                  className="h-10 px-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-3">
              <MessageCircle className="w-7 h-7" />
            </div>
            <p className="font-medium text-sm">Select a conversation</p>
            <p className="text-xs mt-1">Choose from the list to view messages and lead intelligence</p>
          </div>
        )}

        {/* ── Intel overlay for md–lg (absolute, inside relative chat column) ── */}
        <AnimatePresence>
          {selected && showIntel && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-y-0 right-0 z-30 w-72 lg:hidden bg-[#0d1525]/95 backdrop-blur-sm border-l border-white/10 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 flex-shrink-0">
                <span className="text-xs font-medium text-slate-400">Lead Intelligence</span>
                <button
                  onClick={() => setShowIntel(false)}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <IntelligenceSidebar
                  conversation={selected}
                  intelligence={intelligence}
                  loadingIntel={loadingIntel}
                  personalityProfile={personalityProfile}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Column 3: Intelligence Sidebar (inline, lg+) ── */}
      <AnimatePresence>
        {selected && showIntel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-l border-white/10 overflow-hidden hidden lg:block"
            style={{ width: 300 }}
          >
            <IntelligenceSidebar
              conversation={selected}
              intelligence={intelligence}
              loadingIntel={loadingIntel}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis now shown inline in Intelligence sidebar — no modal needed */}
    </div>
  );
}
