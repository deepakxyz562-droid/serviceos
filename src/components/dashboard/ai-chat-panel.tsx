'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Wrench, User, Loader2, RotateCcw, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * AiChatPanel — the conversational AI assistant UI (Tier 2).
 * Talks to POST /api/ai/chat. Holds the conversation client-side; the server
 * is stateless. Tool calls render as transparency chips above each answer.
 */

interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  ok: boolean;
  summary: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  failed?: boolean;
}

interface QuotaInfo {
  used: number;
  quota: number;
}

// ─── Lightweight markdown rendering ─────────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('**')) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <code key={key++} className="rounded bg-muted px-1 py-0.5 text-[0.85em] font-mono">
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Markdownish({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.split('\n');
  let bullets: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={key++} className="my-1.5 space-y-1 pl-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
            <span>{renderInline(b)}</span>
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bulletMatch = line.match(/^\s*[-•*]\s+(.*)$/);
    const numberedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bulletMatch || numberedMatch) {
      bullets.push((bulletMatch ?? numberedMatch)![1]);
    } else {
      flushBullets();
      if (line.trim() === '') continue;
      blocks.push(
        <p key={key++} className="my-1.5 whitespace-pre-wrap">
          {renderInline(line)}
        </p>,
      );
    }
  }
  flushBullets();

  return <div className="text-sm leading-relaxed">{blocks}</div>;
}

// ─── Suggested starters ─────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Give me an overview of the business',
  'Which invoices are outstanding?',
  "What's on the schedule this week?",
  'What services do I offer and at what price?',
];

// ─── Component ──────────────────────────────────────────────────────────────

export function AiChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(
    async (text?: string) => {
      const question = (text ?? input).trim();
      if (!question || loading) return;

      const outgoing: ChatMessage[] = [...messages, { role: 'user' as const, content: question }];
      setMessages([...outgoing, { role: 'assistant' as const, content: '', failed: false }]);
      setInput('');
      setLoading(true);

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: outgoing.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const errMsg = data?.error ?? `Request failed (${res.status})`;
          if (res.status === 429) {
            toast.error('AI quota exceeded', { description: errMsg });
          } else {
            toast.error('AI assistant unavailable', { description: errMsg });
          }
          setMessages([
            ...outgoing,
            { role: 'assistant', content: errMsg, failed: true },
          ]);
          return;
        }

        if (data.quota) setQuota(data.quota);
        setMessages([
          ...outgoing,
          {
            role: 'assistant',
            content: data.reply ?? '(empty response)',
            toolCalls: Array.isArray(data.toolCalls) ? data.toolCalls : [],
          },
        ]);
      } catch {
        toast.error('Network error', { description: 'Could not reach the AI assistant.' });
        setMessages([
          ...outgoing,
          { role: 'assistant', content: 'Network error — please try again.', failed: true },
        ]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [input, loading, messages],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const pct = quota && quota.quota > 0 ? Math.min(100, (quota.used / quota.quota) * 100) : 0;
  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-card" data-testid="ai-chat-panel">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">AI Assistant</p>
            <p className="truncate text-xs text-muted-foreground">
              Ask about your customers, jobs, invoices & schedule — read-only
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {quota && (
            <div className="hidden w-28 sm:block" title={`${quota.used} of ${quota.quota} AI calls used`}>
              <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                <span>AI quota</span>
                <span>{quota.used}/{quota.quota}</span>
              </div>
              <Progress value={pct} className="h-1.5" aria-label="AI quota usage" />
            </div>
          )}
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setMessages([])} aria-label="New chat">
              <RotateCcw className="h-4 w-4" />
              <span className="ml-1 hidden md:inline">New</span>
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Ask your business anything</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                I can look up customers, jobs, leads, invoices, revenue and your service catalog — without changing anything.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => void send(s)}
                  disabled={loading}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2.5',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : msg.failed
                        ? 'border border-destructive/40 bg-destructive/5'
                        : 'bg-muted',
                  )}
                >
                  {msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0 && !msg.failed && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {msg.toolCalls.map((tc, j) => (
                        <Badge
                          key={j}
                          variant={tc.ok ? 'secondary' : 'destructive'}
                          className="gap-1 text-[10px] font-normal"
                          title={JSON.stringify(tc.arguments)}
                        >
                          <Wrench className="h-3 w-3" />
                          {tc.name} · {tc.summary}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  ) : msg.failed ? (
                    <p className="flex items-start gap-1.5 text-sm text-destructive">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      {msg.content}
                    </p>
                  ) : (
                    <Markdownish text={msg.content} />
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                </div>
                <div className="rounded-2xl bg-muted px-4 py-3">
                  <span className="flex gap-1" aria-label="Assistant is thinking">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Which invoices are overdue?"
            rows={1}
            className="max-h-32 min-h-[44px] resize-none"
            aria-label="Message the AI assistant"
            disabled={loading}
          />
          <Button
            onClick={() => void send()}
            disabled={loading || !input.trim()}
            size="icon"
            className="h-11 w-11 shrink-0"
            aria-label="Send message"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
          The assistant can only read business data — it never creates or modifies records.
        </p>
      </div>
    </div>
  );
}
