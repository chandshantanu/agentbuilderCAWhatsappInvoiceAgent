import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  caInvoiceService,
  type CaClient,
} from '@/services/caInvoiceService';

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExportPanel({ config }: { config: Record<string, unknown> }) {
  const { toast } = useToast();
  const [clients, setClients] = useState<CaClient[]>([]);
  const [exporting, setExporting] = useState(false);

  const [clientId, setClientId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('approved');
  const [tallyCompany, setTallyCompany] = useState('');

  useEffect(() => {
    caInvoiceService.listClients({ limit: 200 }).then((resp) => {
      setClients(resp.data || []);
    });
  }, []);

  const handleTallyExport = async () => {
    setExporting(true);
    try {
      const result = await caInvoiceService.exportTally({
        client_id: clientId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        status: status || undefined,
        tally_company: tallyCompany || undefined,
      });
      downloadFile(result.xml, `tally-export-${Date.now()}.xml`, 'application/xml');
      toast({ title: `Exported ${result.invoice_count} invoices to Tally XML` });
    } catch (err: any) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleCsvExport = async () => {
    setExporting(true);
    try {
      const result = await caInvoiceService.exportCsv({
        client_id: clientId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      downloadFile(result.csv, `invoices-export-${Date.now()}.csv`, 'text/csv');
      toast({ title: `Exported ${result.invoice_count} invoices to CSV` });
    } catch (err: any) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export Filters</CardTitle>
          <CardDescription>Select which invoices to export</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Client</Label>
              <Select value={clientId} onValueChange={(v) => setClientId(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clients</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v === 'any' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="exported">Already Exported</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tally Prime Export</CardTitle>
          <CardDescription>
            Generate Tally Prime-compatible XML with vouchers, GST ledger entries, and bill allocations.
            Import the file using Gateway of Tally &gt; Import Data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <Label>Tally Company Name</Label>
              <Input
                value={tallyCompany}
                onChange={(e) => setTallyCompany(e.target.value)}
                placeholder="My Company"
              />
            </div>
            <Button onClick={handleTallyExport} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export Tally XML'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CSV Export</CardTitle>
          <CardDescription>
            Export invoices as CSV for spreadsheet analysis or other accounting software.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleCsvExport} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
