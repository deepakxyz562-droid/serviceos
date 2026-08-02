'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles, X, Loader2, Copy, Check, Send, ClipboardList,
  Wrench, FileText, TrendingUp, MessageSquare, HelpCircle,
  User, AlertTriangle, RefreshCw, Lightbulb,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────

type Action =
  | 'summarize_customer'
  | 'troubleshoot'
  | 'completion_notes'
  | 'upsell'
  | 'draft_message'
  | 'ask';

interface QuickAction {
  key: Action;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  messageType?: 'sms' | 'email' | 'whatsapp';
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    key: 'summarize_customer',
    label: 'Summarize Customer',
    description: 'Quick history recap',
    icon: User,
    color: 'text-emerald-700',
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
  },
  {
    key: 'troubleshoot',
    label: 'Troubleshoot',
    description: 'Step-by-step fix',
    icon: Wrench,
    color: 'text-amber-700',
    bg: 'bg-amber-500/10 hover:bg-amber-500/20',
  },
  {
    key: 'completion_notes',
    label: 'Completion Notes',
    description: 'Auto-write notes',
    icon: FileText,
    color: 'text-blue-700',
    bg: 'bg-blue-500/10 hover:bg-blue-500/20',
  },
  {
    key: 'upsell',
    label: 'Upsell Services',
    description: 'Recommend next services',
    icon: TrendingUp,
    color: 'text-violet-700',
    bg: 'bg-violet-500/10 hover:bg-violet-500/20',
  },
  {
    key: 'draft_message',
    label: 'Draft Message',
    description: 'Customer SMS/Email',
    icon: MessageSquare,
    color: 'text-pink-700',
    bg: 'bg-pink-500/10 hover:bg-pink-500/20',
    messageType: 'email',
  },
  {
    key: 'ask',
    label: 'Ask a Question',
    description: 'Free-form Q&A',
    icon: HelpCircle,
    color: 'text-cyan-700',
    bg: 'bg-cyan-500/10 hover:bg-cyan-500/20',
  },
];

interface AIResult {
  action: Action;
  text: string;
  createdAt: number;
  question?: string; // for 'ask' action
}

interface AIAssistantPanelProps {
  jobId: string;
  jobTitle: string;
  /** Floating button position offset from bottom-right (px). */
  bottomOffset?: number;
  /** Called when "Use" is clicked on a completion_notes result. */
  onUseCompletionNotes?: (notes: string) => void;
  /** Called when "Use" is clicked on a draft_message result. */
  onUseDraftMessage?: (text: string) => void;
}

// ─── Markdown-ish renderer ─────────────────────────────────────────────────
// Lightweight inline + block parser that supports:
//   - **bold** and *italic*
//   - ## headings
//   - - bullet lists
//   - 1. numbered lists
//   - `inline code`
//   - paragraphs (blank-line separated)
// This is intentionally simple — it doesn't aim to support the full CommonMark
// spec, just enough to make AI responses readable.

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Tokenize on **bold**, *italic*, `code`.
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-b-${i}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${i}`}
          className="px-1 py-0.5 rounded bg-muted text-foreground font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(<em key={`${keyPrefix}-i-${i}`}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
    i++;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function FormattedResult({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/);
  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-foreground/90">
      {blocks.map((block, bi) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        // Heading
        if (/^#{1,6}\s/.test(trimmed)) {
          const level = trimmed.match(/^#+/)![0].length;
          const content = trimmed.replace(/^#+\s/, '');
          const cls =
            level <= 2
              ? 'text-base font-bold text-foreground'
              : 'text-sm font-semibold text-foreground';
          return (
            <p key={bi} className={cls}>
              {renderInline(content, `h-${bi}`)}
            </p>
          );
        }
        // Bullet list
        if (/^[-*]\s/.test(trimmed)) {
          const items = trimmed.split(/\n/).filter((l) => /^[-*]\s/.test(l.trim()));
          return (
            <ul key={bi} className="space-y-1 pl-1">
              {items.map((it, ii) => (
                <li key={ii} className="flex gap-2">
                  <span className="text-emerald-600 font-bold mt-0.5">•</span>
                  <span>{renderInline(it.replace(/^[-*]\s/, '').trim(), `li-${bi}-${ii}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        // Numbered list
        if (/^\d+\.\s/.test(trimmed)) {
          const items = trimmed.split(/\n/).filter((l) => /^\d+\.\s/.test(l.trim()));
          return (
            <ol key={bi} className="space-y-1 pl-1">
              {items.map((it, ii) => {
                const m = it.match(/^(\d+)\.\s(.*)$/);
                return (
                  <li key={ii} className="flex gap-2">
                    <span className="text-emerald-700 font-bold mt-0.5 shrink-0">
                      {m ? m[1] + '.' : ''}
                    </span>
                    <span>{renderInline(m ? m[2] : it, `ol-${bi}-${ii}`)}</span>
                  </li>
                );
              })}
            </ol>
          );
        }
        // Plain paragraph (may have inline newlines)
        return (
          <p key={bi} className="whitespace-pre-wrap">
            {renderInline(trimmed, `p-${bi}`)}
          </p>
        );
      })}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export function AIAssistantPanel({
  jobId,
  jobTitle,
  bottomOffset = 24,
  onUseCompletionNotes,
  onUseDraftMessage,
}: AIAssistantPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<Action | null>(null);
  const [results, setResults] = useState<AIResult[]>([]);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when results change.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [results, loading]);

  const callAI = useCallback(
    async (action: Action, opts?: { question?: string; messageType?: 'sms' | 'email' | 'whatsapp' }) => {
      setLoading(action);
      setError(null);
      try {
        const res = await fetch('/api/ai/field-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            action,
            question: opts?.question,
            messageType: opts?.messageType || 'email',
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || `AI request failed (${res.status})`);
        }
        const result: AIResult = {
          action,
          text: data.text,
          createdAt: Date.now(),
          question: opts?.question,
        };
        setResults((prev) => [...prev, result]);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error';
        setError(msg);
        toast.error(`AI Assistant: ${msg}`);
        return null;
      } finally {
        setLoading(null);
      }
    },
    [jobId],
  );

  const handleQuickAction = (qa: QuickAction) => {
    if (qa.key === 'ask') {
      // Don't auto-call — the user types a question first.
      return;
    }
    callAI(qa.key, qa.messageType ? { messageType: qa.messageType } : undefined);
  };

  const handleAskSubmit = () => {
    const q = question.trim();
    if (!q) return;
    callAI('ask', { question: q });
    setQuestion('');
  };

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedIdx(null), 1800);
    } catch {
      toast.error('Clipboard not available');
    }
  };

  const handleUse = (result: AIResult) => {
    if (result.action === 'completion_notes') {
      onUseCompletionNotes?.(result.text);
      toast.success('Inserted into completion notes');
      setOpen(false);
    } else if (result.action === 'draft_message') {
      onUseDraftMessage?.(result.text);
      toast.success('Loaded into composer');
      setOpen(false);
    } else {
      toast.info('"Use" is only available for Completion Notes and Draft Message results.');
    }
  };

  const actionLabel = (a: Action): string => {
    const map: Record<Action, string> = {
      summarize_customer: 'Customer Summary',
      troubleshoot: 'Troubleshooting',
      completion_notes: 'Completion Notes',
      upsell: 'Upsell Recommendations',
      draft_message: 'Drafted Message',
      ask: 'Answer',
    };
    return map[a];
  };

  const actionColor = (a: Action): string => {
    const map: Record<Action, string> = {
      summarize_customer: 'bg-emerald-500/10 text-emerald-700 border-emerald-600/30',
      troubleshoot: 'bg-amber-500/10 text-amber-700 border-amber-600/30',
      completion_notes: 'bg-blue-500/10 text-blue-700 border-blue-600/30',
      upsell: 'bg-violet-500/10 text-violet-700 border-violet-600/30',
      draft_message: 'bg-pink-500/10 text-pink-700 border-pink-600/30',
      ask: 'bg-cyan-500/10 text-cyan-700 border-cyan-600/30',
    };
    return map[a];
  };

  return (
    <>
      {/* ─── Floating emerald button (Sparkles) ─── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="AI Field Assistant"
        aria-label="Open AI Field Assistant"
        className="fixed z-40 flex items-center justify-center size-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all hover:scale-105 active:scale-95"
        style={{ bottom: bottomOffset, right: bottomOffset }}
      >
        <Sparkles className="size-6" strokeWidth={2.2} />
        <span className="absolute inset-0 rounded-full ring-2 ring-emerald-400/40 animate-ping opacity-30" />
        <span className="sr-only">Open AI Field Assistant</span>
      </button>

      {/* ─── Slide-over panel ─── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="sm:max-w-lg w-full flex flex-col p-0"
        >
          {/* Header */}
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border bg-gradient-to-br from-emerald-600/10 via-transparent to-transparent">
            <SheetTitle className="flex items-center gap-2.5">
              <span className="flex items-center justify-center size-9 rounded-lg bg-emerald-600 text-white shadow-md">
                <Sparkles className="size-5" />
              </span>
              <div>
                <span className="block">AI Field Assistant</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {jobTitle ? truncate(jobTitle, 40) : 'Job context loaded'}
                </span>
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">
              Use the AI assistant to summarize customer history, troubleshoot
              issues, generate completion notes, recommend upsells, draft
              messages, or ask questions about this job.
            </SheetDescription>
          </SheetHeader>

          {/* Quick actions grid */}
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              Quick Actions
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUICK_ACTIONS.map((qa) => {
                const Icon = qa.icon;
                const isLoading = loading === qa.key;
                return (
                  <button
                    key={qa.key}
                    type="button"
                    onClick={() => handleQuickAction(qa)}
                    disabled={!!loading}
                    className={cn(
                      'flex flex-col items-start gap-1.5 p-3 rounded-lg border border-border text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed',
                      qa.bg,
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn('size-4', qa.color)} />
                      {isLoading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                    </div>
                    <div>
                      <p className={cn('text-xs font-semibold', qa.color)}>{qa.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {qa.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results / Q&A history */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          >
            {results.length === 0 && !loading && !error && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex items-center justify-center size-12 rounded-full bg-emerald-500/10 text-emerald-700 mb-3">
                  <Lightbulb className="size-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">AI Field Assistant</p>
                <p className="text-xs text-muted-foreground max-w-xs mt-1">
                  Pick a quick action above or type a question below. The assistant uses your customer + job context to give relevant answers.
                </p>
              </div>
            )}

            {results.map((r, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
                {/* Result header */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/30">
                  <Badge variant="outline" className={cn('text-[10px] font-semibold border', actionColor(r.action))}>
                    {r.action === 'ask' && r.question ? (
                      <span className="flex items-center gap-1">
                        <HelpCircle className="size-2.5" /> Q: {truncate(r.question, 50)}
                      </span>
                    ) : (
                      actionLabel(r.action)
                    )}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(r.text, idx)}
                      title="Copy"
                      className="flex items-center gap-1 text-[11px] px-2 py-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      {copiedIdx === idx ? (
                        <Check className="size-3 text-emerald-600" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                      {copiedIdx === idx ? 'Copied' : 'Copy'}
                    </button>
                    {(r.action === 'completion_notes' || r.action === 'draft_message') && (
                      <button
                        type="button"
                        onClick={() => handleUse(r)}
                        title="Use this"
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded text-emerald-700 hover:bg-emerald-500/10 transition-colors font-medium"
                      >
                        <ClipboardList className="size-3" />
                        Use
                      </button>
                    )}
                  </div>
                </div>
                {/* Result body */}
                <div className="px-3 py-3">
                  <FormattedResult text={r.text} />
                </div>
              </div>
            ))}

            {/* Loading placeholder */}
            {loading && (
              <div className="rounded-lg border border-emerald-600/30 bg-emerald-500/5 p-4 flex items-center gap-3">
                <Loader2 className="size-4 animate-spin text-emerald-600" />
                <div className="text-sm">
                  <p className="font-medium text-emerald-800">
                    {loading === 'ask' ? 'Thinking…' : `Generating ${actionLabel(loading)}…`}
                  </p>
                  <p className="text-xs text-emerald-700/70">This usually takes 5-15 seconds.</p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
                <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-destructive">AI request failed</p>
                  <p className="text-xs text-destructive/80 mt-0.5 break-words">{error}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 text-xs"
                    onClick={() => {
                      setError(null);
                    }}
                  >
                    <RefreshCw className="size-3 mr-1" /> Dismiss
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Ask a question input (always visible at bottom) */}
          <div className="border-t border-border px-4 py-3 bg-card">
            <div className="flex items-end gap-2">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask the AI assistant a question about this job…"
                rows={2}
                className="resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAskSubmit();
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                onClick={handleAskSubmit}
                disabled={!question.trim() || !!loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              >
                {loading === 'ask' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Press <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Enter</kbd> to send ·
              <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono ml-1">Shift+Enter</kbd> for newline
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}
