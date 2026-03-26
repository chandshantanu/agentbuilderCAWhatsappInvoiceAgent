/**
 * Products step for SaaS onboarding wizard.
 *
 * Allows customers to:
 * - Add products one by one (name, price, description, optional image_url + buy_link)
 * - Bulk upload products via CSV
 * - Delete added products
 * - Minimum 1 product required to continue
 */

import { useState, useRef } from 'react';
import {
  ShoppingBag,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Upload,
  AlertCircle,
  X,
} from 'lucide-react';
import { saasApi } from '@/services/saasApiService';

interface ProductsStepProps {
  subdomain: string;
  onComplete: (data: string) => void;
  primaryColor: string;
}

interface Product {
  name: string;
  price: number;
  description: string;
  image_url?: string;
  buy_link?: string;
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export default function ProductsStep({
  subdomain,
  onComplete,
  primaryColor,
}: ProductsStepProps) {
  const rgb = hexToRgb(primaryColor);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [buyLink, setBuyLink] = useState('');

  // Products list
  const [products, setProducts] = useState<Product[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toastError, setToastError] = useState('');
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvProgress, setCsvProgress] = useState({ done: 0, total: 0 });
  const [submitting, setSubmitting] = useState(false);

  const csvInputRef = useRef<HTMLInputElement>(null);

  const clearForm = () => {
    setName('');
    setPrice('');
    setDescription('');
    setImageUrl('');
    setBuyLink('');
    setFormError('');
  };

  const showToast = (message: string) => {
    setToastError(message);
    setTimeout(() => setToastError(''), 4000);
  };

  const saveProductToRuntime = async (product: Product): Promise<boolean> => {
    try {
      await saasApi.runtimeProxy(subdomain, '/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: product.name,
          price: product.price,
          description: product.description,
          currency: 'INR',
          image_url: product.image_url || undefined,
          buy_link: product.buy_link || undefined,
          in_stock: true,
        }),
      });
      return true;
    } catch (err) {
      console.error('Product save failed:', err);
      return false;
    }
  };

  const handleAddProduct = async () => {
    // Validate required fields
    if (!name.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      setFormError('Enter a valid price.');
      return;
    }
    if (!description.trim()) {
      setFormError('Product description is required.');
      return;
    }

    setFormError('');
    setSaving(true);

    const product: Product = {
      name: name.trim(),
      price: Number(price),
      description: description.trim(),
      image_url: imageUrl.trim() || undefined,
      buy_link: buyLink.trim() || undefined,
    };

    const success = await saveProductToRuntime(product);

    if (success) {
      setProducts((prev) => [...prev, product]);
      clearForm();
    } else {
      showToast('Failed to save product. Please try again.');
    }

    setSaving(false);
  };

  const handleDeleteProduct = (index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const parseCsv = (text: string): Product[] => {
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) return [];

    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map((h) => h.trim());

    const nameIdx = headers.indexOf('name');
    const priceIdx = headers.indexOf('price');
    const descIdx = headers.indexOf('description');
    const imgIdx = headers.indexOf('image_url');
    const linkIdx = headers.indexOf('buy_link');

    if (nameIdx === -1 || priceIdx === -1 || descIdx === -1) {
      return [];
    }

    const parsed: Product[] = [];
    for (let i = 1; i < lines.length; i++) {
      // Simple CSV parse (handles basic cases, not quoted commas)
      const cols = lines[i].split(',').map((c) => c.trim());
      const pName = cols[nameIdx] || '';
      const pPrice = Number(cols[priceIdx]);
      const pDesc = cols[descIdx] || '';

      if (pName && !isNaN(pPrice) && pPrice > 0 && pDesc) {
        parsed.push({
          name: pName,
          price: pPrice,
          description: pDesc,
          image_url: imgIdx !== -1 ? cols[imgIdx] || undefined : undefined,
          buy_link: linkIdx !== -1 ? cols[linkIdx] || undefined : undefined,
        });
      }
    }
    return parsed;
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvUploading(true);
    setCsvProgress({ done: 0, total: 0 });

    try {
      const text = await file.text();
      const parsed = parseCsv(text);

      if (parsed.length === 0) {
        showToast('No valid products found. CSV must have columns: name, price, description');
        setCsvUploading(false);
        return;
      }

      setCsvProgress({ done: 0, total: parsed.length });
      let successCount = 0;
      const added: Product[] = [];

      for (let i = 0; i < parsed.length; i++) {
        const ok = await saveProductToRuntime(parsed[i]);
        if (ok) {
          successCount++;
          added.push(parsed[i]);
        }
        setCsvProgress({ done: i + 1, total: parsed.length });
      }

      setProducts((prev) => [...prev, ...added]);

      if (successCount < parsed.length) {
        showToast(`${successCount}/${parsed.length} products saved. Some failed.`);
      }
    } catch (err) {
      console.error('CSV upload error:', err);
      showToast('Failed to read CSV file.');
    } finally {
      setCsvUploading(false);
      // Reset file input so the same file can be re-selected
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const handleContinue = async () => {
    if (products.length < 1) return;
    setSubmitting(true);
    onComplete(JSON.stringify({ products_count: products.length }));
  };

  const inputClass =
    'w-full px-4 py-3 border border-white/10 rounded-xl text-sm text-slate-200 bg-white/5 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow placeholder:text-slate-500';

  return (
    <div className="space-y-6">
      {/* Toast error */}
      {toastError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{toastError}</span>
          <button onClick={() => setToastError('')} className="hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <ShoppingBag className="w-5 h-5 text-slate-300" />
        <h3 className="text-base font-semibold text-slate-200">Add Your Products</h3>
      </div>
      <p className="text-sm text-slate-400 -mt-4">
        Add at least 1 product so your AI agent can recommend them to customers.
      </p>

      {/* Add product form */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Product Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cotton Kurta Set"
            className={inputClass}
            style={{ '--tw-ring-color': `rgba(${rgb}, 0.4)` } as React.CSSProperties}
          />
        </div>

        {/* Price + Description row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Price <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                &#x20B9;
              </span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="999"
                min="0"
                step="1"
                className={`${inputClass} pl-8`}
                style={{ '--tw-ring-color': `rgba(${rgb}, 0.4)` } as React.CSSProperties}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Image URL <span className="text-slate-600">(optional)</span>
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
              style={{ '--tw-ring-color': `rgba(${rgb}, 0.4)` } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief product description for the AI agent..."
            rows={2}
            className={`${inputClass} resize-none`}
            style={{ '--tw-ring-color': `rgba(${rgb}, 0.4)` } as React.CSSProperties}
          />
        </div>

        {/* Buy Link */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Payment / Order Link <span className="text-slate-600">(optional)</span>
          </label>
          <input
            type="text"
            value={buyLink}
            onChange={(e) => setBuyLink(e.target.value)}
            placeholder="Payment/order link"
            className={inputClass}
            style={{ '--tw-ring-color': `rgba(${rgb}, 0.4)` } as React.CSSProperties}
          />
        </div>

        {/* Form error */}
        {formError && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {formError}
          </p>
        )}

        {/* Add button */}
        <button
          onClick={handleAddProduct}
          disabled={saving}
          className="w-full h-10 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Add Product
            </>
          )}
        </button>
      </div>

      {/* CSV Upload */}
      <div className="text-center">
        {!showCsvUpload ? (
          <button
            onClick={() => setShowCsvUpload(true)}
            className="text-xs font-medium text-slate-400 hover:text-slate-300 transition-colors inline-flex items-center gap-1"
          >
            <Upload className="w-3.5 h-3.5" /> Or upload a CSV
          </button>
        ) : (
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <p className="text-xs text-slate-400">
              CSV columns: <span className="text-slate-300">name, price, description</span>
              {' '}(required), <span className="text-slate-500">image_url, buy_link</span> (optional)
            </p>
            <label className="flex items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-5 cursor-pointer hover:border-white/20 transition-colors">
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
                disabled={csvUploading}
              />
              <div className="text-center">
                {csvUploading ? (
                  <>
                    <Loader2 className="w-6 h-6 text-slate-400 mx-auto mb-1.5 animate-spin" />
                    <p className="text-xs text-slate-400">
                      Uploading {csvProgress.done}/{csvProgress.total} products...
                    </p>
                    <div className="mt-2 w-48 h-1.5 bg-white/10 rounded-full mx-auto overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: csvProgress.total > 0
                            ? `${(csvProgress.done / csvProgress.total) * 100}%`
                            : '0%',
                          backgroundColor: primaryColor,
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
                    <p className="text-xs text-slate-500">
                      Click to select a .csv file
                    </p>
                  </>
                )}
              </div>
            </label>
            <button
              onClick={() => setShowCsvUpload(false)}
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Products list */}
      {products.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Added Products
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {products.map((product, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl px-4 py-3 group"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200 truncate">
                      {product.name}
                    </span>
                    <span className="text-xs font-medium text-slate-400 shrink-0">
                      &#x20B9;{product.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {product.description}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteProduct(i)}
                  className="text-slate-600 hover:text-red-400 transition-colors shrink-0 mt-0.5 opacity-0 group-hover:opacity-100"
                  title="Remove product"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Counter */}
      <div className="flex items-center gap-2 text-sm">
        {products.length >= 1 ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-green-400">
              {products.length} product{products.length !== 1 ? 's' : ''} added
            </span>
          </>
        ) : (
          <span className="text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/20 w-full">
            Add at least 1 product to continue.
          </span>
        )}
      </div>

      {/* Continue button */}
      <button
        onClick={handleContinue}
        disabled={products.length < 1 || submitting}
        className="w-full h-11 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
        style={{ backgroundColor: primaryColor }}
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Continuing...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4" /> Continue
          </>
        )}
      </button>

      <p className="text-center text-xs text-slate-500">
        You can always add more products later from the dashboard.
      </p>
    </div>
  );
}
