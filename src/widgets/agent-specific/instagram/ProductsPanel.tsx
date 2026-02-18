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
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-blue-500" />
          Product Catalog
          <Badge variant="secondary">{products.length}</Badge>
        </h3>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            <Button variant="outline" size="sm" asChild>
              <span><Upload className="w-4 h-4 mr-1" /> CSV Upload</span>
            </Button>
          </label>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Add Product
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
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
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Product</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Price</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Stock</th>
                <th className="text-right px-4 py-3 font-medium text-neutral-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                          <Package className="w-5 h-5 text-neutral-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-neutral-900">{p.name}</p>
                        <p className="text-xs text-neutral-500 truncate max-w-[200px]">{p.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-900 font-medium">
                    {p.currency === 'INR' ? '₹' : '$'}{p.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{p.category || 'Uncategorized'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={p.in_stock ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                      {p.in_stock ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(p)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-red-500" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-neutral-700">Name *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Product description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-neutral-700">Price</label>
                  <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700">Currency</label>
                  <select
                    value={form.currency}
                    onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700">Category</label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Dresses, Electronics" />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700">Image URL</label>
                <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700">Buy Link</label>
                <Input value={form.buy_link} onChange={e => setForm(f => ({ ...f, buy_link: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700">Tags (comma separated)</label>
                <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="sale, new-arrival, festive" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.in_stock}
                  onChange={e => setForm(f => ({ ...f, in_stock: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-neutral-700">In Stock</span>
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
