import React, { useState, useEffect, useCallback } from 'react';
import {
  Image,
  Link2,
  Link2Off,
  ExternalLink,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Package,
  Instagram,
  Rss,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';

interface PostMapping {
  id: string;
  media_id: string;
  caption: string;
  media_type: string;
  thumbnail_url: string;
  permalink: string;
  post_timestamp: string;
  detected_at: string;
  mapped: boolean;
  product_id: string | null;
  product_name: string | null;
}

interface Product {
  id: string;
  name: string;
  category: string;
}

export default function PostsPanel({ config }: { config: Record<string, unknown> }) {
  const [posts, setPosts] = useState<PostMapping[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [unmappedCount, setUnmappedCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unmapped' | 'mapped'>('all');
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Record<string, string>>({});
  const [productSearch, setProductSearch] = useState<Record<string, string>>({});

  const fetchPosts = useCallback(() => {
    setLoading(true);
    const mappedParam =
      filter === 'mapped' ? '&mapped=true' : filter === 'unmapped' ? '&mapped=false' : '';
    Promise.all([
      apiClient.get(`/api/posts?limit=50${mappedParam}`),
      apiClient.get('/api/posts/unmapped-count'),
      apiClient.get('/api/products?limit=200'),
    ])
      .then(([postsResp, countResp, productsResp]: any[]) => {
        setPosts(postsResp.data?.data || []);
        setUnmappedCount(countResp.data?.count ?? 0);
        setProducts(productsResp.data?.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const filteredPosts = posts.filter(p => {
    if (!search) return true;
    return (
      p.caption?.toLowerCase().includes(search.toLowerCase()) ||
      p.product_name?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const syncFromInstagram = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const resp: any = await apiClient.post('/api/posts/sync', {});
      const { total_posts, unmapped } = resp.data;
      setSyncResult(`Synced — ${total_posts} post${total_posts !== 1 ? 's' : ''} found, ${unmapped} unmapped`);
      fetchPosts();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Sync failed — check Instagram token';
      setSyncResult(`Error: ${msg}`);
    } finally {
      setSyncing(false);
      // Clear result message after 5s
      setTimeout(() => setSyncResult(null), 5000);
    }
  };

  const saveMapping = async (post: PostMapping) => {
    const prodId = selectedProduct[post.media_id];
    if (!prodId) return;
    const prod = products.find(p => p.id === prodId);
    setSavingId(post.media_id);
    try {
      await apiClient.post(`/api/posts/${post.media_id}/mapping`, {
        product_id: prodId,
        product_name: prod?.name || '',
      });
      fetchPosts();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  const clearMapping = async (post: PostMapping) => {
    setSavingId(post.media_id);
    try {
      await apiClient.delete(`/api/posts/${post.media_id}/mapping`);
      fetchPosts();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  const filteredProducts = (mediaId: string) => {
    const q = (productSearch[mediaId] || '').toLowerCase();
    if (!q) return products.slice(0, 20);
    return products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 20);
  };

  return (
    <div className="space-y-5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Posts & SKU Mapping</h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Link each Instagram post to the correct product so the AI knows exactly what to recommend.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {unmappedCount > 0 && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs px-2 py-0.5">
              {unmappedCount} unmapped
            </Badge>
          )}
          {/* Sync from Instagram — triggers an immediate Instagram API poll */}
          <Button
            size="sm"
            onClick={syncFromInstagram}
            disabled={syncing}
            className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white border-0"
          >
            {syncing
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : <Instagram className="w-3.5 h-3.5 mr-1.5" />
            }
            {syncing ? 'Syncing…' : 'Sync from Instagram'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPosts}
            disabled={loading}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Sync result toast */}
      {syncResult && (
        <div className={cn(
          'text-xs px-3 py-2 rounded-lg border',
          syncResult.startsWith('Error')
            ? 'bg-red-950/30 border-red-700/40 text-red-400'
            : 'bg-emerald-950/30 border-emerald-700/40 text-emerald-400'
        )}>
          {syncResult}
        </div>
      )}

      {/* Filter + Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search posts or products..."
            className="pl-8 h-8 text-sm bg-zinc-900 border-zinc-700 text-zinc-200"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'unmapped', 'mapped'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-colors',
                filter === f
                  ? 'bg-pink-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Posts list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-2">
          <Image className="w-8 h-8 opacity-30" />
          <p className="text-sm">
            {filter === 'unmapped'
              ? 'All posts are mapped'
              : 'No posts detected yet — the poll worker checks every 5 minutes'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map(post => (
            <PostCard
              key={post.media_id}
              post={post}
              products={filteredProducts(post.media_id)}
              selectedProduct={selectedProduct[post.media_id] || ''}
              productSearchValue={productSearch[post.media_id] || ''}
              saving={savingId === post.media_id}
              onProductSearchChange={val =>
                setProductSearch(prev => ({ ...prev, [post.media_id]: val }))
              }
              onProductSelect={val =>
                setSelectedProduct(prev => ({ ...prev, [post.media_id]: val }))
              }
              onSave={() => saveMapping(post)}
              onClear={() => clearMapping(post)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({
  post,
  products,
  selectedProduct,
  productSearchValue,
  saving,
  onProductSearchChange,
  onProductSelect,
  onSave,
  onClear,
}: {
  post: PostMapping;
  products: Product[];
  selectedProduct: string;
  productSearchValue: string;
  saving: boolean;
  onProductSearchChange: (v: string) => void;
  onProductSelect: (v: string) => void;
  onSave: () => void;
  onClear: () => void;
}) {
  const [showProducts, setShowProducts] = useState(false);
  const captionSnippet = post.caption
    ? post.caption.slice(0, 120) + (post.caption.length > 120 ? '…' : '')
    : 'No caption';

  const selectedName =
    products.find(p => p.id === selectedProduct)?.name || post.product_name || '';

  return (
    <div
      className={cn(
        'rounded-lg border p-3 flex gap-3 transition-colors',
        post.mapped
          ? 'bg-zinc-900 border-zinc-700/60'
          : 'bg-amber-950/20 border-amber-700/30'
      )}
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-md bg-zinc-800 flex-shrink-0 overflow-hidden">
        {post.thumbnail_url ? (
          <img
            src={post.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="w-5 h-5 text-zinc-600" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">{captionSnippet}</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {post.mapped ? (
              <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-[10px] px-1.5">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                Mapped
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[10px] px-1.5">
                <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                Unmapped
              </Badge>
            )}
            {post.permalink && (
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-zinc-300"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {post.mapped && post.product_name && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Package className="w-3 h-3 text-pink-400" />
            <span className="text-pink-300">{post.product_name}</span>
            <button
              onClick={onClear}
              disabled={saving}
              className="ml-auto text-zinc-600 hover:text-zinc-400 text-[10px] underline"
            >
              {saving ? 'Saving…' : 'Clear'}
            </button>
          </div>
        )}

        {!post.mapped && (
          <div className="flex items-center gap-2 mt-1">
            {/* Product selector */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Type to search products..."
                value={showProducts ? productSearchValue : selectedName}
                onFocus={() => setShowProducts(true)}
                onBlur={() => setTimeout(() => setShowProducts(false), 150)}
                onChange={e => onProductSearchChange(e.target.value)}
                className="w-full h-7 px-2 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-pink-500"
              />
              {showProducts && products.length > 0 && (
                <ul className="absolute z-20 top-full mt-1 left-0 right-0 bg-zinc-800 border border-zinc-700 rounded shadow-lg max-h-36 overflow-y-auto">
                  {products.map(p => (
                    <li
                      key={p.id}
                      onMouseDown={() => {
                        onProductSelect(p.id);
                        onProductSearchChange(p.name);
                        setShowProducts(false);
                      }}
                      className="px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                    >
                      {p.name}
                      {p.category && (
                        <span className="ml-1.5 text-zinc-500">{p.category}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              size="sm"
              disabled={!selectedProduct || saving}
              onClick={onSave}
              className="h-7 px-2.5 text-xs bg-pink-600 hover:bg-pink-500 text-white"
            >
              {saving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Link2 className="w-3 h-3 mr-1" />
                  Map
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
