/**
 * CA Dashboard Overview Widget
 *
 * KPIs, action items, invoice trend, status donut,
 * per-client activity table, recent invoices, system health.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  FileText, AlertCircle, Users, Wifi, WifiOff,
  ChevronRight, Clock, CheckCircle2, TrendingUp,
} from 'lucide-react';
import { caInvoiceService, type DashboardOverview, type ClientBreakdownRow } from '@/services/caInvoiceService';

// ─── Colours ───────────────────────────────────────────────────────

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

function fmtDate(iso: string): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); }
  catch { return iso; }
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

/** Indian Financial Year: Apr–Mar. Returns e.g. "FY 25–26" */
function toFY(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = d.getMonth(); // 0-indexed, March=2, April=3
    const fyStart = m >= 3 ? y : y - 1; // April onwards → new FY
    return `FY ${String(fyStart).slice(2)}–${String(fyStart + 1).slice(2)}`;
  } catch { return ''; }
}

/** Returns unique sorted FYs from min..max invoice dates */
function fyRange(minDate: string | null, maxDate: string | null): string {
  const fyMin = toFY(minDate);
  const fyMax = toFY(maxDate);
  if (!fyMin) return '';
  if (!fyMax || fyMin === fyMax) return fyMin;
  return `${fyMin} – ${fyMax}`;
}

function shortDate(iso: string | null): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return iso; }
}

function fillTrend(raw: Array<{ date: string; count: number }>): Array<{ date: string; count: number; label: string }> {
  const map = new Map(raw.map((r) => [r.date, r.count]));
  const result: Array<{ date: string; count: number; label: string }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    result.push({ date: key, count: map.get(key) ?? 0, label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) });
  }
  return result;
}

// ─── Sub-components ────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, valueStr, accent, highlight, sub,
}: {
  icon: React.ElementType; label: string; value: number;
  valueStr?: string; accent: string; highlight?: boolean; sub?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 bg-white ${highlight ? 'ring-2 ring-amber-400' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${accent}`}><Icon className="h-4 w-4" /></div>
        {highlight && (
          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Needs attention</span>
        )}
      </div>
      <div className="text-2xl font-bold text-neutral-900">{valueStr ?? value.toLocaleString('en-IN')}</div>
      <div className="text-xs text-neutral-500 mt-1">{label}</div>
      {sub && <div className="text-xs text-neutral-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-neutral-700 mb-3">{children}</h3>;
}

// Per-client mini bar showing pending / approved / exported proportions
function ClientStatusBar({ row }: { row: ClientBreakdownRow }) {
  const total = row.total;
  if (total === 0) return null;
  const pctPending = (row.pending / total) * 100;
  const pctApproved = (row.approved / total) * 100;
  const pctExported = (row.exported / total) * 100;
  return (
    <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-neutral-100 gap-px">
      {pctPending > 0 && <div style={{ width: `${pctPending}%`, background: '#f59e0b' }} />}
      {pctApproved > 0 && <div style={{ width: `${pctApproved}%`, background: '#10b981' }} />}
      {pctExported > 0 && <div style={{ width: `${pctExported}%`, background: '#6b7280' }} />}
    </div>
  );
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

  function navigateTab(tabId: string, extra?: Record<string, unknown>) {
    window.dispatchEvent(new CustomEvent('dashboard:navigate-tab', { detail: { tabId, ...extra } }));
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-neutral-400 text-sm">Loading overview…</div>;
  }

  if (error || !data) {
    return <div className="flex items-center justify-center py-24 text-red-500 text-sm">{error || 'No data'}</div>;
  }

  const { kpis, status_breakdown, invoice_trend, action_items, recent_invoices, system_health, client_breakdown = [], approval_rate } = data;
  const trendData = fillTrend(invoice_trend);
  const hasInvoices = kpis.total_invoices > 0;
  const donutTotal = status_breakdown.reduce((s, r) => s + r.count, 0);

  // Approved this month = approved + exported from status_breakdown
  const approvedCount = (status_breakdown.find(s => s.status === 'approved')?.count ?? 0)
    + (status_breakdown.find(s => s.status === 'exported')?.count ?? 0);

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
          icon={CheckCircle2}
          label="Approved / Exported"
          value={approvedCount}
          accent="bg-emerald-100 text-emerald-600"
          sub={approval_rate !== null ? `${approval_rate}% approval rate` : undefined}
        />
        <KpiCard
          icon={Users}
          label="Active Clients"
          value={kpis.active_clients}
          accent="bg-purple-100 text-purple-600"
          sub={client_breakdown.length > 0 ? `${client_breakdown.filter(c => c.pending > 0).length} with pending` : undefined}
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
                    <Pie data={status_breakdown} dataKey="count" innerRadius={42} outerRadius={62} paddingAngle={2}>
                      {status_breakdown.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number, _: any, p: any) => [v, p.payload.label]} contentStyle={{ fontSize: 12 }} />
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
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[entry.status] ?? '#94a3b8' }} />
                      <span className="text-neutral-600">{entry.label}</span>
                    </div>
                    <span className="font-semibold text-neutral-800">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-36 text-neutral-400 text-sm">No invoices yet</div>
          )}
        </div>

        {/* Area trend */}
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Invoices — Last 30 Days</SectionTitle>
            {hasInvoices && (
              <span className="text-xs text-neutral-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {invoice_trend.reduce((s, r) => s + r.count, 0)} this month
              </span>
            )}
          </div>
          {hasInvoices ? (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={6} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => [v, 'Invoices']} labelFormatter={(l) => l} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#trendGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-36 text-neutral-400 text-sm">No activity yet</div>
          )}
        </div>
      </div>

      {/* ── Client Activity Table ───────────────────────────────── */}
      {client_breakdown.length > 0 && (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <SectionTitle>Client Activity</SectionTitle>
            <button
              onClick={() => navigateTab('clients')}
              className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5"
            >
              Manage clients <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-neutral-500 bg-neutral-50">
                  <th className="px-5 py-2 text-left font-medium">Client</th>
                  <th className="px-4 py-2 text-center font-medium">Total</th>
                  <th className="px-4 py-2 text-center font-medium">Pending</th>
                  <th className="px-4 py-2 text-center font-medium">Approved</th>
                  <th className="px-4 py-2 text-center font-medium">Exported</th>
                  <th className="px-4 py-2 text-left font-medium">Progress</th>
                  <th className="px-4 py-2 text-left font-medium">FY Coverage</th>
                  <th className="px-4 py-2 text-left font-medium">Date Range</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {client_breakdown.map((row) => (
                  <tr key={row.client_id ?? row.client_name} className="border-b last:border-0 hover:bg-neutral-50/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-neutral-900 max-w-[160px] truncate">
                      {row.client_name}
                    </td>
                    <td className="px-4 py-3 text-center text-neutral-600">{row.total}</td>
                    <td className="px-4 py-3 text-center">
                      {row.pending > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                          {row.pending}
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-xs">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={row.approved > 0 ? 'text-emerald-600 font-medium' : 'text-neutral-400 text-xs'}>
                        {row.approved}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={row.exported > 0 ? 'text-neutral-700 font-medium' : 'text-neutral-400 text-xs'}>
                        {row.exported}
                      </span>
                    </td>
                    <td className="px-4 py-3 w-24">
                      <ClientStatusBar row={row} />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {fyRange(row.invoice_date_min, row.invoice_date_max)
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium whitespace-nowrap">
                            {fyRange(row.invoice_date_min, row.invoice_date_max)}
                          </span>
                        : <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">
                      {row.invoice_date_min
                        ? shortDate(row.invoice_date_min) === shortDate(row.invoice_date_max)
                          ? shortDate(row.invoice_date_min)
                          : `${shortDate(row.invoice_date_min)} – ${shortDate(row.invoice_date_max)}`
                        : <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.pending > 0 && (
                        <button
                          onClick={() => navigateTab('invoices', { clientId: row.client_id, status: 'pending_review' })}
                          className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
                        >
                          Review →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent_invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-neutral-50/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-neutral-900">{inv.invoice_number || '—'}</td>
                    <td className="px-4 py-3 text-neutral-600 max-w-[160px] truncate">{inv.seller_name || '—'}</td>
                    <td className="px-4 py-3 text-neutral-500">{fmtDate(inv.invoice_date)}</td>
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
          <div className="flex items-center gap-1.5">
            {system_health.whatsapp_connected
              ? <Wifi className="h-3.5 w-3.5 text-emerald-500" />
              : <WifiOff className="h-3.5 w-3.5 text-red-400" />}
            <span>
              WhatsApp{' '}
              <span className={system_health.whatsapp_connected ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                {system_health.whatsapp_connected ? 'connected' : 'not connected'}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Last message: <span className="text-neutral-700">{timeAgo(system_health.last_message_at)}</span></span>
          </div>
          {system_health.blocked_phones_count > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span>{system_health.blocked_phones_count} phone{system_health.blocked_phones_count !== 1 ? 's' : ''} blocked</span>
            </div>
          )}
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
