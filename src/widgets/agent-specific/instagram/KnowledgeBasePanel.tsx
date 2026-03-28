import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Search,
  Loader2,
  X,
  Check,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/apiClient';

interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
}

const CATEGORIES = ['faq', 'returns', 'shipping', 'brand_story', 'policies', 'general', 'uploaded'];

export default function KnowledgeBasePanel({ config }: { config: Record<string, unknown> }) {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KBArticle | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'general', tags: '' });

  const fetchArticles = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterCategory) params.set('category', filterCategory);
    apiClient.get(`/api/knowledge-base?${params}`)
      .then((resp: any) => setArticles(resp.data?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, filterCategory]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const openCreate = () => {
    setEditingArticle(null);
    setForm({ title: '', content: '', category: 'general', tags: '' });
    setShowModal(true);
  };

  const openEdit = (a: KBArticle) => {
    setEditingArticle(a);
    setForm({ title: a.title, content: a.content, category: a.category, tags: a.tags?.join(', ') || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
      if (editingArticle) {
        await apiClient.put(`/api/knowledge-base/${editingArticle.id}`, payload);
      } else {
        await apiClient.post('/api/knowledge-base', payload);
      }
      setShowModal(false);
      fetchArticles();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this article?')) return;
    try {
      await apiClient.delete(`/api/knowledge-base/${id}`);
      fetchArticles();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await apiClient.post('/api/knowledge-base/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchArticles();
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      faq: 'bg-blue-500/20 text-blue-400',
      returns: 'bg-orange-500/20 text-orange-400',
      shipping: 'bg-purple-500/20 text-purple-400',
      brand_story: 'bg-pink-500/20 text-pink-400',
      policies: 'bg-white/10 text-slate-400',
      uploaded: 'bg-cyan-500/20 text-cyan-400',
    };
    return colors[cat] || 'bg-white/10 text-slate-400';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-semibold flex items-center gap-2 text-slate-200">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          Knowledge Base
          <Badge variant="secondary">{articles.length}</Badge>
        </h3>
        <div className="flex gap-2 flex-wrap">
          <label className="cursor-pointer">
            <input type="file" accept=".txt,.pdf" onChange={handleFileUpload} className="hidden" />
            <Button variant="outline" size="sm" asChild className="border-white/10 text-slate-300 hover:bg-white/5">
              <span><Upload className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Upload </span>File</span>
            </Button>
          </label>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Add </span>Article
          </Button>
        </div>
      </div>

      {/* Search + Category Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500" />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-white/10 rounded-lg text-sm bg-white/5 text-slate-300 w-full sm:w-auto"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* Article List */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
          <p className="font-medium">No articles yet</p>
          <p className="text-sm mt-1">Add FAQs, return policies, and brand info so the AI can answer customer questions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map(a => (
            <div key={a.id} className="glass-card rounded-xl p-4 hover:bg-white/[0.07] transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-slate-200 truncate">{a.title}</h4>
                    <Badge className={getCategoryColor(a.category || 'general')}>{(a.category || 'general').replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2">{a.content}</p>
                </div>
                <div className="flex gap-1 ml-3">
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(a)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-red-500" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#0d1525] border border-white/10 rounded-t-2xl sm:rounded-xl p-5 sm:p-6 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-slate-100">{editingArticle ? 'Edit Article' : 'Add Article'}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}><X className="w-4 h-4" /></Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-400">Title *</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Article title" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Content *</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Article content..."
                  rows={8}
                  className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm bg-white/5 text-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm bg-white/5 text-slate-200"
                >
                  {CATEGORIES.filter(c => c !== 'uploaded').map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Tags (comma separated)</label>
                <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="shipping, returns" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || !form.title || !form.content}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                {editingArticle ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
