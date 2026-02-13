/**
 * StatsCard — displays key metrics fetched from a runtime API endpoint.
 * Falls back to placeholder cards when API is unavailable.
 *
 * Config:
 *   endpoint: string — API path to fetch stats (e.g., "/api/dashboard/stats")
 *   fields: string[] — which fields from the response to display
 */

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, IndianRupee, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/apiClient';

interface StatsCardProps {
  config: {
    endpoint?: string;
    fields?: string[];
  };
}

interface StatItem {
  label: string;
  value: string | number;
  trend?: { value: number; direction: 'up' | 'down' };
}

/* ─── Helpers ────────────────────────────────────── */

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (typeof value === 'number') {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  }
  return String(value ?? '0');
}

const ACCENT_STYLES: { bg: string; text: string; icon: LucideIcon }[] = [
  { bg: 'bg-[#EFF6FF]', text: 'text-accent-blue', icon: FileText },
  { bg: 'bg-[#FFF7ED]', text: 'text-accent-amber', icon: Clock },
  { bg: 'bg-[#F0FDF4]', text: 'text-accent-green', icon: IndianRupee },
  { bg: 'bg-[#FDF2F8]', text: 'text-accent-rose', icon: Users },
];

const FALLBACK_STATS: StatItem[] = [
  { label: 'Total Invoices', value: 0 },
  { label: 'Pending Review', value: 0 },
  { label: 'This Month', value: '₹0' },
  { label: 'Active Clients', value: 0 },
];

/* ─── Count-up animation ─────────────────────────── */

function AnimatedValue({ value }: { value: string | number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, ''));
  const prefix = typeof value === 'string' ? value.replace(/[0-9.,KMB]+$/g, '') : '';
  const isNumeric = !isNaN(numericValue) && numericValue > 0;

  useEffect(() => {
    if (!isNumeric || !ref.current) return;
    let frame: number;
    const duration = 600;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(numericValue * eased);
      if (ref.current) ref.current.textContent = `${prefix}${current.toLocaleString()}`;
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [numericValue, isNumeric, prefix]);

  if (!isNumeric) return <span>{value}</span>;
  return <span ref={ref}>{prefix}0</span>;
}

/* ─── Component ──────────────────────────────────── */

export default function StatsCard({ config }: StatsCardProps) {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!config.endpoint) {
      setStats(FALLBACK_STATS);
      setLoading(false);
      return;
    }

    apiClient
      .get(config.endpoint)
      .then((resp) => {
        const data = resp.data?.data || resp.data;
        const fields = config.fields || Object.keys(data);
        const items = fields
          .filter((f) => data[f] !== undefined)
          .map((f) => ({ label: formatLabel(f), value: formatValue(data[f]) }));
        setStats(items.length > 0 ? items : FALLBACK_STATS);
      })
      .catch(() => setStats(FALLBACK_STATS))
      .finally(() => setLoading(false));
  }, [config.endpoint, config.fields]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-7 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const accent = ACCENT_STYLES[index % ACCENT_STYLES.length];
        const Icon = accent.icon;

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.08, ease: [0.4, 0, 0.2, 1] }}
          >
            <Card className="p-5 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-semibold text-foreground tabular-nums">
                    <AnimatedValue value={stat.value} />
                  </p>
                  {stat.trend && (
                    <p className={`text-xs font-medium mt-1 ${stat.trend.direction === 'up' ? 'text-accent-green' : 'text-accent-rose'}`}>
                      {stat.trend.direction === 'up' ? '↑' : '↓'} {stat.trend.value}%
                    </p>
                  )}
                </div>
                <div className={`shrink-0 p-2.5 rounded-xl ${accent.bg}`}>
                  <Icon className={`h-5 w-5 ${accent.text}`} />
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
