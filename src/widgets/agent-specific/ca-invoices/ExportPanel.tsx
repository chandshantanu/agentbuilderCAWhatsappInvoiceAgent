import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
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
import { Download, FileCode2, FileSpreadsheet } from 'lucide-react';
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
    <div className="space-y-5">
      {/* Filters */}
      <div className="rounded-xl border bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Export Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs text-neutral-500">Client</Label>
            <Select value={clientId} onValueChange={(v) => setClientId(v === 'all' ? '' : v)}>
              <SelectTrigger className="mt-1">
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
            <Label className="text-xs text-neutral-500">From Date</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-neutral-500">To Date</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-neutral-500">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v === 'any' ? '' : v)}>
              <SelectTrigger className="mt-1">
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
      </div>

      {/* Export formats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Tally Prime */}
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <FileCode2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Tally Prime XML</h3>
              <p className="text-xs text-neutral-500">Vouchers, GST ledgers, bill allocations</p>
            </div>
          </div>
          <div className="mb-4">
            <Label className="text-xs text-neutral-500">Tally Company Name</Label>
            <Input
              value={tallyCompany}
              onChange={(e) => setTallyCompany(e.target.value)}
              placeholder="My Company"
              className="mt-1"
            />
          </div>
          <p className="text-xs text-neutral-400 mb-4">
            Import via <span className="font-medium text-neutral-600">Gateway of Tally → Import Data</span>
          </p>
          <Button onClick={handleTallyExport} disabled={exporting} className="w-full gap-2">
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export Tally XML'}
          </Button>
        </div>

        {/* CSV */}
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">CSV Export</h3>
              <p className="text-xs text-neutral-500">Spreadsheets and other accounting software</p>
            </div>
          </div>
          <p className="text-xs text-neutral-400 mb-4">
            All invoice fields including line items, GST breakdown, and client details exported as flat CSV rows.
          </p>
          <Button variant="outline" onClick={handleCsvExport} disabled={exporting} className="w-full gap-2">
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      </div>
    </div>
  );
}
