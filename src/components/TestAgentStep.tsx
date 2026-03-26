/**
 * Test Agent step for SaaS onboarding wizard.
 *
 * Lets the customer test their AI agent with a simulated DM conversation
 * using their actual products — the "aha moment" of onboarding.
 *
 * Calls POST /api/test-conversation via saasApi.runtimeProxy().
 * Gracefully handles 404 (endpoint not yet deployed) with a skip option.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  Send,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import { saasApi } from '@/services/saasApiService';

interface TestAgentStepProps {
  subdomain: string;
  onComplete: (data: string) => void;
  primaryColor: string;
}

interface ChatMessage {
  role: 'user' | 'agent';
  text: string;
  productsReferenced?: number;
  kbArticlesUsed?: number;
}

type StepState = 'chat' | 'not-available' | 'success';

const SUGGESTION_CHIPS = [
  'Do you have kurtas under 2000?',
  'What sizes are available?',
  'Is COD available?',
  'Show me your best sellers',
];

export default function TestAgentStep({
  subdomain,
  onComplete,
  primaryColor,
}: TestAgentStepProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stepState, setStepState] = useState<StepState>('chat');
  const [hasSuccessfulExchange, setHasSuccessfulExchange] = useState(false);
  const [timeoutError, setTimeoutError] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setTimeoutError(false);

    try {
      const response = await saasApi.runtimeProxy(subdomain, '/api/test-conversation', {
        method: 'POST',
        body: JSON.stringify({ message: text.trim() }),
      });

      const agentMessage: ChatMessage = {
        role: 'agent',
        text: response.response || 'I received your message.',
        productsReferenced: response.products_referenced,
        kbArticlesUsed: response.kb_articles_used,
      };

      setMessages(prev => [...prev, agentMessage]);
      setHasSuccessfulExchange(true);
    } catch (err: any) {
      const errorMsg = err?.message || '';

      // 404 — endpoint does not exist yet
      if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
        setStepState('not-available');
        return;
      }

      // Timeout or network error — agent pod may still be starting
      if (
        errorMsg.includes('timed out') ||
        errorMsg.includes('AbortError') ||
        errorMsg.includes('Network error')
      ) {
        setTimeoutError(true);
        // Remove the user message since it failed
        setMessages(prev => prev.slice(0, -1));
        return;
      }

      // Generic error — show as agent message
      const errorMessage: ChatMessage = {
        role: 'agent',
        text: 'Sorry, I had trouble responding. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [loading, subdomain]);

  const handleSend = () => {
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChipClick = (chip: string) => {
    sendMessage(chip);
  };

  const handleActivate = () => {
    onComplete(JSON.stringify({ tested: true }));
  };

  const handleSkip = () => {
    onComplete(JSON.stringify({ tested: false, skipped: true }));
  };

  // -- Not-available fallback --
  if (stepState === 'not-available') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <Bot className="w-5 h-5" style={{ color: primaryColor }} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-200">Test Your Agent</h3>
            <p className="text-xs text-slate-400">Send a message like your customers would</p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-300">Coming Soon</p>
              <p className="text-xs text-amber-400/80 mt-1">
                Test conversation will be available after your agent pod starts.
                You can skip this step for now.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSkip}
          className="w-full py-2.5 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2"
          style={{ backgroundColor: primaryColor }}
        >
          <SkipForward className="w-4 h-4" /> Skip for Now
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          <Bot className="w-5 h-5" style={{ color: primaryColor }} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-200">Test Your Agent</h3>
          <p className="text-xs text-slate-400">Send a message like your customers would</p>
        </div>
      </div>

      {/* Suggestion chips (show when no messages yet) */}
      {messages.length === 0 && !timeoutError && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTION_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => handleChipClick(chip)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20 transition-colors disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Timeout error banner */}
      {timeoutError && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-300 flex-1">
              Your agent is starting up. Try again in a moment.
            </p>
            <button
              onClick={() => {
                setTimeoutError(false);
                inputRef.current?.focus();
              }}
              className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1 flex-shrink-0"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        </div>
      )}

      {/* Chat area */}
      {messages.length > 0 && (
        <div className="max-h-80 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {messages.map((msg, i) => (
            <div key={i}>
              <div
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'text-white rounded-br-md'
                      : 'bg-white/5 text-slate-200 rounded-bl-md'
                  }`}
                  style={
                    msg.role === 'user' ? { backgroundColor: primaryColor } : undefined
                  }
                >
                  {msg.text}
                </div>
              </div>
              {/* Stats badge for agent messages */}
              {msg.role === 'agent' &&
                (msg.productsReferenced != null || msg.kbArticlesUsed != null) && (
                  <div className="flex justify-start mt-1 ml-1">
                    <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                      Referenced {msg.productsReferenced ?? 0} products, {msg.kbArticlesUsed ?? 0} FAQ articles
                    </span>
                  </div>
                )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-white/20 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="p-2.5 rounded-xl text-white disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: primaryColor }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Success banner + Activate button */}
      {hasSuccessfulExchange && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-xs text-green-300">
                Your agent is working! It knows your products and can answer customer questions.
              </p>
            </div>
          </div>

          <button
            onClick={handleActivate}
            className="w-full py-2.5 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            <CheckCircle2 className="w-4 h-4" /> Activate Agent
          </button>
        </div>
      )}
    </div>
  );
}
