import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Minus,
  BarChart3,
  Activity,
  Target,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';

interface InstagramMetrics {
  messagesHandled: { today: number; week: number; month: number; change: number };
  responseTime: { average: number; fastest: number; slowest: number; change: number };
  uniqueConversations: { total: number; new: number; returning: number };
  sentiment: { positive: number; neutral: number; negative: number };
  conversions: { leads: number; qualified: number; converted: number; rate: number };
  engagement: { responseRate: number; resolutionRate: number; handoffRate: number };
  peakHours: Array<{ hour: number; count: number }>;
}

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon: React.ElementType;
  iconColor?: string;
  delay?: number;
}> = ({ title, value, subtitle, change, icon: Icon, iconColor = 'text-pink-500', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white rounded-xl border border-neutral-200 p-5 hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between mb-3">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconColor.replace('text-', 'bg-').replace('500', '100'))}>
        <Icon className={cn("w-5 h-5", iconColor)} />
      </div>
      {change !== undefined && (
        <div className={cn(
          "flex items-center gap-1 text-sm font-medium",
          change >= 0 ? "text-emerald-600" : "text-red-500"
        )}>
          {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
    <p className="text-2xl font-bold text-neutral-900 mb-1">{value}</p>
    <p className="text-sm text-neutral-500">{title}</p>
    {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
  </motion.div>
);

const SentimentBar: React.FC<{ positive: number; neutral: number; negative: number }> = ({ positive, neutral, negative }) => {
  const total = positive + neutral + negative;
  const positivePercent = total > 0 ? (positive / total) * 100 : 0;
  const neutralPercent = total > 0 ? (neutral / total) * 100 : 0;
  const negativePercent = total > 0 ? (negative / total) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="h-3 rounded-full overflow-hidden flex bg-neutral-100">
        <motion.div initial={{ width: 0 }} animate={{ width: `${positivePercent}%` }} transition={{ duration: 0.8, delay: 0.2 }} className="bg-emerald-500" />
        <motion.div initial={{ width: 0 }} animate={{ width: `${neutralPercent}%` }} transition={{ duration: 0.8, delay: 0.4 }} className="bg-amber-400" />
        <motion.div initial={{ width: 0 }} animate={{ width: `${negativePercent}%` }} transition={{ duration: 0.8, delay: 0.6 }} className="bg-red-400" />
      </div>
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <ThumbsUp className="w-4 h-4 text-emerald-500" />
          <span className="text-neutral-600">{positivePercent.toFixed(0)}% Positive</span>
        </div>
        <div className="flex items-center gap-2">
          <Minus className="w-4 h-4 text-amber-400" />
          <span className="text-neutral-600">{neutralPercent.toFixed(0)}% Neutral</span>
        </div>
        <div className="flex items-center gap-2">
          <ThumbsDown className="w-4 h-4 text-red-400" />
          <span className="text-neutral-600">{negativePercent.toFixed(0)}% Negative</span>
        </div>
      </div>
    </div>
  );
};

const ActivityChart: React.FC<{ data: Array<{ hour: number; count: number }> }> = ({ data }) => {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="flex items-end justify-between h-24 gap-1">
      {Array.from({ length: 24 }, (_, hour) => {
        const hourData = data.find(d => d.hour === hour);
        const count = hourData?.count || 0;
        const height = (count / maxCount) * 100;
        const isActive = hour >= 9 && hour <= 21;

        return (
          <motion.div
            key={hour}
            initial={{ height: 0 }}
            animate={{ height: `${height}%` }}
            transition={{ duration: 0.5, delay: hour * 0.02 }}
            className={cn(
              "flex-1 rounded-t",
              height > 60 ? "bg-gradient-to-t from-pink-500 to-purple-500" : isActive ? "bg-pink-200" : "bg-neutral-100"
            )}
            title={`${hour}:00 - ${count} messages`}
          />
        );
      })}
    </div>
  );
};

const ConversionFunnel: React.FC<{ leads: number; qualified: number; converted: number }> = ({ leads, qualified, converted }) => {
  const steps = [
    { label: 'Leads', value: leads, color: 'bg-pink-100 text-pink-700' },
    { label: 'Qualified', value: qualified, color: 'bg-purple-100 text-purple-700' },
    { label: 'Converted', value: converted, color: 'bg-emerald-100 text-emerald-700' },
  ];

  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const widthPercent = leads > 0 ? (step.value / leads) * 100 : 0;
        return (
          <div key={step.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">{step.label}</span>
              <span className="font-medium">{step.value}</span>
            </div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${widthPercent}%` }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className={cn("h-2 rounded-full", step.color.split(' ')[0])}
              style={{ minWidth: step.value > 0 ? '8px' : '0' }}
            />
          </div>
        );
      })}
    </div>
  );
};

const DEFAULT_METRICS: InstagramMetrics = {
  messagesHandled: { today: 0, week: 0, month: 0, change: 0 },
  responseTime: { average: 0, fastest: 0, slowest: 0, change: 0 },
  uniqueConversations: { total: 0, new: 0, returning: 0 },
  sentiment: { positive: 0, neutral: 0, negative: 0 },
  conversions: { leads: 0, qualified: 0, converted: 0, rate: 0 },
  engagement: { responseRate: 0, resolutionRate: 0, handoffRate: 0 },
  peakHours: [],
};

export default function MetricsPanel({ config }: { config: Record<string, unknown> }) {
  const [metrics, setMetrics] = useState<InstagramMetrics>(DEFAULT_METRICS);
  const [loading, setLoading] = useState(true);

  const endpoint = (config?.endpoint as string) || '/api/metrics';

  useEffect(() => {
    setLoading(true);
    apiClient.get(endpoint)
      .then((resp: any) => setMetrics(resp.data?.data || resp.data || DEFAULT_METRICS))
      .catch((err: any) => console.error('Failed to load metrics:', err))
      .finally(() => setLoading(false));
  }, [endpoint]);

  const formatResponseTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-pink-500" />
          Performance Metrics
        </h3>
        <span className="text-sm text-neutral-500">Last 30 days</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Messages Today" value={metrics.messagesHandled.today.toLocaleString()} subtitle={`${metrics.messagesHandled.week.toLocaleString()} this week`} change={metrics.messagesHandled.change} icon={MessageCircle} iconColor="text-pink-500" delay={0} />
        <StatCard title="Avg Response Time" value={formatResponseTime(metrics.responseTime.average)} subtitle={`Fastest: ${formatResponseTime(metrics.responseTime.fastest)}`} change={-metrics.responseTime.change} icon={Clock} iconColor="text-purple-500" delay={0.1} />
        <StatCard title="Unique Conversations" value={metrics.uniqueConversations.total.toLocaleString()} subtitle={`${metrics.uniqueConversations.new} new today`} icon={Users} iconColor="text-blue-500" delay={0.2} />
        <StatCard title="Conversion Rate" value={`${metrics.conversions.rate}%`} subtitle={`${metrics.conversions.converted} conversions`} icon={Target} iconColor="text-emerald-500" delay={0.3} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-xl border border-neutral-200 p-5">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500" />
            Sentiment Analysis
          </h4>
          <SentimentBar positive={metrics.sentiment.positive} neutral={metrics.sentiment.neutral} negative={metrics.sentiment.negative} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-xl border border-neutral-200 p-5">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-500" />
            Conversion Funnel
          </h4>
          <ConversionFunnel leads={metrics.conversions.leads} qualified={metrics.conversions.qualified} converted={metrics.conversions.converted} />
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white rounded-xl border border-neutral-200 p-5">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-pink-500" />
          Activity by Hour
        </h4>
        <ActivityChart data={metrics.peakHours} />
        <div className="flex justify-between text-xs text-neutral-400 mt-2">
          <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-pink-50 to-white rounded-xl border border-pink-100 p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6 text-pink-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">{metrics.engagement.responseRate}%</p>
          <p className="text-sm text-neutral-500">Response Rate</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100 p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">{metrics.engagement.resolutionRate}%</p>
          <p className="text-sm text-neutral-500">Resolution Rate</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-100 p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">{metrics.engagement.handoffRate}%</p>
          <p className="text-sm text-neutral-500">Human Handoff</p>
        </div>
      </motion.div>
    </div>
  );
}
