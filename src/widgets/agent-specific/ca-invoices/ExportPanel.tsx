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
import { Download, FileCode2, FileSpreadsheet, Settings2 } from 'lucide-react';
import {
  caInvoiceService,
  type CaClient,
  type TallyPreviewResult,
} from '@/services/caInvoiceService';
import OutlierReviewModal from './OutlierReviewModal';

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

/**
 * Tally Prime requires UTF-16 LE encoding (with BOM) for XML import.
 * This encodes the XML string as UTF-16 LE bytes before downloading.
 */
function downloadTallyXml(content: string, filename: string) {
  // Replace UTF-8 declaration with UTF-16 declaration
  const xmlContent = content.replace(
    /^<\?xml[^?]*\?>/,
    '<?xml version="1.0" encoding="UTF-16"?>'
  );
  // Encode as UTF-16 LE with BOM
  const bom = '\uFEFF';
  const full = bom + xmlContent;
  const buffer = new ArrayBuffer(full.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < full.length; i++) {
    view.setUint16(i * 2, full.charCodeAt(i), true); // little-endian
  }
  const blob = new Blob([buffer], { type: 'application/xml' });
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
  const [status, setStatus] = useState('');
  const [tallyCompany, setTallyCompany] = useState('');

  // Outlier review state
  const [outlierResult, setOutlierResult] = useState<TallyPreviewResult | null>(null);
  const [showOutlierModal, setShowOutlierModal] = useState(false);

  useEffect(() => {
    caInvoiceService.listClients({ limit: 200 }).then((resp) => {
      setClients(resp.data || []);
    });
    // Pre-populate company name from saved Tally config
    caInvoiceService.getTallyConfig().then((cfg) => {
      if (cfg.company_name) setTallyCompany(cfg.company_name);
    }).catch(() => {});
  }, []);

  const _doExport = async (acknowledgedIds?: string[]) => {
    setExporting(true);
    try {
      const result = await caInvoiceService.exportTally({
        client_id: clientId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        status: status || undefined,
        tally_company: tallyCompany || undefined,
        acknowledged_invoice_ids: acknowledgedIds,
      });
      if (!result.success && result.invoice_count === 0) {
        toast({ title: 'No invoices to export', description: result.message || 'No invoices matched the selected filters.', variant: 'destructive' });
        return;
      }
      downloadTallyXml(result.xml, `tally-export-${Date.now()}.xml`);
      toast({ title: `Exported ${result.invoice_count} invoices to Tally XML` });
    } catch (err: any) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleTallyExport = async () => {
    setExporting(true);
    try {
      const preview = await caInvoiceService.previewTallyExport({
        client_id: clientId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        status: status || undefined,
      });

      if (preview.has_outliers) {
        setOutlierResult(preview);
        setShowOutlierModal(true);
        return;
      }
    } catch {
      // If preview fails, fall through to direct export
    } finally {
      setExporting(false);
    }
    // No outliers — proceed directly
    await _doExport();
  };

  const handleFixInvoice = (invoiceId: string) => {
    setShowOutlierModal(false);
    // Navigate to invoices tab with the invoice focused
    window.dispatchEvent(
      new CustomEvent('dashboard:navigate-tab', { detail: { tabId: 'invoices', focusInvoiceId: invoiceId } })
    );
  };

  const handleReviewAgain = async (acknowledgedIds: string[]) => {
    setShowOutlierModal(false);
    setExporting(true);
    try {
      const preview = await caInvoiceService.previewTallyExport({
        client_id: clientId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        status: status || undefined,
        acknowledged_invoice_ids: acknowledgedIds,
      });
      if (preview.has_outliers) {
        setOutlierResult(preview);
        setShowOutlierModal(true);
      } else {
        toast({ title: 'All issues resolved', description: 'Proceeding with export…' });
        await _doExport(acknowledgedIds);
      }
    } catch {
      await _doExport(acknowledgedIds);
    } finally {
      setExporting(false);
    }
  };

  const handleExportAnyway = async (acknowledgedIds: string[]) => {
    setShowOutlierModal(false);
    await _doExport(acknowledgedIds);
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
    <>
    <OutlierReviewModal
      open={showOutlierModal}
      result={outlierResult}
      onClose={() => setShowOutlierModal(false)}
      onFixInvoice={handleFixInvoice}
      onReviewAgain={handleReviewAgain}
      onExportAnyway={handleExportAnyway}
    />
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
            <Select value={status || 'any'} onValueChange={(v) => setStatus(v === 'any' ? '' : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="exported">Already Exported</SelectItem>
                <SelectItem value="pending_user_confirmation">Pending Confirmation</SelectItem>
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
          <p className="text-xs text-neutral-400 mb-2">
            Import via <span className="font-medium text-neutral-600">Gateway of Tally → Import Data</span>
          </p>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('dashboard:navigate-tab', { detail: { tabId: 'settings' } }));
            }}
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mb-3"
          >
            <Settings2 className="h-3 w-3" />
            Configure ledger mappings
          </button>
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
    </>
  );
}
