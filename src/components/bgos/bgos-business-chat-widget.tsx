'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Loader2,
  MessageCircle,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import type { BgosPublicBusinessProfile } from '@/lib/bgos-public-business';
import type {
  BusinessChatReplyResult,
  PublicBusinessChatbotMeta,
} from '@/lib/bgos-business-chatbot';

interface BgosBusinessChatWidgetProps {
  profile: BgosPublicBusinessProfile;
  initialMeta?: PublicBusinessChatbotMeta | null;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  onRequestBook?: () => void;
}

interface WidgetMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  senderType: 'visitor' | 'ai' | 'admin' | 'system';
  senderName?: string;
  text: string;
  createdAt: string;
  citations?: Array<{ id: number; title: string; snippet: string }>;
  actionCard?: BusinessChatReplyResult['actionCard'];
}

function getSafeAccentHex(raw?: string | null): string {
  const value = (raw || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return '#1E3A5F';
}

function getInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'B';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function buildWhatsappUrl(digits: string | null | undefined, businessName: string): string | null {
  const clean = (digits || '').replace(/\D/g, '');
  if (!clean) return null;
  const text = encodeURIComponent(`Hi ${businessName}, I found your business page and had a question.`);
  return `https://wa.me/${clean}?text=${text}`;
}

export function BgosBusinessChatWidget({
  profile,
  initialMeta,
  externalOpen,
  onExternalOpenChange,
  onRequestBook,
}: BgosBusinessChatWidgetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (externalOpen === undefined) {
        setInternalOpen(next);
      }
      onExternalOpenChange?.(next);
    },
    [externalOpen, onExternalOpenChange],
  );

  const [meta, setMeta] = useState<PublicBusinessChatbotMeta | null>(initialMeta ?? null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [aiPaused, setAiPaused] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(
    initialMeta?.quickQuestions ?? [
      'What services do you offer?',
      'What are your opening hours?',
      'Can I book an appointment?',
      'Where are you located?',
    ],
  );
  const [showHandoffCard, setShowHandoffCard] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [unreadOwnerCount, setUnreadOwnerCount] = useState(0);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastPollIsoRef = useRef<string | null>(null);
  const restoredSessionRef = useRef(false);

  const accent = useMemo(
    () => getSafeAccentHex(meta?.accentColor || profile.accentColor),
    [meta?.accentColor, profile.accentColor],
  );

  const assistantName = meta?.agentName || `${profile.businessName} Assistant`;
  const roleSubtitle = useMemo(() => {
    if (liveMode || aiPaused) return `Live chat with ${profile.businessName} Owner`;
    return meta?.roleTitle || profile.category || 'Instant Business Assistant';
  }, [aiPaused, liveMode, meta?.roleTitle, profile.businessName, profile.category]);

  const storageSessionKey = `bgos_chat_session_${profile.slug}`;
  const storageVisitorKey = `bgos_chat_visitor_${profile.slug}`;
  const defaultWhatsappUrl = useMemo(
    () => buildWhatsappUrl(profile.whatsappDigits, profile.businessName),
    [profile.businessName, profile.whatsappDigits],
  );

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  // Load saved visitor & sessionId from localStorage once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedSession = window.localStorage.getItem(storageSessionKey);
      if (savedSession) {
        setSessionId(savedSession);
      }
      const savedVisitorRaw = window.localStorage.getItem(storageVisitorKey);
      if (savedVisitorRaw) {
        const parsed = JSON.parse(savedVisitorRaw);
        if (typeof parsed?.name === 'string') setVisitorName(parsed.name);
        if (typeof parsed?.phone === 'string') setVisitorPhone(parsed.phone);
      }
    } catch {
      // Ignore storage access failures in private browsing
    }
  }, [storageSessionKey, storageVisitorKey]);

  // Ensure initial greeting exists if no prior messages
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      const greeting =
        meta?.welcomeGreeting ||
        `Hi! Welcome to ${profile.businessName}. Ask me about services, hours, pricing, location, or tap "Chat with Owner" anytime.`;
      return [
        {
          id: 'welcome_greeting',
          role: 'assistant',
          senderType: 'ai',
          senderName: assistantName,
          text: greeting,
          createdAt: new Date().toISOString(),
        },
      ];
    });
  }, [assistantName, meta?.welcomeGreeting, profile.businessName]);

  // Fetch latest public meta if SSR didn't provide it
  useEffect(() => {
    if (meta) return;
    let active = true;
    fetch(`/api/public/business/${encodeURIComponent(profile.slug)}/chat`, {
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.chatbot) return;
        setMeta(data.chatbot);
        if (Array.isArray(data.chatbot.quickQuestions) && data.chatbot.quickQuestions.length > 0) {
          setSuggestedQuestions(data.chatbot.quickQuestions);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [meta, profile.slug]);

  // Restore saved session transcript once when widget opens (or sessionId loads while open)
  useEffect(() => {
    if (!isOpen || !sessionId || restoredSessionRef.current) return;
    restoredSessionRef.current = true;

    fetch(`/api/public/chat/${encodeURIComponent(sessionId)}/messages`, {
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !Array.isArray(data.messages)) return;
        if (typeof data.aiPaused === 'boolean') {
          setAiPaused(data.aiPaused);
          if (data.aiPaused) setLiveMode(true);
        }
        if (data.messages.length === 0) return;

        const restored: WidgetMessage[] = data.messages.map((m: any) => ({
          id: String(m.id),
          role:
            m.senderType === 'visitor'
              ? 'user'
              : m.senderType === 'system'
                ? 'system'
                : 'assistant',
          senderType: m.senderType || 'ai',
          senderName: m.senderName || undefined,
          text: String(m.body || ''),
          createdAt: String(m.createdAt || new Date().toISOString()),
        }));
        lastPollIsoRef.current = restored[restored.length - 1]?.createdAt || null;

        setMessages((prev) => {
          const welcome = prev.find((p) => p.id === 'welcome_greeting');
          return welcome ? [welcome, ...restored] : restored;
        });
        scrollToBottom();
      })
      .catch(() => {});
  }, [isOpen, scrollToBottom, sessionId]);

  // Poll for live owner replies & takeover status when session exists & live/paused (or open)
  useEffect(() => {
    if (!sessionId || (!liveMode && !aiPaused && !isOpen)) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const sinceQuery = lastPollIsoRef.current
          ? `?since=${encodeURIComponent(lastPollIsoRef.current)}`
          : '';
        const res = await fetch(
          `/api/public/chat/${encodeURIComponent(sessionId)}/messages${sinceQuery}`,
          { cache: 'no-store' },
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;

        if (typeof data.aiPaused === 'boolean') {
          setAiPaused(data.aiPaused);
          setLiveMode((prev) => (data.aiPaused ? true : prev && data.sessionStatus !== 'resolved'));
        }

        const incoming = Array.isArray(data.messages) ? data.messages : [];
        if (incoming.length === 0) return;

        const latestCreatedAt = incoming[incoming.length - 1]?.createdAt;
        if (typeof latestCreatedAt === 'string') {
          lastPollIsoRef.current = latestCreatedAt;
        }

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const additions: WidgetMessage[] = [];
          for (const raw of incoming) {
            const id = String(raw.id);
            if (existingIds.has(id)) continue;

            const senderType: WidgetMessage['senderType'] =
              raw.senderType === 'visitor' ||
              raw.senderType === 'admin' ||
              raw.senderType === 'system'
                ? raw.senderType
                : 'ai';
            const body = String(raw.body || '').trim();
            if (!body) continue;

            // Skip duplicates matching optimistic messages added in last few seconds
            const isRecentDuplicate = prev.some(
              (existing) =>
                existing.text === body &&
                ((senderType === 'visitor' && existing.role === 'user') ||
                  (senderType !== 'visitor' && existing.role === 'assistant')),
            );
            if (isRecentDuplicate) continue;

            additions.push({
              id,
              role:
                senderType === 'visitor'
                  ? 'user'
                  : senderType === 'system'
                    ? 'system'
                    : 'assistant',
              senderType,
              senderName:
                raw.senderName ||
                (senderType === 'admin' ? `${profile.businessName} Owner` : assistantName),
              text: body,
              createdAt: String(raw.createdAt || new Date().toISOString()),
            });
          }

          if (additions.length === 0) return prev;
          if (!isOpen) {
            const ownerAdditions = additions.filter((a) => a.senderType === 'admin').length;
            if (ownerAdditions > 0) {
              setUnreadOwnerCount((c) => c + ownerAdditions);
            }
          }
          return [...prev, ...additions];
        });
        scrollToBottom();
      } catch {
        // Silent retry on next poll interval
      }
    };

    const intervalMs = liveMode || aiPaused ? 3000 : 8000;
    const timer = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [aiPaused, assistantName, isOpen, liveMode, profile.businessName, scrollToBottom, sessionId]);

  useEffect(() => {
    if (isOpen) {
      setUnreadOwnerCount(0);
      scrollToBottom();
    }
  }, [isOpen, scrollToBottom]);

  const sendMessageToServer = useCallback(
    async (
      rawText: string,
      options?: { action?: 'request_human'; name?: string; phone?: string },
    ) => {
      const trimmed = rawText.trim();
      const isHandoff = options?.action === 'request_human';
      if (!trimmed && !isHandoff) return;
      if (sending) return;

      setErrorBanner(null);
      const userBubbleText =
        trimmed || 'Hello, I would like to chat directly with the business owner.';

      const userMessage: WidgetMessage = {
        id: `local_u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        role: 'user',
        senderType: 'visitor',
        senderName: options?.name || visitorName || 'Visitor',
        text: userBubbleText,
        createdAt: new Date().toISOString(),
      };

      const historySnapshot = messages
        .filter((m) => m.id !== 'welcome_greeting' && m.role !== 'system')
        .slice(-10)
        .map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.text,
        }));

      setMessages((prev) => [...prev, userMessage]);
      if (!isHandoff) setInput('');
      setSending(true);
      scrollToBottom();

      try {
        const res = await fetch(
          `/api/public/business/${encodeURIComponent(profile.slug)}/chat`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: userBubbleText,
              history: historySnapshot,
              sessionId,
              action: options?.action ?? null,
              visitor: {
                name: (options?.name ?? visitorName).trim() || null,
                phone: (options?.phone ?? visitorPhone).trim() || null,
              },
            }),
          },
        );

        const data = (await res.json().catch(() => null)) as
          | (BusinessChatReplyResult & { error?: string })
          | null;

        if (!res.ok || !data) {
          throw new Error(data?.error || 'Could not reach assistant right now.');
        }

        if (data.sessionId) {
          setSessionId(data.sessionId);
          restoredSessionRef.current = true;
          try {
            window.localStorage.setItem(storageSessionKey, data.sessionId);
          } catch {
            // ignore
          }
        }

        if (data.liveMode || data.escalatedToHuman) {
          setLiveMode(true);
        }
        if (typeof data.aiPaused === 'boolean') {
          setAiPaused(data.aiPaused);
        }
        if (Array.isArray(data.suggestedQuestions) && data.suggestedQuestions.length > 0) {
          setSuggestedQuestions(data.suggestedQuestions);
        }

        const nowIso = new Date().toISOString();
        lastPollIsoRef.current = nowIso;

        if (data.reply) {
          setMessages((prev) => [
            ...prev,
            {
              id: `local_a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              role: 'assistant',
              senderType: data.aiPaused ? 'system' : 'ai',
              senderName: data.agentName || assistantName,
              text: data.reply,
              createdAt: nowIso,
              citations: data.citations,
              actionCard: data.actionCard ?? null,
            },
          ]);
        }
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : 'Unable to send message right now.';
        setErrorBanner(errMsg);
      } finally {
        setSending(false);
        scrollToBottom();
      }
    },
    [
      assistantName,
      messages,
      profile.slug,
      scrollToBottom,
      sending,
      sessionId,
      storageSessionKey,
      visitorName,
      visitorPhone,
    ],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    void sendMessageToServer(input);
  };

  const handleConfirmOwnerHandoff = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      window.localStorage.setItem(
        storageVisitorKey,
        JSON.stringify({ name: visitorName.trim(), phone: visitorPhone.trim() }),
      );
    } catch {
      // ignore
    }
    setShowHandoffCard(false);
    void sendMessageToServer(
      'I would like to chat directly with the business owner.',
      {
        action: 'request_human',
        name: visitorName.trim(),
        phone: visitorPhone.trim(),
      },
    );
  };

  const showQuickChips = !liveMode && !aiPaused && suggestedQuestions.length > 0;

  return (
    <>
      {/* Floating launcher above the mobile sticky CTA dock */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Chat with ${profile.businessName}`}
          className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2.5 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:scale-[1.02] active:scale-[0.98] sm:bottom-6 sm:right-6"
          style={{ backgroundColor: accent }}
        >
          <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
            <MessageSquare className="h-3.5 w-3.5" />
            {unreadOwnerCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {unreadOwnerCount}
              </span>
            )}
          </span>
          <span>Ask AI · Chat</span>
        </button>
      )}

      {/* White-label Floating / Slide-up Chat Drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={`Chat with ${profile.businessName}`}
          className="fixed bottom-0 right-0 z-50 flex h-[85dvh] w-full flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-slate-200 sm:bottom-6 sm:right-6 sm:h-[600px] sm:max-h-[82vh] sm:w-[400px] sm:rounded-2xl"
        >
          {/* Business-branded Header */}
          <div
            className="flex items-center justify-between gap-3 px-4 py-3 text-white"
            style={{ backgroundColor: accent }}
          >
            <div className="flex min-w-0 items-center gap-3">
              {profile.logoUrl ? (
                <img
                  src={profile.logoUrl}
                  alt={profile.businessName}
                  className="h-9 w-9 shrink-0 rounded-full border border-white/25 bg-white object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 text-xs font-bold text-white">
                  {getInitials(profile.businessName)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">
                  {assistantName}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/85">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      liveMode || aiPaused ? 'bg-emerald-300' : 'bg-sky-200'
                    }`}
                  />
                  <span className="truncate">{roleSubtitle}</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {meta?.allowOwnerHandoff !== false && !liveMode && !aiPaused && (
                <button
                  type="button"
                  onClick={() => setShowHandoffCard((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-white/25"
                >
                  <UserCheck className="h-3 w-3" />
                  <span>Owner</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="rounded-full p-1.5 text-white/90 transition hover:bg-white/20 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Live mode status banner */}
          {(liveMode || aiPaused) && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-900">
              <div className="flex items-center gap-1.5 font-medium">
                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>
                  {aiPaused
                    ? `Owner live mode active · Messages appear here`
                    : `Connected to ${profile.businessName} Inbox`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {defaultWhatsappUrl && (
                  <a
                    href={defaultWhatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                  >
                    <MessageCircle className="h-3 w-3" />
                    <span>WhatsApp</span>
                  </a>
                )}
                {profile.phone && (
                  <a
                    href={`tel:${profile.phone}`}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    <Phone className="h-3 w-3" />
                    <span>Call</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Optional visitor info card before live owner handoff */}
          {showHandoffCard && !liveMode && !aiPaused && (
            <form
              onSubmit={handleConfirmOwnerHandoff}
              className="border-b border-slate-200 bg-slate-50 px-3.5 py-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-900">
                  Chat directly with {profile.businessName} Owner
                </p>
                <button
                  type="button"
                  onClick={() => setShowHandoffCard(false)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Add your name or phone so the owner can follow up right away (optional).
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="Your name"
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-400"
                />
                <input
                  type="tel"
                  value={visitorPhone}
                  onChange={(e) => setVisitorPhone(e.target.value)}
                  placeholder="Phone / WhatsApp"
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-400"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
                style={{ backgroundColor: accent }}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Start Live Chat with Owner</span>
              </button>
            </form>
          )}

          {/* Message Feed */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 px-3.5 py-3.5"
          >
            {messages.map((msg) => {
              if (msg.role === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center py-1">
                    <span className="rounded-full bg-slate-200/80 px-3 py-1 text-[11px] font-medium text-slate-700">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {!isUser && (
                    <div className="mb-1 flex items-center gap-1.5 px-1">
                      <span className="text-[11px] font-semibold text-slate-600">
                        {msg.senderType === 'admin'
                          ? msg.senderName || `${profile.businessName} Owner`
                          : msg.senderName || assistantName}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                          msg.senderType === 'admin'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {msg.senderType === 'admin' ? 'Owner' : 'AI'}
                      </span>
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-xs ${
                      isUser
                        ? 'rounded-br-sm text-white'
                        : msg.senderType === 'admin'
                          ? 'rounded-bl-sm border border-emerald-200 bg-emerald-50 text-slate-900'
                          : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'
                    }`}
                    style={isUser ? { backgroundColor: accent } : undefined}
                  >
                    {msg.text}
                  </div>

                  {/* Action card attached to AI response */}
                  {!isUser && msg.actionCard && (
                    <div className="mt-2 w-[85%] rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
                      {msg.actionCard.type === 'booking_confirmation' && (
                        <div className="flex items-start gap-2 text-xs text-emerald-800">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <div>
                            <p className="font-semibold">Booking Confirmed</p>
                            <p className="mt-0.5 text-slate-600">
                              {[msg.actionCard.service, msg.actionCard.date, msg.actionCard.time]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>
                        </div>
                      )}

                      {msg.actionCard.type === 'booking_cta' && (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-700">
                            Ready to reserve a time slot?
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (onRequestBook) {
                                setOpen(false);
                                onRequestBook();
                              } else if (msg.actionCard?.bookingUrl) {
                                window.location.href = msg.actionCard.bookingUrl;
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                            style={{ backgroundColor: accent }}
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Book Appointment</span>
                          </button>
                        </div>
                      )}

                      {msg.actionCard.type === 'owner_contact_cta' && (
                        <div className="flex flex-wrap gap-1.5">
                          {(msg.actionCard.whatsappUrl || defaultWhatsappUrl) && (
                            <a
                              href={msg.actionCard.whatsappUrl || defaultWhatsappUrl || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span>WhatsApp Owner</span>
                            </a>
                          )}
                          {(msg.actionCard.phone || profile.phone) && (
                            <a
                              href={`tel:${msg.actionCard.phone || profile.phone}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              <span>Call</span>
                            </a>
                          )}
                          {onRequestBook && profile.bookingEnabled && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpen(false);
                                onRequestBook();
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Book</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {sending && (
              <div className="flex items-start">
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{liveMode || aiPaused ? 'Sending to owner...' : 'Typing...'}</span>
                </div>
              </div>
            )}

            {errorBanner && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {errorBanner}
              </div>
            )}
          </div>

          {/* Suggested Quick Questions & Direct Owner CTA */}
          {showQuickChips && (
            <div className="border-t border-slate-100 bg-white px-3 py-2">
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {suggestedQuestions.slice(0, 4).map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={sending}
                    onClick={() => void sendMessageToServer(q)}
                    className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                liveMode || aiPaused
                  ? `Message ${profile.businessName} owner...`
                  : `Ask ${profile.businessName} anything...`
              }
              maxLength={2000}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:bg-white"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition hover:opacity-95 disabled:opacity-40"
              style={{ backgroundColor: accent }}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          {/* White-label Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-3.5 py-1.5 text-[10px] text-slate-500">
            <span className="inline-flex items-center gap-1 truncate">
              <Sparkles className="h-3 w-3 shrink-0" />
              <span className="truncate">Official {profile.businessName} Assistant</span>
            </span>
            {meta?.allowOwnerHandoff !== false && !liveMode && !aiPaused && (
              <button
                type="button"
                onClick={() => setShowHandoffCard(true)}
                className="shrink-0 font-semibold text-slate-700 underline-offset-2 hover:underline"
              >
                Talk to Owner
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
