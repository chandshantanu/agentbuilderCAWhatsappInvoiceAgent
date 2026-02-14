import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Plus, Trash2, Save, CheckCircle, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import {
  caInvoiceService,
  type CaInvoice,
  type InvoiceLineItem,
} from '@/services/caInvoiceService';

const STATUS_COLORS: Record<string, string> = {
  pending_user_confirmation: 'bg-purple-100 text-purple-800',
  pending_review: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  exported: 'bg-blue-100 text-blue-800',
};

const VOUCHER_TYPES = ['Sales', 'Purchase', 'Credit Note', 'Debit Note', 'Receipt', 'Payment', 'Journal'];
const SUPPLY_TYPES = ['Intra-State', 'Inter-State'];

/* ─── Helpers ──────────────────────────────────────── */

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

function confidenceBadge(score: number) {
  const pct = Math.round(score * 100);
  if (pct >= 90) return <Badge className="bg-green-100 text-green-800 text-xs">{pct}% confidence</Badge>;
  if (pct >= 70) return <Badge className="bg-amber-100 text-amber-800 text-xs">{pct}% confidence</Badge>;
  return <Badge className="bg-red-100 text-red-800 text-xs">{pct}% confidence</Badge>;
}

function emptyLineItem(): InvoiceLineItem {
  return {
    description: '',
    hsn_sac_code: '',
    quantity: 1,
    unit: 'NOS',
    rate: 0,
    taxable_amount: 0,
    gst_rate: 18,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    cess_amount: 0,
    total_amount: 0,
  };
}

function recalcLineItem(item: InvoiceLineItem, isInterState: boolean): InvoiceLineItem {
  const taxable = item.quantity * item.rate;
  const gstAmount = taxable * (item.gst_rate / 100);
  return {
    ...item,
    taxable_amount: taxable,
    cgst_amount: isInterState ? 0 : gstAmount / 2,
    sgst_amount: isInterState ? 0 : gstAmount / 2,
    igst_amount: isInterState ? gstAmount : 0,
    total_amount: taxable + gstAmount + item.cess_amount,
  };
}

function calcTotals(items: InvoiceLineItem[], roundOff: number) {
  const taxable = items.reduce((s, i) => s + i.taxable_amount, 0);
  const cgst = items.reduce((s, i) => s + i.cgst_amount, 0);
  const sgst = items.reduce((s, i) => s + i.sgst_amount, 0);
  const igst = items.reduce((s, i) => s + i.igst_amount, 0);
  const cess = items.reduce((s, i) => s + i.cess_amount, 0);
  return {
    taxable_amount: taxable,
    cgst_total: cgst,
    sgst_total: sgst,
    igst_total: igst,
    cess_total: cess,
    round_off: roundOff,
    grand_total: taxable + cgst + sgst + igst + cess + roundOff,
  };
}

/* ─── Invoice Media Preview ────────────────────────── */

function InvoiceMediaPreview({ invoiceId }: { invoiceId: string }) {
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    caInvoiceService.getInvoiceMediaCount(invoiceId).then((count) => {
      if (!cancelled) {
        setPageCount(count);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setPageCount(0);
        setLoading(false);
        setError(true);
      }
    });
    return () => { cancelled = true; };
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || pageCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-lg text-gray-400 gap-2 py-12">
        <ImageIcon className="h-10 w-10" />
        <p className="text-sm">No document preview available</p>
      </div>
    );
  }

  const mediaUrl = caInvoiceService.getInvoiceMediaUrl(invoiceId, currentPage);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
        <img
          src={mediaUrl}
          alt={`Invoice page ${currentPage + 1}`}
          className="max-w-full max-h-[70vh] object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 mt-2">
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-500">
            Page {currentPage + 1} of {pageCount}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Editable Invoice Detail Dialog ───────────────── */

function InvoiceDetailDialog({
  invoice,
  onClose,
  onApprove,
  onReject,
  onSaved,
}: {
  invoice: CaInvoice;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEditable = invoice.status === 'pending_review' || invoice.status === 'pending_user_confirmation';
  const hasMedia = (invoice.media_file_ids?.length ?? 0) > 0;

  // Editable state
  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoice_number || '');
  const [invoiceDate, setInvoiceDate] = useState(invoice.invoice_date || '');
  const [voucherType, setVoucherType] = useState(invoice.voucher_type || 'Purchase');
  const [supplyType, setSupplyType] = useState(invoice.supply_type || 'Intra-State');
  const [sellerName, setSellerName] = useState(invoice.seller_name || '');
  const [sellerGstin, setSellerGstin] = useState(invoice.seller_gstin || '');
  const [sellerStateCode, setSellerStateCode] = useState(invoice.seller_state_code || '');
  const [buyerName, setBuyerName] = useState(invoice.buyer_name || '');
  const [buyerGstin, setBuyerGstin] = useState(invoice.buyer_gstin || '');
  const [buyerStateCode, setBuyerStateCode] = useState(invoice.buyer_state_code || '');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(invoice.line_items || []);
  const [roundOff, setRoundOff] = useState(invoice.totals?.round_off || 0);
  const [saving, setSaving] = useState(false);

  const isInterState = sellerStateCode !== buyerStateCode && !!sellerStateCode && !!buyerStateCode;

  // Recalc all line items when inter-state status changes
  useEffect(() => {
    setLineItems((prev) => prev.map((item) => recalcLineItem(item, isInterState)));
  }, [isInterState]);

  const totals = useMemo(() => calcTotals(lineItems, roundOff), [lineItems, roundOff]);

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      updated[index] = recalcLineItem(updated[index], isInterState);
      return updated;
    });
  };

  const addLineItem = () => setLineItems((prev) => [...prev, recalcLineItem(emptyLineItem(), isInterState)]);

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const buildPayload = (): Partial<CaInvoice> => ({
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    voucher_type: voucherType,
    supply_type: supplyType,
    seller_name: sellerName,
    seller_gstin: sellerGstin,
    seller_state_code: sellerStateCode,
    buyer_name: buyerName,
    buyer_gstin: buyerGstin,
    buyer_state_code: buyerStateCode,
    line_items: lineItems,
    totals: { ...invoice.totals, ...totals },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await caInvoiceService.updateInvoice(invoice.id, buildPayload());
      toast({ title: 'Invoice saved' });
      onSaved();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      await caInvoiceService.updateInvoice(invoice.id, buildPayload());
      await caInvoiceService.approveInvoice(invoice.id);
      toast({ title: 'Invoice approved' });
      onSaved();
      onClose();
    } catch (err: any) {
      toast({ title: 'Approve failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className={`${hasMedia ? 'max-w-7xl' : 'max-w-4xl'} max-h-[90vh] overflow-y-auto`}>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle className="flex items-center gap-3">
            Invoice #{invoice.invoice_number}
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[invoice.status] || ''}`}>
              {invoice.status.replace(/_/g, ' ')}
            </span>
            {invoice.wa_confirmed && (
              <Badge className="bg-green-50 text-green-700 text-xs">WA Confirmed</Badge>
            )}
          </DialogTitle>
          {confidenceBadge(invoice.confidence_score || 0)}
        </div>
      </DialogHeader>

      <div className={`${hasMedia ? 'grid grid-cols-5 gap-6' : ''}`}>
        {/* Left panel: Document preview */}
        {hasMedia && (
          <div className="col-span-2">
            <InvoiceMediaPreview invoiceId={invoice.id} />
          </div>
        )}

        {/* Right panel: Extracted data */}
        <div className={`${hasMedia ? 'col-span-3' : ''} space-y-6 text-sm`}>
        {/* Editable banner */}
        {isEditable && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-amber-800 text-sm">
              Review extracted data. Edit any incorrect fields before approving.
            </p>
          </div>
        )}

        {/* Header fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs text-gray-500">Invoice Number</Label>
            {isEditable ? (
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="mt-1" />
            ) : (
              <p className="font-medium mt-1">{invoiceNumber || '\u2014'}</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-gray-500">Invoice Date</Label>
            {isEditable ? (
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="mt-1" />
            ) : (
              <p className="font-medium mt-1">{invoiceDate || '\u2014'}</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-gray-500">Voucher Type</Label>
            {isEditable ? (
              <Select value={voucherType} onValueChange={setVoucherType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VOUCHER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <p className="font-medium mt-1">{voucherType}</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-gray-500">Supply Type</Label>
            {isEditable ? (
              <Select value={supplyType} onValueChange={setSupplyType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPLY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <p className="font-medium mt-1">{supplyType}</p>
            )}
          </div>
        </div>

        {/* Seller / Buyer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Seller */}
          <div className="space-y-3 p-4 rounded-lg bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Seller</p>
            <div>
              <Label className="text-xs text-gray-500">Name</Label>
              {isEditable ? (
                <Input value={sellerName} onChange={(e) => setSellerName(e.target.value)} className="mt-1" />
              ) : (
                <p className="font-medium mt-1">{sellerName}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">GSTIN</Label>
                {isEditable ? (
                  <Input
                    value={sellerGstin}
                    onChange={(e) => setSellerGstin(e.target.value.toUpperCase())}
                    maxLength={15}
                    placeholder="27ABCDE1234F1Z5"
                    className="mt-1 font-mono text-xs"
                  />
                ) : (
                  <p className="font-mono text-xs mt-1">{sellerGstin || 'N/A'}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-gray-500">State Code</Label>
                {isEditable ? (
                  <Input
                    value={sellerStateCode}
                    onChange={(e) => setSellerStateCode(e.target.value)}
                    maxLength={2}
                    className="mt-1 w-20"
                  />
                ) : (
                  <p className="font-medium mt-1">{sellerStateCode || '\u2014'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Buyer */}
          <div className="space-y-3 p-4 rounded-lg bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Buyer</p>
            <div>
              <Label className="text-xs text-gray-500">Name</Label>
              {isEditable ? (
                <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="mt-1" />
              ) : (
                <p className="font-medium mt-1">{buyerName}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">GSTIN</Label>
                {isEditable ? (
                  <Input
                    value={buyerGstin}
                    onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
                    maxLength={15}
                    placeholder="27ABCDE1234F1Z5"
                    className="mt-1 font-mono text-xs"
                  />
                ) : (
                  <p className="font-mono text-xs mt-1">{buyerGstin || 'N/A'}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-gray-500">State Code</Label>
                {isEditable ? (
                  <Input
                    value={buyerStateCode}
                    onChange={(e) => setBuyerStateCode(e.target.value)}
                    maxLength={2}
                    className="mt-1 w-20"
                  />
                ) : (
                  <p className="font-medium mt-1">{buyerStateCode || '\u2014'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-900">Line Items</p>
            {isEditable && (
              <Button size="sm" variant="outline" onClick={addLineItem} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Item
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Description</TableHead>
                  <TableHead className="w-[100px]">HSN/SAC</TableHead>
                  <TableHead className="w-[70px] text-right">Qty</TableHead>
                  <TableHead className="w-[60px]">Unit</TableHead>
                  <TableHead className="w-[100px] text-right">Rate</TableHead>
                  <TableHead className="w-[70px] text-right">GST %</TableHead>
                  <TableHead className="w-[110px] text-right">Total</TableHead>
                  {isEditable && <TableHead className="w-[40px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      {isEditable ? (
                        <Input
                          value={item.description}
                          onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                          className="h-8 text-xs"
                        />
                      ) : (
                        <span className="truncate block max-w-[200px]">{item.description}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditable ? (
                        <Input
                          value={item.hsn_sac_code}
                          onChange={(e) => updateLineItem(i, 'hsn_sac_code', e.target.value)}
                          className="h-8 text-xs"
                        />
                      ) : (
                        item.hsn_sac_code || '\u2014'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditable ? (
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right w-16"
                          min={0}
                          step="any"
                        />
                      ) : (
                        item.quantity
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditable ? (
                        <Input
                          value={item.unit}
                          onChange={(e) => updateLineItem(i, 'unit', e.target.value)}
                          className="h-8 text-xs w-14"
                        />
                      ) : (
                        item.unit
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditable ? (
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateLineItem(i, 'rate', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right w-24"
                          min={0}
                          step="any"
                        />
                      ) : (
                        formatCurrency(item.rate)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditable ? (
                        <Input
                          type="number"
                          value={item.gst_rate}
                          onChange={(e) => updateLineItem(i, 'gst_rate', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right w-16"
                          min={0}
                          max={28}
                          step="any"
                        />
                      ) : (
                        `${item.gst_rate}%`
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.total_amount)}
                    </TableCell>
                    {isEditable && (
                      <TableCell>
                        <button
                          onClick={() => removeLineItem(i)}
                          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          aria-label="Remove line item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {lineItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isEditable ? 8 : 7} className="text-center text-gray-400 py-6">
                      No line items
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Totals */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-2 max-w-xs ml-auto text-sm">
            <span className="text-gray-500">Taxable Amount:</span>
            <span className="text-right font-mono">{formatCurrency(totals.taxable_amount)}</span>
            {totals.cgst_total > 0 && (
              <>
                <span className="text-gray-500">CGST:</span>
                <span className="text-right font-mono">{formatCurrency(totals.cgst_total)}</span>
                <span className="text-gray-500">SGST:</span>
                <span className="text-right font-mono">{formatCurrency(totals.sgst_total)}</span>
              </>
            )}
            {totals.igst_total > 0 && (
              <>
                <span className="text-gray-500">IGST:</span>
                <span className="text-right font-mono">{formatCurrency(totals.igst_total)}</span>
              </>
            )}
            {totals.cess_total > 0 && (
              <>
                <span className="text-gray-500">Cess:</span>
                <span className="text-right font-mono">{formatCurrency(totals.cess_total)}</span>
              </>
            )}
            <span className="text-gray-500">Round Off:</span>
            <span className="text-right">
              {isEditable ? (
                <Input
                  type="number"
                  value={roundOff}
                  onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs text-right w-24 ml-auto"
                  step="0.01"
                />
              ) : (
                <span className="font-mono">{formatCurrency(roundOff)}</span>
              )}
            </span>
            <span className="font-bold text-gray-900">Grand Total:</span>
            <span className="text-right font-bold font-mono text-gray-900">{formatCurrency(totals.grand_total)}</span>
          </div>
        </div>

        {/* Additional Charges */}
        {invoice.additional_charges && (() => {
          const ac = invoice.additional_charges!;
          const hasCharges = (ac.service_charge || 0) > 0 || (ac.delivery_charge || 0) > 0 ||
            (ac.packaging_charge || 0) > 0 || (ac.tips_gratuity || 0) > 0 ||
            (ac.convenience_fee || 0) > 0 || (ac.other_charges || 0) > 0;
          if (!hasCharges) return null;
          return (
            <div className="border-t pt-4">
              <p className="font-semibold text-gray-900 mb-2">Additional Charges</p>
              <div className="grid grid-cols-2 gap-2 max-w-xs text-sm">
                {(ac.service_charge || 0) > 0 && (
                  <>
                    <span className="text-gray-500">
                      Service Charge{ac.service_charge_rate ? ` (${ac.service_charge_rate}%)` : ''}:
                    </span>
                    <span className="text-right font-mono">{formatCurrency(ac.service_charge)}</span>
                  </>
                )}
                {(ac.delivery_charge || 0) > 0 && (
                  <>
                    <span className="text-gray-500">Delivery:</span>
                    <span className="text-right font-mono">{formatCurrency(ac.delivery_charge)}</span>
                  </>
                )}
                {(ac.packaging_charge || 0) > 0 && (
                  <>
                    <span className="text-gray-500">Packaging:</span>
                    <span className="text-right font-mono">{formatCurrency(ac.packaging_charge)}</span>
                  </>
                )}
                {(ac.tips_gratuity || 0) > 0 && (
                  <>
                    <span className="text-gray-500">Tips/Gratuity:</span>
                    <span className="text-right font-mono">{formatCurrency(ac.tips_gratuity)}</span>
                  </>
                )}
                {(ac.convenience_fee || 0) > 0 && (
                  <>
                    <span className="text-gray-500">Convenience Fee:</span>
                    <span className="text-right font-mono">{formatCurrency(ac.convenience_fee)}</span>
                  </>
                )}
                {(ac.other_charges || 0) > 0 && (
                  <>
                    <span className="text-gray-500">{ac.other_charges_description || 'Other'}:</span>
                    <span className="text-right font-mono">{formatCurrency(ac.other_charges)}</span>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Discount */}
        {invoice.discount && (invoice.discount.discount_amount || 0) > 0 && (
          <div className="border-t pt-4">
            <p className="font-semibold text-gray-900 mb-2">Discount</p>
            <div className="grid grid-cols-2 gap-2 max-w-xs text-sm">
              <span className="text-gray-500">
                Amount{invoice.discount.discount_percentage ? ` (${invoice.discount.discount_percentage}%)` : ''}:
              </span>
              <span className="text-right font-mono text-green-700">
                -{formatCurrency(invoice.discount.discount_amount)}
              </span>
              {invoice.discount.discount_description && (
                <>
                  <span className="text-gray-500">Description:</span>
                  <span className="text-right">{invoice.discount.discount_description}</span>
                </>
              )}
              {invoice.discount.coupon_code && (
                <>
                  <span className="text-gray-500">Coupon:</span>
                  <span className="text-right font-mono">{invoice.discount.coupon_code}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Extraction notes */}
        {invoice.extraction_notes && (
          <p className="text-xs text-gray-400">Notes: {invoice.extraction_notes}</p>
        )}
      </div>{/* end right panel / data column */}
      </div>{/* end grid */}

      <DialogFooter>
        {isEditable ? (
          <div className="flex gap-2 w-full justify-end">
            <Button
              variant="outline"
              onClick={() => { onReject(invoice.id); onClose(); }}
              disabled={saving}
            >
              Reject
            </Button>
            <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={handleApprove} disabled={saving} className="gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              {saving ? 'Approving...' : 'Save & Approve'}
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={onClose}>Close</Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}

/* ─── Main InvoiceTable Component ──────────────────── */

export default function InvoiceTable({ config }: { config: Record<string, unknown> }) {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<CaInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailInvoice, setDetailInvoice] = useState<CaInvoice | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await caInvoiceService.listInvoices({
        search: search || undefined,
        status: statusFilter || undefined,
        limit: pageSize,
        offset: page * pageSize,
      });
      setInvoices(resp.data || []);
      setTotal(resp.total || 0);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, toast]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleApprove = async (invoiceId: string) => {
    try {
      await caInvoiceService.approveInvoice(invoiceId);
      toast({ title: 'Invoice approved' });
      fetchInvoices();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleReject = async (invoiceId: string) => {
    try {
      await caInvoiceService.rejectInvoice(invoiceId);
      toast({ title: 'Invoice rejected' });
      fetchInvoices();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleBulkApprove = async () => {
    if (selected.size === 0) return;
    try {
      const result = await caInvoiceService.bulkApproveInvoices(Array.from(selected));
      toast({ title: `${result.modified_count} invoices approved` });
      setSelected(new Set());
      fetchInvoices();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === invoices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(invoices.map((i) => i.id)));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Invoices</CardTitle>
          {selected.size > 0 && (
            <Button size="sm" onClick={handleBulkApprove}>
              Approve {selected.size} selected
            </Button>
          )}
        </div>
        <div className="flex gap-3 mt-3">
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(0); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending_user_confirmation">Awaiting Confirmation</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="exported">Exported</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === invoices.length && invoices.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(inv.id)}
                        onChange={() => toggleSelect(inv.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        className="text-blue-600 hover:underline font-medium"
                        onClick={() => setDetailInvoice(inv)}
                      >
                        {inv.invoice_number || '\u2014'}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{inv.invoice_date || '\u2014'}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{inv.seller_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {inv.voucher_type || inv.invoice_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(inv.totals?.grand_total || 0)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[inv.status] || ''}`}>
                        {inv.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {(inv.status === 'pending_review' || inv.status === 'pending_user_confirmation') && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleApprove(inv.id)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleReject(inv.id)}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      No invoices found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {total > pageSize && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-500">
                  Showing {page * pageSize + 1}&ndash;{Math.min((page + 1) * pageSize, total)} of {total}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={(page + 1) * pageSize >= total}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={!!detailInvoice} onOpenChange={() => setDetailInvoice(null)}>
        {detailInvoice && (
          <InvoiceDetailDialog
            invoice={detailInvoice}
            onClose={() => setDetailInvoice(null)}
            onApprove={handleApprove}
            onReject={handleReject}
            onSaved={fetchInvoices}
          />
        )}
      </Dialog>
    </Card>
  );
}
