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
  const startBg = agent.style?.agentBackgroundStart || '#C5E3FA';
  const endBg = agent.style?.agentBackgroundEnd || '#D6E1E7';
  const titleColor = agent.style?.titleColor || '#0A1551';
  const chatBg = agent.style?.chatBg || '#ffffff';
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
      <div className="flex flex-col justify-end h-full w-full p-4 items-center sm:items-end">
        {welcomeStyle === 'avatar' ? (
          /* ── AVATAR CIRCLE LAUNCHER STYLE ── */
          <div className="flex flex-col items-end gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {greetingToggle && (
              <div
                onClick={() => onSwitchPage?.('conversation')}
                className="bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 font-semibold cursor-pointer max-w-[260px] leading-snug hover:scale-105 transition-transform"
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
          <div className="w-full max-w-[340px] bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {greetingToggle && (
              <p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed">
                Hi! I&apos;m <strong className="font-bold">{agent.name}</strong>, your <strong className="font-bold">AI Agent</strong> and <strong className="font-bold">{agent.roleTitle}</strong>. How can I help you?
              </p>
            )}

            {(agent.channels?.chatbot?.showButtons ?? true) && (agent.quickActions || []).length > 0 && (
              <div className="space-y-2">
                {(agent.quickActions || []).slice(0, 3).map((qa) => (
                  <button
                    key={qa.id}
                    type="button"
                    onClick={() => handleQuickActionClick(qa)}
                    className="w-full py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800 hover:bg-blue-50/50 text-xs font-semibold text-slate-800 dark:text-slate-100 text-center transition-all shadow-2xs"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div
                onClick={() => onSwitchPage?.('conversation')}
                className="flex items-center gap-2 flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 rounded-full px-3 py-1.5 cursor-pointer transition-all border border-slate-200 dark:border-slate-700"
              >
                <img
                  src={agent.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'}
                  alt={agent.name}
                  className="size-5 rounded-full object-cover shrink-0"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
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
                  className="px-3.5 py-1.5 rounded-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1 shadow-md transition-all shrink-0"
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
        'flex flex-col h-full w-full overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-all select-none relative',
        isSidebarLayout ? 'rounded-none border-y-0 h-full' : 'rounded-[28px]'
      )}
      style={{
        background: chatBg,
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
              <h2 className="text-xs font-bold leading-none tracking-tight" style={{ color: titleColor === '#0A1551' ? '#ffffff' : titleColor }}>
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
            <p className="text-[10px] text-white/80 mt-0.5 leading-none">{agent.roleTitle}</p>
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
        </div>
      </div>

      {/* ── TAB 1: CHAT TAB CONTENT ── */}
      {activeTab === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto min-h-0 relative flex flex-col p-4 space-y-4">
            {/* Welcome Text + Action Buttons Card */}
            {messages.length <= 1 && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  Hi! I&apos;m <strong className="font-bold">{agent.name}</strong>, your <strong className="font-bold">AI Agent</strong> and <strong className="font-bold">{agent.roleTitle}</strong>. How can I help you?
                </p>

                {(agent.channels?.chatbot?.showButtons ?? true) && (
                  <div className="flex flex-wrap gap-2">
                    {(agent.quickActions || []).map((qa) => (
                      <button
                        key={qa.id}
                        type="button"
                        onClick={() => handleQuickActionClick(qa)}
                        className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-all shadow-2xs"
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
                        'p-3 rounded-2xl text-xs leading-relaxed shadow-2xs break-words',
                        isAi
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                          : 'bg-blue-600 text-white rounded-tr-xs'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>

                    {/* Connected Form Recommendation Card */}
                    {msg.suggestedForm && (
                      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-800/80 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <FileText className="size-3.5 text-blue-600" />
                          <span className="text-[11px] font-bold text-blue-900 dark:text-blue-200">
                            {msg.suggestedForm.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400">
                          {msg.suggestedForm.description || 'Complete this form to submit your inquiry.'}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onOpenFormInModal?.(msg.suggestedForm!)}
                          className="w-full h-7 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1 shadow-xs"
                        >
                          Open &amp; Fill Form <ArrowRight className="size-3" />
                        </Button>
                      </div>
                    )}

                    <span className="text-[9px] text-slate-400 block px-1">
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
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs flex items-center gap-1.5 shadow-2xs">
                  <span className="size-1.5 rounded-full bg-blue-600 animate-bounce" />
                  <span className="size-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                  <span className="size-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── BOTTOM INPUT BAR ── */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center gap-2 bg-slate-100/90 dark:bg-slate-800 rounded-2xl px-3 py-1.5 border border-slate-200 dark:border-slate-700">
              {allowFileUpload && (
                <button type="button" className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5">
                  <Paperclip className="size-4" />
                </button>
              )}

              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSendMessage())}
                placeholder={placeholderMessage}
                className="text-xs h-7 flex-1 bg-transparent border-0 focus-visible:ring-0 shadow-none px-1 text-slate-900 dark:text-slate-100"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                className="size-7 rounded-full bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs"
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
            <h3 className="text-sm font-bold text-foreground">{agent.name}</h3>
            <p className="text-xs text-muted-foreground">Voice Assistant • {agent.voiceTone} tone</p>
          </div>

          {/* Animated Waveform Visualizer */}
          <div className="flex items-center gap-1.5 h-10">
            {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 35, 65].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-blue-600 rounded-full animate-pulse"
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
              className="size-11 rounded-full shadow-md"
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
            <h3 className="text-xs font-bold text-foreground">Connected Forms</h3>
            <p className="text-[11px] text-muted-foreground">
              Select a form to fill out with AI guidance.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            {(agent.connectedForms || [
              { id: 'form_1', name: 'Service & Loan Application Form', description: 'Pre-qualification and documentation' },
            ]).map((form) => (
              <div
                key={form.id}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">{form.name}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{form.description}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onOpenFormInModal?.(form)}
                  className="h-7 text-xs font-bold bg-blue-600 text-white"
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
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-800 space-y-2">
            <Presentation className="size-8 text-indigo-600 mx-auto" />
            <h3 className="text-xs font-bold text-foreground">Interactive AI Presentation</h3>
            <p className="text-[11px] text-muted-foreground">
              {agent.name} is ready to present your services with slides and voice walkthrough.
            </p>
            <Button size="sm" className="h-7 text-xs font-bold bg-indigo-600 text-white mt-2">
              Start Presentation
            </Button>
          </div>
        </div>
      )}

      {/* ── TAB 5: WHATSAPP TAB CONTENT ── */}
      {activeTab === 'whatsapp' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-center">
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 space-y-3">
            <div className="size-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
              <MessageCircle className="size-6" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">WhatsApp Business Integration</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
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
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                Enter your WhatsApp number in the Chatbot Navigation settings.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 6: HISTORY TAB CONTENT ── */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h3 className="text-xs font-bold text-foreground">Conversation History</h3>
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Today, Session #1</span>
              <span>{messages.length} messages</span>
            </div>
            <p className="text-xs text-foreground font-medium line-clamp-2">
              {messages[messages.length - 1]?.text || 'No previous messages.'}
            </p>
          </div>
        </div>
      )}

      {/* ── DYNAMIC FOOTER SUB-TABS (CHAT | VOICE | WHATSAPP | FORMS | PRESENTATION | HISTORY) ── */}
      {navItems.length > 0 && (
        <div
          className="h-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 px-1 text-slate-600 dark:text-slate-400 flex items-center justify-around"
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
                  isSelected ? 'text-blue-600 dark:text-blue-400' : 'hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                <Icon className="size-3.5" />
                <span className="truncate max-w-[54px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="py-1 text-center text-[9px] text-slate-400 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
        Powered by <strong className="font-bold text-slate-600 dark:text-slate-300">Fieseros AI</strong>
      </div>
    </div>
  );
}
