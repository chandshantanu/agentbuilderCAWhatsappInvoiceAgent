/**
 * CA Dashboard Overview Widget
 *
 * Single-call consolidated overview: KPIs, status donut, 30-day trend,
 * GST summary, action items, recent invoices, system health.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  FileText,
  AlertCircle,
  IndianRupee,
  Users,
  Wifi,
  WifiOff,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { caInvoiceService, type DashboardOverview } from '@/services/caInvoiceService';

// ─── Colour palette ────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending_review: '#f59e0b',
  pending_user_confirmation: '#6366f1',
  approved: '#10b981',
  rejected: '#ef4444',
  exported: '#6b7280',
};

const STATUS_BADGE: Record<string, string> = {
  pending_review: 'bg-amber-100 text-amber-700',
  pending_user_confirmation: 'bg-indigo-100 text-indigo-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  exported: 'bg-neutral-100 text-neutral-600',
};

const SEVERITY_STYLES: Record<string, string> = {
  error: 'border-l-red-500 bg-red-50',
  warning: 'border-l-amber-500 bg-amber-50',
  info: 'border-l-blue-500 bg-blue-50',
};

const SEVERITY_DOT: Record<string, string> = {
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

// ─── Helpers ───────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch {
    return iso;
  }
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Fill missing dates in the 30-day window with count=0 */
function fillTrend(raw: Array<{ date: string; count: number }>): Array<{ date: string; count: number; label: string }> {
  const map = new Map(raw.map((r) => [r.date, r.count]));
  const result: Array<{ date: string; count: number; label: string }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    result.push({
      date: key,
      count: map.get(key) ?? 0,
      label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    });
  }
  return result;
}

// ─── Sub-components ────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  valueStr,
  accent,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  valueStr?: string;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 bg-white ${highlight ? 'ring-2 ring-amber-400' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
        {highlight && (
          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            Needs attention
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-neutral-900">{valueStr ?? value.toLocaleString('en-IN')}</div>
      <div className="text-xs text-neutral-500 mt-1">{label}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-neutral-700 mb-3">{children}</h3>;
}

// ─── Main Component ────────────────────────────────────────────────

export default function DashboardOverview({ config }: { config: Record<string, unknown> }) {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const overview = await caInvoiceService.getDashboardOverview();
      setData(overview);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);

  function navigateTab(tabId: string) {
    window.dispatchEvent(new CustomEvent('dashboard:navigate-tab', { detail: { tabId } }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400 text-sm">
        Loading overview…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-24 text-red-500 text-sm">
        {error || 'No data'}
      </div>
    );
  }

  const { kpis, status_breakdown, invoice_trend, gst_summary, action_items, recent_invoices, system_health } = data;
  const trendData = fillTrend(invoice_trend);
  const hasInvoices = kpis.total_invoices > 0;
  const gstTotal = gst_summary.total_gst;

  // Donut total for centre label
  const donutTotal = status_breakdown.reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-6">

      {/* ── Action Items ───────────────────────────────────────── */}
      {action_items.length > 0 && (
        <div className="space-y-2">
          {action_items.map((item) => (
            <button
              key={item.type}
              onClick={() => navigateTab(item.tab)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-l-4 text-left transition-opacity hover:opacity-80 ${SEVERITY_STYLES[item.severity]}`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[item.severity]}`} />
                <span className="text-sm font-medium text-neutral-800">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* ── Hero KPIs ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={FileText}
          label="Total Invoices"
          value={kpis.total_invoices}
          accent="bg-blue-100 text-blue-600"
        />
        <KpiCard
          icon={AlertCircle}
          label="Pending Review"
          value={kpis.pending_review}
          accent="bg-amber-100 text-amber-600"
          highlight={kpis.pending_review > 0}
        />
        <KpiCard
          icon={IndianRupee}
          label="Total Invoice Value"
          value={kpis.total_amount}
          valueStr={fmt(kpis.total_amount)}
          accent="bg-emerald-100 text-emerald-600"
        />
        <KpiCard
          icon={Users}
          label="Active Clients"
          value={kpis.active_clients}
          accent="bg-purple-100 text-purple-600"
        />
      </div>

      {/* ── Status breakdown + Invoice Trend ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Donut */}
        <div className="rounded-xl border bg-white p-5">
          <SectionTitle>Invoice Status Breakdown</SectionTitle>
          {hasInvoices ? (
            <div className="flex items-center gap-4">
              <div className="relative" style={{ width: 140, height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={status_breakdown}
                      dataKey="count"
                      innerRadius={42}
                      outerRadius={62}
                      paddingAngle={2}
                    >
                      {status_breakdown.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, _: any, p: any) => [v, p.payload.label]}
                      contentStyle={{ fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-neutral-900">{donutTotal}</span>
                  <span className="text-xs text-neutral-500">total</span>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                {status_breakdown.map((entry) => (
                  <div key={entry.status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: STATUS_COLORS[entry.status] ?? '#94a3b8' }}
                      />
                      <span className="text-neutral-600">{entry.label}</span>
                    </div>
                    <span className="font-semibold text-neutral-800">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-36 text-neutral-400 text-sm">
              No invoices yet
            </div>
          )}
        </div>

        {/* Area trend */}
        <div className="rounded-xl border bg-white p-5">
          <SectionTitle>Invoices — Last 30 Days</SectionTitle>
          {hasInvoices ? (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  interval={6}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(v: number) => [v, 'Invoices']}
                  labelFormatter={(l) => l}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#trendGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-36 text-neutral-400 text-sm">
              No activity yet
            </div>
          )}
        </div>
      </div>

      {/* ── GST Summary ─────────────────────────────────────────── */}
      <div className="rounded-xl border bg-white p-5">
        <SectionTitle>GST Summary</SectionTitle>
        {gstTotal > 0 ? (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-3 flex-wrap">
              {[
                { label: 'CGST', value: gst_summary.cgst_total, color: 'text-blue-600 bg-blue-50' },
                { label: 'SGST', value: gst_summary.sgst_total, color: 'text-violet-600 bg-violet-50' },
                { label: 'IGST', value: gst_summary.igst_total, color: 'text-teal-600 bg-teal-50' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-lg px-4 py-3 ${color} flex-1 min-w-[100px]`}>
                  <div className="text-xs font-medium opacity-70">{label}</div>
                  <div className="text-lg font-bold mt-0.5">{fmt(value)}</div>
                  <div className="text-xs opacity-60 mt-0.5">
                    {gstTotal > 0 ? `${((value / gstTotal) * 100).toFixed(1)}%` : '—'}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={70}>
                <BarChart
                  data={[
                    { name: 'CGST', value: gst_summary.cgst_total },
                    { name: 'SGST', value: gst_summary.sgst_total },
                    { name: 'IGST', value: gst_summary.igst_total },
                  ]}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => [fmt(v), '']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    <Cell fill="#3b82f6" />
                    <Cell fill="#8b5cf6" />
                    <Cell fill="#14b8a6" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="text-neutral-400 text-sm py-4 text-center">No GST data yet</div>
        )}
        {gstTotal > 0 && (
          <div className="mt-3 pt-3 border-t flex justify-between text-sm">
            <span className="text-neutral-500">Total GST Collected</span>
            <span className="font-bold text-neutral-900">{fmt(gstTotal)}</span>
          </div>
        )}
      </div>

      {/* ── Recent Invoices ─────────────────────────────────────── */}
      {recent_invoices.length > 0 && (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <SectionTitle>Recent Invoices</SectionTitle>
            <button
              onClick={() => navigateTab('invoices')}
              className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5"
            >
              View all <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-neutral-500 bg-neutral-50">
                  <th className="px-5 py-2 text-left font-medium">Invoice #</th>
                  <th className="px-4 py-2 text-left font-medium">Seller</th>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent_invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-neutral-50/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-neutral-900">{inv.invoice_number || '—'}</td>
                    <td className="px-4 py-3 text-neutral-600 max-w-[140px] truncate">{inv.seller_name || '—'}</td>
                    <td className="px-4 py-3 text-neutral-500">{fmtDate(inv.invoice_date)}</td>
                    <td className="px-4 py-3 text-right font-medium text-neutral-900">{fmt(inv.grand_total)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[inv.status] ?? 'bg-neutral-100 text-neutral-600'}`}>
                        {inv.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── System Health Footer ────────────────────────────────── */}
      <div className="rounded-xl border bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-neutral-500">

          {/* WhatsApp connection */}
          <div className="flex items-center gap-1.5">
            {system_health.whatsapp_connected ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-red-400" />
            )}
            <span>
              WhatsApp{' '}
              <span className={system_health.whatsapp_connected ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                {system_health.whatsapp_connected ? 'connected' : 'not connected'}
              </span>
            </span>
          </div>

          {/* Last message */}
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Last message: <span className="text-neutral-700">{timeAgo(system_health.last_message_at)}</span></span>
          </div>

          {/* Blocked phones */}
          {system_health.blocked_phones_count > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span>{system_health.blocked_phones_count} phone{system_health.blocked_phones_count !== 1 ? 's' : ''} blocked</span>
            </div>
          )}

          {/* Queue stats (if available) */}
          {Object.keys(system_health.queue_stats).length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>
                Queue:{' '}
                {['pending', 'processing', 'failed']
                  .filter((k) => system_health.queue_stats[k] !== undefined)
                  .map((k) => `${system_health.queue_stats[k]} ${k}`)
                  .join(' · ')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
