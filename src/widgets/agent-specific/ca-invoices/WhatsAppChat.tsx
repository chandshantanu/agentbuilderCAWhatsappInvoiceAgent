/**
 * WhatsApp Chat Widget — full conversation management for CA dashboard.
 *
 * Left panel: conversation list with search
 * Right panel: message thread with human + bot reply
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Search,
  Loader2,
  Check,
  CheckCheck,
  Clock,
  Bot,
  User as UserIcon,
  Phone,
  ArrowLeft,
  RefreshCw,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';

interface Message {
  id: string;
  sender_phone: string;
  direction: 'incoming' | 'outgoing';
  type: string;
  text: string;
  source: 'user' | 'bot' | 'human';
  timestamp: string;
  status?: string;
  sender_name?: string;
  media_id?: string;
  media_filename?: string;
  media_url?: string;
  wa_message_id?: string;
}

interface Conversation {
  phone: string;
  display_phone: string;
  sender_name: string;
  client_id?: string;
  client_name: string;
  last_message: string;
  last_message_type: string;
  last_message_time: string;
  last_direction: string;
  last_source: string;
  total_messages: number;
  incoming_count: number;
  outgoing_count: number;
}

export default function WhatsAppChat({ config }: { config: Record<string, unknown> }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const endpoint = (config?.endpoint as string) || '/api/conversations';

  // Load conversations
  const fetchConversations = useCallback(async () => {
    try {
      const resp = await apiClient.get(endpoint);
      const data = resp.data?.data || resp.data || [];
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConvs(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages for selected conversation
  const fetchMessages = useCallback(async (phone: string) => {
    setLoadingMsgs(true);
    try {
      const resp = await apiClient.get(`${endpoint}/${phone}/messages?limit=200`);
      setMessages(resp.data?.data || resp.data || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMsgs(false);
    }
  }, [endpoint]);

  // When a conversation is selected, load its messages
  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.phone);
    } else {
      setMessages([]);
    }
  }, [selectedConv, fetchMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 10s when a conversation is open
  useEffect(() => {
    if (selectedConv) {
      pollIntervalRef.current = setInterval(() => {
        fetchMessages(selectedConv.phone);
        fetchConversations();
      }, 10000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [selectedConv, fetchMessages, fetchConversations]);

  const handleSelectConv = (conv: Conversation) => {
    setSelectedConv(conv);
    setShowMobileChat(true);
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
    setSelectedConv(null);
  };

  const handleSendReply = useCallback(async () => {
    if (!selectedConv || !replyText.trim()) return;
    setSending(true);

    // Optimistic: add message immediately
    const optimisticMsg: Message = {
      id: `temp_${Date.now()}`,
      sender_phone: selectedConv.phone,
      direction: 'outgoing',
      type: 'text',
      text: replyText.trim(),
      source: 'human',
      timestamp: new Date().toISOString(),
      status: 'sending',
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    const msgText = replyText.trim();
    setReplyText('');

    try {
      const resp = await apiClient.post(
        `${endpoint}/${selectedConv.phone}/send`,
        { text: msgText },
      );
      const sent = resp.data?.data;

      // Replace optimistic with real
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMsg.id
            ? { ...m, id: sent?.id || m.id, status: 'sent', wa_message_id: sent?.wa_message_id }
            : m,
        ),
      );
      // Refresh conversation list
      fetchConversations();
    } catch (err: any) {
      // Mark as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMsg.id ? { ...m, status: 'failed' } : m,
        ),
      );
      console.error('Failed to send:', err);
    } finally {
      setSending(false);
    }
  }, [selectedConv, replyText, endpoint, fetchConversations]);

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      conv.phone.includes(q) ||
      (conv.sender_name || '').toLowerCase().includes(q) ||
      (conv.client_name || '').toLowerCase().includes(q)
    );
  });

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
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

  const formatMessageTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-neutral-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-neutral-400" />;
      case 'sending':
        return <Clock className="w-3 h-3 text-neutral-400 animate-pulse" />;
      case 'failed':
        return <span className="text-[10px] text-red-500 font-medium">Failed</span>;
      default:
        return null;
    }
  };

  const getSourceIcon = (source: string, direction: string) => {
    if (direction === 'incoming') {
      return <UserIcon className="w-3 h-3" />;
    }
    return source === 'bot' ? (
      <Bot className="w-3 h-3" />
    ) : (
      <UserIcon className="w-3 h-3" />
    );
  };

  const getSourceLabel = (msg: Message) => {
    if (msg.direction === 'incoming') {
      return msg.sender_name || 'Client';
    }
    return msg.source === 'bot' ? 'Bot' : 'You';
  };

  const getInitials = (conv: Conversation) => {
    if (conv.client_name) return conv.client_name.slice(0, 2).toUpperCase();
    if (conv.sender_name) return conv.sender_name.slice(0, 2).toUpperCase();
    return conv.phone.slice(-2);
  };

  const getDisplayName = (conv: Conversation) => {
    return conv.client_name || conv.sender_name || conv.display_phone;
  };

  // ─── Conversation List Panel ──────────────────────────────────────

  const ConversationListPanel = () => (
    <div className={cn(
      "border-r border-neutral-200 flex flex-col h-full",
      showMobileChat ? "hidden lg:flex" : "flex",
      "lg:w-[340px] w-full"
    )}>
      <div className="p-4 border-b border-neutral-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-green-600" />
            WhatsApp Messages
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {conversations.length}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={() => {
                setLoadingConvs(true);
                fetchConversations().finally(() => setLoadingConvs(false));
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loadingConvs ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-neutral-500 px-4">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm font-medium">No conversations yet</p>
            <p className="text-xs text-neutral-400 text-center mt-1">
              Messages from WhatsApp will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredConversations.map((conv) => (
              <motion.button
                key={conv.phone}
                onClick={() => handleSelectConv(conv)}
                whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                className={cn(
                  "w-full p-3 flex items-start gap-3 text-left transition-colors",
                  selectedConv?.phone === conv.phone && "bg-green-50/60"
                )}
              >
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarFallback className="bg-green-100 text-green-700 text-xs font-medium">
                    {getInitials(conv)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-sm truncate">
                      {getDisplayName(conv)}
                    </span>
                    <span className="text-[11px] text-neutral-400 flex-shrink-0 ml-2">
                      {formatTime(conv.last_message_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {conv.last_direction === 'outgoing' && (
                      <span className="text-neutral-400 flex-shrink-0">
                        {conv.last_source === 'bot' ? (
                          <Bot className="w-3 h-3 inline" />
                        ) : (
                          <Check className="w-3 h-3 inline" />
                        )}
                      </span>
                    )}
                    <p className="text-xs text-neutral-500 truncate">
                      {conv.last_message_type !== 'text'
                        ? `[${conv.last_message_type}]`
                        : conv.last_message || '...'}
                    </p>
                  </div>
                  {conv.client_name && conv.sender_name && conv.client_name !== conv.sender_name && (
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {conv.display_phone}
                    </p>
                  )}
                </div>

                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 flex-shrink-0 mt-1"
                >
                  {conv.total_messages}
                </Badge>
              </motion.button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  // ─── Chat Panel ──────────────────────────────────────────────────

  const ChatPanel = () => (
    <div className={cn(
      "flex flex-col h-full flex-1",
      !showMobileChat && "hidden lg:flex"
    )}>
      {selectedConv ? (
        <>
          {/* Header */}
          <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-3 bg-neutral-50/80 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 lg:hidden"
              onClick={handleBackToList}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-green-100 text-green-700 text-xs font-medium">
                {getInitials(selectedConv)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {getDisplayName(selectedConv)}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {selectedConv.display_phone}
                {selectedConv.client_name && ` · ${selectedConv.client_name}`}
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-xs"
            >
              {selectedConv.total_messages} msgs
            </Badge>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {loadingMsgs ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-neutral-400">
                <MessageSquare className="w-6 h-6 mb-2" />
                <p className="text-sm">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "flex",
                      msg.direction === 'outgoing' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-3 py-2 shadow-sm",
                        msg.direction === 'outgoing'
                          ? msg.source === 'bot'
                            ? "bg-blue-50 text-neutral-900 border border-blue-100"
                            : "bg-green-600 text-white"
                          : "bg-white text-neutral-900 border border-neutral-200"
                      )}
                    >
                      {/* Source label */}
                      <div
                        className={cn(
                          "flex items-center gap-1 text-[11px] mb-0.5",
                          msg.direction === 'outgoing'
                            ? msg.source === 'bot'
                              ? "text-blue-500"
                              : "text-green-100"
                            : "text-neutral-400"
                        )}
                      >
                        {getSourceIcon(msg.source, msg.direction)}
                        <span>{getSourceLabel(msg)}</span>
                      </div>

                      {/* Media preview */}
                      {msg.type === 'image' && msg.media_url && (
                        <div className="mb-1.5 rounded-lg overflow-hidden">
                          <img
                            src={msg.media_url}
                            alt="Shared image"
                            className="max-w-full max-h-[240px] rounded-lg object-contain bg-neutral-100 cursor-pointer"
                            loading="lazy"
                            onClick={() => window.open(msg.media_url, '_blank')}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className={cn(
                            "hidden flex items-center gap-1.5 text-xs py-1 italic",
                            msg.direction === 'outgoing' && msg.source !== 'bot' ? "text-green-100" : "text-neutral-400"
                          )}>
                            <ImageIcon className="w-3 h-3" /> Image
                          </div>
                        </div>
                      )}

                      {/* Document indicator */}
                      {msg.type === 'document' && (
                        <div
                          className={cn(
                            "flex items-center gap-2 mb-1.5 px-2 py-1.5 rounded-lg text-xs",
                            msg.direction === 'outgoing' && msg.source !== 'bot'
                              ? "bg-green-700/30 text-green-50"
                              : "bg-neutral-100 text-neutral-600"
                          )}
                        >
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{msg.media_filename || 'Document'}</span>
                          {msg.media_url && (
                            <a
                              href={msg.media_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto underline flex-shrink-0"
                            >
                              View
                            </a>
                          )}
                        </div>
                      )}

                      {/* Other media types fallback */}
                      {msg.type !== 'text' && msg.type !== 'unknown' && msg.type !== 'image' && msg.type !== 'document' && (
                        <div
                          className={cn(
                            "text-xs mb-1 italic",
                            msg.direction === 'outgoing' && msg.source !== 'bot'
                              ? "text-green-100"
                              : "text-neutral-400"
                          )}
                        >
                          [{msg.type}
                          {msg.media_filename ? `: ${msg.media_filename}` : ''}]
                        </div>
                      )}

                      {/* Message text */}
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.text || `[${msg.type}]`}
                      </p>

                      {/* Time + status */}
                      <div
                        className={cn(
                          "flex items-center justify-end gap-1 mt-0.5 text-[10px]",
                          msg.direction === 'outgoing'
                            ? msg.source === 'bot'
                              ? "text-blue-400"
                              : "text-green-200"
                            : "text-neutral-400"
                        )}
                      >
                        {formatMessageTime(msg.timestamp)}
                        {msg.direction === 'outgoing' && getStatusIcon(msg.status)}
                      </div>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Reply input */}
          <div className="px-4 py-3 border-t border-neutral-100 bg-white flex-shrink-0">
            <div className="flex items-end gap-2">
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
                className="min-h-[42px] max-h-[120px] resize-none text-sm flex-1"
                rows={1}
              />
              <Button
                onClick={handleSendReply}
                disabled={!replyText.trim() || sending}
                className="h-[42px] px-4 bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5">
              Shift+Enter for new line · Replies sent as your business number
            </p>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-green-300" />
          </div>
          <p className="font-medium text-neutral-600 mb-1">Select a conversation</p>
          <p className="text-sm text-center max-w-xs">
            Choose a conversation to view messages and reply
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-[600px] bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <ConversationListPanel />
      <ChatPanel />
    </div>
  );
}
