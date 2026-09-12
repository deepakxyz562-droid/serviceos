'use client';

/**
 * AiChatPanel
 * ===========
 * Modern, high-performance conversational AI assistant UI for Fieseros.
 *
 * Features:
 *   • Rich Markdown rendering: GFM Tables, Fenced Code Blocks with 1-click copy,
 *     Headers, Bullet/Ordered Lists, Blockquotes, Bold, and Inline Code.
 *   • Expandable Tool Execution Cards with JSON inspector and status indicators.
 *   • Dynamic Contextual Follow-up Chips after each AI response.
 *   • Voice / Speech-to-Text Input with real-time listening wave.
 *   • Message actions: Copy to Clipboard, 1-Click Regenerate, Helpful Feedback.
 *   • Chat Session actions: Export Transcript to Markdown, Copy Entire Chat, Reset.
 *   • Categorized Quick Prompt Starters with icons and instant execution.
 *   • Auto-expanding multiline composer with keyboard shortcuts (Enter to send, Shift+Enter for newline).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Send,
  Sparkles,
  Wrench,
  User,
  Loader2,
  RotateCcw,
  CircleAlert,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
  TrendingUp,
  Calendar,
  DollarSign,
  Briefcase,
  Users,
  Database,
  ArrowRight,
  Mic,
  MicOff,
  Download,
  ThumbsUp,
  ThumbsDown,
  FileCode,
  CornerDownLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  ok: boolean;
  summary: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  failed?: boolean;
  timestamp?: string;
  followUps?: string[];
  feedback?: 'up' | 'down';
}

export interface QuotaInfo {
  used: number;
  quota: number;
}

// ─── Inline Markdown Renderer ────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={key++} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-muted-foreground/10 px-1.5 py-0.5 text-[0.85em] font-mono font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={key++} className="italic text-foreground/90">
          {token.slice(1, -1)}
        </em>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// ─── Code Block with 1-Click Copy ───────────────────────────────────────────

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-lg border border-border/80 bg-slate-950 text-slate-100 overflow-hidden font-mono text-xs shadow-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <FileCode className="size-3.5 text-emerald-400" />
          <span>{language || 'code'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-800"
        >
          {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ─── Markdown Table Parser ──────────────────────────────────────────────────

function parseMarkdownTable(lines: string[]): { headers: string[]; rows: string[][] } | null {
  if (lines.length < 2) return null;
  const parseRow = (line: string) =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());

  const headers = parseRow(lines[0]);
  // Check if second line is separator (e.g. |---|---|)
  const isSeparator = /^\|?(\s*:?-+:?\s*\|?)+$/.test(lines[1].trim());
  if (!isSeparator) return null;

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    if (!lines[i].includes('|')) break;
    rows.push(parseRow(lines[i]));
  }
  return { headers, rows };
}

// ─── Rich Markdown Renderer Component ───────────────────────────────────────

function RichMarkdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.split('\n');
  let bullets: string[] = [];
  let key = 0;
  let i = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={key++} className="my-2 space-y-1.5 pl-1">
        {bullets.map((b, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-foreground/90 leading-relaxed">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="flex-1">{renderInline(b)}</span>
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // Check for fenced code block ```
    if (line.startsWith('```')) {
      flushBullets();
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimEnd().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push(<CodeBlock key={key++} code={codeLines.join('\n')} language={language} />);
      i++;
      continue;
    }

    // Check for Markdown Table
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('|') && /^\|?(\s*:?-+:?\s*\|?)+$/.test(lines[i + 1].trim())) {
      flushBullets();
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const tableData = parseMarkdownTable(tableLines);
      if (tableData) {
        blocks.push(
          <div key={key++} className="my-3 overflow-x-auto rounded-lg border border-border/70 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/70 border-b border-border/70 font-semibold text-foreground">
                <tr>
                  {tableData.headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-3 py-2">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {tableData.rows.map((row, rIdx) => (
                  <tr key={rIdx} className={cn('hover:bg-muted/30 transition-colors', rIdx % 2 === 1 && 'bg-muted/10')}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-foreground/90">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        continue;
      }
    }

    // Check for Blockquotes (> quote)
    if (line.startsWith('> ')) {
      flushBullets();
      blocks.push(
        <div
          key={key++}
          className="my-2.5 rounded-r-lg border-l-3 border-emerald-500 bg-emerald-500/5 px-3 py-2 text-xs italic text-foreground/90 leading-relaxed"
        >
          {renderInline(line.slice(2))}
        </div>,
      );
      i++;
      continue;
    }

    // Check for Headings
    if (line.startsWith('### ')) {
      flushBullets();
      blocks.push(
        <h4 key={key++} className="mt-3 mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {renderInline(line.slice(4))}
        </h4>,
      );
      i++;
      continue;
    }
    if (line.startsWith('## ') || line.startsWith('# ')) {
      flushBullets();
      blocks.push(
        <h3 key={key++} className="mt-3.5 mb-1.5 text-sm font-bold text-foreground">
          {renderInline(line.replace(/^#+\s/, ''))}
        </h3>,
      );
      i++;
      continue;
    }

    // Check for Bullet/Numbered lists
    const bulletMatch = line.match(/^\s*[-•*]\s+(.*)$/);
    const numberedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bulletMatch || numberedMatch) {
      bullets.push((bulletMatch ?? numberedMatch)![1]);
    } else {
      flushBullets();
      if (line.trim() === '') {
        blocks.push(<div key={key++} className="h-1.5" />);
      } else {
        blocks.push(
          <p key={key++} className="my-1 text-sm leading-relaxed text-foreground/90">
            {renderInline(line)}
          </p>,
        );
      }
    }
    i++;
  }
  flushBullets();

  return <div className="space-y-0.5">{blocks}</div>;
}

// ─── Expandable Tool Call Card ────────────────────────────────────────────────

function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border/70 bg-background/80 overflow-hidden text-xs transition-all shadow-2xs">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 bg-muted/40 hover:bg-muted/70 text-left transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Database className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-mono font-medium text-[11px] text-foreground truncate">
            {toolCall.name}
          </span>
          <span className="text-muted-foreground text-[11px] truncate">
            · {toolCall.summary}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Badge
            variant={toolCall.ok ? 'outline' : 'destructive'}
            className="text-[9px] px-1.5 py-0 h-4 uppercase font-semibold"
          >
            {toolCall.ok ? 'Completed' : 'Failed'}
          </Badge>
          {expanded ? (
            <ChevronUp className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="p-2.5 bg-muted/10 border-t border-border/50 space-y-1.5 font-mono text-[11px]">
          <div>
            <span className="text-muted-foreground text-[10px] uppercase tracking-wider block mb-0.5">
              Arguments:
            </span>
            <pre className="p-1.5 rounded bg-muted/50 text-foreground overflow-x-auto text-[10px]">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dynamic Follow-Up Generator ────────────────────────────────────────────

function generateDynamicFollowUps(content: string): string[] {
  const lower = content.toLowerCase();
  const followUps: string[] = [];

  if (lower.includes('invoice') || lower.includes('balance') || lower.includes('overdue') || lower.includes('revenue')) {
    followUps.push('Which customer has the largest overdue balance?');
    followUps.push('How much revenue was collected this month?');
  } else if (lower.includes('job') || lower.includes('technician') || lower.includes('schedule') || lower.includes('assigned')) {
    followUps.push('Show me unassigned jobs that need dispatch');
    followUps.push('What are the scheduled start times for today?');
  } else if (lower.includes('lead') || lower.includes('quote') || lower.includes('customer')) {
    followUps.push('List all high-priority pending leads');
    followUps.push('What is the conversion rate this month?');
  } else {
    followUps.push('Give me a full business snapshot for today');
    followUps.push('Are there any urgent alerts or overdue items?');
  }

  return followUps.slice(0, 2);
}

// ─── Categorized Prompt Starters ─────────────────────────────────────────────

interface PromptCategory {
  category: string;
  icon: typeof Sparkles;
  prompts: { label: string; text: string }[];
}

const CATEGORIZED_PROMPTS: PromptCategory[] = [
  {
    category: 'Overview',
    icon: TrendingUp,
    prompts: [
      { label: 'Business Snapshot', text: 'Give me an overview of the business today' },
      { label: 'Monthly Revenue', text: 'How much revenue have we generated this month?' },
    ],
  },
  {
    category: 'Jobs & Schedule',
    icon: Calendar,
    prompts: [
      { label: "Today's Schedule", text: "What's on the schedule for today and who is assigned?" },
      { label: 'Unassigned Jobs', text: 'Are there any unassigned jobs that need technicians?' },
    ],
  },
  {
    category: 'Invoices & Leads',
    icon: DollarSign,
    prompts: [
      { label: 'Overdue Invoices', text: 'Which invoices are currently overdue and need follow-up?' },
      { label: 'Hot Leads', text: 'Show me high-priority leads waiting for quote responses' },
    ],
  },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export interface AiChatPanelProps {
  initialPrompt?: string;
  onNavigateToView?: (view: string) => void;
  className?: string;
}

export function AiChatPanel({ initialPrompt, onNavigateToView, className }: AiChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialPrompt || '');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Sync initialPrompt prop changes
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setInput(initialPrompt);
      textareaRef.current?.focus();
    }
  }, [initialPrompt]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, loading]);

  // Adjust textarea height on input change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Voice Input Setup via Web Speech API
  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Voice input not supported', {
        description: 'Your browser does not support the Web Speech API.',
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        toast.info('Listening...', { description: 'Speak your query now' });
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        toast.error('Voice input error');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      toast.error('Could not initialize microphone');
    }
  };

  const send = useCallback(
    async (textToSend?: string) => {
      const question = (textToSend ?? input).trim();
      if (!question || loading) return;

      const userMsg: ChatMessage = {
        role: 'user',
        content: question,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const outgoing: ChatMessage[] = [...messages, userMsg];
      setMessages([...outgoing, { role: 'assistant', content: '', failed: false }]);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
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
            toast.error('AI quota reached', { description: errMsg });
          } else {
            toast.error('AI assistant error', { description: errMsg });
          }
          setMessages([
            ...outgoing,
            {
              role: 'assistant',
              content: errMsg,
              failed: true,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
          return;
        }

        if (data.quota) setQuota(data.quota);

        const replyContent = data.reply ?? '(No response content)';
        const followUps = generateDynamicFollowUps(replyContent);

        setMessages([
          ...outgoing,
          {
            role: 'assistant',
            content: replyContent,
            toolCalls: Array.isArray(data.toolCalls) ? data.toolCalls : [],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            followUps,
          },
        ]);
      } catch {
        toast.error('Network Error', { description: 'Could not connect to the AI Assistant.' });
        setMessages([
          ...outgoing,
          {
            role: 'assistant',
            content: 'Network connection error. Please verify your internet and try again.',
            failed: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } finally {
        setLoading(false);
        textareaRef.current?.focus();
      }
    },
    [input, loading, messages],
  );

  const handleCopyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyEntireChat = () => {
    if (messages.length === 0) return;
    const text = messages
      .map((m) => `### ${m.role === 'user' ? 'User' : `${BRAND.name} AI`} (${m.timestamp || ''})\n\n${m.content}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Complete conversation copied to clipboard');
  };

  const handleExportTranscript = () => {
    if (messages.length === 0) return;
    const text = messages
      .map((m) => `## ${m.role === 'user' ? 'User' : `${BRAND.name} AI`} [${m.timestamp || ''}]\n\n${m.content}`)
      .join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ai-copilot-transcript-${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Conversation transcript downloaded');
  };

  const handleFeedback = (index: number, feedback: 'up' | 'down') => {
    setMessages((prev) =>
      prev.map((m, i) => (i === index ? { ...m, feedback } : m)),
    );
    toast.success(feedback === 'up' ? 'Thanks for your feedback!' : 'Feedback noted for improvements.');
  };

  const handleRegenerate = () => {
    if (messages.length < 2 || loading) return;
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;
    const realIdx = messages.length - 1 - lastUserIdx;
    const userPrompt = messages[realIdx].content;
    const historyBefore = messages.slice(0, realIdx);
    setMessages(historyBefore);
    void send(userPrompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const pct = quota && quota.quota > 0 ? Math.min(100, (quota.used / quota.quota) * 100) : 0;
  const isEmpty = messages.length === 0;

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm',
        className,
      )}
      data-testid="ai-chat-panel"
    >
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs shrink-0">
            <Sparkles className="size-4" />
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 ring-2 ring-background animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground tracking-tight">
                {BRAND.name} Copilot
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-medium h-4 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
              >
                Read-Only Tools
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Business intelligence, schedule lookups & invoice analytics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {quota && (
            <div className="hidden sm:block w-24 mr-1" title={`${quota.used} of ${quota.quota} AI credits used`}>
              <div className="mb-0.5 flex justify-between text-[10px] text-muted-foreground">
                <span>Credits</span>
                <span className="font-mono">{quota.used}/{quota.quota}</span>
              </div>
              <Progress value={pct} className="h-1" />
            </div>
          )}

          {messages.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyEntireChat}
                className="size-7 text-muted-foreground hover:text-foreground"
                title="Copy entire conversation"
              >
                <Copy className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExportTranscript}
                className="size-7 text-muted-foreground hover:text-foreground"
                title="Download transcript (.md)"
              >
                <Download className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMessages([])}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Start a new conversation"
              >
                <RotateCcw className="size-3 mr-1" />
                <span>Reset</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Messages Stream ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 min-h-0 space-y-4">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-center px-4 py-8 max-w-lg mx-auto space-y-6">
            <div className="size-14 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <Sparkles className="size-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-foreground">
                How can I assist your business today?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ask about customer history, active jobs, technician schedules, revenue metrics, or overdue invoices.
              </p>
            </div>

            {/* Categorized Starters */}
            <div className="w-full space-y-3 pt-2 text-left">
              {CATEGORIZED_PROMPTS.map((cat, idx) => {
                const IconComponent = cat.icon;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <IconComponent className="size-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{cat.category}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {cat.prompts.map((p, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => void send(p.text)}
                          disabled={loading}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-background/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 hover:border-emerald-500/40 text-xs font-medium text-foreground text-left transition-all group cursor-pointer shadow-2xs"
                        >
                          <span className="truncate">{p.label}</span>
                          <ArrowRight className="size-3 text-muted-foreground group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5 shrink-0 ml-1.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-3 text-sm transition-all',
                  msg.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                {/* Assistant Avatar */}
                {msg.role === 'assistant' && (
                  <div className="size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                    <Sparkles className="size-4" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={cn(
                    'max-w-[88%] rounded-2xl p-3.5 space-y-2.5 text-sm shadow-2xs',
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-xs'
                      : msg.failed
                        ? 'bg-destructive/10 border border-destructive/30 text-destructive rounded-tl-xs'
                        : 'bg-muted/70 border border-border/60 text-foreground rounded-tl-xs',
                  )}
                >
                  {/* Tool Call Cards if any */}
                  {msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0 && !msg.failed && (
                    <div className="space-y-1.5 mb-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Wrench className="size-3 text-emerald-500" />
                        <span>Executed Tools ({msg.toolCalls.length})</span>
                      </div>
                      {msg.toolCalls.map((tc, tcIdx) => (
                        <ToolCallCard key={tcIdx} toolCall={tc} />
                      ))}
                    </div>
                  )}

                  {/* Content */}
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : msg.failed ? (
                    <div className="flex items-start gap-2">
                      <CircleAlert className="size-4 text-destructive shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{msg.content}</p>
                    </div>
                  ) : (
                    <RichMarkdown text={msg.content} />
                  )}

                  {/* Dynamic Follow-Up Chips */}
                  {msg.role === 'assistant' && !msg.failed && msg.followUps && msg.followUps.length > 0 && i === messages.length - 1 && (
                    <div className="pt-2 border-t border-border/40 space-y-1.5">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                        Suggested Follow-ups:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.followUps.map((prompt, fIdx) => (
                          <button
                            key={fIdx}
                            type="button"
                            onClick={() => void send(prompt)}
                            disabled={loading}
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-background border border-border/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-500/40 text-foreground transition-all cursor-pointer font-medium"
                          >
                            <Zap className="size-3 text-amber-500 shrink-0" />
                            <span>{prompt}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assistant Footer Toolbar */}
                  {msg.role === 'assistant' && !msg.failed && msg.content && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground">
                      <span>{msg.timestamp || 'Just now'}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn('size-6 hover:text-emerald-600', msg.feedback === 'up' && 'text-emerald-600')}
                          onClick={() => handleFeedback(i, 'up')}
                          title="Helpful response"
                        >
                          <ThumbsUp className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn('size-6 hover:text-destructive', msg.feedback === 'down' && 'text-destructive')}
                          onClick={() => handleFeedback(i, 'down')}
                          title="Not helpful"
                        >
                          <ThumbsDown className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-foreground"
                          onClick={() => handleCopyMessage(msg.content, i)}
                          title="Copy response"
                        >
                          {copiedIndex === i ? (
                            <Check className="size-3 text-emerald-600" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                          <span className="sr-only">Copy</span>
                        </Button>
                        {i === messages.length - 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground hover:text-foreground"
                            onClick={handleRegenerate}
                            title="Regenerate response"
                          >
                            <RotateCcw className="size-3" />
                            <span className="sr-only">Regenerate</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {msg.role === 'user' && (
                  <div className="size-8 rounded-lg bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                    <User className="size-4" />
                  </div>
                )}
              </div>
            ))}

            {/* In-Flight Thinking Indicator */}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5 animate-pulse">
                  <Sparkles className="size-4" />
                </div>
                <div className="rounded-2xl rounded-tl-xs bg-muted/70 border border-border/60 p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin text-emerald-600" />
                    <span>Analyzing business data...</span>
                  </div>
                  <div className="flex gap-1.5 py-1">
                    <span className="size-2 rounded-full bg-emerald-500/70 animate-bounce [animation-delay:0ms]" />
                    <span className="size-2 rounded-full bg-emerald-500/70 animate-bounce [animation-delay:150ms]" />
                    <span className="size-2 rounded-full bg-emerald-500/70 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Input Composer ── */}
      <div className="border-t border-border/70 p-3.5 bg-background shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">
          <div className="relative flex items-end gap-2 rounded-xl border border-border/80 bg-muted/30 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all p-1.5">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about jobs, invoices, customers, schedule..."
              rows={1}
              className="flex-1 max-h-32 min-h-[40px] border-0 bg-transparent resize-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 p-2 shadow-none"
              disabled={loading}
            />

            {/* Voice Input Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'size-8 text-muted-foreground hover:text-foreground shrink-0 mb-1',
                isListening && 'text-red-500 bg-red-50 dark:bg-red-950/40 animate-pulse',
              )}
              onClick={toggleVoiceInput}
              title={isListening ? 'Stop listening' : 'Voice dictation'}
            >
              {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </Button>

            {input.trim() && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground shrink-0 mb-1"
                onClick={() => setInput('')}
                title="Clear input"
              >
                <X className="size-3.5" />
              </Button>
            )}

            <Button
              type="button"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              size="icon"
              className="size-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shrink-0 mb-0.5 shadow-xs"
              title="Send message (Enter)"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CornerDownLeft className="size-3" />
              <span>Press <kbd className="font-mono bg-muted px-1 rounded border border-border/60">Enter ↵</kbd> to send, <kbd className="font-mono bg-muted px-1 rounded border border-border/60">Shift+Enter</kbd> for newline</span>
            </span>
            <span className="flex items-center gap-1">
              <Zap className="size-3 text-emerald-500" />
              Encrypted & Tenant-Isolated
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
