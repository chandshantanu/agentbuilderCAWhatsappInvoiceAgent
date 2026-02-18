import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Loader2,
  ChevronDown,
  StickyNote,
  Tag,
  Flame,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';

interface Contact {
  id: string;
  sender_id: string;
  username: string;
  full_name: string;
  lead_score: number;
  tags: string[];
  deal_stage: string;
  sentiment: string;
  language: string;
  ai_paused: boolean;
  notes: Array<{ id: string; text: string; created_at: string }>;
  custom_fields: Record<string, any>;
  updated_at: string;
  engagement_signals: { message_count: number };
}

const STAGES = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const STAGE_COLORS: Record<string, string> = {
  new: 'bg-neutral-100 text-neutral-700',
  qualified: 'bg-blue-100 text-blue-700',
  proposal: 'bg-purple-100 text-purple-700',
  negotiation: 'bg-amber-100 text-amber-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
};

export default function CRMPanel({ config }: { config: Record<string, unknown> }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'pipeline'>('table');
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [expandedContact, setExpandedContact] = useState<string | null>(null);
  const [pipelineData, setPipelineData] = useState<Record<string, Contact[]>>({});
  const [noteText, setNoteText] = useState('');

  const fetchContacts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStage) params.set('stage', filterStage);
    if (filterTag) params.set('tag', filterTag);
    apiClient.get(`/api/crm/contacts?${params}`)
      .then((resp: any) => setContacts(resp.data?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterStage, filterTag]);

  const fetchPipeline = useCallback(() => {
    apiClient.get('/api/crm/pipeline')
      .then((resp: any) => setPipelineData(resp.data?.pipeline || {}))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (view === 'table') fetchContacts();
    else fetchPipeline();
  }, [view, fetchContacts, fetchPipeline]);

  const updateStage = async (senderId: string, stage: string) => {
    try {
      await apiClient.put(`/api/crm/contacts/${senderId}`, { deal_stage: stage });
      if (view === 'table') fetchContacts();
      else fetchPipeline();
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const addNote = async (senderId: string) => {
    if (!noteText.trim()) return;
    try {
      await apiClient.put(`/api/crm/contacts/${senderId}`, { notes: noteText });
      setNoteText('');
      fetchContacts();
    } catch (err) {
      console.error('Note failed:', err);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 30) return 'bg-amber-500';
    return 'bg-neutral-300';
  };

  const filteredContacts = contacts.filter(c => {
    if (!search) return true;
    return (c.username || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.sender_id || '').includes(search);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-500" />
          CRM
          <Badge variant="secondary">{contacts.length}</Badge>
        </h3>
        <div className="flex gap-2">
          <div className="flex bg-neutral-100 rounded-lg p-0.5">
            <button
              onClick={() => setView('table')}
              className={cn('px-3 py-1 rounded-md text-xs font-medium', view === 'table' ? 'bg-white shadow-sm' : '')}
            >
              Table
            </button>
            <button
              onClick={() => setView('pipeline')}
              className={cn('px-3 py-1 rounded-md text-xs font-medium', view === 'pipeline' ? 'bg-white shadow-sm' : '')}
            >
              Pipeline
            </button>
          </div>
        </div>
      </div>

      {view === 'table' ? (
        <>
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select
              value={filterStage}
              onChange={e => setFilterStage(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm"
            >
              <option value="">All Stages</option>
              {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>
          ) : (
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Contact</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Score</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Tags</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Stage</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Messages</th>
                    <th className="text-right px-4 py-3 font-medium text-neutral-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredContacts.map(c => (
                    <React.Fragment key={c.sender_id}>
                      <tr className="hover:bg-neutral-50 cursor-pointer" onClick={() => setExpandedContact(expandedContact === c.sender_id ? null : c.sender_id)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                              {(c.username || c.sender_id).slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900">@{c.username || c.sender_id.slice(-8)}</p>
                              {c.ai_paused && <Badge variant="outline" className="text-xs text-orange-600">Paused</Badge>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-neutral-100 rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full', getScoreColor(c.lead_score))} style={{ width: `${c.lead_score}%` }} />
                            </div>
                            <span className="text-xs font-medium text-neutral-600">{c.lead_score}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {(c.tags || []).slice(0, 3).map(t => (
                              <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={c.deal_stage || 'new'}
                            onChange={e => { e.stopPropagation(); updateStage(c.sender_id, e.target.value); }}
                            onClick={e => e.stopPropagation()}
                            className={cn('px-2 py-1 rounded-md text-xs font-medium border-0', STAGE_COLORS[c.deal_stage || 'new'])}
                          >
                            {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-neutral-600">
                          {c.engagement_signals?.message_count || 0}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ChevronDown className={cn('w-4 h-4 transition-transform', expandedContact === c.sender_id && 'rotate-180')} />
                        </td>
                      </tr>
                      {expandedContact === c.sender_id && (
                        <tr>
                          <td colSpan={6} className="px-4 py-4 bg-neutral-50">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-medium text-neutral-700 mb-2 flex items-center gap-1">
                                  <StickyNote className="w-4 h-4" /> Notes
                                </h4>
                                {(c.notes || []).map(n => (
                                  <div key={n.id} className="text-xs text-neutral-600 mb-1 bg-white rounded p-2">
                                    {n.text}
                                    <span className="text-neutral-400 ml-2">{new Date(n.created_at).toLocaleDateString()}</span>
                                  </div>
                                ))}
                                <div className="flex gap-2 mt-2">
                                  <Input
                                    value={noteText}
                                    onChange={e => setNoteText(e.target.value)}
                                    placeholder="Add a note..."
                                    className="text-sm h-8"
                                    onClick={e => e.stopPropagation()}
                                  />
                                  <Button size="sm" className="h-8" onClick={e => { e.stopPropagation(); addNote(c.sender_id); }}>
                                    Add
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-neutral-700 mb-2">Details</h4>
                                <div className="text-xs text-neutral-600 space-y-1">
                                  <p>Sentiment: <Badge variant="outline" className="text-xs">{c.sentiment || 'neutral'}</Badge></p>
                                  <p>Language: {c.language || 'en'}</p>
                                  <p>First contact: {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : 'N/A'}</p>
                                  {c.custom_fields && Object.entries(c.custom_fields).map(([k, v]) => (
                                    <p key={k}>{k}: {String(v)}</p>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* Pipeline / Kanban View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => (
            <div key={stage} className="min-w-[240px] flex-shrink-0">
              <div className={cn('rounded-t-lg px-3 py-2 text-sm font-medium', STAGE_COLORS[stage])}>
                {stage.charAt(0).toUpperCase() + stage.slice(1)}
                <Badge variant="secondary" className="ml-2 text-xs">{(pipelineData[stage] || []).length}</Badge>
              </div>
              <div className="bg-neutral-50 rounded-b-lg p-2 space-y-2 min-h-[200px]">
                {(pipelineData[stage] || []).map(c => (
                  <div key={c.sender_id} className="bg-white rounded-lg border border-neutral-200 p-3">
                    <p className="text-sm font-medium text-neutral-900">@{c.username || c.sender_id.slice(-8)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', getScoreColor(c.lead_score))} style={{ width: `${c.lead_score}%` }} />
                      </div>
                      <span className="text-xs text-neutral-500">{c.lead_score}</span>
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {(c.tags || []).slice(0, 2).map(t => (
                        <Badge key={t} variant="outline" className="text-xs px-1">{t}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
