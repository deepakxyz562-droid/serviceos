'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Bot,
  X,
  Send,
  Sparkles,
  Phone,
  User,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  Clock,
  Loader2,
  HelpCircle,
  Minimize2,
  Maximize2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface CitationItem {
  id: number;
  title: string;
  url?: string;
  snippet: string;
}

export interface FloatingWidgetProps {
  agentId?: string;
  formId?: string;
  businessName?: string;
  brandColor?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  greetingBubble?: string;
  avatarUrl?: string;
  defaultMode?: 'chat' | 'form';
  onFormSubmit?: (data: any) => Promise<void>;
  formSchema?: any;
}

interface Message {
  id: string;
  sender: 'ai' | 'user' | 'system' | 'agent';
  senderName?: string;
  isLiveAgent?: boolean;
  text: string;
  citations?: CitationItem[];
  card?: any;
  timestamp: string;
}

export function FloatingFormAgentWidget({
  agentId = 'default',
  formId,
  businessName = 'Service Assistant',
  brandColor = '#059669',
  position = 'bottom-right',
  greetingBubble = '👋 Have questions or want a quick quote? Ask our AI!',
  avatarUrl,
  defaultMode = 'chat',
  formSchema,
}: FloatingWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'form' | 'human'>(defaultMode);
  const [hasUnread, setHasUnread] = useState(true);
  const [inputVal, setInputVal] = useState('');
  const [sending, setSending] = useState(false);
  const [humanRequested, setHumanRequested] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [agentAvailable, setAgentAvailable] = useState<boolean | null>(null);
  const [operatorConnected, setOperatorConnected] = useState<boolean>(false);
  const [operatorName, setOperatorName] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init_welcome',
      sender: 'ai',
      text: `Hello! 👋 I'm your AI assistant for **${businessName}**. How can I help you today? Ask any question, check pricing, or schedule service in seconds!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      scrollToBottom();
    }
  }, [isOpen, messages]);

  // ── Poll for live specialist responses when human support requested ────────
  useEffect(() => {
    if (!liveSessionId) return;

    let isMounted = true;
    const pollMessages = async () => {
      try {
        const res = await fetch(`/api/public/chat/${encodeURIComponent(liveSessionId)}/messages`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted || !data.messages || !Array.isArray(data.messages)) return;

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newBackendMsgs: Message[] = [];
          let hasAdmin = false;
          let latestAdminName = '';

          for (const m of data.messages) {
            if (m.senderType === 'admin') {
              hasAdmin = true;
              if (m.senderName) latestAdminName = m.senderName;
            }
            if (!existingIds.has(m.id) && (m.senderType === 'admin' || m.senderType === 'system')) {
              newBackendMsgs.push({
                id: m.id,
                sender: m.senderType === 'admin' ? 'agent' : 'ai',
                senderName: m.senderName || 'Live Specialist',
                isLiveAgent: m.senderType === 'admin',
                text: m.body,
                timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              });
            }
          }

          if (hasAdmin) {
            setOperatorConnected(true);
            if (latestAdminName) setOperatorName(latestAdminName);
          }

          if (newBackendMsgs.length === 0) return prev;
          return [...prev, ...newBackendMsgs];
        });
      } catch (err) {
        console.warn('[floating-widget poll] error:', err);
      }
    };

    const timer = setInterval(pollMessages, 3000);
    pollMessages();
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [liveSessionId]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputVal).trim();
    if (!text || sending) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setSending(true);

    // If escalated to live specialist, route message to live chat API
    if (liveSessionId) {
      try {
        await fetch(`/api/public/chat/${encodeURIComponent(liveSessionId)}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: text,
            visitorName: 'Visitor',
          }),
        });
      } catch (err) {
        console.warn('[floating-widget send] error:', err);
      } finally {
        setSending(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/public/ai/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: formId || agentId,
          message: text,
          history: messages.map((m) => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        const aiMsg: Message = {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: data.reply,
          citations: data.citations,
          card: data.card,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
        if (data.status === 'human_requested' || data.humanHandoff) {
          setHumanRequested(true);
          if (data.sessionId) setLiveSessionId(data.sessionId);
          if (data.agentAvailable !== undefined) setAgentAvailable(data.agentAvailable);
        }
      } else {
        toast.error('Could not receive AI response');
      }
    } catch {
      toast.error('Network error communicating with AI agent');
    } finally {
      setSending(false);
    }
  };

  const handleRequestHuman = async () => {
    setHumanRequested(true);
    setSending(true);
    try {
      const res = await fetch('/api/public/ai/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: formId || agentId,
          message: 'Customer requested to speak with a human agent.',
          action: 'request_human',
        }),
      });
      const data = await res.json();
      if (data.sessionId) setLiveSessionId(data.sessionId);
      if (data.agentAvailable !== undefined) setAgentAvailable(data.agentAvailable);
      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `human_${Date.now()}`,
            sender: 'ai',
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
      setActiveTab('chat');
      toast.success(
        data.agentAvailable === false
          ? 'Notice: Specialists are currently offline (Mon–Fri 8am–6pm).'
          : 'Human support requested. An agent will connect shortly!'
      );
    } catch {
      toast.error('Failed to notify human support');
    } finally {
      setSending(false);
    }
  };

  // Render message text with interactive citation badges
  const renderMessageWithCitations = (msg: Message) => {
    if (!msg.citations || msg.citations.length === 0) {
      return <span className="whitespace-pre-wrap">{msg.text}</span>;
    }

    const citationMap = new Map<number, CitationItem>();
    msg.citations.forEach((c) => citationMap.set(c.id, c));

    // Regex to find citation tags like [1] or [2]
    const parts = msg.text.split(/(\[\d+\])/g);

    return (
      <span className="whitespace-pre-wrap">
        {parts.map((part, idx) => {
          const match = part.match(/^\[(\d+)\]$/);
          if (match) {
            const citeId = parseInt(match[1], 10);
            const citation = citationMap.get(citeId);
            if (citation) {
              return (
                <Popover key={idx}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center size-4 mx-0.5 text-[10px] font-bold rounded-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-all cursor-pointer align-super"
                      title={citation.title}
                    >
                      {citeId}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="center"
                    className="w-72 p-3 text-xs bg-slate-900 text-white border-slate-700 shadow-2xl rounded-xl z-50"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1 border-b border-white/10 pb-1">
                        <span className="font-bold text-amber-300 flex items-center gap-1 text-[11px] truncate">
                          <ShieldCheck className="size-3 text-emerald-400" />
                          Source [{citeId}]: {citation.title}
                        </span>
                        {citation.url && (
                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline flex items-center gap-0.5 shrink-0"
                          >
                            Open <ExternalLink className="size-2.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed italic">
                        "{citation.snippet}"
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            }
          }
          return part;
        })}
      </span>
    );
  };

  const positionClasses = {
    'bottom-right': 'bottom-5 right-5',
    'bottom-left': 'bottom-5 left-5',
    'bottom-center': 'bottom-5 left-1/2 -translate-x-1/2',
  }[position];

  return (
    <div className={`fixed ${positionClasses} z-50 font-sans`}>
      {/* Floating Launcher Bubble & Greeting Tooltip */}
      {!isOpen && (
        <div className="flex flex-col items-end gap-2 group">
          {greetingBubble && (
            <div
              onClick={() => setIsOpen(true)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-3 max-w-xs text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-300 hover:scale-105 transition-transform flex items-start gap-2"
            >
              <div
                className="size-2 rounded-full mt-1 shrink-0 animate-ping"
                style={{ backgroundColor: brandColor }}
              />
              <p className="leading-snug">{greetingBubble}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="relative size-14 sm:size-16 rounded-full shadow-2xl flex items-center justify-center text-white cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-white/20"
            style={{ backgroundColor: brandColor }}
            title="Open AI Assistant"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Agent" className="size-full rounded-full object-cover" />
            ) : (
              <Bot className="size-7 sm:size-8" />
            )}

            {/* Online Pulse Ring */}
            <span className="absolute -top-1 -right-1 flex size-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-4 bg-emerald-500 border-2 border-white" />
            </span>

            {hasUnread && (
              <span className="absolute -bottom-1 -left-1 px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-full border border-white shadow-sm">
                1
              </span>
            )}
          </button>
        </div>
      )}

      {/* Expanded Popup Window */}
      {isOpen && (
        <Card className="w-[360px] sm:w-[410px] h-[580px] max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div
            className="p-4 text-white flex items-center justify-between shrink-0"
            style={{ backgroundColor: brandColor }}
          >
            <div className="flex items-center gap-3">
              <div className="relative size-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="size-full rounded-full object-cover" />
                ) : (
                  <Bot className="size-5" />
                )}
                <span className="absolute bottom-0 right-0 size-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">{businessName}</h3>
                <p className="text-[11px] text-white/80 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-300" />
                  24/7 AI Online • Instant Response
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="size-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Mode Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-1.5 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex-1 text-xs py-1.5 px-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'chat'
                  ? 'bg-white dark:bg-slate-800 shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare className="size-3.5 text-primary" />
              <span>AI Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('human')}
              className={`flex-1 text-xs py-1.5 px-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'human'
                  ? 'bg-white dark:bg-slate-800 shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="size-3.5 text-amber-500" />
              <span>Live Human</span>
              {humanRequested && (
                <span className="size-1.5 rounded-full bg-amber-500 animate-ping" />
              )}
            </button>
          </div>

          {/* Chat Messages Body */}
          {activeTab === 'chat' && (
            <>
              {/* Live Human Handoff / Specialist Status Banner */}
              {humanRequested && (
                <div
                  className={cn(
                    'px-3 py-2 text-xs flex items-center justify-between gap-2 border-b shrink-0',
                    operatorConnected
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                      : agentAvailable === false
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300'
                      : 'bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'size-2 rounded-full shrink-0',
                        operatorConnected
                          ? 'bg-emerald-500'
                          : agentAvailable === false
                          ? 'bg-amber-500'
                          : 'bg-blue-500 animate-ping'
                      )}
                    />
                    <span className="text-[11px] font-medium truncate">
                      {operatorConnected
                        ? `Live Specialist ${operatorName ? `(${operatorName})` : ''} connected!`
                        : agentAvailable === false
                        ? 'Specialists offline right now (Mon–Fri 8am–6pm).'
                        : 'Connecting with a live specialist...'}
                    </span>
                  </div>
                  {agentAvailable === false && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setActiveTab('form')}
                      className="h-6 px-2 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                    >
                      Book Appointment
                    </Button>
                  )}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {messages.map((m) => {
                  const isUser = m.sender === 'user';
                  const isLiveSpecialist = m.sender === 'agent' || m.isLiveAgent;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      {isLiveSpecialist && (
                        <div className="flex items-center gap-1 mb-1 px-1">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {m.senderName || 'Live Specialist'}
                          </span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold">
                            Operator
                          </span>
                        </div>
                      )}
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed',
                          isUser
                            ? 'bg-primary text-primary-foreground rounded-tr-xs shadow-sm'
                            : isLiveSpecialist
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-foreground rounded-tl-xs border border-emerald-200 dark:border-emerald-800/80 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-foreground rounded-tl-xs border border-slate-200/60 dark:border-slate-700/60 shadow-xs'
                        )}
                        style={isUser ? { backgroundColor: brandColor } : undefined}
                      >
                        {renderMessageWithCitations(m)}

                        {/* Card Protocol Rendering */}
                        {m.card?.type === 'slot_picker' && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <Calendar className="size-3 text-primary" />
                              Select Booking Slot:
                            </p>
                            <div className="grid grid-cols-2 gap-1">
                              {m.card.slots?.map((slot: string, sIdx: number) => (
                                <Button
                                  key={sIdx}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendMessage(`I would like to book the ${slot} slot.`)}
                                  className="text-[11px] h-7 bg-white dark:bg-slate-900 hover:bg-primary/10 border-primary/20"
                                >
                                  {slot}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-muted-foreground mt-1 px-1">
                        {m.timestamp}
                      </span>
                    </div>
                  );
                })}
                {sending && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground italic p-2 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                    AI is thinking...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="Ask a question or request a quote..."
                    className="text-xs h-9 rounded-xl flex-1 bg-slate-50 dark:bg-slate-950/50"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!inputVal.trim() || sending}
                    className="h-9 w-9 p-0 rounded-xl shrink-0"
                    style={{ backgroundColor: brandColor }}
                  >
                    <Send className="size-3.5" />
                  </Button>
                </form>
              </div>
            </>
          )}

          {/* Live Human Handoff Tab */}
          {activeTab === 'human' && (
            <div className="flex-1 p-6 flex flex-col justify-center items-center text-center space-y-4">
              <div className="size-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto">
                <User className="size-8" />
              </div>
              <div className="space-y-1.5 max-w-xs">
                <h4 className="text-base font-bold">Connect with Our Team</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Need custom assistance or human expertise? Request a live staff member to join this conversation.
                </p>
              </div>

              {humanRequested ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 space-y-2">
                  <p className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    {operatorConnected ? 'Specialist Connected!' : 'Human Agent Alerted!'}
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                    {operatorConnected
                      ? `You are now connected with ${operatorName || 'a live specialist'}. Switch back to the chat tab to talk live!`
                      : agentAvailable === false
                      ? `Specialists are currently outside normal business hours (Mon–Fri 8:00 AM – 6:00 PM). Please leave your message or book directly.`
                      : `A specialist from ${businessName} has been alerted and will join this chat momentarily.`}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setActiveTab('chat')}
                    className="w-full h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Open Live Chat Room
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={handleRequestHuman}
                  disabled={sending}
                  className="w-full gap-2 rounded-xl text-xs font-bold"
                  style={{ backgroundColor: brandColor }}
                >
                  {sending ? <Loader2 className="size-3.5 animate-spin" /> : <User className="size-3.5" />}
                  Talk to a Real Person Now
                </Button>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
