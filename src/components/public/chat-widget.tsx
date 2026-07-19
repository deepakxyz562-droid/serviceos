'use client'

/**
 * Visitor-facing Chat Widget
 * ──────────────────────────
 * Floating "Live Chat" button + slide-up panel rendered on every public
 * business hub page (/{industry}/{city}/{slug}).
 *
 * Flow:
 *   1. Visitor clicks the floating button → panel opens.
 *   2. If no session in localStorage → show pre-chat form (name + email optional).
 *   3. Visitor submits first message:
 *        POST /api/public/chat/session  → creates PublicChatSession
 *        POST /api/public/chat/[id]/messages  → first visitor message
 *   4. Widget polls /api/public/chat/[id]/messages?since= every 4s for admin replies.
 *   5. Visitor can end chat via the X menu → POST /api/public/chat/[id]/close.
 *   6. Session ID persisted in localStorage so returning visitor resumes chat.
 *
 * Self-contained: no external CSS deps, no app state. All inline styles + Tailwind.
 * Scoped to a high z-index so it floats above the public page content but below
 * admin Select portals (z-100).
 */

import { useState, useEffect, useCallback, useRef, FormEvent } from 'react'
import {
  MessageSquare,
  X,
  Send,
  ArrowRight,
  Circle,
  Loader2,
  RefreshCw,
} from 'lucide-react'

interface ChatWidgetProps {
  /** Tenant slug OR publicSlug — used to look up the tenant on session create. */
  businessSlug: string
  /** Business display name — shown in the widget header. */
  businessName?: string
}

interface ChatMessage {
  id: string
  senderType: 'visitor' | 'admin' | 'system'
  senderName: string | null
  body: string
  createdAt: string
}

type Phase = 'closed' | 'prechat' | 'chatting'

const STORAGE_KEY_PREFIX = 'serviceos_chat_'

// ─── Component ────────────────────────────────────────────────────────────

export function ChatWidget({ businessSlug, businessName }: ChatWidgetProps) {
  const [phase, setPhase] = useState<Phase>('closed')
  const [visitorName, setVisitorName] = useState('')
  const [visitorEmail, setVisitorEmail] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adminOnline, setAdminOnline] = useState(true) // optimistic; turns false on closed status

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const storageKey = `${STORAGE_KEY_PREFIX}${businessSlug}`

  // ─── Restore session from localStorage on mount ─────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as { sessionId: string; visitorName?: string; visitorEmail?: string }
        if (parsed.sessionId) {
          setSessionId(parsed.sessionId)
          setVisitorName(parsed.visitorName || '')
          setVisitorEmail(parsed.visitorEmail || '')
          setPhase('chatting')
        }
      }
    } catch {
      // Corrupt localStorage — clear it.
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  // ─── Persist session to localStorage whenever it changes ────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionId) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ sessionId, visitorName, visitorEmail }),
      )
    }
  }, [sessionId, visitorName, visitorEmail, storageKey])

  // ─── Fetch messages (polling) ───────────────────────────────────────────
  const fetchMessages = useCallback(async (sid: string) => {
    try {
      // Determine `since` from last message we have
      const last = messages[messages.length - 1]
      const sinceParam = last ? `?since=${encodeURIComponent(last.createdAt)}` : ''
      const res = await fetch(`/api/public/chat/${sid}/messages${sinceParam}`)
      if (!res.ok) return
      const data = await res.json()
      const incoming: ChatMessage[] = data.messages || []
      if (incoming.length === 0) return

      setMessages((prev) => {
        const existing = new Set(prev.map((m) => m.id))
        const fresh = incoming.filter((m) => !existing.has(m.id))
        return [...prev, ...fresh]
      })

      // If a system message says "ended by visitor" or admin closed, mark offline.
      const hasClose = incoming.some(
        (m) => m.senderType === 'system' && /ended|closed/i.test(m.body),
      )
      if (hasClose) setAdminOnline(false)
    } catch {
      // silent — poll will retry
    }
  }, [messages])

  // ─── Polling effect when chatting ───────────────────────────────────────
  useEffect(() => {
    if (phase !== 'chatting' || !sessionId) {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }

    // Initial fetch
    fetchMessages(sessionId)

    pollRef.current = setInterval(() => {
      fetchMessages(sessionId)
    }, 4000)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [phase, sessionId, fetchMessages])

  // ─── Auto-scroll to bottom on new messages ──────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Start chat (pre-chat form submit) ──────────────────────────────────
  async function handleStartChat(e: FormEvent) {
    e.preventDefault()
    if (starting) return
    setError(null)

    // Trim + validate email if provided
    const name = visitorName.trim().slice(0, 100)
    const email = visitorEmail.trim().slice(0, 200)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email or leave it blank.')
      return
    }

    setStarting(true)
    try {
      // 1. Create session
      const sessionRes = await fetch('/api/public/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug,
          visitorName: name || undefined,
          visitorEmail: email || undefined,
          metadata: {
            currentPage: typeof window !== 'undefined' ? window.location.pathname : '',
            referrer: typeof window !== 'undefined' ? document.referrer : '',
          },
        }),
      })
      if (!sessionRes.ok) {
        const data = await sessionRes.json().catch(() => ({}))
        throw new Error(data.error || 'Could not start chat')
      }
      const sessionData = await sessionRes.json()
      const newSessionId: string = sessionData.sessionId
      setSessionId(newSessionId)
      setPhase('chatting')
      // Fetch the initial system message ("Chat session started")
      // Use a tiny delay to let the DB write commit.
      setTimeout(() => fetchMessages(newSessionId), 200)
      // Focus the input
      setTimeout(() => inputRef.current?.focus(), 300)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start chat. Please try again.')
    } finally {
      setStarting(false)
    }
  }

  // ─── Send a visitor message ─────────────────────────────────────────────
  async function handleSend(e?: FormEvent) {
    e?.preventDefault()
    const text = inputText.trim()
    if (!text || !sessionId || sending) return
    if (text.length > 5000) {
      setError('Message too long (max 5000 chars).')
      return
    }
    setError(null)
    setSending(true)
    setInputText('')

    // Optimistic message
    const optimistic: ChatMessage = {
      id: `temp_${Date.now()}`,
      senderType: 'visitor',
      senderName: visitorName || null,
      body: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const res = await fetch(`/api/public/chat/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: text,
          visitorName: visitorName || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send')
      }
      // Replace optimistic with the real createdAt from server
      const data = await res.json()
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id
            ? { ...m, id: data.messageId || m.id, createdAt: data.createdAt || m.createdAt }
            : m,
        ),
      )
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id ? { ...m, body: `${m.body} [failed to send]` } : m,
        ),
      )
      setError(err instanceof Error ? err.message : 'Failed to send message.')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  // ─── End chat ────────────────────────────────────────────────────────────
  async function handleEndChat() {
    if (!sessionId) return
    if (!confirm('End this chat session? You can start a new one later.')) return
    try {
      await fetch(`/api/public/chat/${sessionId}/close`, { method: 'POST' })
    } catch {
      // ignore — server-side state will reflect on next poll
    }
    // Clear local state
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey)
    }
    setSessionId(null)
    setMessages([])
    setPhase('closed')
    setVisitorName('')
    setVisitorEmail('')
    setAdminOnline(true)
    setError(null)
  }

  // ─── Close widget (minimize) — keep session ─────────────────────────────
  function handleCloseWidget() {
    setPhase('closed')
  }

  function handleOpenWidget() {
    setPhase(sessionId ? 'chatting' : 'prechat')
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  // Floating launcher button (only shown when widget is closed)
  if (phase === 'closed') {
    return (
      <button
        type="button"
        onClick={handleOpenWidget}
        aria-label={`Chat with ${businessName || 'this business'}`}
        className="fixed bottom-5 right-5 z-[80] flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-700/30 transition-all hover:bg-emerald-800 hover:shadow-xl hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
      >
        <MessageSquare className="h-5 w-5" />
        <span className="hidden sm:inline">Chat with us</span>
        <span className="sm:hidden">Chat</span>
        {sessionId && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-300 border-2 border-emerald-700" />
          </span>
        )}
      </button>
    )
  }

  // Open panel (prechat or chatting)
  return (
    <div
      role="dialog"
      aria-label={`Live chat with ${businessName || 'business'}`}
      className="fixed inset-x-0 bottom-0 z-[80] flex flex-col bg-white shadow-2xl border-t border-slate-200 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:rounded-2xl sm:border sm:overflow-hidden"
      style={{ maxHeight: 'min(85vh, 600px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-emerald-700 px-4 py-3 text-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">
              {businessName || 'Live Chat'}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-100">
              <Circle className={`h-2 w-2 fill-current ${adminOnline ? 'text-emerald-300' : 'text-slate-400'}`} />
              {adminOnline ? 'We typically reply in a few minutes' : 'Chat ended'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {phase === 'chatting' && sessionId && (
            <button
              type="button"
              onClick={handleEndChat}
              aria-label="End chat"
              title="End chat"
              className="rounded-md p-1.5 text-emerald-100 hover:bg-emerald-600 hover:text-white transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleCloseWidget}
            aria-label="Close chat"
            title="Minimize"
            className="rounded-md p-1.5 text-emerald-100 hover:bg-emerald-600 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      {phase === 'prechat' ? (
        <PrechatForm
          visitorName={visitorName}
          visitorEmail={visitorEmail}
          onNameChange={setVisitorName}
          onEmailChange={setVisitorEmail}
          onSubmit={handleStartChat}
          starting={starting}
          error={error}
          businessName={businessName}
        />
      ) : (
        <ChatPanel
          messages={messages}
          inputText={inputText}
          onInputChange={setInputText}
          onSend={handleSend}
          sending={sending}
          error={error}
          messagesEndRef={messagesEndRef}
          inputRef={inputRef}
          closed={!adminOnline}
        />
      )}
    </div>
  )
}

// ─── Pre-chat form (name + email optional) ────────────────────────────────

interface PrechatFormProps {
  visitorName: string
  visitorEmail: string
  onNameChange: (v: string) => void
  onEmailChange: (v: string) => void
  onSubmit: (e: FormEvent) => void
  starting: boolean
  error: string | null
  businessName?: string
}

function PrechatForm({
  visitorName,
  visitorEmail,
  onNameChange,
  onEmailChange,
  onSubmit,
  starting,
  error,
  businessName,
}: PrechatFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-y-auto p-4">
      <div className="flex-1 space-y-4">
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-900">
          <p className="font-semibold mb-1">Hi there! 👋</p>
          <p className="text-emerald-800">
            Have a question for {businessName || 'us'}? Start a chat and we&apos;ll get back to you shortly.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="chat-name" className="block text-xs font-medium text-slate-700 mb-1">
              Your name <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="chat-name"
              type="text"
              value={visitorName}
              onChange={(e) => onNameChange(e.target.value)}
              maxLength={100}
              placeholder="e.g. John Smith"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              disabled={starting}
            />
          </div>
          <div>
            <label htmlFor="chat-email" className="block text-xs font-medium text-slate-700 mb-1">
              Email <span className="text-slate-400">(optional — for follow-up)</span>
            </label>
            <input
              id="chat-email"
              type="email"
              value={visitorEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              maxLength={200}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              disabled={starting}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 p-2.5 text-xs text-red-700">
            {error}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={starting}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {starting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Starting chat…
          </>
        ) : (
          <>
            Start chat
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  )
}

// ─── Chat panel (message list + input) ────────────────────────────────────

interface ChatPanelProps {
  messages: ChatMessage[]
  inputText: string
  onInputChange: (v: string) => void
  onSend: (e?: FormEvent) => void
  sending: boolean
  error: string | null
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  inputRef: React.RefObject<HTMLInputElement | null>
  closed: boolean
}

function ChatPanel({
  messages,
  inputText,
  onInputChange,
  onSend,
  sending,
  error,
  messagesEndRef,
  inputRef,
  closed,
}: ChatPanelProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-3" style={{ minHeight: '200px' }}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
            <MessageSquare className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-xs">Say hello to start the conversation</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-1.5 bg-red-50 border-t border-red-100 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={onSend}
        className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={closed ? 'Chat ended — start a new one from the menu' : 'Type your message…'}
          disabled={sending || closed}
          maxLength={5000}
          className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={sending || !inputText.trim() || closed}
          aria-label="Send message"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.senderType === 'system') {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-full bg-slate-200 px-3 py-0.5 text-[11px] text-slate-600">
          {message.body}
        </span>
      </div>
    )
  }

  const isVisitor = message.senderType === 'visitor'
  return (
    <div className={`flex ${isVisitor ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isVisitor ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isVisitor && message.senderName && (
          <span className="mb-0.5 px-1 text-[10px] font-medium text-slate-500">
            {message.senderName}
          </span>
        )}
        <div
          className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
            isVisitor
              ? 'bg-emerald-700 text-white rounded-br-sm'
              : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm'
          }`}
        >
          {message.body}
        </div>
        <span className="mt-0.5 px-1 text-[10px] text-slate-400">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    const date = new Date(iso)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
