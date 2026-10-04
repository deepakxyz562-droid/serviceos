'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: string;
}

interface AiChatbotEmbedValue {
  botId?: string;
  messages: ChatMessage[];
  integrated: boolean;
  timestamp?: string;
  externalId?: string;
}

export function AiChatbotEmbed({ value, onChange, config, disabled, field }: WidgetProps) {
  const botId = str(config.botId, '');
  const endpoint = str(config.endpoint, '/api/forms/ai/chatbot');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const ariaLabel = str(field?.label, 'AI chatbot');
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const existing = (value as Partial<AiChatbotEmbedValue> | undefined) ?? {};

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pending]);

  useEffect(() => {
    if (botId && !existing.integrated) {
      const next: AiChatbotEmbedValue = {
        botId, messages: [], integrated: true,
        timestamp: new Date().toISOString(),
      };
      onChange(next);
    }
     
  }, [botId]);

  const send = async () => {
    if (!input.trim() || disabled || pending) return;
    const userText = input.trim();
    const userMsg: ChatMessage = { role: 'user', content: userText, ts: new Date().toISOString() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setPending(true);
    setError(null);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: next.map((m) => ({ role: m.role, content: m.content })),
          botId,
          formId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      const reply: string = data.reply || data.message || '';
      const aiMsg: ChatMessage = { role: 'assistant', content: reply, ts: new Date().toISOString() };
      const updated = [...next, aiMsg];
      setMessages(updated);
      onChange({ botId, messages: updated, integrated: true, timestamp: new Date().toISOString() });
    } catch (err: any) {
      setError(err?.message || 'Failed to get a reply. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Bot className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">AI Chatbot</span>
        {botId ? <span className="ml-auto text-[10px] font-mono text-muted-foreground">bot:{botId.slice(0, 6)}</span>
              : <span className="ml-auto text-[10px] text-amber-600">no botId</span>}
      </div>
      <div ref={scrollRef} className="h-44 overflow-y-auto rounded-xl border border-border bg-muted/30 p-2 space-y-1.5">
        {messages.length === 0 && !pending && !error && (
          <div className="h-full flex flex-col items-center justify-center text-center text-[11px] text-muted-foreground">
            <Sparkles className="size-4 mb-1 text-primary" />
            <p>Ask me anything about this form.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-2.5 py-1.5 rounded-2xl text-[11px] ${m.role === 'user'
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-background border border-border rounded-bl-sm'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="bg-background border border-border rounded-2xl rounded-bl-sm px-2.5 py-1.5 flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" />
              <span className="text-[10px] text-muted-foreground">typing…</span>
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-start">
            <div className="max-w-[90%] px-2.5 py-1.5 rounded-2xl rounded-bl-sm text-[11px] bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
              {error}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled || pending}
          placeholder="Type your message…"
          className="h-9 text-xs"
          aria-label="Chat input"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
        />
        <Button type="button" disabled={disabled || pending || !input.trim()} onClick={send}
          className="h-9 px-3 text-xs gap-1 shrink-0">
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Send
        </Button>
      </div>
    </div>
  );
}

export default AiChatbotEmbed;
