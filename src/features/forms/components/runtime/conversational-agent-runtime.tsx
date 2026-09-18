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

  const primaryColor = schema.theme?.primaryColor || schema.theme?.buttonColor || '#059669';
  const borderRadius = schema.theme?.borderRadius || '16px';

  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
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
      setMessages([
        {
          id: 'msg_welcome',
          sender: 'ai',
          text: `Hi there! 👋 I'm your AI assistant for ${formName}. I'll guide you step-by-step through a few quick questions. Let's get started:`,
        },
        {
          id: `msg_q_0`,
          sender: 'ai',
          text: `${firstField.label}${firstField.required ? ' *' : ''} ${firstField.helpText ? `(${firstField.helpText})` : ''}`,
          fieldId: firstField.id,
        },
      ]);
    }
  }, [fields, formName, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : inputVal;
    if (!rawText.trim() || submitting) return;

    const userText = rawText.trim();
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
        text: `Got it! Next: ${nextField.label}${nextField.required ? ' *' : ''} ${nextField.helpText ? `(${nextField.helpText})` : ''}`,
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

  const toggleMic = () => {
    if (!isRecording) {
      setIsRecording(true);
      toast.info('Voice input listening... (Speak your answer)');
      // Simulate voice capture
      setTimeout(() => {
        setIsRecording(false);
      }, 4000);
    } else {
      setIsRecording(false);
    }
  };

  return (
    <div
      className="flex flex-col h-[540px] bg-background border border-border/80 shadow-lg overflow-hidden transition-all"
      style={{ borderRadius }}
    >
      {/* Header */}
      <div className="p-4 bg-muted/40 border-b border-border/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="size-9 rounded-xl text-white flex items-center justify-center shadow-md transition-all"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
            }}
          >
            <Bot className="size-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>{formName} AI Agent</span>
              <span
                className="inline-block size-2 rounded-full animate-pulse"
                style={{ backgroundColor: primaryColor }}
              />
            </h3>
            <p className="text-[10px] text-muted-foreground">Conversational Voice &amp; Chat Assistant</p>
          </div>
        </div>

        {/* Question Counter Badge */}
        <div
          className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs transition-colors"
          style={{
            backgroundColor: `${primaryColor}15`,
            color: primaryColor,
            borderColor: `${primaryColor}40`,
          }}
        >
          {Math.min(currentFieldIndex + 1, Math.max(fields.length, 1))} of {fields.length} questions
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40 dark:bg-slate-950/40">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'ai' && (
              <div
                className="size-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-2xs"
                style={{
                  backgroundColor: `${primaryColor}20`,
                  color: primaryColor,
                }}
              >
                <Sparkles className="size-3.5" />
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs transition-all ${
                msg.sender === 'user'
                  ? 'text-white rounded-tr-none font-medium'
                  : 'bg-card text-foreground border border-border/70 rounded-tl-none'
              }`}
              style={
                msg.sender === 'user'
                  ? { backgroundColor: primaryColor }
                  : undefined
              }
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
      <div className="p-3.5 bg-background border-t border-border/80">
        {!isCompleted ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Type your answer here..."
              className="text-xs h-10 bg-slate-50 dark:bg-slate-900 border-border/80 focus-visible:ring-2 rounded-xl"
              style={{
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                ['--tw-ring-color' as any]: primaryColor,
              }}
              autoFocus
            />

            {/* Mic Toggle Button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleMic}
              className={`size-10 rounded-xl shrink-0 cursor-pointer transition-colors ${
                isRecording ? 'bg-rose-500 text-white border-rose-600 animate-pulse' : 'hover:bg-muted'
              }`}
              title="Speak with voice"
            >
              <Mic className="size-4" />
            </Button>

            {/* Send Button */}
            <Button
              type="submit"
              size="sm"
              disabled={!inputVal.trim()}
              className="h-10 px-4 text-white font-bold rounded-xl shadow-md shrink-0 cursor-pointer transition-opacity"
              style={{
                backgroundColor: primaryColor,
              }}
            >
              <Send className="size-4" />
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="w-full text-white text-xs font-bold h-11 rounded-xl gap-2 shadow-lg cursor-pointer"
            style={{
              backgroundColor: primaryColor,
            }}
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
