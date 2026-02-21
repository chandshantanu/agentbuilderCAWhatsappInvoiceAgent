import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Send, Bot, User, Instagram, Search, Loader2, X,
  Pause, Play, Brain, ChevronDown, ChevronRight, Flame, Target,
  TrendingUp, AlertCircle, Clock, Zap, Star, ArrowRight,
  Calendar, MessageSquare, CheckCircle, XCircle, Lightbulb,
  BarChart2, Heart, DollarSign, Eye, RefreshCw, Sparkles,
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
  send_status?: 'sent' | 'failed' | 'unknown';
  send_error?: string;
  send_error_code?: number;
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
  score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-neutral-500';

const scoreBg = (score: number) =>
  score >= 70 ? 'bg-emerald-50 border-emerald-200' : score >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-neutral-50 border-neutral-200';

const priorityColor = (p?: string) => {
  switch (p) {
    case 'high': return 'bg-red-100 text-red-700';
    case 'medium': return 'bg-amber-100 text-amber-700';
    default: return 'bg-neutral-100 text-neutral-600';
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

const stageColor = (stage?: string) => {
  const map: Record<string, string> = {
    greeting: 'bg-neutral-100 text-neutral-600',
    discovery: 'bg-blue-100 text-blue-700',
    recommendation: 'bg-purple-100 text-purple-700',
    objection_handling: 'bg-orange-100 text-orange-700',
    closing: 'bg-green-100 text-green-700',
    follow_up: 'bg-sky-100 text-sky-700',
    nurturing: 'bg-pink-100 text-pink-700',
    win_back: 'bg-violet-100 text-violet-700',
    churned: 'bg-red-100 text-red-700',
  };
  return map[stage || ''] || 'bg-neutral-100 text-neutral-600';
};

// ── Intelligence Sidebar ───────────────────────────────────────

function IntelligenceSidebar({
  conversation,
  intelligence,
  loadingIntel,
}: {
  conversation: InstagramConversation;
  intelligence: Intelligence | null;
  loadingIntel: boolean;
}) {
  const [activeSection, setActiveSection] = useState<string>('plan');

  if (loadingIntel) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  const q = intelligence?.qualification;
  const next = intelligence?.next_action;
  const stage = intelligence?.conversation_stage || conversation.conversation_stage;
  const score = intelligence?.lead_score ?? conversation.lead_score ?? 0;

  const sections = [
    { id: 'plan', label: "Agent's Plan", icon: Brain },
    { id: 'profile', label: 'Lead Profile', icon: User },
    { id: 'followups', label: 'Follow-ups', icon: Calendar },
    { id: 'reasoning', label: 'Reasoning Log', icon: BarChart2 },
  ];

  return (
    <div className="flex flex-col h-full bg-neutral-50">
      {/* Score header */}
      <div className={cn('p-4 border-b', scoreBg(score))}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Lead Intelligence</span>
          <div className="flex items-center gap-1">
            {intelligence?.scope && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 font-medium">
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
            <div className="text-xs text-neutral-500">Lead Score</div>
          </div>
          {score > 0 && (
            <div className="flex-1 mb-1">
              <div className="h-2 bg-white rounded-full overflow-hidden border border-neutral-200">
                <div
                  className={cn('h-full rounded-full transition-all duration-700',
                    score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-neutral-300'
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-neutral-400 mt-0.5">
                <span>Cold</span><span>Warm</span><span>Hot</span>
              </div>
            </div>
          )}
        </div>
        {q && q.completeness > 0 && (
          <div className="mt-2 text-xs text-neutral-500">
            Qualification: <span className="font-medium text-neutral-700">{q.completeness}% complete</span>
          </div>
        )}
        {intelligence?.opted_out && (
          <Badge className="mt-2 bg-red-100 text-red-700 text-xs">Opted Out</Badge>
        )}
        {intelligence?.disengaged && !intelligence.opted_out && (
          <Badge className="mt-2 bg-orange-100 text-orange-700 text-xs">Disengaged</Badge>
        )}
        {intelligence?.last_sender === 'assistant' && intelligence?.last_agent_message_at && (
          <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
            <Clock className="w-3 h-3" />
            Agent waiting — {formatTime(intelligence.last_agent_message_at)}
          </div>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex border-b bg-white overflow-x-auto">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2',
              activeSection === id
                ? 'border-violet-500 text-violet-700 bg-violet-50'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
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
                <div className="bg-white rounded-xl border border-violet-100 p-3">
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-violet-700">
                    <Eye className="w-3.5 h-3.5" />
                    Internal Assessment
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed italic">
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
                <div className="bg-white rounded-xl border border-blue-100 p-3">
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-blue-700">
                    <Target className="w-3.5 h-3.5" />
                    Current Strategy
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed">{next.latest_strategy}</p>
                </div>
              )}

              {next?.suggested_question && (
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-3">
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-amber-700">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Next Question to Ask
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    "{next.suggested_question}"
                  </p>
                </div>
              )}

              {next?.emotional_state && next.emotional_state !== 'neutral' && (
                <div className="bg-white rounded-xl border border-neutral-200 p-3">
                  <div className="text-xs font-medium text-neutral-600 mb-1">Customer Mood</div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{emotionIcon(next.emotional_state)}</span>
                    <span className="text-sm font-medium text-neutral-800 capitalize">
                      {next.emotional_state}
                    </span>
                  </div>
                </div>
              )}

              {!next?.latest_assessment && !next?.latest_strategy && (
                <div className="text-center py-8 text-neutral-400">
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
                <div className="bg-white rounded-xl border border-neutral-200 p-3 space-y-2">
                  <div className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">Business</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {q.business_type && <Row label="Type" value={q.business_type} />}
                    {q.niche && <Row label="Niche" value={q.niche} />}
                    {q.instagram_followers && <Row label="Followers" value={q.instagram_followers} />}
                    {q.daily_dm_volume && <Row label="Daily DMs" value={q.daily_dm_volume} />}
                  </div>
                </div>
              )}

              {(q?.current_pain || q?.purchase_timeline) && (
                <div className="bg-white rounded-xl border border-neutral-200 p-3 space-y-2">
                  <div className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">Buying Signals</div>
                  {q.current_pain && (
                    <div>
                      <div className="text-xs text-neutral-500 mb-0.5">Pain Point</div>
                      <div className="text-xs text-neutral-800 font-medium">{q.current_pain}</div>
                    </div>
                  )}
                  {q.purchase_timeline && (
                    <div>
                      <div className="text-xs text-neutral-500 mb-0.5">Timeline</div>
                      <div className="text-xs text-neutral-800 font-medium">{q.purchase_timeline}</div>
                    </div>
                  )}
                  {q.budget_signals && (
                    <div>
                      <div className="text-xs text-neutral-500 mb-0.5">Budget</div>
                      <div className="text-xs text-neutral-800 font-medium">{q.budget_signals}</div>
                    </div>
                  )}
                </div>
              )}

              {q?.buying_readiness != null && q.buying_readiness > 0 && (
                <div className="bg-white rounded-xl border border-neutral-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">Buying Readiness</div>
                    <span className={cn('text-sm font-bold',
                      q.buying_readiness >= 7 ? 'text-emerald-600' :
                      q.buying_readiness >= 4 ? 'text-amber-600' : 'text-neutral-500'
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
                            ? q.buying_readiness >= 7 ? 'bg-emerald-500' : q.buying_readiness >= 4 ? 'bg-amber-500' : 'bg-neutral-300'
                            : 'bg-neutral-100'
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              {(q?.communication_style || q?.price_sensitivity || q?.key_motivator) && (
                <div className="bg-white rounded-xl border border-neutral-200 p-3 space-y-2">
                  <div className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">Psychology</div>
                  <div className="grid grid-cols-1 gap-1.5 text-xs">
                    {q.communication_style && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Style</span>
                        <Badge variant="outline" className="text-xs capitalize">{q.communication_style}</Badge>
                      </div>
                    )}
                    {q.price_sensitivity && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Price Sensitivity</span>
                        <Badge variant="outline" className={cn('text-xs capitalize',
                          q.price_sensitivity === 'high' ? 'border-red-300 text-red-600' :
                          q.price_sensitivity === 'low' ? 'border-green-300 text-green-600' : ''
                        )}>{q.price_sensitivity}</Badge>
                      </div>
                    )}
                    {q.key_motivator && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Motivated By</span>
                        <Badge variant="outline" className="text-xs capitalize">{q.key_motivator}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {q?.objections && q.objections.length > 0 && (
                <div className="bg-white rounded-xl border border-red-100 p-3">
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-red-700">
                    <XCircle className="w-3.5 h-3.5" />
                    Objections Raised
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {q.objections.map((obj, i) => (
                      <Badge key={i} className="bg-red-50 text-red-700 border-red-200 text-xs">{obj}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {q?.interests && q.interests.length > 0 && (
                <div className="bg-white rounded-xl border border-emerald-100 p-3">
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-emerald-700">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Interests & Hooks
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {q.interests.map((int, i) => (
                      <Badge key={i} className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">{int}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {q?.personal_details && (
                <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-3">
                  <div className="text-xs font-medium text-neutral-600 mb-1">Personal Context</div>
                  <p className="text-xs text-neutral-700">{q.personal_details}</p>
                </div>
              )}

              {!q?.business_type && !q?.current_pain && (
                <div className="text-center py-8 text-neutral-400">
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
                <div className="bg-white rounded-xl border border-neutral-200 p-3">
                  <div className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-3">Stage Journey</div>
                  <div className="relative">
                    {intelligence.stage_progression.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
                        <div className={cn('w-2 h-2 rounded-full mt-0.5 flex-shrink-0', stageColor(s.stage).replace('text-', 'bg-').split(' ')[0])} />
                        <div className="flex-1">
                          <span className={cn('text-xs font-medium capitalize px-1.5 py-0.5 rounded', stageColor(s.stage))}>
                            {s.stage.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-xs text-neutral-400">{formatTime(s.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active follow-ups */}
              <div className="bg-white rounded-xl border border-neutral-200 p-3">
                <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-neutral-700 uppercase tracking-wide">
                  <Calendar className="w-3.5 h-3.5" />
                  Scheduled Follow-ups
                </div>
                {intelligence?.follow_up_schedule && intelligence.follow_up_schedule.length > 0 ? (
                  <div className="space-y-2">
                    {intelligence.follow_up_schedule.map((fu, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-violet-50 rounded-lg px-3 py-2">
                        <div>
                          <div className="font-medium text-violet-800">Follow-up #{fu.follow_up_number}</div>
                          <div className="text-violet-600 capitalize">{fu.stage.replace('_', ' ')} stage</div>
                          {fu.source === 'watchdog' && (
                            <Badge className="mt-1 bg-amber-100 text-amber-700 text-xs">Proactive nudge</Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-violet-700 font-medium">{formatTime(fu.scheduled_at)}</div>
                          <div className="text-violet-500">scheduled</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-neutral-400">
                    <Clock className="w-6 h-6 mx-auto mb-1 opacity-30" />
                    <p className="text-xs">No follow-ups queued</p>
                    <p className="text-xs mt-0.5 text-neutral-300">Watchdog will queue a nudge if the lead goes cold</p>
                  </div>
                )}
              </div>

              {/* Score trajectory mini chart */}
              {intelligence?.score_trajectory && intelligence.score_trajectory.length > 1 && (
                <div className="bg-white rounded-xl border border-neutral-200 p-3">
                  <div className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-3">Score Trajectory</div>
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
                  <div className="flex justify-between text-xs text-neutral-400 mt-1">
                    <span>Start</span>
                    <span>Latest: {intelligence.score_trajectory[intelligence.score_trajectory.length - 1]?.score ?? 0}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Reasoning Log ── */}
          {activeSection === 'reasoning' && (
            <div className="space-y-2">
              {intelligence?.strategist_log && intelligence.strategist_log.length > 0 ? (
                [...intelligence.strategist_log].reverse().map((entry, i) => (
                  <div key={i} className="bg-white rounded-xl border border-neutral-200 p-3 text-xs space-y-2">
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
                      <span className="text-neutral-400">{formatTime(entry.timestamp)}</span>
                    </div>

                    {entry.text_preview && (
                      <div className="bg-neutral-50 rounded-lg px-2 py-1.5 text-neutral-600 italic">
                        "{entry.text_preview}…"
                      </div>
                    )}

                    {entry.internal_assessment && (
                      <div>
                        <span className="font-medium text-violet-700">Assessment: </span>
                        <span className="text-neutral-700">{entry.internal_assessment}</span>
                      </div>
                    )}

                    {entry.selling_strategy && (
                      <div>
                        <span className="font-medium text-blue-700">Strategy: </span>
                        <span className="text-neutral-700">{entry.selling_strategy}</span>
                      </div>
                    )}

                    {entry.suggested_question && (
                      <div className="bg-amber-50 rounded px-2 py-1 border border-amber-100">
                        <span className="font-medium text-amber-700">Asked: </span>
                        <span className="text-amber-900">{entry.suggested_question}</span>
                      </div>
                    )}

                    {/* Full reasoning trace (v5.0+) */}
                    {entry.reasoning_trace && (
                      <details className="mt-1">
                        <summary className="text-xs text-neutral-400 cursor-pointer hover:text-neutral-600 select-none">
                          Why this answer? ({entry.reasoning_trace.confidence_level ?? '?'}% confidence)
                        </summary>
                        <div className="mt-2 space-y-2 text-xs border-l-2 border-violet-200 pl-2">
                          {entry.reasoning_trace.decision_factors && entry.reasoning_trace.decision_factors.length > 0 && (
                            <div>
                              <p className="font-medium text-neutral-500 mb-0.5">Data used:</p>
                              {entry.reasoning_trace.decision_factors.map((f, i) => (
                                <p key={i} className="text-neutral-600">• {f}</p>
                              ))}
                            </div>
                          )}
                          {entry.reasoning_trace.alternatives_considered && entry.reasoning_trace.alternatives_considered.length > 0 && (
                            <div>
                              <p className="font-medium text-neutral-500 mb-0.5">Alternatives rejected:</p>
                              {entry.reasoning_trace.alternatives_considered.map((a, i) => (
                                <p key={i} className="text-neutral-500 line-through decoration-neutral-300">• {a}</p>
                              ))}
                            </div>
                          )}
                          {entry.reasoning_trace.research_basis && (
                            <div className="bg-blue-50 rounded px-2 py-1 text-blue-700">
                              <p className="font-medium mb-0.5">Research basis:</p>
                              <p>{entry.reasoning_trace.research_basis}</p>
                            </div>
                          )}
                          {entry.reasoning_trace.next_best_action && (
                            <div className="bg-emerald-50 rounded px-2 py-1 text-emerald-700">
                              <p className="font-medium mb-0.5">If no reply:</p>
                              <p>{entry.reasoning_trace.next_best_action}</p>
                            </div>
                          )}
                          {entry.timing_reasoning && (
                            <div className="bg-violet-50 rounded px-2 py-1 text-violet-700">
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
                <div className="text-center py-8 text-neutral-400">
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
      <div className="text-neutral-400">{label}</div>
      <div className="font-medium text-neutral-800 truncate">{value}</div>
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
    apiClient.get(`/api/conversations/${sid}/intelligence`)
      .then((resp: any) => setIntelligence(resp.data))
      .catch(() => setIntelligence(null))
      .finally(() => setLoadingIntel(false));
  }, [selected]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages]);

  const reloadSelectedConversation = useCallback(async (sid: string) => {
    try {
      const resp = await apiClient.get(`/api/conversations/${sid}/messages`);
      const { conversation, messages } = resp.data;
      const updated = { ...conversation, messages };
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

  // Per-conversation analyse — loads intelligence for the selected conversation
  const handleRunAnalysis = useCallback(async (scope: 'recent' | 'all') => {
    if (!selected) return;
    const sid = selected.sender_id || selected.id;
    setAnalyseScope(scope);
    setShowScopeMenu(false);
    setRunningAnalysis(true);
    setShowIntel(true); // ensure sidebar is visible
    try {
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

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  const filteredConvs = conversations.filter(c => {
    const u = c.username || c.sender_id || '';
    return u.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[550px] max-h-[920px] bg-white rounded-xl border border-neutral-200 overflow-hidden">

      {/* ── Column 1: Conversation List ── */}
      <div className="w-72 flex-shrink-0 border-r border-neutral-200 flex flex-col">
        <div className="p-4 border-b border-neutral-100">
          <div className="flex items-center gap-2 mb-3">
            <Instagram className="w-4 h-4 text-pink-500" />
            <span className="font-semibold text-sm">Conversations</span>
            <Badge variant="secondary" className="ml-auto text-xs">{conversations.length}</Badge>
            <button
              onClick={loadConversations}
              title="Refresh conversation list"
              className="p-1 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-neutral-400">
              <MessageCircle className="w-6 h-6 mb-1" />
              <p className="text-xs">No conversations</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {filteredConvs.map(conv => {
                const sid = conv.sender_id || conv.id;
                const score = conv.lead_score ?? 0;
                return (
                  <button
                    key={sid}
                    onClick={() => { setSelected(conv); setShowNotes(false); setNoteText(''); }}
                    className={cn(
                      'w-full p-3 flex items-start gap-2.5 text-left hover:bg-neutral-50 transition-colors',
                      selected?.sender_id === sid && 'bg-violet-50 border-r-2 border-violet-500'
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
                        <span className="text-xs font-semibold text-neutral-800 truncate">@{conv.username || sid?.slice(-6)}</span>
                        <span className="text-xs text-neutral-400 flex-shrink-0">{formatTime(conv.updated_at || '')}</span>
                      </div>
                      <p className="text-xs text-neutral-500 truncate">{conv.lastMessage || '—'}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {conv.conversation_stage && (
                          <Badge className={cn('text-xs px-1.5 py-0', stageColor(conv.conversation_stage))}>
                            {conv.conversation_stage?.replace('_', ' ')}
                          </Badge>
                        )}
                        {score > 0 && (
                          <span className={cn('text-xs font-bold', scoreColor(score))}>{score}</span>
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
      <div className="flex-1 flex flex-col min-w-0 border-r border-neutral-200">
        {selected ? (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white text-xs">
                    {(selected.username || '??').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">@{selected.username || selected.sender_id}</p>
                  <div className="flex items-center gap-1">
                    {selected.conversation_stage && (
                      <Badge className={cn('text-xs px-1.5 py-0', stageColor(selected.conversation_stage))}>
                        {selected.conversation_stage?.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={selected.ai_paused ? 'default' : 'outline'}
                  size="sm"
                  className={cn('h-7 text-xs', selected.ai_paused ? 'bg-orange-500 hover:bg-orange-600 text-white' : '')}
                  onClick={handleAiToggle}
                >
                  {selected.ai_paused
                    ? <><Play className="w-3 h-3 mr-1" />Resume AI</>
                    : <><Pause className="w-3 h-3 mr-1" />Pause AI</>
                  }
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn('h-7 text-xs', showNotes ? 'bg-amber-50 text-amber-700' : '')}
                  onClick={() => setShowNotes(v => !v)}
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Notes{selected.notes && selected.notes.length > 0 ? ` (${selected.notes.length})` : ''}
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
                      {runningAnalysis ? 'Analysing…' : `Analyse (${analyseScope})`}
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
                    <div className="absolute right-0 top-8 z-20 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 min-w-[140px]">
                      {(['recent', 'all'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => handleRunAnalysis(s)}
                          className={cn(
                            'w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 flex items-center gap-2',
                            s === analyseScope ? 'text-violet-600 font-medium' : 'text-neutral-700'
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
                  className="h-7 text-xs"
                  onClick={() => setShowIntel(v => !v)}
                >
                  <Brain className="w-3 h-3 mr-1" />
                  {showIntel ? 'Hide' : 'Intel'}
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {(selected.messages || []).map(msg => (
                  <div key={msg.id} className={cn('flex flex-col', msg.role === 'assistant' ? 'items-end' : 'items-start')}>
                    <div className={cn(
                      'max-w-[78%] rounded-2xl px-3.5 py-2.5',
                      msg.role === 'assistant'
                        ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                        : 'bg-neutral-100 text-neutral-900'
                    )}>
                      <div className={cn('flex items-center gap-1 text-xs mb-1 opacity-70')}>
                        {msg.role === 'assistant' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        <span>{msg.role === 'assistant' ? 'AI Agent' : `@${selected.username || 'user'}`}</span>
                      </div>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <div className="text-right text-xs opacity-60 mt-1">{formatTime(msg.timestamp)}</div>
                    </div>

                    {/* Delivery failure indicator */}
                    {msg.role === 'assistant' && msg.send_status === 'failed' && (
                      <div className="flex items-center gap-1 text-xs text-red-400 mt-0.5">
                        <AlertCircle className="w-3 h-3" />
                        <span>Not delivered{msg.send_error ? `: ${msg.send_error}` : ''}</span>
                      </div>
                    )}

                    {/* Inline reasoning pill below agent messages */}
                    {msg.role === 'assistant' && msg.metadata?.internal_assessment && (
                      <div className="mt-1 mr-1 flex items-center gap-1.5 text-xs text-neutral-400">
                        <Eye className="w-3 h-3" />
                        <span className="italic">{msg.metadata.internal_assessment}</span>
                      </div>
                    )}
                    {msg.role === 'assistant' && !msg.metadata?.internal_assessment && msg.metadata?.governor_reason && (
                      <div className="mt-1 mr-1 flex items-center gap-1 text-xs text-neutral-400">
                        <Zap className="w-3 h-3" />
                        <span>{msg.metadata.response_mode} · {msg.metadata.governor_reason}</span>
                      </div>
                    )}
                  </div>
                ))}
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
                  className="border-t border-amber-100 bg-amber-50 overflow-hidden"
                >
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Internal Notes
                    </div>
                    {(selected.notes || []).length > 0 ? (
                      <div className="space-y-1.5 max-h-28 overflow-y-auto">
                        {(selected.notes || []).map(note => (
                          <div key={note.id} className="bg-white rounded-lg px-3 py-2 text-xs border border-amber-100">
                            <p className="text-neutral-700">{note.text}</p>
                            <p className="text-neutral-400 mt-0.5">{formatTime(note.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 italic">No notes yet</p>
                    )}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a note…"
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }}
                        className="h-7 text-xs bg-white border-amber-200 flex-1"
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

            {/* Reply box */}
            <div className="p-3 border-t border-neutral-100">
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
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
            <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
              <MessageCircle className="w-7 h-7" />
            </div>
            <p className="font-medium text-sm">Select a conversation</p>
            <p className="text-xs mt-1">Choose from the list to view messages and lead intelligence</p>
          </div>
        )}
      </div>

      {/* ── Column 3: Intelligence Sidebar ── */}
      <AnimatePresence>
        {selected && showIntel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-l border-neutral-200 overflow-hidden"
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
