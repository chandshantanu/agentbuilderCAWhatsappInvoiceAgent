/**
 * ActivityFeed — scrollable timeline of events with visual polish.
 *
 * Config:
 *   endpoint: string — API path to fetch activity items
 *   limit: number — max items to display (default 20)
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Inbox, MessageSquare, CreditCard, UserPlus, Settings, Bell } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/apiClient';

interface ActivityItem {
  id?: string;
  title: string;
  description?: string;
  timestamp: string;
  type?: string;
}

interface ActivityFeedProps {
  config: {
    endpoint?: string;
    limit?: number;
  };
}

/* ─── Helpers ────────────────────────────────────── */

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const typeIcons: Record<string, { icon: LucideIcon; bg: string; text: string }> = {
  message: { icon: MessageSquare, bg: 'bg-[#EFF6FF]', text: 'text-accent-blue' },
  payment: { icon: CreditCard, bg: 'bg-[#F0FDF4]', text: 'text-accent-green' },
  user: { icon: UserPlus, bg: 'bg-[#FDF2F8]', text: 'text-accent-rose' },
  config: { icon: Settings, bg: 'bg-[#FFF7ED]', text: 'text-accent-amber' },
  default: { icon: Bell, bg: 'bg-surface-raised', text: 'text-muted-foreground' },
};

function getTypeStyle(type?: string) {
  return typeIcons[type || ''] || typeIcons.default;
}

/* ─── Empty State ────────────────────────────────── */

function ActivityEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="p-3 rounded-xl bg-surface-raised mb-3">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">No recent activity</p>
      <p className="text-xs text-muted-foreground max-w-[240px]">
        Activity will appear here as your agent processes messages and events.
      </p>
    </div>
  );
}

/* ─── Component ──────────────────────────────────── */

export default function ActivityFeed({ config }: ActivityFeedProps) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!config.endpoint) {
      setLoading(false);
      return;
    }

    apiClient
      .get(config.endpoint, { params: { limit: config.limit || 20 } })
      .then((resp) => setItems(resp.data?.data || resp.data || []))
      .catch((err) => console.error('ActivityFeed fetch error:', err))
      .finally(() => setLoading(false));
  }, [config.endpoint, config.limit]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
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
        <CardHeader>
          <CardTitle className="text-sm font-medium text-foreground">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <ActivityEmptyState />
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="relative pl-4">
                {/* Timeline line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

                {items.map((item, i) => {
                  const style = getTypeStyle(item.type);
                  const Icon = style.icon;

                  return (
                    <motion.div
                      key={item.id || i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="relative flex gap-3 pb-4 last:pb-0"
                    >
                      {/* Icon */}
                      <div className={`relative z-10 shrink-0 p-1.5 rounded-lg ${style.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${style.text}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm text-foreground leading-snug">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(item.timestamp)}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
