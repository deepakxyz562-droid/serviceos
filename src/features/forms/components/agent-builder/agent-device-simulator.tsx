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
  const [activeTab, setActiveTab] = useState<'chat' | 'voice' | 'forms' | 'history'>('chat');
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
        text: data.reply || `Thank you for asking! Based on your loan inquiry, you qualify for our competitive 30-year fixed rate program. Would you like to complete the pre-qualification form now?`,
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

  // ═════════════════════════════════════════════════════════════════════════
  // VIEW 1: GREETING PAGE (Screenshot 4 Minimized Launcher)
  // ═════════════════════════════════════════════════════════════════════════
  if (previewPage === 'greeting') {
    return (
      <div className="flex flex-col justify-end h-full w-full p-4 items-center sm:items-end">
        <div className="w-full max-w-[340px] bg-white rounded-3xl p-5 shadow-2xl border border-slate-200/80 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <p className="text-xs text-slate-800 leading-relaxed">
            Hi! I&apos;m <strong className="font-bold">{agent.name}</strong>, your <strong className="font-bold">AI Agent</strong> and <strong className="font-bold">{agent.roleTitle}</strong>. How can I help you?
          </p>

          <div className="space-y-2">
            {(agent.quickActions || []).slice(0, 2).map((qa) => (
              <button
                key={qa.id}
                type="button"
                onClick={() => handleQuickActionClick(qa)}
                className="w-full py-2 px-4 rounded-xl border border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/50 text-xs font-semibold text-slate-800 text-center transition-all shadow-2xs"
              >
                {qa.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <div
              onClick={() => onSwitchPage?.('conversation')}
              className="flex items-center gap-2 flex-1 bg-slate-100 hover:bg-slate-200/80 rounded-full px-3 py-1.5 cursor-pointer transition-all border border-slate-200"
            >
              <img src={agent.avatarUrl} alt={agent.name} className="size-5 rounded-full object-cover shrink-0" />
              <span className="text-xs text-slate-500 font-medium">{agent.channels?.chatbot?.placeholderMessage || 'Ask AI'}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                onSwitchPage?.('conversation');
                setActiveTab('voice');
              }}
              className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 shadow-md transition-all shrink-0"
            >
              <Mic className="size-3.5" />
              <span>Voice</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VIEW 2: CONVERSATION PAGE (Screenshots 1, 2, 3, 5 Full Chat)
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div
      className={cn(
        'flex flex-col h-full w-full overflow-hidden shadow-2xl border border-slate-200/80 text-slate-900 transition-all select-none relative',
        isSidebarLayout ? 'rounded-l-2xl rounded-r-none border-r-0' : 'rounded-[28px]'
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
              src={agent.avatarUrl}
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

      {/* ── CHAT VIEWPORT CONTENT ── */}
      <div className="flex-1 overflow-y-auto min-h-0 relative flex flex-col p-4 space-y-4">
        {/* Welcome Text + Action Buttons Card */}
        {messages.length <= 1 && (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-slate-800 leading-relaxed font-medium">
              Hi! I&apos;m <strong className="font-bold">{agent.name}</strong>, your <strong className="font-bold">AI Agent</strong> and <strong className="font-bold">{agent.roleTitle}</strong>. How can I help you?
            </p>

            <div className="flex flex-wrap gap-2">
              {(agent.quickActions || []).map((qa) => (
                <button
                  key={qa.id}
                  type="button"
                  onClick={() => handleQuickActionClick(qa)}
                  className="py-1.5 px-3 rounded-xl border border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50 text-xs font-semibold text-slate-800 transition-all shadow-2xs"
                >
                  {qa.label}
                </button>
              ))}
            </div>
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
                      ? 'bg-slate-100 text-slate-900 rounded-tl-xs'
                      : 'bg-slate-100 text-slate-900 border border-slate-200 rounded-tr-xs font-medium'
                  )}
                >
                  {msg.text.split('**').map((chunk, i) =>
                    i % 2 === 1 ? <strong key={i} className="font-bold">{chunk}</strong> : chunk
                  )}

                  {msg.suggestedForm && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenFormInModal?.(msg.suggestedForm!);
                          setActiveTab('forms');
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-white border border-blue-400 hover:bg-blue-50 transition-all text-left"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="size-3.5 text-blue-600 shrink-0" />
                          <span className="text-[11px] font-bold text-slate-900 truncate">{msg.suggestedForm.name}</span>
                        </div>
                        <ArrowRight className="size-3 text-blue-600 shrink-0" />
                      </button>
                    </div>
                  )}
                </div>
                <p className={cn('text-[9px] text-slate-400 px-1', !isAi && 'text-right')}>
                  {msg.timestamp}
                </p>
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex items-center gap-2 mr-auto">
            <img src={agent.avatarUrl} alt={agent.name} className="size-7 rounded-full object-cover border shrink-0" />
            <div className="p-3 rounded-2xl bg-slate-100 text-xs flex items-center gap-1.5 shadow-2xs">
              <span className="size-1.5 rounded-full bg-blue-600 animate-bounce" />
              <span className="size-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
              <span className="size-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── BOTTOM INPUT BAR ── */}
      <div className="p-3 border-t border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2 bg-slate-100/90 rounded-2xl px-3 py-1.5 border border-slate-200">
          {allowFileUpload && (
            <button type="button" className="text-slate-400 hover:text-slate-700 p-0.5">
              <Paperclip className="size-4" />
            </button>
          )}

          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSendMessage())}
            placeholder="Type here..."
            className="text-xs h-7 flex-1 bg-transparent border-0 focus-visible:ring-0 shadow-none px-1 text-slate-900"
          />

          <button
            type="button"
            onClick={() => handleSendMessage()}
            className="size-7 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs"
          >
            <Mic className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ── FOOTER SUB-TABS (CHAT | VOICE | FORMS | HISTORY) ── */}
      <div className="h-12 border-t border-slate-200 bg-white grid grid-cols-4 shrink-0 px-2 text-slate-600">
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={cn('flex flex-col items-center justify-center text-[10px] font-bold gap-0.5', activeTab === 'chat' ? 'text-blue-600' : 'hover:text-slate-900')}
        >
          <MessageSquare className="size-3.5" />
          <span>Chat</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('voice')}
          className={cn('flex flex-col items-center justify-center text-[10px] font-bold gap-0.5', activeTab === 'voice' ? 'text-blue-600' : 'hover:text-slate-900')}
        >
          <Mic className="size-3.5" />
          <span>Voice</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('forms')}
          className={cn('flex flex-col items-center justify-center text-[10px] font-bold gap-0.5', activeTab === 'forms' ? 'text-blue-600' : 'hover:text-slate-900')}
        >
          <FileText className="size-3.5" />
          <span>Forms</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={cn('flex flex-col items-center justify-center text-[10px] font-bold gap-0.5', activeTab === 'history' ? 'text-blue-600' : 'hover:text-slate-900')}
        >
          <History className="size-3.5" />
          <span>History</span>
        </button>
      </div>

      <div className="py-1 text-center text-[9px] text-slate-400 bg-slate-50 border-t border-slate-100">
        Powered by <strong className="font-bold text-slate-600">Fieseros AI</strong>
      </div>
    </div>
  );
}
