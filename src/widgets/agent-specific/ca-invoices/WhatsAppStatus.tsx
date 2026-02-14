import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/apiClient';
import { saasApi } from '@/services/saasApiService';

interface WhatsAppStatusData {
  connected: boolean;
  phone_number?: string;
  verified_name?: string;
  waba_id?: string;
  connected_at?: string;
}

export default function WhatsAppStatus({ config }: { config: Record<string, unknown> }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<WhatsAppStatusData | null>(null);

  useEffect(() => {
    const subdomain = (config?.subdomain as string) || '';

    // Try SaaS status endpoint first, fall back to health check
    if (subdomain) {
      saasApi
        .getWhatsAppStatus(subdomain)
        .then((resp: any) => {
          const data = resp.data || resp;
          setStatusData(data);
          setConnected(!!data.connected);
        })
        .catch(() => {
          // Fall back to runtime health check
          apiClient
            .get('/api/health')
            .then(() => setConnected(true))
            .catch(() => setConnected(false));
        })
        .finally(() => setLoading(false));
    } else {
      apiClient
        .get('/api/health')
        .then(() => setConnected(true))
        .catch(() => setConnected(false))
        .finally(() => setLoading(false));
    }
  }, [config?.subdomain]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            WhatsApp Connection
            {!loading && (
              <Badge variant={connected ? 'default' : 'destructive'}>
                {connected ? 'Connected' : 'Disconnected'}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Manage your WhatsApp Business API connection for invoice processing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <span className="text-gray-500">Status:</span>
              <span className="font-medium">{loading ? 'Checking...' : connected ? 'Active' : 'Inactive'}</span>
              {statusData?.phone_number && (
                <>
                  <span className="text-gray-500">Phone Number:</span>
                  <span className="font-medium">{statusData.phone_number}</span>
                </>
              )}
              {statusData?.verified_name && (
                <>
                  <span className="text-gray-500">Verified Name:</span>
                  <span className="font-medium">{statusData.verified_name}</span>
                </>
              )}
              {statusData?.connected_at && (
                <>
                  <span className="text-gray-500">Connected:</span>
                  <span className="font-medium">
                    {new Date(statusData.connected_at).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-gray-500 list-decimal list-inside">
            <li>
              <strong className="text-gray-900">Send Invoice</strong> — Your clients send
              invoice photos or PDFs to your WhatsApp Business number.
            </li>
            <li>
              <strong className="text-gray-900">Auto-Extract</strong> — Our AI reads the
              invoice and extracts all GST details: GSTIN, HSN/SAC codes, CGST/SGST/IGST amounts.
            </li>
            <li>
              <strong className="text-gray-900">Review</strong> — You review the extracted
              data in the Invoices tab. Make corrections if needed.
            </li>
            <li>
              <strong className="text-gray-900">Export</strong> — Export approved invoices
              as Tally Prime XML or CSV with one click.
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supported Formats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="border rounded-lg p-3 text-center">
              <div className="font-medium">JPEG/PNG</div>
              <div className="text-gray-500 text-xs">Invoice photos</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="font-medium">PDF</div>
              <div className="text-gray-500 text-xs">Multi-page invoices</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="font-medium">B2B / B2C</div>
              <div className="text-gray-500 text-xs">All invoice types</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="font-medium">GST Compliant</div>
              <div className="text-gray-500 text-xs">GSTIN validation</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
