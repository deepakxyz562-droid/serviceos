'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FormSchema, FormField } from '@/lib/forms/form-schema-types';
import { Bot, User, Send, Mic, Sparkles, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ConversationalAgentRuntimeProps {
  schema: FormSchema;
  formName: string;
  formData: Record<string, any>;
  onFieldChange: (fieldId: string, value: any) => void;
  onSubmit: () => Promise<void>;
  submitting?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  fieldId?: string;
}

export function ConversationalAgentRuntime({
  schema,
  formName,
  formData,
  onFieldChange,
  onSubmit,
  submitting = false,
}: ConversationalAgentRuntimeProps) {
  const fields = schema.fields.filter(
    (f) => !['heading', 'paragraph', 'divider'].includes(f.type)
  );

  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initial welcome message — use hasInitialized ref to avoid cascading renders.
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current && messages.length === 0 && fields.length > 0) {
      hasInitialized.current = true;
      const firstField = fields[0];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([
        {
          id: 'msg_welcome',
          sender: 'ai',
          text: `Hi there! 👋 I'm your AI assistant for ${formName}. I'll guide you through a few quick questions. Let's start:`,
        },
        {
          id: `msg_q_0`,
          sender: 'ai',
          text: `${firstField.label} ${firstField.helpText ? `(${firstField.helpText})` : ''}`,
          fieldId: firstField.id,
        },
      ]);
    }
  }, [fields, formName, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputVal.trim() || submitting) return;

    const userText = inputVal.trim();
    const currentField = fields[currentFieldIndex];

    // Save field value
    if (currentField) {
      onFieldChange(currentField.id, userText);
    }

    const nextIndex = currentFieldIndex + 1;
    const updatedMessages: ChatMessage[] = [
      ...messages,
      { id: `user_${Date.now()}`, sender: 'user', text: userText },
    ];

    setInputVal('');

    if (nextIndex < fields.length) {
      setCurrentFieldIndex(nextIndex);
      const nextField = fields[nextIndex];
      updatedMessages.push({
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: `Got it. Next: ${nextField.label} ${nextField.helpText ? `(${nextField.helpText})` : ''}`,
        fieldId: nextField.id,
      });
      setMessages(updatedMessages);
    } else {
      // Completed all fields
      setIsCompleted(true);
      updatedMessages.push({
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: `Awesome! You've answered all the questions. Click "Submit Now" below to finalize your submission. 🎉`,
      });
      setMessages(updatedMessages);
    }
  };

  return (
    <div className="flex flex-col h-[520px] bg-background border border-border/80 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-3.5 bg-muted/40 border-b border-border/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
            <Bot className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>{formName} AI Agent</span>
              <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>
            <p className="text-[10px] text-muted-foreground">Conversational Voice & Chat Assistant</p>
          </div>
        </div>
        <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
          {Math.min(currentFieldIndex, fields.length)} of {fields.length} questions
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'ai' && (
              <div className="size-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="size-3.5" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-none'
                  : 'bg-muted/70 text-foreground border border-border/60 rounded-tl-none'
              }`}
            >
              {msg.text}
            </div>
            {msg.sender === 'user' && (
              <div className="size-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                <User className="size-3.5" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input or Submit CTA */}
      <div className="p-3 bg-muted/20 border-t border-border/80">
        {!isCompleted ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Type your answer here..."
              className="text-xs h-9 bg-background"
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              disabled={!inputVal.trim()}
              className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            >
              <Send className="size-3.5" />
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 gap-2 shadow-sm"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="size-4" /> Submit Form Now
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
