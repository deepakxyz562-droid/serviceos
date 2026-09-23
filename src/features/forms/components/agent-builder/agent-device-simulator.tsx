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
  MonitorPlay,
  Brain,
  Presentation,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FormAgentData, ConnectedFormRef } from '@/features/forms/types/agent-types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AgentDeviceSimulatorProps {
  agent: FormAgentData;
  isTestMode?: boolean;
  previewPage?: 'conversation' | 'greeting';
  onOpenFormInModal?: (form: ConnectedFormRef) => void;
  onRestartSession?: () => void;
  onToggleTestMode?: () => void;
  onSwitchPage?: (page: 'conversation' | 'greeting') => void;
}

interface ChatMsg {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  suggestedForm?: ConnectedFormRef;
}

function isColorDark(colorStr?: string): boolean {
  if (!colorStr) return false;
  const hex = colorStr.replace('#', '').trim();
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 145;
  }
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 145;
  }
  return false;
}

export function AgentDeviceSimulator({
  agent,
  isTestMode = true,
  previewPage = 'conversation',
  onOpenFormInModal,
  onRestartSession,
  onToggleTestMode,
  onSwitchPage,
}: AgentDeviceSimulatorProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'voice' | 'forms' | 'history' | 'presentation' | 'whatsapp'>('chat');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [screenSharingActive, setScreenSharingActive] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [activeFormModal, setActiveFormModal] = useState<ConnectedFormRef | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize greeting on load
  useEffect(() => {
    setMessages([
      {
        id: 'msg_greet',
        sender: 'ai',
        text: agent.welcomeGreeting || `Hi! I'm **${agent.name}**, your **AI Agent** and **${agent.roleTitle}**. How can I help you?`,
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

    // ─── TEST MODE: never hit the real chat API ──────────────────────────
    // In the studio's preview viewport, the agent may not be saved yet, and
    // we don't want to consume AI credits for a preview. Return a friendly
    // simulated reply that surfaces the connected form (if any) so the user
    // can verify the "Fill Form" handoff works end-to-end.
    if (isTestMode) {
      try {
        await new Promise((r) => setTimeout(r, 500)); // brief thinking delay
        const connectedForm = agent.connectedForms?.[0];
        const aiMsg: ChatMsg = {
          id: `ai_sim_${Date.now()}`,
          sender: 'ai',
          text: `Great question! In test mode I can't reach the live AI, but here's how I'd help: I can answer questions about ${agent.roleTitle || 'your inquiry'}, or you can fill out the connected form and I'll guide you through it.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedForm: connectedForm,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } finally {
        setSending(false);
      }
      return;
    }

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
        text: data.reply || `Thank you for asking! Based on your inquiry, I'm ready to assist you. Would you like to fill out our form to proceed?`,
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
    if (onSwitchPage && previewPage === 'greeting') {
      onSwitchPage('conversation');
    }
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
        text: agent.welcomeGreeting || `Hi! I'm **${agent.name}**, your **AI Agent** and **${agent.roleTitle}**. How can I help you?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    toast.success('Conversation reset');
    onRestartSession?.();
  };

  const brandColor = agent.brandColor || '#0284c7';
  const chatBg = agent.style?.chatBg || '#ffffff';
  const isDark = agent.style?.isDark ?? isColorDark(chatBg);
  const titleColor = agent.style?.titleColor || (isDark ? '#ffffff' : '#0A1551');
  const isSidebarLayout = agent.channels?.chatbot?.layoutMode === 'sidebar';
  const allowFileUpload = agent.settings?.fileUploadEnabled ?? true;
  const allowScreenShare = agent.settings?.allowScreenSharing ?? false;
  const memoryActive = agent.settings?.memoryEnabled ?? true;
  const welcomeStyle = agent.channels?.chatbot?.welcomeStyle || 'quick_input';
  const greetingToggle = agent.channels?.chatbot?.greetingToggle ?? true;
  const placeholderMessage = agent.channels?.chatbot?.placeholderMessage || 'Ask AI';
  const greetingBubble = agent.channels?.chatbot?.greetingBubble || `👋 Need help? Chat with ${agent.name}!`;

  // Compute active navigation items
  const navItems = [
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare, enabled: agent.navigation?.chatEnabled ?? true },
    { id: 'voice' as const, label: 'Voice', icon: Mic, enabled: agent.navigation?.voiceEnabled ?? true },
    { id: 'whatsapp' as const, label: 'WhatsApp', icon: MessageCircle, enabled: agent.navigation?.whatsappEnabled ?? false },
    { id: 'forms' as const, label: 'Forms', icon: FileText, enabled: agent.navigation?.formsEnabled ?? true },
    { id: 'presentation' as const, label: 'Presentation', icon: Presentation, enabled: agent.navigation?.presentationEnabled ?? false },
    { id: 'history' as const, label: 'History', icon: History, enabled: agent.navigation?.historyEnabled ?? true },
  ].filter((item) => item.enabled);

  // ═════════════════════════════════════════════════════════════════════════
  // VIEW 1: GREETING / WELCOME PAGE (Screenshots 4 & Minimized Launcher)
  // ═════════════════════════════════════════════════════════════════════════
  if (previewPage === 'greeting') {
    return (
      <div className={cn('flex flex-col justify-end h-full w-full p-4 items-center sm:items-end', isDark && 'dark')}>
        {welcomeStyle === 'avatar' ? (
          /* ── AVATAR CIRCLE LAUNCHER STYLE ── */
          <div className="flex flex-col items-end gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {greetingToggle && (
              <div
                onClick={() => onSwitchPage?.('conversation')}
                className={cn(
                  'px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-semibold cursor-pointer max-w-[260px] leading-snug hover:scale-105 transition-transform',
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-slate-950/50'
                    : 'bg-white border-slate-200 text-slate-800'
                )}
              >
                {greetingBubble}
              </div>
            )}
            <button
              type="button"
              onClick={() => onSwitchPage?.('conversation')}
              className="relative size-16 rounded-full shadow-2xl p-0.5 border-2 border-white hover:scale-110 transition-transform cursor-pointer"
              style={{ background: brandColor }}
            >
              <img
                src={agent.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'}
                alt={agent.name}
                className="size-full rounded-full object-cover"
              />
              <span className="absolute bottom-0 right-0 size-4 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
            </button>
          </div>
        ) : (
          /* ── QUICK INPUT CARD LAUNCHER STYLE ── */
          <div
            className={cn(
              'w-full max-w-[340px] rounded-3xl p-5 shadow-2xl border space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300',
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/50'
                : 'bg-white border-slate-200/80 text-slate-900'
            )}
          >
            {greetingToggle && (
              <p className={cn('text-xs leading-relaxed font-medium', isDark ? 'text-slate-100' : 'text-slate-800')}>
                Hi! I&apos;m <strong className="font-bold text-blue-500">{agent.name}</strong>, your <strong className="font-bold">AI Agent</strong> and <strong className="font-bold">{agent.roleTitle}</strong>. How can I help you?
              </p>
            )}

            {(agent.channels?.chatbot?.showButtons ?? true) && (agent.quickActions || []).length > 0 && (
              <div className="space-y-2">
                {(agent.quickActions || []).slice(0, 3).map((qa) => (
                  <button
                    key={qa.id}
                    type="button"
                    onClick={() => handleQuickActionClick(qa)}
                    className={cn(
                      'w-full py-2 px-4 rounded-xl border text-xs font-semibold text-center transition-all shadow-2xs',
                      isDark
                        ? 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-100 hover:border-slate-500'
                        : 'bg-slate-50/50 hover:bg-blue-50/50 border-slate-300 hover:border-blue-500 text-slate-800'
                    )}
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            )}

            <div className={cn('flex items-center gap-2 pt-1 border-t', isDark ? 'border-slate-800' : 'border-slate-100')}>
              <div
                onClick={() => onSwitchPage?.('conversation')}
                className={cn(
                  'flex items-center gap-2 flex-1 rounded-full px-3 py-1.5 cursor-pointer transition-all border',
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200'
                    : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700'
                )}
              >
                <img
                  src={agent.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'}
                  alt={agent.name}
                  className="size-5 rounded-full object-cover shrink-0"
                />
                <span className={cn('text-xs font-medium', isDark ? 'text-slate-300' : 'text-slate-500')}>
                  {placeholderMessage}
                </span>
              </div>

              {(agent.navigation?.voiceEnabled ?? true) && (
                <button
                  type="button"
                  onClick={() => {
                    onSwitchPage?.('conversation');
                    setActiveTab('voice');
                  }}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-md transition-all shrink-0',
                    isDark
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  )}
                >
                  <Mic className="size-3.5" />
                  <span>Voice</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VIEW 2: CONVERSATION PAGE (Full Interactive Simulation)
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div
      className={cn(
        'flex flex-col h-full w-full overflow-hidden shadow-2xl border transition-all select-none relative',
        isDark ? 'dark border-slate-800 text-slate-100' : 'border-slate-200/80 text-slate-900',
        isSidebarLayout ? 'rounded-none border-y-0 h-full' : 'rounded-[28px]'
      )}
      style={{
        backgroundColor: chatBg,
      }}
    >
      {/* ── TOP AGENT BAR ── */}
      <div
        className="px-4 py-3 flex items-center justify-between text-white shrink-0 shadow-xs z-10"
        style={{
          background: `linear-gradient(135deg, ${brandColor}, ${brandColor}ee)`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img
              src={agent.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'}
              alt={agent.name}
              className="size-9 rounded-full object-cover border-2 border-white/80 shadow-xs"
            />
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-bold leading-none tracking-tight" style={{ color: titleColor }}>
                {agent.name}
              </h2>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white leading-none">
                AI
              </span>
              {memoryActive && (
                <span className="text-[8px] font-semibold px-1 rounded bg-black/20 text-white/90 flex items-center gap-0.5" title="Agent remembers context">
                  <Brain className="size-2.5" /> Memory
                </span>
              )}
            </div>
            <p className="text-[10px] text-white/85 mt-0.5 leading-none">{agent.roleTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {allowScreenShare && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setScreenSharingActive(!screenSharingActive);
                toast(screenSharingActive ? 'Screen sharing stopped' : 'Screen sharing active for visual guidance');
              }}
              title="Screen Sharing Visual Guidance"
              className={cn(
                'size-7 rounded-full text-white/80 hover:text-white',
                screenSharingActive ? 'bg-emerald-500 text-white' : 'hover:bg-white/10'
              )}
            >
              <MonitorPlay className="size-3.5" />
            </Button>
          )}

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

          {onSwitchPage && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onSwitchPage('greeting')}
              title="Minimize Chat"
              className="size-7 rounded-full text-white/80 hover:text-white hover:bg-white/10"
            >
              <ChevronDown className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ── TAB 1: CHAT TAB CONTENT ── */}
      {activeTab === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto min-h-0 relative flex flex-col p-4 space-y-4">
            {/* Welcome Text + Action Buttons Card */}
            {messages.length <= 1 && (
              <div className="space-y-3 pt-1">
                <p className={cn('text-xs leading-relaxed font-semibold', isDark ? 'text-slate-100' : 'text-slate-800')}>
                  Hi! I&apos;m <strong className="font-bold text-blue-400">{agent.name}</strong>, your <strong className="font-bold">AI Agent</strong> and <strong className="font-bold">{agent.roleTitle}</strong>. How can I help you?
                </p>

                {(agent.channels?.chatbot?.showButtons ?? true) && (
                  <div className="flex flex-wrap gap-2">
                    {(agent.quickActions || []).map((qa) => (
                      <button
                        key={qa.id}
                        type="button"
                        onClick={() => handleQuickActionClick(qa)}
                        className={cn(
                          'py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all shadow-2xs',
                          isDark
                            ? 'bg-slate-800/90 border-slate-700 text-slate-100 hover:bg-slate-700 hover:border-slate-500'
                            : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-blue-50 hover:border-blue-400'
                        )}
                      >
                        {qa.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Messages Stream */}
            {messages.slice(1).map((msg) => {
              const isAi = msg.sender === 'ai';
              return (
                <div
                  key={msg.id}
                  className={cn('flex items-start gap-2 max-w-[88%]', isAi ? 'mr-auto' : 'ml-auto flex-row-reverse')}
                >
                  {isAi && (
                    <img
                      src={agent.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'}
                      alt={agent.name}
                      className="size-6 rounded-full object-cover shrink-0 mt-0.5"
                    />
                  )}

                  <div className="space-y-1.5">
                    <div
                      className={cn(
                        'p-3 rounded-2xl text-xs leading-relaxed shadow-2xs break-words font-medium',
                        isAi
                          ? isDark
                            ? 'bg-slate-800/95 border border-slate-700/80 text-slate-100 rounded-tl-xs shadow-slate-950/40'
                            : 'bg-slate-100 border border-slate-200/60 text-slate-900 rounded-tl-xs'
                          : 'text-white rounded-tr-xs shadow-sm'
                      )}
                      style={!isAi ? { background: brandColor } : undefined}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>

                    {/* Connected Form Recommendation Card */}
                    {msg.suggestedForm && (
                      <div
                        className={cn(
                          'p-3 rounded-xl border space-y-2',
                          isDark
                            ? 'bg-slate-800/90 border-slate-700'
                            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/80'
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <FileText className="size-3.5 text-blue-400" />
                          <span className={cn('text-[11px] font-bold', isDark ? 'text-blue-300' : 'text-blue-900')}>
                            {msg.suggestedForm.name}
                          </span>
                        </div>
                        <p className={cn('text-[10px]', isDark ? 'text-slate-300' : 'text-slate-600')}>
                          {msg.suggestedForm.description || 'Complete this form to submit your inquiry.'}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setActiveFormModal(msg.suggestedForm!);
                            onOpenFormInModal?.(msg.suggestedForm!);
                          }}
                          className="w-full h-7 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1 shadow-xs"
                        >
                          Open &amp; Fill Form <ArrowRight className="size-3" />
                        </Button>
                      </div>
                    )}

                    <span className={cn('text-[9px] block px-1', isDark ? 'text-slate-400' : 'text-slate-500')}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex items-center gap-2 mr-auto">
                <img
                  src={agent.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'}
                  alt={agent.name}
                  className="size-6 rounded-full object-cover shrink-0"
                />
                <div className={cn(
                  'p-3 rounded-2xl text-xs flex items-center gap-1.5 shadow-2xs',
                  isDark ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-slate-100 text-slate-800'
                )}>
                  <span className="size-1.5 rounded-full bg-blue-500 animate-bounce" />
                  <span className="size-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="size-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── BOTTOM INPUT BAR ── */}
          <div
            className={cn(
              'p-3 border-t shrink-0',
              isDark ? 'bg-slate-900/95 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            )}
          >
            <div
              className={cn(
                'flex items-center gap-2 rounded-2xl px-3 py-1.5 border',
                isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-100/90 border-slate-200'
              )}
            >
              {allowFileUpload && (
                <button
                  type="button"
                  className={cn(
                    'p-0.5 transition-colors',
                    isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-700'
                  )}
                >
                  <Paperclip className="size-4" />
                </button>
              )}

              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSendMessage())}
                placeholder={placeholderMessage}
                className={cn(
                  'text-xs h-7 flex-1 bg-transparent border-0 focus-visible:ring-0 shadow-none px-1',
                  isDark ? 'text-slate-100 placeholder:text-slate-400' : 'text-slate-900 placeholder:text-slate-500'
                )}
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                style={{ background: brandColor }}
                className="size-7 rounded-full text-white flex items-center justify-center shrink-0 shadow-xs hover:opacity-90 transition-opacity"
              >
                <Send className="size-3.5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── TAB 2: VOICE TAB CONTENT ── */}
      {activeTab === 'voice' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 text-center">
          <div className="relative">
            <img
              src={agent.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'}
              alt={agent.name}
              className="size-24 rounded-full object-cover border-4 border-white shadow-2xl"
            />
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-ping opacity-25" />
          </div>

          <div className="space-y-1">
            <h3 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>{agent.name}</h3>
            <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>Voice Assistant • {agent.voiceTone} tone</p>
          </div>

          {/* Animated Waveform Visualizer */}
          <div className="flex items-center gap-1.5 h-10">
            {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 35, 65].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-blue-500 rounded-full animate-pulse"
                style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Button
              type="button"
              size="icon"
              variant={isMuted ? 'destructive' : 'outline'}
              onClick={() => setIsMuted(!isMuted)}
              className={cn('size-11 rounded-full shadow-md', isDark && 'border-slate-700 bg-slate-800 text-slate-100')}
            >
              {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </Button>

            <Button
              type="button"
              size="icon"
              onClick={() => {
                setIsCalling(!isCalling);
                toast(isCalling ? 'Call ended' : 'Voice session connected');
              }}
              className={cn(
                'size-14 rounded-full text-white shadow-xl transition-transform hover:scale-105',
                isCalling ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              )}
            >
              {isCalling ? <PhoneOff className="size-6" /> : <PhoneCall className="size-6" />}
            </Button>
          </div>
        </div>
      )}

      {/* ── TAB 3: FORMS TAB CONTENT ── */}
      {activeTab === 'forms' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="space-y-1">
            <h3 className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-slate-900')}>Connected Forms</h3>
            <p className={cn('text-[11px]', isDark ? 'text-slate-400' : 'text-slate-500')}>
              Select a form to fill out with AI guidance.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            {(agent.connectedForms || [
              { id: 'form_1', name: 'Service & Loan Application Form', description: 'Pre-qualification and documentation' },
            ]).map((form) => (
              <div
                key={form.id}
                className={cn(
                  'p-3 rounded-2xl border flex items-center justify-between',
                  isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-100 border-slate-200'
                )}
              >
                <div className="space-y-0.5">
                  <p className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-slate-900')}>{form.name}</p>
                  <p className={cn('text-[10px] line-clamp-1', isDark ? 'text-slate-400' : 'text-slate-500')}>{form.description}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setActiveFormModal(form);
                    onOpenFormInModal?.(form);
                  }}
                  className="h-7 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Fill Form
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: PRESENTATION TAB CONTENT ── */}
      {activeTab === 'presentation' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-center">
          <div className={cn(
            'p-4 rounded-2xl border space-y-2',
            isDark ? 'bg-indigo-950/30 border-indigo-800/60' : 'bg-indigo-50 border-indigo-200'
          )}>
            <Presentation className="size-8 text-indigo-400 mx-auto" />
            <h3 className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-slate-900')}>Interactive AI Presentation</h3>
            <p className={cn('text-[11px]', isDark ? 'text-slate-300' : 'text-slate-600')}>
              {agent.name} is ready to present your services with slides and voice walkthrough.
            </p>
            <Button size="sm" className="h-7 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white mt-2">
              Start Presentation
            </Button>
          </div>
        </div>
      )}

      {/* ── TAB 5: WHATSAPP TAB CONTENT ── */}
      {activeTab === 'whatsapp' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-center">
          <div className={cn(
            'p-5 rounded-2xl border space-y-3',
            isDark ? 'bg-emerald-950/30 border-emerald-800/60' : 'bg-emerald-50 border-emerald-200'
          )}>
            <div className="size-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
              <MessageCircle className="size-6" />
            </div>
            <div>
              <h3 className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-slate-900')}>WhatsApp Business Integration</h3>
              <p className={cn('text-[11px] mt-0.5', isDark ? 'text-slate-300' : 'text-slate-600')}>
                {agent.channels?.whatsapp?.phoneNumber
                  ? `Connected: ${agent.channels.whatsapp.phoneNumber}`
                  : 'Configure your WhatsApp number in settings.'}
              </p>
            </div>
            {agent.channels?.whatsapp?.phoneNumber ? (
              <a
                href={`https://wa.me/${agent.channels.whatsapp.phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  agent.channels.whatsapp.welcomeTemplate || `Hi! I would like to chat with ${agent.name}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 w-full h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors"
              >
                Open WhatsApp Chat <ExternalLink className="size-3" />
              </a>
            ) : (
              <p className="text-[10px] text-amber-400 font-medium">
                Enter your WhatsApp number in the Chatbot Navigation settings.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 6: HISTORY TAB CONTENT ── */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h3 className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-slate-900')}>Conversation History</h3>
          <div className={cn('p-3 rounded-2xl border space-y-1', isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-100 border-slate-200')}>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Today, Session #1</span>
              <span>{messages.length} messages</span>
            </div>
            <p className={cn('text-xs font-medium line-clamp-2', isDark ? 'text-slate-200' : 'text-slate-800')}>
              {messages[messages.length - 1]?.text || 'No previous messages.'}
            </p>
          </div>
        </div>
      )}

      {/* ── DYNAMIC FOOTER SUB-TABS (CHAT | VOICE | WHATSAPP | FORMS | PRESENTATION | HISTORY) ── */}
      {navItems.length > 0 && (
        <div
          className={cn(
            'h-12 border-t shrink-0 px-1 flex items-center justify-around',
            isDark ? 'bg-slate-900/95 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
          )}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center text-[10px] font-bold gap-0.5 px-2 py-1 rounded-lg transition-colors',
                  isSelected
                    ? isDark
                      ? 'text-blue-400'
                      : 'text-blue-600'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <Icon className="size-3.5" />
                <span className="truncate max-w-[54px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div
        className={cn(
          'py-1 text-center text-[9px] border-t shrink-0',
          isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
        )}
      >
        Powered by <strong className={cn('font-bold', isDark ? 'text-slate-200' : 'text-slate-700')}>Fieseros AI</strong>
      </div>

      {/* ── IN-CHAT CONNECTED FORM MODAL OVERLAY (JotForm AI Agent Style) ── */}
      {activeFormModal && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/40 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-blue-600" />
              <div>
                <h3 className="text-xs font-bold text-foreground line-clamp-1">{activeFormModal.name}</h3>
                <p className="text-[10px] text-muted-foreground line-clamp-1">{activeFormModal.description || 'Fill and submit to complete inquiry'}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setActiveFormModal(null)}
              className="size-7 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex-1 min-h-0 w-full overflow-y-auto p-2">
            <iframe
              src={`/form/${encodeURIComponent(activeFormModal.id)}`}
              title={activeFormModal.name}
              className="w-full h-full min-h-[440px] border-0 rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
