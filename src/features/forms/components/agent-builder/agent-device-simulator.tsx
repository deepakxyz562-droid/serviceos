'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Mic,
  FileText,
  History,
  Send,
  Paperclip,
  X,
  Bot,
  Sparkles,
  PhoneCall,
  PhoneOff,
  Volume2,
  VolumeX,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Loader2,
  User,
  RotateCcw,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FormAgentData, ConnectedFormRef } from '@/features/forms/types/agent-types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AgentDeviceSimulatorProps {
  agent: FormAgentData;
  isTestMode?: boolean;
  onOpenFormInModal?: (form: ConnectedFormRef) => void;
  onRestartSession?: () => void;
  onToggleTestMode?: () => void;
}

interface ChatMsg {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  suggestedForm?: ConnectedFormRef;
}

export function AgentDeviceSimulator({
  agent,
  isTestMode = true,
  onOpenFormInModal,
  onRestartSession,
  onToggleTestMode,
}: AgentDeviceSimulatorProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'voice' | 'forms' | 'history'>('chat');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('Speaking with AI Agent...');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize greeting on load
  useEffect(() => {
    setMessages([
      {
        id: 'msg_greet',
        sender: 'ai',
        text: agent.welcomeGreeting || `Hi! I'm **${agent.name}**, your ${agent.roleTitle}. How can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [agent.welcomeGreeting, agent.name, agent.roleTitle]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab, sending]);

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputText).trim();
    if (!message || sending) return;

    const userMsg: ChatMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setSending(true);

    try {
      const res = await fetch(`/api/forms/agents/${agent.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: messages,
          agentConfig: agent,
        }),
      });

      const data = await res.json().catch(() => ({}));
      const matchedForm = data.suggestedFormId
        ? agent.connectedForms?.find((f) => f.id === data.suggestedFormId) || agent.connectedForms?.[0]
        : undefined;

      const aiMsg: ChatMsg = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: data.reply || `Thank you for your message! Based on your loan inquiry, you qualify for our competitive 30-year fixed rate program. Would you like to fill out the pre-qualification form now?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedForm: matchedForm,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_fallback_${Date.now()}`,
          sender: 'ai',
          text: `I'm happy to help you with your ${agent.roleTitle || 'application'}! You can ask questions or fill out our ${agent.connectedForms?.[0]?.name || 'inquiry form'}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedForm: agent.connectedForms?.[0],
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleQuickActionClick = (action: any) => {
    if (action.actionType === 'open_form') {
      const form = agent.connectedForms?.find((f) => f.id === action.payload) || agent.connectedForms?.[0];
      if (form) {
        onOpenFormInModal?.(form);
        setActiveTab('forms');
      } else {
        handleSendMessage(action.label);
      }
    } else {
      handleSendMessage(action.payload || action.label);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: 'msg_greet',
        sender: 'ai',
        text: agent.welcomeGreeting || `Hi! I'm **${agent.name}**, your ${agent.roleTitle}. How can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    toast.success('Conversation reset');
    onRestartSession?.();
  };

  const brandColor = agent.brandColor || '#0284c7';
  const chatBg = agent.style?.chatBg || '#ffffff';
  const fontFamily = agent.style?.fontFamily || 'Plus Jakarta Sans';

  return (
    <div
      className="flex flex-col h-full w-full rounded-[24px] overflow-hidden shadow-2xl border border-border/80 text-foreground transition-all select-none relative"
      style={{
        fontFamily,
        background: chatBg,
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          1. TOP AGENT BAR (AVATAR HERO + STATUS + AI BADGE)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className="px-4 py-3 flex items-center justify-between text-white shrink-0 shadow-xs z-10"
        style={{
          background: `linear-gradient(135deg, ${brandColor}, ${brandColor}ee)`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img
              src={agent.avatarUrl}
              alt={agent.name}
              className="size-9 rounded-full object-cover border-2 border-white/80 shadow-xs"
            />
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-bold leading-none tracking-tight">{agent.name}</h2>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white leading-none">
                AI
              </span>
            </div>
            <p className="text-[10px] text-white/80 mt-0.5 leading-none">{agent.roleTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={resetChat}
            title="Restart Session"
            className="size-7 rounded-full text-white/80 hover:text-white hover:bg-white/10"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          2. MAIN ACTIVE VIEWPORT CONTENT
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto min-h-0 relative flex flex-col">
        {/* ── A. CHAT TAB ── */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col justify-between p-4 space-y-4">
            <div className="space-y-4">
              {/* Agent Hero Welcome Card */}
              {messages.length <= 1 && (
                <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-gradient-to-b from-blue-50/50 via-slate-50/30 to-transparent dark:from-blue-950/20 dark:via-slate-900/10 border border-blue-500/10 shadow-2xs my-1">
                  <div className="relative mb-2">
                    <img
                      src={agent.avatarUrl}
                      alt={agent.name}
                      className="size-16 rounded-full object-cover border-2 border-white shadow-md ring-4 ring-blue-500/20"
                    />
                    <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold border-2 border-white">
                      ✓
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    {agent.name}
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      AI Guide
                    </Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                    {agent.greetingSubtitle || 'Get immediate loan estimates, check eligibility, or complete your application.'}
                  </p>

                  {/* Multi-choice Quick Action Chips */}
                  <div className="flex flex-wrap gap-1.5 justify-center mt-4 w-full">
                    {(agent.quickActions || []).map((qa) => (
                      <button
                        key={qa.id}
                        type="button"
                        onClick={() => handleQuickActionClick(qa)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-background border border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all shadow-2xs hover:scale-[1.02] flex items-center gap-1"
                      >
                        <Sparkles className="size-3 shrink-0" />
                        <span>{qa.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Message Stream */}
              {messages.map((msg) => {
                const isAi = msg.sender === 'ai';
                return (
                  <div
                    key={msg.id}
                    className={cn('flex items-start gap-2 max-w-[88%]', isAi ? 'mr-auto' : 'ml-auto flex-row-reverse')}
                  >
                    {isAi && (
                      <img
                        src={agent.avatarUrl}
                        alt={agent.name}
                        className="size-7 rounded-full object-cover border shrink-0 mt-0.5 shadow-2xs"
                      />
                    )}

                    <div className="space-y-1">
                      <div
                        className={cn(
                          'p-3 rounded-2xl text-xs leading-relaxed shadow-2xs break-words',
                          isAi
                            ? 'bg-slate-100 dark:bg-slate-800 text-foreground rounded-tl-xs'
                            : 'bg-blue-600 text-white rounded-tr-xs font-medium'
                        )}
                      >
                        {msg.text.split('**').map((chunk, i) =>
                          i % 2 === 1 ? <strong key={i} className="font-bold">{chunk}</strong> : chunk
                        )}

                        {/* Connected Form Embedded Suggestion */}
                        {msg.suggestedForm && (
                          <div className="mt-2.5 pt-2 border-t border-border/40">
                            <button
                              type="button"
                              onClick={() => {
                                onOpenFormInModal?.(msg.suggestedForm!);
                                setActiveTab('forms');
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-xl bg-background text-foreground border border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all text-left"
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <FileText className="size-3.5 text-blue-600 shrink-0" />
                                <span className="text-[11px] font-bold truncate">{msg.suggestedForm.name}</span>
                              </div>
                              <ArrowRight className="size-3 text-blue-600 shrink-0" />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className={cn('text-[9px] text-muted-foreground px-1', !isAi && 'text-right')}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {sending && (
                <div className="flex items-center gap-2 mr-auto">
                  <img
                    src={agent.avatarUrl}
                    alt={agent.name}
                    className="size-7 rounded-full object-cover border shrink-0"
                  />
                  <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs flex items-center gap-1.5 shadow-2xs">
                    <span className="size-1.5 rounded-full bg-blue-600 animate-bounce" />
                    <span className="size-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="size-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* ── B. VOICE TAB ── */}
        {activeTab === 'voice' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 bg-gradient-to-b from-blue-950/20 to-slate-900/40">
            <div className="relative">
              <img
                src={agent.avatarUrl}
                alt={agent.name}
                className="size-24 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-2xl"
              />
              {isCalling && (
                <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-ping opacity-30" />
              )}
            </div>

            <div>
              <h3 className="text-base font-bold text-foreground">{agent.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isCalling ? 'Live Real-time Voice Streaming' : 'Ready to begin conversational voice call'}
              </p>
            </div>

            {/* Waveform Frequency Visualizer */}
            {isCalling && (
              <div className="flex items-center gap-1 h-8">
                {[12, 24, 36, 18, 30, 42, 20, 32, 16, 28, 40, 14, 22].map((height, idx) => (
                  <div
                    key={idx}
                    className="w-1 bg-blue-500 rounded-full animate-pulse"
                    style={{
                      height: `${height}px`,
                      animationDuration: `${0.6 + (idx % 4) * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <Button
                type="button"
                variant={isCalling ? 'destructive' : 'default'}
                size="lg"
                onClick={() => {
                  setIsCalling(!isCalling);
                  toast(isCalling ? 'Call ended' : 'Voice session connected');
                }}
                className={cn('rounded-full size-14 shadow-lg font-bold gap-2', !isCalling && 'bg-blue-600 hover:bg-blue-700')}
              >
                {isCalling ? <PhoneOff className="size-6" /> : <PhoneCall className="size-6" />}
              </Button>

              {isCalling && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                  className="rounded-full size-11 border-border/80"
                >
                  {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── C. FORMS TAB ── */}
        {activeTab === 'forms' && (
          <div className="flex-1 p-4 space-y-3">
            <div>
              <h4 className="text-xs font-bold text-foreground">Connected AI Forms</h4>
              <p className="text-[11px] text-muted-foreground">Select a form to fill with AI guidance.</p>
            </div>

            <div className="space-y-2.5">
              {(agent.connectedForms || []).map((form) => (
                <div
                  key={form.id}
                  onClick={() => onOpenFormInModal?.(form)}
                  className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-blue-500 cursor-pointer transition-all shadow-2xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">
                      <FileText className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{form.name}</p>
                      <p className="text-[10px] text-muted-foreground">{form.description || 'Guided auto-fill enabled'}</p>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs font-bold text-blue-600 gap-1">
                    Fill <ArrowRight className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── D. HISTORY TAB ── */}
        {activeTab === 'history' && (
          <div className="flex-1 p-4 space-y-3">
            <div>
              <h4 className="text-xs font-bold text-foreground">Conversation History</h4>
              <p className="text-[11px] text-muted-foreground">Review transcripts and qualification audits.</p>
            </div>

            <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-foreground">Session #{agent.metrics?.totalConversations || 1}</span>
                <span className="text-muted-foreground">Today, {new Date().toLocaleDateString()}</span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                &quot;{messages[messages.length - 1]?.text || 'Loan inquiry session initiated'}&quot;
              </p>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-50/50">
                ✓ Lead Captured
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          3. BOTTOM INPUT BAR (CLIP + 4000 CHAR COUNTER + VOICE WAVE + SEND)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'chat' && (
        <div className="p-3 border-t border-border/70 bg-background/95 backdrop-blur shrink-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title="Attach File"
            >
              <Paperclip className="size-4" />
            </button>

            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSendMessage())}
              placeholder="Type your message here..."
              maxLength={4000}
              className="text-xs h-9 flex-1 bg-muted/30 rounded-xl"
            />

            {/* Voice Wave Button */}
            <button
              type="button"
              onClick={() => setActiveTab('voice')}
              className="px-2 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors text-xs font-bold flex items-center gap-1 shrink-0"
              title="Switch to Voice Call"
            >
              <Mic className="size-3.5" />
              <span className="hidden sm:inline text-[11px]">Voice</span>
            </button>

            {/* Send Button */}
            <Button
              type="button"
              disabled={!inputText.trim() || sending}
              onClick={() => handleSendMessage()}
              size="icon"
              className="size-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-xs"
            >
              <Send className="size-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground">
            <span>Powered by Fieseros AI</span>
            <span>{inputText.length}/4000</span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          4. FOOTER SUB-TABS (CHAT | VOICE | FORMS | HISTORY)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="h-12 border-t border-border/80 bg-muted/40 grid grid-cols-4 shrink-0 px-2">
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={cn(
            'flex flex-col items-center justify-center text-[10px] font-bold transition-all gap-0.5',
            activeTab === 'chat' ? 'text-blue-600 border-t-2 border-blue-600' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <MessageSquare className="size-3.5" />
          <span>Chat</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('voice')}
          className={cn(
            'flex flex-col items-center justify-center text-[10px] font-bold transition-all gap-0.5',
            activeTab === 'voice' ? 'text-blue-600 border-t-2 border-blue-600' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Mic className="size-3.5" />
          <span>Voice</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('forms')}
          className={cn(
            'flex flex-col items-center justify-center text-[10px] font-bold transition-all gap-0.5',
            activeTab === 'forms' ? 'text-blue-600 border-t-2 border-blue-600' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <FileText className="size-3.5" />
          <span>Forms</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={cn(
            'flex flex-col items-center justify-center text-[10px] font-bold transition-all gap-0.5',
            activeTab === 'history' ? 'text-blue-600 border-t-2 border-blue-600' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <History className="size-3.5" />
          <span>History</span>
        </button>
      </div>
    </div>
  );
}
