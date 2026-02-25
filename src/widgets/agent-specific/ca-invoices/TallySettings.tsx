import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tooltip } from '@/components/ui/tooltip';
import {
  Save,
  Wand2,
  Info,
  Building2,
  BookOpen,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Upload,
  FileCode2,
  X,
  ChevronDown,
} from 'lucide-react';
import { caInvoiceService, type TallyConfig } from '@/services/caInvoiceService';
import { getAuthToken } from '@/lib/apiClient';

const GST_RATES = ['0', '5', '12', '18', '28'] as const;
type GstRate = typeof GST_RATES[number];

const RATE_HALF: Record<GstRate, string> = {
  '0': '0',
  '5': '2',
  '12': '6',
  '18': '9',
  '28': '14',
};

/* ─── Tally XML Parser ──────────────────────────────────────
   Parses Tally XML exports in two formats:
   1. Masters export: <LEDGER NAME="..."> elements
   2. Voucher/All-Masters export: <LEDGERNAME> within <ALLEDGERENTRIES.LIST>

   Also extracts company name from <SVCURRENTCOMPANY>.
   Handles both UTF-8 and UTF-16 LE encodings from Tally Prime.
─────────────────────────────────────────────────────────────── */

interface ParsedLedger {
  name: string;
  parent: string;
}

interface ParsedTallyData {
  ledgers: ParsedLedger[];
  companyName?: string;
}

/** Decode ArrayBuffer handling UTF-16 LE BOM (FF FE) that Tally Prime uses.
    Strips the BOM character (\uFEFF) so DOMParser doesn't reject the string. */
function decodeTallyBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let text: string;
  // Detect UTF-16 LE BOM: 0xFF 0xFE
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    text = new TextDecoder('utf-16le').decode(buffer);
  // Detect UTF-16 BE BOM: 0xFE 0xFF
  } else if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    text = new TextDecoder('utf-16be').decode(buffer);
  } else {
    text = new TextDecoder('utf-8').decode(buffer);
  }
  // Strip BOM character that TextDecoder leaves in the string
  return text.replace(/^\uFEFF/, '');
}

/** Strip wide-character spaces: Tally sometimes emits UTF-16 as UTF-8
    resulting in spaces between every character (e.g. "< E N V E L O P E >").
    Detect this pattern and compact it. */
function normalizeSpacedXML(text: string): string {
  // If every other character is a space for >20 chars, it's wide-spaced
  const sample = text.slice(0, 40);
  const everyOtherIsSpace = sample.length > 20 &&
    Array.from(sample).every((ch, i) => i % 2 === 1 ? ch === ' ' : true);
  if (everyOtherIsSpace) {
    return text.replace(/ /g, '');
  }
  return text;
}

function parseTallyXML(xmlText: string): ParsedTallyData {
  try {
    let normalized = normalizeSpacedXML(xmlText);

    // Remove XML encoding declaration — DOMParser rejects encoding="UTF-16"
    // when fed a pre-decoded JS string. The string is already Unicode at this point.
    normalized = normalized.replace(/(<\?xml\b[^?]*?)(\s+encoding=["'][^"']*["'])([^?]*?\?>)/, '$1$3');

    // Remove &#N; references to control characters illegal in XML 1.0
    // Tally uses &#4; (EOT) to represent "Not Applicable". Strip them.
    normalized = normalized.replace(/&#([0-9]+);/g, (match, num) => {
      const code = parseInt(num, 10);
      // XML 1.0 legal chars: #x9 | #xA | #xD | [#x20-#xD7FF]
      if (code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 55295)) {
        return match; // keep valid ones
      }
      return ''; // strip illegal control chars like &#4;
    });

    const parser = new DOMParser();
    const doc = parser.parseFromString(normalized, 'application/xml');

    if (doc.querySelector('parsererror')) {
      throw new Error('Invalid XML file');
    }

    // Extract company name from static variables (voucher export format)
    const companyEl = doc.querySelector('SVCURRENTCOMPANY');
    const companyName = companyEl?.textContent?.trim() || undefined;

    const ledgers: ParsedLedger[] = [];

    // Format 1: Masters export — <LEDGER NAME="..."><PARENT>...</PARENT>
    const masterElements = doc.querySelectorAll('LEDGER[NAME]');
    masterElements.forEach((el) => {
      const name = el.getAttribute('NAME')?.trim() || '';
      const parentEl = el.querySelector('PARENT');
      const parent = parentEl?.textContent?.trim() || 'Other';
      if (name) ledgers.push({ name, parent });
    });

    // Format 2: Voucher/All-Masters export — extract unique LEDGERNAME values
    // from ALLEDGERENTRIES.LIST entries. Classify by ledger name keywords.
    if (ledgers.length === 0) {
      const ledgerNameEls = doc.querySelectorAll('LEDGERNAME');
      ledgerNameEls.forEach((el) => {
        const name = el.textContent?.trim() || '';
        if (!name) return;
        const lower = name.toLowerCase();
        let parent = 'Other';
        if (lower.includes('cgst')) parent = 'Duties & Taxes (CGST)';
        else if (lower.includes('sgst')) parent = 'Duties & Taxes (SGST)';
        else if (lower.includes('igst')) parent = 'Duties & Taxes (IGST)';
        else if (lower.includes('sale') || lower.includes('income')) parent = 'Sales Accounts';
        else if (lower.includes('purchase') || lower.includes('expense')) parent = 'Purchase Accounts';
        else if (lower.includes('debtor') || lower.includes('receivable') || lower.includes('sundry')) parent = 'Sundry Debtors';
        else if (lower.includes('creditor') || lower.includes('payable')) parent = 'Sundry Creditors';
        else if (lower.includes('bank') || lower.includes('cash')) parent = 'Bank / Cash';
        ledgers.push({ name, parent });
      });
    }

    // Deduplicate by name
    const seen = new Set<string>();
    const unique = ledgers.filter((l) => {
      if (seen.has(l.name)) return false;
      seen.add(l.name);
      return true;
    });

    return { ledgers: unique, companyName };
  } catch {
    throw new Error('Could not parse Tally XML. Please upload a valid Tally data export file.');
  }
}

/* ─── Field key → label mapping for smart auto-fill ──────── */

function isRelevantLedger(parent: string): boolean {
  const p = parent.toLowerCase();
  return (
    p.includes('sale') ||
    p.includes('duty') ||
    p.includes('tax') ||
    p.includes('gst') ||
    p.includes('liabi') ||
    p.includes('output') ||
    p.includes('igst') ||
    p.includes('cgst') ||
    p.includes('sgst')
  );
}

/* ─── XML Upload Panel ────────────────────────────────────── */

interface XmlUploadPanelProps {
  onApply: (ledgers: ParsedLedger[], companyName?: string) => void;
}

function XmlUploadPanel({ onApply }: XmlUploadPanelProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ledgers, setLedgers] = useState<ParsedLedger[]>([]);
  const [companyName, setCompanyName] = useState<string | undefined>();
  const [fileName, setFileName] = useState<string>('');
  const [expanded, setExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const processFile = (file: File) => {
    if (!file.name.endsWith('.xml')) {
      toast({ title: 'Wrong file type', description: 'Please upload a .xml file exported from Tally.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Decode buffer handling UTF-16 LE BOM that Tally Prime uses
        const buffer = e.target?.result as ArrayBuffer;
        const text = decodeTallyBuffer(buffer);
        const { ledgers: parsed, companyName: cn } = parseTallyXML(text);
        if (parsed.length === 0) {
          toast({ title: 'No ledgers found', description: 'Upload any Tally export XML (Masters or Vouchers). The file will be used to detect your ledger names.', variant: 'destructive' });
          return;
        }
        setLedgers(parsed);
        setCompanyName(cn);
        setFileName(file.name);
        setExpanded(true);
        const companyMsg = cn ? ` Company: "${cn}".` : '';
        toast({ title: `${parsed.length} ledgers found`, description: `${companyMsg} Click "Auto-fill from XML" to apply.` });

        // Upload raw file to backend so it can use the real Tally format as export template
        const formData = new FormData();
        formData.append('file', file);
        const authToken = getAuthToken();
        fetch('/api/settings/tally/template', {
          method: 'POST',
          body: formData,
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        })
          .then(r => r.json())
          .then(res => {
            if (res.success) {
              toast({ title: 'Export format saved', description: `Tally export will now match your "${file.name}" format exactly.` });
            }
          })
          .catch(() => {
            // Non-fatal: ledger name auto-fill still works, export falls back to built-in format
          });
      } catch (err: any) {
        toast({ title: 'Parse error', description: err.message, variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const clear = () => {
    setLedgers([]);
    setCompanyName(undefined);
    setFileName('');
    setExpanded(false);
  };

  // Group by parent for display
  const grouped = ledgers.reduce<Record<string, string[]>>((acc, l) => {
    (acc[l.parent] ??= []).push(l.name);
    return acc;
  }, {});

  const relevantGroups = Object.entries(grouped).filter(([parent]) => isRelevantLedger(parent));
  const otherGroups = Object.entries(grouped).filter(([parent]) => !isRelevantLedger(parent));

  return (
    <Card className="border-stone-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-violet-50 text-violet-600">
            <FileCode2 className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm font-semibold text-stone-800">Import from Tally XML</CardTitle>
            <CardDescription className="text-xs text-stone-500">
              Upload your Tally master export to auto-populate ledger names below
            </CardDescription>
          </div>
          {fileName && (
            <button onClick={clear} className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Drop zone */}
        {!fileName && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative cursor-pointer rounded-lg border-2 border-dashed px-6 py-8
              flex flex-col items-center gap-2 text-center transition-colors duration-200
              ${dragOver
                ? 'border-violet-400 bg-violet-50'
                : 'border-stone-300 bg-stone-50 hover:border-stone-400 hover:bg-stone-100'}
            `}
          >
            <Upload className="h-6 w-6 text-stone-400" />
            <div>
              <p className="text-sm font-medium text-stone-700">Drop your Tally XML here</p>
              <p className="text-xs text-stone-500 mt-0.5">
                or <span className="text-violet-600 font-medium">click to browse</span>
              </p>
            </div>
            <p className="text-xs text-stone-400">
              Export from Tally: Gateway → Export → Masters or Vouchers → XML format
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* File loaded state */}
        {fileName && (
          <>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 border border-violet-200">
              <FileCode2 className="h-4 w-4 text-violet-600 shrink-0" />
              <span className="text-xs font-medium text-violet-800 flex-1 truncate">{fileName}</span>
              <span className="text-xs text-violet-600 shrink-0">{ledgers.length} ledgers</span>
            </div>

            {/* Auto-fill + expand toggle */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-violet-700 border-violet-300 hover:bg-violet-50 text-xs"
                onClick={() => onApply(ledgers, companyName)}
              >
                <Wand2 className="h-3 w-3" />
                Auto-fill from XML
              </Button>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="ml-auto flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 transition-colors"
              >
                {expanded ? 'Hide' : 'Browse'} ledgers
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Ledger browser */}
            {expanded && (
              <div className="rounded-lg border border-stone-200 bg-white divide-y divide-stone-100 max-h-64 overflow-y-auto text-xs">
                {/* Relevant groups first */}
                {relevantGroups.map(([parent, names]) => (
                  <LedgerGroup
                    key={parent}
                    parent={parent}
                    names={names}
                    highlighted
                    onSelect={(name) => onApply([{ name, parent }], companyName)}
                  />
                ))}
                {otherGroups.map(([parent, names]) => (
                  <LedgerGroup
                    key={parent}
                    parent={parent}
                    names={names}
                    highlighted={false}
                    onSelect={(name) => onApply([{ name, parent }], companyName)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LedgerGroup({
  parent,
  names,
  highlighted,
  onSelect,
}: {
  parent: string;
  names: string[];
  highlighted: boolean;
  onSelect: (name: string) => void;
}) {
  const [open, setOpen] = useState(highlighted);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-stone-50 transition-colors"
      >
        <span className={`font-medium ${highlighted ? 'text-violet-700' : 'text-stone-600'}`}>
          {parent}
        </span>
        <div className="flex items-center gap-1.5 text-stone-400">
          <span className="text-[10px]">{names.length}</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1">
          {names.map((name) => (
            <button
              key={name}
              onClick={() => onSelect(name)}
              className="w-full text-left px-2 py-1 rounded font-mono text-stone-700 hover:bg-violet-50 hover:text-violet-800 transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────── */

export default function TallySettings({ config: _config }: { config: Record<string, unknown> }) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [salesRate, setSalesRate] = useState<GstRate>('18');
  const [gstRate, setGstRate] = useState<GstRate>('18');
  const [inputGstRate, setInputGstRate] = useState<GstRate>('18');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    caInvoiceService.getTallyConfig()
      .then((cfg) => {
        const flat: Record<string, string> = {};
        Object.entries(cfg).forEach(([k, v]) => { if (v) flat[k] = v as string; });
        setValues(flat);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (key: string, val: string) => setValues((prev) => ({ ...prev, [key]: val }));

  const handleSuggestions = async () => {
    try {
      const suggestions = await caInvoiceService.getTallyConfigSuggestions();
      setValues((prev) => {
        const next = { ...prev };
        Object.entries(suggestions).forEach(([k, v]) => { if (!next[k] && v) next[k] = v as string; });
        return next;
      });
      toast({ title: 'Suggestions loaded', description: 'Empty fields filled with standard Tally ledger names.' });
    } catch {
      toast({ title: 'Could not load suggestions', variant: 'destructive' });
    }
  };

  /* Apply parsed ledgers from XML upload.
     Strategy: if a single ledger is selected, offer a popover to pick which field.
     If "auto-fill all" is used, match by name keywords. */
  const handleXmlApply = (ledgers: { name: string; parent: string }[], companyName?: string) => {
    if (ledgers.length === 0) return;

    // Build a mapping from keywords to config keys
    const KEYWORD_MAP: Array<{ keys: string[]; fieldPattern: RegExp }> = [
      { keys: ['output cgst', 'cgst output'],  fieldPattern: /^output_cgst_/ },
      { keys: ['output sgst', 'sgst output'],  fieldPattern: /^output_sgst_/ },
      { keys: ['output igst', 'igst output'],  fieldPattern: /^output_igst_/ },
      { keys: ['input cgst', 'cgst input'],    fieldPattern: /^input_cgst_/ },
      { keys: ['input sgst', 'sgst input'],    fieldPattern: /^input_sgst_/ },
      { keys: ['input igst', 'igst input'],    fieldPattern: /^input_igst_/ },
      { keys: ['cgst', 'central gst'],         fieldPattern: /^(output|input)_cgst_/ },
      { keys: ['sgst', 'state gst'],           fieldPattern: /^(output|input)_sgst_/ },
      { keys: ['igst', 'integrated'],          fieldPattern: /^(output|input)_igst_/ },
      { keys: ['local sale', 'intra'],         fieldPattern: /^local_sale_/ },
      { keys: ['interstate', 'inter state', 'inter-state'], fieldPattern: /^interstate_sale_/ },
    ];

    // When auto-filling all ledgers from XML, overwrite existing values
    // (user explicitly chose "Auto-fill from XML" so intent is to use XML as source of truth)
    const isFullAutoFill = ledgers.length > 1;

    setValues((prev) => {
      const next = { ...prev };
      let filled = 0;

      // Auto-fill company name from XML
      if (companyName && (isFullAutoFill || !next['company_name'])) {
        next['company_name'] = companyName;
        filled++;
      }

      ledgers.forEach(({ name, parent }) => {
        const combined = `${name} ${parent}`.toLowerCase();

        // Check each pattern
        for (const { keys, fieldPattern } of KEYWORD_MAP) {
          if (keys.some((k) => combined.includes(k))) {
            // For full auto-fill: overwrite. For single ledger: only fill empty.
            const shouldFill = (k: string) => isFullAutoFill ? true : !next[k];
            Object.keys(next).forEach((k) => {
              if (fieldPattern.test(k) && shouldFill(k)) { next[k] = name; filled++; }
            });
            // Also apply to all rate-keyed fields
            GST_RATES.forEach((r) => {
              const half = RATE_HALF[r];
              const candidates = [
                `output_cgst_${half}`, `output_sgst_${half}`, `output_igst_${r}`,
                `input_cgst_${half}`, `input_sgst_${half}`, `input_igst_${r}`,
                `local_sale_${r}`, `interstate_sale_${r}`,
              ];
              candidates.forEach((ck) => {
                if (fieldPattern.test(ck) && shouldFill(ck)) { next[ck] = name; filled++; }
              });
            });
            break;
          }
        }

        // Company name
        if (!next['company_name'] && (combined.includes('company') || parent === 'Other')) {
          // don't auto-fill company from ledger name
        }
      });

      if (filled === 0 && ledgers.length === 1) {
        // Single ledger selected — show which field to fill via toast
        toast({
          title: `"${ledgers[0].name}" copied`,
          description: 'Paste it into the ledger field you want to map.',
        });
        // Copy to clipboard
        navigator.clipboard.writeText(ledgers[0].name).catch(() => {});
      } else if (filled > 0) {
        toast({ title: `${filled} fields updated`, description: 'Ledger names filled from Tally XML.' });
      } else {
        toast({ title: 'No automatic matches', description: 'Could not match these ledgers to known fields. Click individual ledger names to copy them.' });
      }

      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const cfg: TallyConfig = {};
      Object.entries(values).forEach(([k, v]) => { if (v.trim()) (cfg as Record<string, string>)[k] = v.trim(); });
      await caInvoiceService.saveTallyConfig(cfg);
      setSaved(true);
      toast({ title: 'Settings saved', description: 'Ledger mappings will be used on next export.' });
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      toast({ title: 'Save failed', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-stone-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Loading settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-stone-900">Tally Prime Settings</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Configure ledger names to match your Tally books exactly
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSuggestions}
            className="gap-1.5 text-stone-600 border-stone-300 hover:bg-stone-50 text-xs"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Suggestions
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5 bg-green-700 hover:bg-green-800 text-white text-xs"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* ── XML Upload ────────────────────────────────────────── */}
      <XmlUploadPanel onApply={handleXmlApply} />

      {/* ── Company Settings ──────────────────────────────────── */}
      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-50 text-amber-700">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-stone-800">Company Settings</CardTitle>
              <CardDescription className="text-xs text-stone-500">
                Must match the company name in Tally Prime exactly
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="max-w-sm">
            <Label className="text-xs font-medium text-stone-600">Company Name</Label>
            <Input
              value={values['company_name'] || ''}
              onChange={(e) => set('company_name', e.target.value)}
              placeholder="e.g. FIN-DRIVE CONSULTANTS"
              className="mt-1.5 h-8 text-sm font-mono placeholder:font-sans"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Sales Ledgers ─────────────────────────────────────── */}
      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-stone-800">Sales Ledgers</CardTitle>
              <CardDescription className="text-xs text-stone-500">
                Sales account ledger names by GST rate and supply type
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-stone-500 mr-1">GST Rate:</span>
            {GST_RATES.map((r) => (
              <button
                key={r}
                onClick={() => setSalesRate(r)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  salesRate === r
                    ? 'bg-green-700 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {r}%
              </button>
            ))}
          </div>
          <div className="grid gap-3">
            <LedgerRow
              label="Local Sale (Intra-state)"
              badge="INTRA"
              badgeColor="bg-violet-50 text-violet-700"
              fieldKey={`local_sale_${salesRate}`}
              placeholder={`Local Sale @${salesRate}%`}
              value={values[`local_sale_${salesRate}`] || ''}
              onChange={(v) => set(`local_sale_${salesRate}`, v)}
              tooltip="Used for sales within the same state (CGST + SGST applicable)"
            />
            <LedgerRow
              label="Interstate Sale"
              badge="INTER"
              badgeColor="bg-sky-50 text-sky-700"
              fieldKey={`interstate_sale_${salesRate}`}
              placeholder={`Interstate Sale@${salesRate}%`}
              value={values[`interstate_sale_${salesRate}`] || ''}
              onChange={(v) => set(`interstate_sale_${salesRate}`, v)}
              tooltip="Used for sales to other states (IGST applicable)"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── GST Output Ledgers ────────────────────────────────── */}
      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-orange-50 text-orange-700">
              <ChevronRight className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-stone-800">GST Output Ledgers</CardTitle>
              <CardDescription className="text-xs text-stone-500">
                Tax liability ledger names for GST collected on sales
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-stone-500 mr-1">GST Rate:</span>
            {GST_RATES.map((r) => (
              <button
                key={r}
                onClick={() => setGstRate(r)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  gstRate === r
                    ? 'bg-green-700 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {r}%
              </button>
            ))}
          </div>
          <div className="grid gap-3">
            <LedgerRow
              label="CGST Output"
              badge={`@${RATE_HALF[gstRate]}%`}
              badgeColor="bg-orange-50 text-orange-700"
              fieldKey={`output_cgst_${RATE_HALF[gstRate]}`}
              placeholder={`Output Cgst@${RATE_HALF[gstRate]}%`}
              value={values[`output_cgst_${RATE_HALF[gstRate]}`] || ''}
              onChange={(v) => set(`output_cgst_${RATE_HALF[gstRate]}`, v)}
              tooltip="Central GST liability — applies to intra-state sales"
            />
            <LedgerRow
              label="SGST Output"
              badge={`@${RATE_HALF[gstRate]}%`}
              badgeColor="bg-orange-50 text-orange-700"
              fieldKey={`output_sgst_${RATE_HALF[gstRate]}`}
              placeholder={`Output Sgst@${RATE_HALF[gstRate]}%`}
              value={values[`output_sgst_${RATE_HALF[gstRate]}`] || ''}
              onChange={(v) => set(`output_sgst_${RATE_HALF[gstRate]}`, v)}
              tooltip="State GST liability — applies to intra-state sales"
            />
            <LedgerRow
              label="IGST Output"
              badge={`@${gstRate}%`}
              badgeColor="bg-red-50 text-red-700"
              fieldKey={`output_igst_${gstRate}`}
              placeholder={`Output Igst@${gstRate}%`}
              value={values[`output_igst_${gstRate}`] || ''}
              onChange={(v) => set(`output_igst_${gstRate}`, v)}
              tooltip="Integrated GST liability — applies to interstate sales"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── GST Input Ledgers ─────────────────────────────────── */}
      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-50 text-blue-700">
              <ChevronRight className="h-4 w-4 rotate-180" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-stone-800">GST Input Ledgers</CardTitle>
              <CardDescription className="text-xs text-stone-500">
                Tax credit ledger names for GST paid on purchases (ITC)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-stone-500 mr-1">GST Rate:</span>
            {GST_RATES.map((r) => (
              <button
                key={r}
                onClick={() => setInputGstRate(r)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  inputGstRate === r
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {r}%
              </button>
            ))}
          </div>
          <div className="grid gap-3">
            <LedgerRow
              label="CGST Input"
              badge={`@${RATE_HALF[inputGstRate]}%`}
              badgeColor="bg-blue-50 text-blue-700"
              fieldKey={`input_cgst_${RATE_HALF[inputGstRate]}`}
              placeholder={`Input Cgst@${RATE_HALF[inputGstRate]}%`}
              value={values[`input_cgst_${RATE_HALF[inputGstRate]}`] || ''}
              onChange={(v) => set(`input_cgst_${RATE_HALF[inputGstRate]}`, v)}
              tooltip="Central GST input tax credit — applies to intra-state purchases"
            />
            <LedgerRow
              label="SGST Input"
              badge={`@${RATE_HALF[inputGstRate]}%`}
              badgeColor="bg-blue-50 text-blue-700"
              fieldKey={`input_sgst_${RATE_HALF[inputGstRate]}`}
              placeholder={`Input Sgst@${RATE_HALF[inputGstRate]}%`}
              value={values[`input_sgst_${RATE_HALF[inputGstRate]}`] || ''}
              onChange={(v) => set(`input_sgst_${RATE_HALF[inputGstRate]}`, v)}
              tooltip="State GST input tax credit — applies to intra-state purchases"
            />
            <LedgerRow
              label="IGST Input"
              badge={`@${inputGstRate}%`}
              badgeColor="bg-indigo-50 text-indigo-700"
              fieldKey={`input_igst_${inputGstRate}`}
              placeholder={`Input Igst@${inputGstRate}%`}
              value={values[`input_igst_${inputGstRate}`] || ''}
              onChange={(v) => set(`input_igst_${inputGstRate}`, v)}
              tooltip="Integrated GST input tax credit — applies to interstate purchases"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Import Instructions ────────────────────────────────── */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex gap-3">
        <div className="shrink-0 mt-0.5">
          <Info className="h-4 w-4 text-blue-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-blue-800 mb-1">How to import into Tally Prime</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            Go to{' '}
            <span className="font-semibold">Gateway of Tally → Import Data</span>{' '}
            and select the downloaded XML file. Make sure these ledger names exactly match the
            ledgers in your Tally company — Tally will create new ledgers if names don't match,
            which can cause duplicate entries.
          </p>
        </div>
      </div>

    </div>
  );
}

/* ─── Shared ledger row ───────────────────────────────────── */

interface LedgerRowProps {
  label: string;
  badge: string;
  badgeColor: string;
  fieldKey: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  tooltip: string;
}

function LedgerRow({ label, badge, badgeColor, placeholder, value, onChange, tooltip }: LedgerRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-52 shrink-0 flex items-center gap-2">
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${badgeColor}`}>{badge}</span>
        <Label className="text-xs font-medium text-stone-600">{label}</Label>
        <Tooltip content={tooltip} side="top">
          <Info className="h-3 w-3 text-stone-300 cursor-help shrink-0" />
        </Tooltip>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm font-mono placeholder:font-sans placeholder:text-stone-300 flex-1"
      />
    </div>
  );
}
