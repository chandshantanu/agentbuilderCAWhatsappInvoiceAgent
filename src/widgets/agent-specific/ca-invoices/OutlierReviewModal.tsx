import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface OutlierInvoice {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  gap: number;
  issue_type: string;
  taxable: number;
  grand_total: number;
  gst_total: number;
}

export interface OutlierCompanyGroup {
  company: string;
  invoices: OutlierInvoice[];
  insight: string;
}

export interface OutlierPreviewResult {
  has_outliers: boolean;
  companies: OutlierCompanyGroup[];
  clean_count: number;
  outlier_count: number;
}

interface Props {
  open: boolean;
  result: OutlierPreviewResult | null;
  onClose: () => void;
  onFixInvoice: (invoiceId: string) => void;
  onReviewAgain: (acknowledgedIds: string[]) => void;
  onExportAnyway: (acknowledgedIds: string[]) => void;
}

const ISSUE_LABELS: Record<string, string> = {
  missing_gst: 'Missing GST',
  missing_grand_total: 'Missing Total',
  mixed_rates: 'Mixed Rates',
};

export default function OutlierReviewModal({
  open,
  result,
  onClose,
  onFixInvoice,
  onReviewAgain,
  onExportAnyway,
}: Props) {
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  if (!result) return null;

  const allOutlierIds = result.companies.flatMap((g) =>
    g.invoices.map((i) => i.invoice_id)
  );

  const handleSkip = (invoiceId: string) => {
    setSkippedIds((prev) => new Set([...prev, invoiceId]));
  };

  const handleUnSkip = (invoiceId: string) => {
    setSkippedIds((prev) => {
      const next = new Set(prev);
      next.delete(invoiceId);
      return next;
    });
  };

  const handleReviewAgain = () => {
    onReviewAgain([...skippedIds]);
    setSkippedIds(new Set());
  };

  const handleExportAnyway = () => {
    onExportAnyway(allOutlierIds);
  };

  const activeGroups = result.companies.filter((g) =>
    g.invoices.some((i) => !skippedIds.has(i.invoice_id))
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-neutral-100">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-neutral-900">
                Review Required Before Export
              </DialogTitle>
              <p className="text-sm text-neutral-500 mt-0.5">
                {result.outlier_count} invoice{result.outlier_count !== 1 ? 's' : ''} need attention
                across {result.companies.length} {result.companies.length !== 1 ? 'companies' : 'company'}
                {result.clean_count > 0 && (
                  <span className="text-emerald-600 ml-1">
                    · {result.clean_count} invoice{result.clean_count !== 1 ? 's' : ''} look clean
                  </span>
                )}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Company Groups */}
        <div className="px-6 py-4 space-y-4">
          {result.companies.map((group) => {
            const activeInvoices = group.invoices.filter((i) => !skippedIds.has(i.invoice_id));
            const skippedInGroup = group.invoices.filter((i) => skippedIds.has(i.invoice_id));

            return (
              <div key={group.company} className="rounded-xl border border-neutral-200 overflow-hidden">
                {/* Company header */}
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
                  <p className="text-sm font-semibold text-neutral-800">{group.company}</p>
                  {group.insight && (
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{group.insight}</p>
                  )}
                </div>

                {/* Active invoices */}
                {activeInvoices.length > 0 && (
                  <div className="divide-y divide-neutral-100">
                    {activeInvoices.map((inv) => (
                      <div key={inv.invoice_id} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-neutral-900 truncate">
                              {inv.invoice_number || '(no number)'}
                            </span>
                            {inv.invoice_date && (
                              <span className="text-xs text-neutral-400">{inv.invoice_date}</span>
                            )}
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                              {ISSUE_LABELS[inv.issue_type] || inv.issue_type}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            Gap: <span className="font-semibold text-red-600">₹{inv.gap.toFixed(2)}</span>
                            {' · '}Taxable: ₹{inv.taxable.toFixed(2)}
                            {' · '}GST: ₹{inv.gst_total.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1"
                            onClick={() => onFixInvoice(inv.invoice_id)}
                          >
                            Fix
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 text-neutral-400 hover:text-neutral-600"
                            onClick={() => handleSkip(inv.invoice_id)}
                          >
                            Skip
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Skipped invoices in this group */}
                {skippedInGroup.length > 0 && (
                  <div className="px-4 py-2 bg-neutral-50/50 border-t border-neutral-100 space-y-1">
                    {skippedInGroup.map((inv) => (
                      <div key={inv.invoice_id} className="flex items-center justify-between text-xs text-neutral-400">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-neutral-300" />
                          <span className="line-through">{inv.invoice_number || '(no number)'}</span>
                          <span>— skipped</span>
                        </div>
                        <button
                          onClick={() => handleUnSkip(inv.invoice_id)}
                          className="text-blue-500 hover:text-blue-700 underline"
                        >
                          undo
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {activeGroups.length === 0 && (
            <div className="text-center py-4 text-sm text-emerald-600">
              All flagged invoices have been skipped. Click "Review Again" to re-check.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between gap-3 bg-neutral-50">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-neutral-500">
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReviewAgain}
            >
              Review Again
            </Button>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleExportAnyway}
            >
              Export Anyway
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
