import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Search,
  Loader2,
  X,
  Check,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  image_url: string;
  buy_link: string;
  in_stock: boolean;
  tags: string[];
}

export default function ProductsPanel({ config }: { config: Record<string, unknown> }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', price: 0, currency: 'INR', category: '',
    image_url: '', buy_link: '', in_stock: true, tags: '',
  });

  const fetchProducts = useCallback(() => {
    setLoading(true);
    apiClient.get(`/api/products?search=${search}`)
      .then((resp: any) => setProducts(resp.data?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openCreate = () => {
    setEditingProduct(null);
    setForm({ name: '', description: '', price: 0, currency: 'INR', category: '', image_url: '', buy_link: '', in_stock: true, tags: '' });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name, description: p.description, price: p.price, currency: p.currency,
      category: p.category, image_url: p.image_url, buy_link: p.buy_link,
      in_stock: p.in_stock, tags: p.tags?.join(', ') || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      if (editingProduct) {
        await apiClient.put(`/api/products/${editingProduct.id}`, payload);
      } else {
        await apiClient.post('/api/products', payload);
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await apiClient.delete(`/api/products/${id}`);
      fetchProducts();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await apiClient.post('/api/products/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchProducts();
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-semibold flex items-center gap-2 text-slate-200">
          <ShoppingBag className="w-5 h-5 text-blue-400" />
          Product Catalog
          <Badge variant="secondary">{products.length}</Badge>
        </h3>
        <div className="flex gap-2 flex-wrap">
          <label className="cursor-pointer">
            <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            <Button variant="outline" size="sm" asChild className="border-white/10 text-slate-300 hover:bg-white/5">
              <span><Upload className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">CSV </span>Upload</span>
            </Button>
          </label>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Add </span>Product
          </Button>
        </div>
      </div>

      {/* Missing buy-link banner */}
      {!loading && products.length > 0 && products.some((p) => !p.buy_link) && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <span>
            <strong>{products.filter((p) => !p.buy_link).length} product{products.filter((p) => !p.buy_link).length !== 1 ? 's are' : ' is'} missing a buy link.</strong>
            {' '}The AI can recommend these products but can't send a purchase URL in DMs. Click the edit icon to add a link.
          </span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500"
        />
      </div>

      {/* Product Table */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
          <p className="font-medium">No products yet</p>
          <p className="text-sm mt-1">Add products to your catalog for the AI agent to recommend.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="glass-card rounded-xl overflow-hidden hidden sm:block">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/[0.07]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-400">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-400">Price</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-400 hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-400">Stock</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.04]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-slate-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-200 truncate">{p.name}</p>
                            {!p.buy_link && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                No buy link
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate max-w-[180px]">{p.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-200 font-medium text-sm">{p.currency === 'INR' ? '₹' : '$'}{p.price.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant="outline" className="border-white/20 text-slate-400">{p.category || 'Uncategorized'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={p.in_stock ? 'bg-emerald-500/20 text-emerald-400 border-0' : 'bg-red-500/20 text-red-400 border-0'}>
                        {p.in_stock ? 'In Stock' : 'Out'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-slate-200" onClick={() => openEdit(p)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-red-500/70 hover:text-red-400" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="space-y-2 sm:hidden">
            {products.map((p) => (
              <div key={p.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 text-sm truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.currency === 'INR' ? '₹' : '$'}{p.price.toLocaleString()} · {p.category || 'Uncategorized'}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge className={cn('text-[10px] border-0', p.in_stock ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                      {p.in_stock ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                    {!p.buy_link && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        No buy link
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400" onClick={() => openEdit(p)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-red-500/70" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#0d1525] border border-white/10 rounded-t-2xl sm:rounded-xl p-5 sm:p-6 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-slate-100">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-400">Name *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Product description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm bg-white/5 text-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-400">Price</label>
                  <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Currency</label>
                  <select
                    value={form.currency}
                    onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm bg-white/5 text-slate-200"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Category</label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Dresses, Electronics" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Image URL</label>
                <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
                  Buy / Trial Link
                  <span className="text-[10px] text-amber-400 font-normal">(recommended — AI uses this to close sales)</span>
                </label>
                <Input value={form.buy_link} onChange={e => setForm(f => ({ ...f, buy_link: e.target.value }))} placeholder="https://yoursite.com/buy or payment link" />
                {!form.buy_link && (
                  <p className="text-[11px] text-amber-400/70 mt-1">Without this, the AI can't share a purchase link when a customer says "how do I buy?"</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Tags (comma separated)</label>
                <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="sale, new-arrival, festive" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.in_stock}
                  onChange={e => setForm(f => ({ ...f, in_stock: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-slate-300">In Stock</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                {editingProduct ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
