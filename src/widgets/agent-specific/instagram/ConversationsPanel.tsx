import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Send,
  Image,
  Smile,
  MoreHorizontal,
  Check,
  CheckCheck,
  Clock,
  Bot,
  User,
  Instagram,
  Search,
  Loader2,
  X,
  Pause,
  Play,
  Tag,
  Flame,
  Brain,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';

interface MessageMetadata {
  response_mode?: string;
  governor_reason?: string;
  intent?: string;
  stage?: string;
  lead_score?: number;
  products_referenced?: string[];
  kb_articles_used?: string[];
  tags?: string[];
  trigger?: string;
}

interface InstagramMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  mediaUrl?: string;
  metadata?: MessageMetadata;
}

interface InstagramConversation {
  id: string;
  sender_id?: string;
  user: {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl?: string;
    isVerified?: boolean;
    followersCount?: number;
  };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'active' | 'resolved' | 'pending';
  messages: InstagramMessage[];
  tags?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  lead_score?: number;
  deal_stage?: string;
  ai_paused?: boolean;
  notes?: Array<{ id: string; text: string; created_at: string }>;
}

export default function ConversationsPanel({ config }: { config: Record<string, unknown> }) {
  const [conversations, setConversations] = useState<InstagramConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<InstagramConversation | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'pending'>('all');
  const [loading, setLoading] = useState(true);
  const [expandedMeta, setExpandedMeta] = useState<Record<string, boolean>>({});
  const toggleMetadata = (id: string) => setExpandedMeta(prev => ({ ...prev, [id]: !prev[id] }));

  const endpoint = (config?.endpoint as string) || '/api/conversations';

  useEffect(() => {
    setLoading(true);
    apiClient.get(endpoint)
      .then((resp: any) => {
        const raw = resp.data?.data || resp.data || [];
        // Map flat API response to the nested shape the component expects
        const mapped = raw.map((conv: any) => ({
          ...conv,
          id: conv.id || conv.sender_id || '',
          sender_id: conv.sender_id || conv.id || '',
          user: (conv.user && conv.user.username) ? conv.user : {
            id: conv.user?.id || conv.sender_id || conv.id || '',
            username: conv.user?.username || conv.username || conv.sender_id || 'unknown',
            fullName: conv.user?.fullName || conv.full_name || '',
            avatarUrl: conv.user?.avatarUrl || conv.avatar_url || '',
            isVerified: conv.user?.isVerified || false,
            followersCount: conv.user?.followersCount || 0,
          },
          lastMessage: conv.lastMessage || '',
          lastMessageTime: conv.lastMessageTime || conv.updated_at || '',
          unreadCount: conv.unreadCount || 0,
          status: conv.status || 'active',
          messages: (conv.messages || []).map((msg: any) => ({
            id: msg.id || '',
            sender: msg.role === 'assistant' ? 'agent' : 'user',
            text: msg.text || '',
            timestamp: msg.timestamp || '',
            status: msg.role === 'assistant' ? 'sent' : undefined,
            mediaUrl: msg.mediaUrl || undefined,
            metadata: msg.metadata || undefined,
          })),
        }));
        setConversations(mapped);
      })
      .catch((err: any) => console.error('Failed to load conversations:', err))
      .finally(() => setLoading(false));
  }, [endpoint]);

  const filteredConversations = conversations.filter(conv => {
    const username = conv.user?.username || '';
    const lastMsg = conv.lastMessage || '';
    const matchesSearch = username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastMsg.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' ||
      (filter === 'unread' && conv.unreadCount > 0) ||
      (filter === 'pending' && conv.status === 'pending');
    return matchesSearch && matchesFilter;
  });

  const handleSendReply = useCallback(async () => {
    if (!selectedConversation || !replyText.trim()) return;
    setSending(true);
    try {
      await apiClient.post(`/api/conversations/${selectedConversation.id}/reply`, {
        message: replyText,
      });
      setReplyText('');
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  }, [selectedConversation, replyText]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-emerald-100 text-emerald-700';
      case 'negative': return 'bg-red-100 text-red-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'read': return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'delivered': return <CheckCheck className="w-3 h-3 text-neutral-400" />;
      case 'sent': return <Check className="w-3 h-3 text-neutral-400" />;
      case 'sending': return <Clock className="w-3 h-3 text-neutral-400" />;
      default: return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-[calc(100vh-12rem)] min-h-[500px] max-h-[900px] bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {/* Conversations List */}
      <div className="lg:col-span-1 border-r border-neutral-200 flex flex-col overflow-hidden min-h-0">
        <div className="p-4 border-b border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Instagram className="w-5 h-5 text-pink-500" />
              Conversations
            </h3>
            <Badge variant="secondary">{conversations.length}</Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex gap-2 mt-3">
            {(['all', 'unread', 'pending'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  filter === f
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                )}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-neutral-500">
              <MessageCircle className="w-8 h-8 mb-2" />
              <p className="text-sm">No conversations found</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {filteredConversations.map((conv) => (
                <motion.button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                  className={cn(
                    "w-full p-4 flex items-start gap-3 text-left transition-colors",
                    selectedConversation?.id === conv.id && "bg-neutral-50"
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-12 h-12">
                      {conv.user?.avatarUrl && <AvatarImage src={conv.user.avatarUrl} />}
                      <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                        {(conv.user?.username || '??').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "font-medium truncate",
                        conv.unreadCount > 0 && "font-semibold"
                      )}>
                        @{conv.user?.username || 'unknown'}
                        {conv.user?.isVerified && (
                          <Check className="inline w-3 h-3 ml-1 text-blue-500" />
                        )}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {formatTime(conv.lastMessageTime)}
                      </span>
                    </div>
                    <p className={cn(
                      "text-sm truncate",
                      conv.unreadCount > 0 ? "text-neutral-900" : "text-neutral-500"
                    )}>
                      {conv.lastMessage}
                    </p>
                    {conv.tags && conv.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {conv.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Conversation Detail */}
      <div className="lg:col-span-2 flex flex-col overflow-hidden min-h-0">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  {selectedConversation.user?.avatarUrl && <AvatarImage src={selectedConversation.user.avatarUrl} />}
                  <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                    {(selectedConversation.user?.username || '??').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">@{selectedConversation.user?.username || 'unknown'}</p>
                  <p className="text-xs text-neutral-500">
                    {selectedConversation.user?.followersCount?.toLocaleString() || 0} followers
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedConversation.lead_score != null && (
                  <Badge className={
                    selectedConversation.lead_score >= 70 ? 'bg-emerald-100 text-emerald-700' :
                    selectedConversation.lead_score >= 30 ? 'bg-amber-100 text-amber-700' :
                    'bg-neutral-100 text-neutral-600'
                  }>
                    <Flame className="w-3 h-3 mr-1" />
                    {selectedConversation.lead_score}
                  </Badge>
                )}
                <Badge className={getSentimentColor(selectedConversation.sentiment)}>
                  {selectedConversation.sentiment || 'neutral'}
                </Badge>
                <Button
                  variant={selectedConversation.ai_paused ? "default" : "outline"}
                  size="sm"
                  className={selectedConversation.ai_paused ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
                  onClick={async () => {
                    const senderId = selectedConversation.sender_id || selectedConversation.id;
                    const newState = !selectedConversation.ai_paused;
                    try {
                      await apiClient.put(`/api/conversations/${senderId}/handoff`, { ai_paused: newState });
                      setSelectedConversation({ ...selectedConversation, ai_paused: newState });
                    } catch (err) {
                      console.error('Handoff toggle failed:', err);
                    }
                  }}
                >
                  {selectedConversation.ai_paused ? (
                    <><Play className="w-3 h-3 mr-1" /> Resume AI</>
                  ) : (
                    <><Pause className="w-3 h-3 mr-1" /> Pause AI</>
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Mark as resolved</DropdownMenuItem>
                    <DropdownMenuItem>Add tag</DropdownMenuItem>
                    <DropdownMenuItem>View profile</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedConversation(null)}
                  className="lg:hidden"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {selectedConversation.messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col",
                      msg.sender === 'agent' ? "items-end" : "items-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2",
                      msg.sender === 'agent'
                        ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                        : "bg-neutral-100 text-neutral-900"
                    )}>
                      <div className={cn(
                        "flex items-center gap-1 text-xs mb-1",
                        msg.sender === 'agent' ? "text-white/70" : "text-neutral-500"
                      )}>
                        {msg.sender === 'agent' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {msg.sender === 'agent' ? 'AI Agent' : (selectedConversation.user?.username || 'User')}
                      </div>
                      {msg.mediaUrl && (
                        <img src={msg.mediaUrl} alt="Media" className="rounded-lg mb-2 max-w-full" />
                      )}
                      <p className="text-sm">{msg.text}</p>
                      <div className={cn(
                        "flex items-center justify-end gap-1 mt-1 text-xs",
                        msg.sender === 'agent' ? "text-white/70" : "text-neutral-500"
                      )}>
                        {formatTime(msg.timestamp)}
                        {msg.sender === 'agent' && getStatusIcon(msg.status)}
                      </div>
                    </div>
                    {msg.sender === 'agent' && msg.metadata && (
                      <button
                        onClick={() => toggleMetadata(msg.id)}
                        className="text-xs text-neutral-400 hover:text-neutral-600 flex items-center gap-1 mt-1 mr-1"
                      >
                        <Brain className="w-3 h-3" />
                        AI Reasoning
                        <ChevronDown className={cn("w-3 h-3 transition-transform", expandedMeta[msg.id] && "rotate-180")} />
                      </button>
                    )}
                    {expandedMeta[msg.id] && msg.metadata && (
                      <div className="mt-1 p-2 rounded-lg bg-neutral-50 border border-neutral-100 text-xs space-y-1 max-w-[70%]">
                        {msg.metadata.governor_reason && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-neutral-400">Route:</span>
                            <Badge variant="outline" className="text-xs">{msg.metadata.response_mode}</Badge>
                            <span className="text-neutral-500">{msg.metadata.governor_reason}</span>
                          </div>
                        )}
                        {msg.metadata.intent && (
                          <div><span className="text-neutral-400">Intent:</span> <span className="text-neutral-700">{msg.metadata.intent}</span></div>
                        )}
                        {msg.metadata.stage && (
                          <div><span className="text-neutral-400">Stage:</span> <span className="text-neutral-700">{msg.metadata.stage}</span></div>
                        )}
                        {msg.metadata.lead_score != null && (
                          <div><span className="text-neutral-400">Lead Score:</span> <span className="text-neutral-700">{msg.metadata.lead_score}</span></div>
                        )}
                        {msg.metadata.products_referenced && msg.metadata.products_referenced.length > 0 && (
                          <div><span className="text-neutral-400">Products:</span> <span className="text-neutral-700">{msg.metadata.products_referenced.join(', ')}</span></div>
                        )}
                        {msg.metadata.kb_articles_used && msg.metadata.kb_articles_used.length > 0 && (
                          <div><span className="text-neutral-400">KB:</span> <span className="text-neutral-700">{msg.metadata.kb_articles_used.join(', ')}</span></div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-neutral-100 bg-white">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Type a message..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    className="min-h-[44px] max-h-[120px] resize-none pr-20"
                    rows={1}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <Image className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <Smile className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sending}
                  className="h-11 px-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8" />
            </div>
            <p className="font-medium mb-1">Select a conversation</p>
            <p className="text-sm">Choose a conversation from the list to view messages</p>
          </div>
        )}
      </div>
    </div>
  );
}
