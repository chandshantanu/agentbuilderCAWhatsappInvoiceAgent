/**
 * DataTable — generic sortable, filterable table widget.
 *
 * Config:
 *   endpoint: string — API path to fetch data
 *   columns: Array<{key, label, sortable?}> — column definitions
 *   searchable: boolean — show search input
 *   pageSize: number — rows per page (default 20)
 */

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
}

interface DataTableProps {
  config: {
    endpoint?: string;
    columns?: Column[];
    searchable?: boolean;
    pageSize?: number;
  };
}

export default function DataTable({ config }: DataTableProps) {
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<1 | -1>(1);

  const pageSize = config.pageSize || 20;

  const fetchData = useCallback(async () => {
    if (!config.endpoint) return;
    setLoading(true);
    try {
      const params: Record<string, any> = {
        limit: pageSize,
        offset: page * pageSize,
      };
      if (search) params.search = search;
      if (sortBy) {
        params.sort_by = sortBy;
        params.sort_order = sortOrder;
      }
      const resp = await apiClient.get(config.endpoint, { params });
      const result = resp.data;
      setData(result.data || result);
      setTotal(result.total || (result.data || result).length);
    } catch (err) {
      console.error('DataTable fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [config.endpoint, page, search, sortBy, sortOrder, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = config.columns || (data.length > 0
    ? Object.keys(data[0])
        .filter((k) => k !== '_id' && k !== 'id')
        .slice(0, 6)
        .map((k) => ({ key: k, label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), sortable: true as boolean | undefined }))
    : []);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 1 ? -1 : 1));
    } else {
      setSortBy(key);
      setSortOrder(1);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {config.searchable !== false && (
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  {col.label}
                  {sortBy === col.key && (sortOrder === 1 ? ' \u25B2' : ' \u25BC')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                  No data found
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={row.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-gray-700">
                      {String(row[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * pageSize >= total}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
