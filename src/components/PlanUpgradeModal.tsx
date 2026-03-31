/**
 * PlanUpgradeModal — shown when user clicks a plan-gated feature toggle.
 * Displays current plan vs required plan with price delta and feature list.
 * "Upgrade" button navigates to /checkout?plan=<required> to pre-select the plan.
 */

import { X, Check, ArrowRight, Crown, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

const PLAN_META = {
  starter: {
    name: 'Starter',
    price: 999,
    color: '#64748b',
    unlocks: [] as string[],
  },
  pro: {
    name: 'Pro',
    price: 2999,
    color: '#7C3AED',
    unlocks: [
      'Story AutoDM — instant DM on every story reply',
      'Follow Gate — reply only after they follow you',
      'Comment AutoDM — auto-DM on purchase-intent comments',
      'Follow-up Scheduler — re-engage cold leads after 24h',
      'Proactive Outreach — AI-initiated warm messages',
    ],
  },
  agency: {
    name: 'Agency',
    price: 5999,
    color: '#0ea5e9',
    unlocks: [
      'Everything in Pro',
      'Advanced Analytics — LTV, funnel drop-off, attribution',
      'Multi-account management (up to 5 accounts)',
      'White-label dashboard branding',
      'Dedicated account manager',
    ],
  },
} as const;

type KnownPlan = keyof typeof PLAN_META;

export interface UpgradeModalConfig {
  feature: string;
  desc: string;
  requiredPlan: 'pro' | 'agency';
}

export default function PlanUpgradeModal({
  open,
  onClose,
  currentPlan,
  config,
}: {
  open: boolean;
  onClose: () => void;
  currentPlan: string;
  config: UpgradeModalConfig | null;
}) {
  const navigate = useNavigate();

  if (!open || !config) return null;

  const current = PLAN_META[(currentPlan as KnownPlan)] ?? PLAN_META.starter;
  const required = PLAN_META[config.requiredPlan];
  const delta = required.price - current.price;
  const reqRgb = hexToRgb(required.color);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{
          background: '#0f1625',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Feature name + lock */}
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-4 h-4 shrink-0" style={{ color: required.color }} />
          <h3 className="font-semibold text-slate-200 text-[15px]">{config.feature}</h3>
        </div>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">{config.desc}</p>

        {/* Plan comparison grid */}
        <div
          className="rounded-xl overflow-hidden mb-5"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="grid grid-cols-2">
            {/* Current plan */}
            <div className="p-4 bg-white/3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                Current
              </p>
              <p className="text-sm font-semibold text-slate-300 mb-1">{current.name}</p>
              <div className="flex items-baseline gap-0.5">
                <span className="text-slate-400 text-sm">₹</span>
                <span className="text-2xl font-extrabold text-slate-200 leading-none">
                  {current.price.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">/mo</span>
              </div>
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Feature locked
              </p>
            </div>

            {/* Required plan */}
            <div
              className="p-4"
              style={{
                background: `rgba(${reqRgb}, 0.07)`,
                borderLeft: `1px solid rgba(${reqRgb}, 0.22)`,
              }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: required.color }}
              >
                Required
              </p>
              <p className="text-sm font-semibold text-slate-200 mb-1">{required.name}</p>
              <div className="flex items-baseline gap-0.5">
                <span className="text-slate-400 text-sm">₹</span>
                <span className="text-2xl font-extrabold text-slate-100 leading-none">
                  {required.price.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">/mo</span>
              </div>
              <p className="text-xs text-emerald-400 mt-2">
                +₹{delta.toLocaleString()}/mo
              </p>
            </div>
          </div>
        </div>

        {/* What the new plan unlocks */}
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
            {required.name} plan unlocks
          </p>
          <div className="space-y-2">
            {required.unlocks.map(f => (
              <div key={f} className="flex items-start gap-2">
                <div
                  className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `rgba(${reqRgb}, 0.15)` }}
                >
                  <Check className="w-2.5 h-2.5" style={{ color: required.color }} />
                </div>
                <span className="text-[13px] text-slate-300 leading-snug">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-lg text-sm text-slate-400 hover:text-slate-200 border border-white/10 hover:bg-white/5 transition-colors"
          >
            Not now
          </button>
          <button
            onClick={() => navigate(`/checkout?plan=${config.requiredPlan}`)}
            className="flex-1 h-10 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: required.color }}
          >
            Upgrade to {required.name}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
