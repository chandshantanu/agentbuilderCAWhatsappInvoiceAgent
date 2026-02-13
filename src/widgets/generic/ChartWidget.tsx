/**
 * ChartWidget — renders line, bar, area, or pie charts from API data.
 * Shows a friendly empty state when no data is available.
 *
 * Config:
 *   endpoint: string — API path to fetch chart data
 *   chart_type: 'line' | 'bar' | 'area' | 'pie' (default: 'line')
 *   title: string
 *   dataKey: string — field name for Y axis values
 *   xKey: string — field name for X axis labels
 *   color: string — chart color (default: primary)
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/apiClient';

interface ChartWidgetProps {
  config: {
    endpoint?: string;
    chart_type?: 'line' | 'bar' | 'area' | 'pie';
    title?: string;
    dataKey?: string;
    xKey?: string;
    color?: string;
  };
}

const COLORS = ['#8B5CF6', '#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

/* ─── Custom Tooltip ─────────────────────────────── */

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg border border-border px-3 py-2 text-xs">
      <p className="font-medium text-foreground mb-0.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
}

/* ─── Empty State ────────────────────────────────── */

function ChartEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-3 rounded-xl bg-surface-raised mb-3">
        <BarChart3 className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">No data available yet</p>
      <p className="text-xs text-muted-foreground max-w-[240px]">
        Chart data will appear here once your agent starts processing.
      </p>
    </div>
  );
}

/* ─── Shared chart props ─────────────────────────── */

const gridProps = {
  strokeDasharray: '4 4',
  stroke: 'var(--color-border)',
  strokeOpacity: 0.6,
};

const axisTickProps = { fontSize: 11, fill: 'var(--color-muted)' };

/* ─── Component ──────────────────────────────────── */

export default function ChartWidget({ config }: ChartWidgetProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!config.endpoint) {
      setLoading(false);
      return;
    }

    apiClient
      .get(config.endpoint)
      .then((resp) => setData(resp.data?.data || resp.data || []))
      .catch((err) => console.error('ChartWidget fetch error:', err))
      .finally(() => setLoading(false));
  }, [config.endpoint]);

  const chartType = config.chart_type || 'line';
  const dataKey = config.dataKey || 'value';
  const xKey = config.xKey || 'name';
  const color = config.color || 'var(--color-primary, #8B5CF6)';

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          {config.title && <Skeleton className="h-4 w-32" />}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-56 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <Card>
        {config.title && (
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">{config.title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className={config.title ? '' : 'pt-6'}>
          {data.length === 0 ? (
            <ChartEmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              {chartType === 'bar' ? (
                <BarChart data={data}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey={xKey} tick={axisTickProps} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTickProps} axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : chartType === 'area' ? (
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey={xKey} tick={axisTickProps} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTickProps} axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill="url(#areaGradient)" />
                </AreaChart>
              ) : chartType === 'pie' ? (
                <PieChart>
                  <Pie data={data} dataKey={dataKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={2} stroke="#fff">
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              ) : (
                <LineChart data={data}>
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey={xKey} tick={axisTickProps} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTickProps} axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
