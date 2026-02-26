import React, { useState, useEffect, useCallback } from 'react';
import {
  Target, Plus, Play, Pause, Trash2, ChevronDown, ChevronRight,
  ArrowUp, ArrowDown, Loader2, Check, X, MessageSquare, Zap,
  Brain, TrendingUp, Phone, ShoppingBag, Calendar, Star,
  Edit3, Send, RefreshCw, AlertCircle, GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/apiClient';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ─────────────────────────────────────────────────────────────────────

type GoalType = 'sale' | 'phone_capture' | 'email_capture' | 'appointment' | 'brand_awareness' | 'lead_qualify';

interface CampaignGoal {
  id: string;
  type: GoalType;
  priority: number;
  label: string;
  trigger_min_score: number;
  trigger_min_messages: number;
  can_defer: boolean;
}

interface FunnelStage {
  stage_prompt: string;
  buttons_allowed: boolean;
  button_type: 'none' | 'quick_replies' | 'cta';
  button_options: string[];
  cta_title: string;
  cta_url: string;
}

interface Campaign {
  id?: string;
  name: string;
  status: 'draft' | 'active' | 'paused';
  goals: CampaignGoal[];
  funnel: Record<string, FunnelStage>;
  escalation_triggers: {
    explicit_keywords: string[];
    frustration_threshold: number;
    high_value_score: number;
    objection_loop_count: number;
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GOAL_META: Record<GoalType, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  sale: { label: 'Drive a Sale', icon: <ShoppingBag className="w-4 h-4" />, color: 'text-emerald-400', description: 'Convert the conversation into a purchase' },
  phone_capture: { label: 'Capture Phone', icon: <Phone className="w-4 h-4" />, color: 'text-violet-400', description: 'Get their contact number for follow-up' },
  email_capture: { label: 'Capture Email', icon: <MessageSquare className="w-4 h-4" />, color: 'text-blue-400', description: 'Collect email for nurture campaigns' },
  appointment: { label: 'Book Appointment', icon: <Calendar className="w-4 h-4" />, color: 'text-amber-400', description: 'Schedule a call, demo or visit' },
  brand_awareness: { label: 'Brand Awareness', icon: <Star className="w-4 h-4" />, color: 'text-pink-400', description: 'Build familiarity and positive impression' },
  lead_qualify: { label: 'Qualify Lead', icon: <TrendingUp className="w-4 h-4" />, color: 'text-cyan-400', description: 'Collect structured qualification data' },
};

const FUNNEL_STAGES = ['greeting', 'discovery', 'recommendation', 'objection_handling', 'closing', 'phone_capture', 'follow_up'];

const STAGE_META: Record<string, { label: string; icon: React.ReactNode; noButtons: boolean }> = {
  greeting: { label: 'Greeting', icon: '👋', noButtons: true },
  discovery: { label: 'Discovery', icon: '🔍', noButtons: false },
  recommendation: { label: 'Recommendation', icon: '✨', noButtons: false },
  objection_handling: { label: 'Objection Handling', icon: '🤝', noButtons: true },
  closing: { label: 'Closing', icon: '🎯', noButtons: false },
  phone_capture: { label: 'Phone Capture', icon: '📞', noButtons: true },
  follow_up: { label: 'Follow-up', icon: '🔄', noButtons: false },
};

const DEFAULT_STAGE_PROMPTS: Record<string, string> = {
  greeting: 'Build rapport naturally. Ask one open question. No sales pitch yet.',
  discovery: 'Understand their need. Ask one qualifying question.',
  recommendation: 'Recommend 1-2 products with a specific reason. Offer a choice.',
  objection_handling: 'Acknowledge their concern genuinely. Share a relevant proof point.',
  closing: 'Present the offer with clear value. One decisive ask.',
  phone_capture: 'Naturally ask for their contact number for exclusive updates or to connect the team.',
  follow_up: 'Re-engage warmly. Reference previous conversation. Offer something new.',
};

const EMPTY_CAMPAIGN: Campaign = {
  name: '',
  status: 'draft',
  goals: [],
  funnel: Object.fromEntries(
    FUNNEL_STAGES.map(stage => [stage, {
      stage_prompt: DEFAULT_STAGE_PROMPTS[stage] || '',
      buttons_allowed: !STAGE_META[stage]?.noButtons,
      button_type: 'none' as const,
      button_options: [],
      cta_title: '',
      cta_url: '',
    }])
  ),
  escalation_triggers: {
    explicit_keywords: ['talk to human', 'call me', 'real person'],
    frustration_threshold: 2,
    high_value_score: 90,
    objection_loop_count: 3,
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function GoalBadge({ type, priority }: { type: GoalType; priority: number }) {
  const meta = GOAL_META[type];
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
      <span className={meta.color}>{meta.icon}</span>
      <span className="text-xs text-slate-300">{meta.label}</span>
      <span className="text-xs text-slate-500">#{priority}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map = {
    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    paused: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    draft: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  } as Record<string, string>;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${map[status] || map.draft}`}>
      {status}
    </span>
  );
}

// ── Campaign Editor ───────────────────────────────────────────────────────────

function CampaignEditor({
  campaign,
  onSave,
  onCancel,
}: {
  campaign: Campaign;
  onSave: (c: Campaign) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Campaign>(JSON.parse(JSON.stringify(campaign)));
  const [activeSection, setActiveSection] = useState<'goals' | 'funnel' | 'escalation'>('goals');
  const [activeStage, setActiveStage] = useState<string>('greeting');
  const [saving, setSaving] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const updateDraft = (path: string[], value: unknown) => {
    setDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let obj: Record<string, unknown> = next;
      for (let i = 0; i < path.length - 1; i++) {
        obj = obj[path[i]] as Record<string, unknown>;
      }
      obj[path[path.length - 1]] = value;
      return next;
    });
  };

  const addGoal = (type: GoalType) => {
    const newGoal: CampaignGoal = {
      id: `goal_${Date.now()}`,
      type,
      priority: draft.goals.length + 1,
      label: GOAL_META[type].label,
      trigger_min_score: 0,
      trigger_min_messages: 0,
      can_defer: true,
    };
    setDraft(prev => ({ ...prev, goals: [...prev.goals, newGoal] }));
  };

  const removeGoal = (id: string) => {
    setDraft(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== id).map((g, i) => ({ ...g, priority: i + 1 })),
    }));
  };

  const moveGoal = (id: string, dir: 'up' | 'down') => {
    setDraft(prev => {
      const goals = [...prev.goals];
      const idx = goals.findIndex(g => g.id === id);
      const newIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= goals.length) return prev;
      [goals[idx], goals[newIdx]] = [goals[newIdx], goals[idx]];
      return { ...prev, goals: goals.map((g, i) => ({ ...g, priority: i + 1 })) };
    });
  };

  const handleAiEdit = async () => {
    if (!aiInstruction.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await apiClient.post('/api/campaigns/ai-edit', {
        instruction: aiInstruction,
        campaign: draft,
      });
      const updated = (res.data as any)?.campaign;
      if (updated) {
        setDraft(prev => ({ ...prev, ...updated }));
        setAiInstruction('');
      }
    } catch (e: any) {
      setAiError(e.message || 'AI edit failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  };

  const stageCfg = draft.funnel[activeStage] || {} as FunnelStage;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Input
          value={draft.name}
          onChange={e => updateDraft(['name'], e.target.value)}
          placeholder="Campaign name..."
          className="bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500 text-sm h-8 flex-1"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            className="h-8 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !draft.name}
            className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      {/* AI Editor Bar */}
      <div className="flex gap-2 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
        <Brain className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs text-violet-300 mb-1.5">Ask AI to edit this campaign</p>
          <div className="flex gap-2">
            <Input
              value={aiInstruction}
              onChange={e => setAiInstruction(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAiEdit()}
              placeholder="e.g. Make closing more urgent, add scarcity message..."
              className="bg-white/5 border-violet-500/30 text-slate-200 placeholder:text-slate-500 text-xs h-7 flex-1"
            />
            <Button
              size="sm"
              onClick={handleAiEdit}
              disabled={aiLoading || !aiInstruction.trim()}
              className="h-7 px-2 text-xs bg-violet-600/80 hover:bg-violet-500 text-white"
            >
              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            </Button>
          </div>
          {aiError && <p className="text-xs text-red-400 mt-1">{aiError}</p>}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
        {(['goals', 'funnel', 'escalation'] as const).map(s => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors capitalize ${
              activeSection === s
                ? 'bg-white/10 text-slate-200'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {s === 'goals' ? '🎯 Goals' : s === 'funnel' ? '🔀 Funnel' : '🚨 Escalation'}
          </button>
        ))}
      </div>

      {/* Goals Section */}
      {activeSection === 'goals' && (
        <div className="flex-1 overflow-y-auto space-y-3">
          <p className="text-xs text-slate-500">Set goals in priority order. The agent pursues them top-down based on trigger conditions.</p>

          {/* Active goals */}
          {draft.goals.length > 0 && (
            <div className="space-y-2">
              {draft.goals.map((goal, idx) => (
                <div key={goal.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                  <GripVertical className="w-3 h-3 text-slate-600 flex-shrink-0" />
                  <span className={GOAL_META[goal.type]?.color}>{GOAL_META[goal.type]?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200">{GOAL_META[goal.type]?.label}</p>
                    <p className="text-xs text-slate-500">Priority #{goal.priority}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={goal.trigger_min_score}
                      onChange={e => {
                        const goals = [...draft.goals];
                        goals[idx] = { ...goals[idx], trigger_min_score: parseInt(e.target.value) || 0 };
                        setDraft(prev => ({ ...prev, goals }));
                      }}
                      className="w-12 text-xs bg-white/5 border border-white/10 rounded px-1 py-0.5 text-slate-300 text-center"
                      title="Min lead score to activate"
                    />
                    <span className="text-xs text-slate-600">score</span>
                  </div>
                  <div className="flex gap-0.5">
                    <button onClick={() => moveGoal(goal.id, 'up')} disabled={idx === 0}
                      className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30">
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => moveGoal(goal.id, 'down')} disabled={idx === draft.goals.length - 1}
                      className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30">
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button onClick={() => removeGoal(goal.id)}
                      className="p-1 text-slate-500 hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add goal */}
          <div>
            <p className="text-xs text-slate-500 mb-2">Add a goal:</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(GOAL_META) as GoalType[])
                .filter(t => !draft.goals.find(g => g.type === t))
                .map(type => {
                  const meta = GOAL_META[type];
                  return (
                    <button
                      key={type}
                      onClick={() => addGoal(type)}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors text-left"
                    >
                      <span className={meta.color}>{meta.icon}</span>
                      <div>
                        <p className="text-xs text-slate-300">{meta.label}</p>
                        <p className="text-xs text-slate-500 leading-tight">{meta.description}</p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Funnel Section */}
      {activeSection === 'funnel' && (
        <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
          {/* Stage list */}
          <div className="w-36 flex-shrink-0 space-y-1 overflow-y-auto">
            {FUNNEL_STAGES.map(stage => {
              const meta = STAGE_META[stage];
              const cfg = draft.funnel[stage];
              return (
                <button
                  key={stage}
                  onClick={() => setActiveStage(stage)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                    activeStage === stage
                      ? 'bg-white/10 border border-white/20 text-slate-200'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-300'
                  }`}
                >
                  <span className="text-sm">{meta?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{meta?.label}</p>
                    {cfg?.buttons_allowed && cfg?.button_type !== 'none' && (
                      <p className="text-xs text-violet-400">{cfg.button_type === 'cta' ? 'CTA' : 'QR'}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Stage editor */}
          <div className="flex-1 space-y-3 overflow-y-auto">
            <div className="flex items-center gap-2">
              <span className="text-lg">{STAGE_META[activeStage]?.icon}</span>
              <h4 className="text-sm font-medium text-slate-200">{STAGE_META[activeStage]?.label}</h4>
              {STAGE_META[activeStage]?.noButtons && (
                <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  No buttons (by design)
                </span>
              )}
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Stage guidance for AI</p>
              <textarea
                value={stageCfg.stage_prompt || ''}
                onChange={e => updateDraft(['funnel', activeStage, 'stage_prompt'], e.target.value)}
                rows={3}
                className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-500 resize-none focus:outline-none focus:border-violet-500/50"
                placeholder="Guide the AI on what to do in this stage..."
              />
            </div>

            {!STAGE_META[activeStage]?.noButtons && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-slate-400">Buttons:</p>
                  <div className="flex gap-1">
                    {(['none', 'quick_replies', 'cta'] as const).map(bt => (
                      <button
                        key={bt}
                        onClick={() => updateDraft(['funnel', activeStage, 'button_type'], bt)}
                        className={`text-xs px-2 py-1 rounded-md transition-colors ${
                          stageCfg.button_type === bt
                            ? 'bg-violet-600/80 text-white'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300'
                        }`}
                      >
                        {bt === 'none' ? 'None' : bt === 'quick_replies' ? 'Quick Replies' : 'CTA Button'}
                      </button>
                    ))}
                  </div>
                </div>

                {stageCfg.button_type === 'quick_replies' && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Options (max 3, shown as chips)</p>
                    <div className="space-y-1.5">
                      {(stageCfg.button_options || []).map((opt, i) => (
                        <div key={i} className="flex gap-1">
                          <Input
                            value={opt}
                            onChange={e => {
                              const opts = [...(stageCfg.button_options || [])];
                              opts[i] = e.target.value;
                              updateDraft(['funnel', activeStage, 'button_options'], opts);
                            }}
                            className="h-7 text-xs bg-white/5 border-white/10 text-slate-200"
                            maxLength={20}
                          />
                          <button
                            onClick={() => {
                              const opts = (stageCfg.button_options || []).filter((_, j) => j !== i);
                              updateDraft(['funnel', activeStage, 'button_options'], opts);
                            }}
                            className="p-1 text-slate-500 hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {(stageCfg.button_options || []).length < 3 && (
                        <button
                          onClick={() => {
                            const opts = [...(stageCfg.button_options || []), ''];
                            updateDraft(['funnel', activeStage, 'button_options'], opts);
                          }}
                          className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
                        >
                          <Plus className="w-3 h-3" /> Add option
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {stageCfg.button_type === 'cta' && (
                  <div className="space-y-1.5">
                    <Input
                      value={stageCfg.cta_title || ''}
                      onChange={e => updateDraft(['funnel', activeStage, 'cta_title'], e.target.value)}
                      placeholder="Button title (e.g. Shop Now)"
                      className="h-7 text-xs bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500"
                    />
                    <Input
                      value={stageCfg.cta_url || ''}
                      onChange={e => updateDraft(['funnel', activeStage, 'cta_url'], e.target.value)}
                      placeholder="URL (e.g. https://yourstore.com)"
                      className="h-7 text-xs bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Escalation Section */}
      {activeSection === 'escalation' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-500">Configure when the AI should escalate to human support and ask for the contact number.</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">Frustration threshold</p>
              <input
                type="number" min={1} max={10}
                value={draft.escalation_triggers.frustration_threshold}
                onChange={e => updateDraft(['escalation_triggers', 'frustration_threshold'], parseInt(e.target.value) || 2)}
                className="w-full text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-slate-200"
              />
              <p className="text-xs text-slate-600 mt-0.5">Negative messages in a row</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">High-value lead score</p>
              <input
                type="number" min={50} max={100}
                value={draft.escalation_triggers.high_value_score}
                onChange={e => updateDraft(['escalation_triggers', 'high_value_score'], parseInt(e.target.value) || 90)}
                className="w-full text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-slate-200"
              />
              <p className="text-xs text-slate-600 mt-0.5">Stall triggers escalation</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Objection loop count</p>
              <input
                type="number" min={1} max={10}
                value={draft.escalation_triggers.objection_loop_count}
                onChange={e => updateDraft(['escalation_triggers', 'objection_loop_count'], parseInt(e.target.value) || 3)}
                className="w-full text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-slate-200"
              />
              <p className="text-xs text-slate-600 mt-0.5">Same objection repeated</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1">Escalation keywords</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {draft.escalation_triggers.explicit_keywords.map((kw, i) => (
                <span key={i} className="flex items-center gap-1 text-xs bg-red-500/10 border border-red-500/20 text-red-300 rounded-full px-2 py-0.5">
                  {kw}
                  <button onClick={() => {
                    const kws = draft.escalation_triggers.explicit_keywords.filter((_, j) => j !== i);
                    updateDraft(['escalation_triggers', 'explicit_keywords'], kws);
                  }}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <AddKeywordInput onAdd={kw => {
              const kws = [...draft.escalation_triggers.explicit_keywords, kw];
              updateDraft(['escalation_triggers', 'explicit_keywords'], kws);
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

function AddKeywordInput({ onAdd }: { onAdd: (kw: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-1">
      <Input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal(''); } }}
        placeholder="Add keyword..."
        className="h-7 text-xs bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500"
      />
      <Button size="sm" onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(''); } }}
        className="h-7 px-2 bg-white/5 hover:bg-white/10 text-slate-300">
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  );
}

// ── Funnel Visual ─────────────────────────────────────────────────────────────

function FunnelVisual({ campaign }: { campaign: Campaign }) {
  return (
    <div className="flex flex-col items-center gap-0 py-2">
      {FUNNEL_STAGES.map((stage, i) => {
        const meta = STAGE_META[stage];
        const cfg = campaign.funnel[stage];
        const isLast = i === FUNNEL_STAGES.length - 1;
        return (
          <React.Fragment key={stage}>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 w-full max-w-xs">
              <span className="text-sm">{meta?.icon}</span>
              <span className="text-xs text-slate-300 flex-1">{meta?.label}</span>
              {cfg?.button_type && cfg.button_type !== 'none' && (
                <span className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded">
                  {cfg.button_type === 'cta' ? 'CTA' : 'QR'}
                </span>
              )}
            </div>
            {!isLast && <div className="w-px h-4 bg-white/10" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CampaignPanel({ config }: { config: Record<string, unknown> }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/campaigns');
      setCampaigns((res.data as any)?.campaigns || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => {
    setSelected({ ...EMPTY_CAMPAIGN, name: 'New Campaign' });
    setEditing(true);
  };

  const handleEdit = (campaign: Campaign) => {
    setSelected(campaign);
    setEditing(true);
  };

  const handleSave = async (campaign: Campaign) => {
    if (campaign.id) {
      await apiClient.put(`/api/campaigns/${campaign.id}`, campaign);
    } else {
      await apiClient.post('/api/campaigns', campaign);
    }
    await load();
    setEditing(false);
    setSelected(null);
  };

  const handleActivate = async (id: string) => {
    await apiClient.post(`/api/campaigns/${id}/activate`);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    await apiClient.delete(`/api/campaigns/${id}`);
    await load();
    if (selected?.id === id) { setSelected(null); setEditing(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    );
  }

  if (editing && selected) {
    return (
      <div className="h-full p-4">
        <CampaignEditor
          campaign={selected}
          onSave={handleSave}
          onCancel={() => { setEditing(false); setSelected(null); }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Campaign List */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-medium text-slate-200">Campaigns</h3>
          </div>
          <Button size="sm" onClick={handleCreate}
            className="h-7 px-2 text-xs bg-violet-600/80 hover:bg-violet-500 text-white">
            <Plus className="w-3 h-3 mr-1" /> New
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
            <AlertCircle className="w-3 h-3" /> {error}
          </div>
        )}

        <div className="space-y-2 flex-1 overflow-y-auto">
          {campaigns.length === 0 && (
            <div className="text-center py-8">
              <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No campaigns yet</p>
              <button onClick={handleCreate} className="text-xs text-violet-400 hover:text-violet-300 mt-1">
                Create your first campaign
              </button>
            </div>
          )}

          {campaigns.map(campaign => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selected?.id === campaign.id
                  ? 'bg-white/10 border-white/20'
                  : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/15'
              }`}
              onClick={() => { setSelected(campaign); setEditing(false); }}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-xs font-medium text-slate-200 leading-tight">{campaign.name}</p>
                <StatusBadge status={campaign.status} />
              </div>
              <div className="flex flex-wrap gap-1">
                {campaign.goals.slice(0, 3).map(g => (
                  <span key={g.id} className={`text-xs ${GOAL_META[g.type as GoalType]?.color}`}>
                    {GOAL_META[g.type as GoalType]?.icon}
                  </span>
                ))}
                {campaign.goals.length > 3 && (
                  <span className="text-xs text-slate-600">+{campaign.goals.length - 3}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Detail / Preview Pane */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-slate-600">
            <div className="text-center">
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a campaign to preview</p>
            </div>
          </div>
        ) : (
          <>
            {/* Campaign header */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div>
                <h3 className="text-sm font-medium text-slate-200">{selected.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selected.goals.length} goals · {FUNNEL_STAGES.length} stages</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={selected.status} />
                {selected.id && selected.status !== 'active' && (
                  <Button size="sm" onClick={() => handleActivate(selected.id!)}
                    className="h-7 px-2 text-xs bg-emerald-600/80 hover:bg-emerald-500 text-white">
                    <Play className="w-3 h-3 mr-1" /> Activate
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => handleEdit(selected)}
                  className="h-7 px-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/10">
                  <Edit3 className="w-3 h-3 mr-1" /> Edit
                </Button>
                {selected.id && (
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(selected.id!)}
                    className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-4 flex-1 min-h-0">
              {/* Goals preview */}
              <div className="w-48 flex-shrink-0">
                <p className="text-xs text-slate-500 mb-2">Goal Priority Stack</p>
                <div className="space-y-1.5">
                  {selected.goals.map(goal => (
                    <GoalBadge key={goal.id} type={goal.type as GoalType} priority={goal.priority} />
                  ))}
                  {selected.goals.length === 0 && (
                    <p className="text-xs text-slate-600">No goals configured</p>
                  )}
                </div>
              </div>

              {/* Funnel visual */}
              <div className="flex-1 overflow-y-auto">
                <p className="text-xs text-slate-500 mb-2">Funnel Stages</p>
                <FunnelVisual campaign={selected} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
