import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/apiClient';
import {
  Phone,
  MessageSquare,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  FileText,
  Clock,
  Link,
  Copy,
  Check,
  Zap,
} from 'lucide-react';

interface MessageStats {
  total: number;
  incoming: number;
  outgoing: number;
  today: number;
  unique_senders: number;
}

interface WhatsAppStatusData {
  connected: boolean;
  phone_number?: string;
  phone_number_id?: string;
  verified_name?: string;
  waba_id?: string;
  connected_at?: string;
  message_stats?: MessageStats;
  last_received?: string;
  total_invoices?: number;
  webhook_url?: string;
}

function StatItem({
  icon: Icon,
  label,
  value,
  color = 'text-neutral-600',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50/80">
      <div className={`p-2 rounded-md bg-white shadow-sm ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-neutral-500">{label}</div>
        <div className="text-sm font-semibold text-neutral-900 truncate">{value}</div>
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function WhatsAppStatus({ config }: { config: Record<string, unknown> }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<WhatsAppStatusData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiClient
      .get('/api/whatsapp/status')
      .then((resp: any) => {
        const data = resp.data || resp;
        setStatusData(data);
        setConnected(!!data.connected);
      })
      .catch(() => setConnected(false))
      .finally(() => setLoading(false));
  }, []);

  const copyWebhook = () => {
    if (statusData?.webhook_url) {
      navigator.clipboard.writeText(statusData.webhook_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const stats = statusData?.message_stats;

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-600" />
            WhatsApp Business Connection
            {!loading && (
              <Badge
                variant={connected ? 'default' : 'destructive'}
                className={connected ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {connected ? 'Connected' : 'Not Connected'}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {connected
              ? 'Your WhatsApp Business number is actively receiving and processing invoices.'
              : 'Connect your WhatsApp Business number to start processing invoices automatically.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-neutral-200 rounded w-1/3" />
              <div className="h-4 bg-neutral-200 rounded w-1/2" />
            </div>
          ) : connected && statusData ? (
            <div className="grid grid-cols-2 gap-4 max-w-lg">
              <span className="text-sm text-neutral-500">Phone Number</span>
              <span className="text-sm font-medium">{statusData.phone_number}</span>

              {statusData.verified_name && (
                <>
                  <span className="text-sm text-neutral-500">Business Name</span>
                  <span className="text-sm font-medium">{statusData.verified_name}</span>
                </>
              )}

              {statusData.connected_at && (
                <>
                  <span className="text-sm text-neutral-500">Connected Since</span>
                  <span className="text-sm font-medium">
                    {new Date(statusData.connected_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </>
              )}

              {statusData.phone_number_id && (
                <>
                  <span className="text-sm text-neutral-500">Phone Number ID</span>
                  <span className="text-sm font-mono text-xs text-neutral-600">
                    {statusData.phone_number_id}
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="text-sm text-neutral-500 space-y-2">
              <p>
                To connect, complete the WhatsApp Embedded Signup from the agent
                configuration wizard.
              </p>
              <p className="text-xs text-neutral-400">
                Once connected, your clients can send invoice photos or PDFs
                directly to your WhatsApp Business number.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Stats */}
      {connected && stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Message Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatItem
                icon={MessageSquare}
                label="Total Messages"
                value={stats.total}
                color="text-blue-600"
              />
              <StatItem
                icon={ArrowDownLeft}
                label="Received"
                value={stats.incoming}
                color="text-green-600"
              />
              <StatItem
                icon={ArrowUpRight}
                label="Sent"
                value={stats.outgoing}
                color="text-violet-600"
              />
              <StatItem
                icon={Users}
                label="Unique Senders"
                value={stats.unique_senders}
                color="text-amber-600"
              />
              <StatItem
                icon={Zap}
                label="Today"
                value={stats.today}
                color="text-rose-600"
              />
            </div>

            <div className="mt-4 flex items-center gap-6 text-sm text-neutral-500">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>
                  <strong className="text-neutral-900">{statusData?.total_invoices ?? 0}</strong>{' '}
                  invoices processed
                </span>
              </div>
              {statusData?.last_received && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    Last message{' '}
                    <strong className="text-neutral-900">
                      {timeAgo(statusData.last_received)}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook URL */}
      {connected && statusData?.webhook_url && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link className="h-4 w-4" />
              Webhook Configuration
            </CardTitle>
            <CardDescription>
              This webhook URL is configured in your Meta App to receive WhatsApp messages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-neutral-100 rounded-md text-sm font-mono text-neutral-700 truncate">
                {statusData.webhook_url}
              </code>
              <button
                onClick={copyWebhook}
                className="p-2 rounded-md hover:bg-neutral-100 transition-colors text-neutral-500"
                title="Copy webhook URL"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-neutral-500 list-decimal list-inside">
            <li>
              <strong className="text-neutral-900">Send Invoice</strong> — Your
              clients send invoice photos or PDFs to your WhatsApp Business number.
            </li>
            <li>
              <strong className="text-neutral-900">Auto-Extract</strong> — AI reads
              the invoice and extracts all GST details: GSTIN, HSN/SAC codes,
              CGST/SGST/IGST amounts, additional charges, and discounts.
            </li>
            <li>
              <strong className="text-neutral-900">Confirm via WhatsApp</strong> —
              A summary is sent back for confirmation. Users can correct any field
              by replying with corrections.
            </li>
            <li>
              <strong className="text-neutral-900">Review &amp; Export</strong> —
              Review confirmed invoices in the Invoices tab. Export as Tally Prime
              XML or CSV.
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Supported Formats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supported Formats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="border rounded-lg p-3 text-center">
              <div className="font-medium">JPEG / PNG</div>
              <div className="text-neutral-500 text-xs">Invoice photos</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="font-medium">PDF</div>
              <div className="text-neutral-500 text-xs">Multi-page invoices</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="font-medium">B2B / B2C</div>
              <div className="text-neutral-500 text-xs">All invoice types</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="font-medium">GST Compliant</div>
              <div className="text-neutral-500 text-xs">GSTIN checksum validation</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
