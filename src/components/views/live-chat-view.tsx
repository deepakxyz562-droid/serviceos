'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  MessageSquare,
  Send,
  X,
  Phone,
  Mail,
  Clock,
  Circle,
  ChevronLeft,
  Sparkles,
  FileText,
  Loader2,
  Volume2,
  VolumeX,
  Search,
  PlusCircle,
  Calendar,
  Copy,
  Check,
  Info,
  ShieldCheck,
  User,
  Globe,
  Laptop,
  CheckCheck,
  ArrowRight,
  ShoppingBag,
  BookOpen,
  Package,
  Truck,
  MessageCircle,
  Bot,
  Layers,
  Inbox,
  CheckCircle2,
  ChevronDown,
  Hash,
  Instagram,
  Tag,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { authFetch } from '@/lib/api'

export type TidioView =
  | 'all'
  | 'unassigned'
  | 'my_open'
  | 'solved'
  | 'lyro_ai'
  | 'view_products'
  | 'view_order_status'
  | 'view_order_issues'
  | 'view_shipping'
  | 'channel_whatsapp'
  | 'channel_web'
  | 'channel_instagram'
  | 'channel_messenger';

interface ChatSession {
  id: string
  visitorName: string | null
  visitorPhone: string | null
  visitorEmail: string | null
  status: string // 'active' | 'claimed' | 'waiting_for_agent' | 'closed'
  unreadCount: number
  lastMessageAt: string | null
  createdAt: string
  lastMessage: { body: string; senderType: string; createdAt: string } | null
  formId?: string | null
  formName?: string | null
  workspaceId?: string | null
  metadataJson?: string
}

interface ChatMessage {
  id: string
  senderType: string // 'visitor' | 'admin' | 'system'
  senderName: string | null
  body: string
  createdAt: string
  readAt?: string | null
}

const CANNED_RESPONSES = [
  { label: '👋 Greeting', text: 'Hello! Thanks for reaching out. How can I assist you today?' },
  { label: '🔍 Checking', text: 'Let me look into that for you right now, one moment please.' },
  { label: '📅 Booking', text: 'Would you like to schedule an appointment with our team? We have slots available this week.' },
  { label: '📧 Contact', text: 'Could you please confirm your email address and phone number so we can follow up if needed?' },
  { label: '🙏 Closing', text: 'Thank you for chatting with us! Have a wonderful day, and feel free to reach back out anytime.' },
]

/**
 * Text.com / LiveChat Operator Console Parity View
 *
 * Professional 3-pane live chat workspace:
 * 1. Queue Pane: real-time sessions with search, filters, unread counters, and sound chime.
 * 2. Conversation Stream: real-time message exchange, canned response macros, and AI copilot.
 * 3. Visitor Context Panel: metadata, origin form, location, device, and quick actions.
 */
export function LiveChatView() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [filter, setFilter] = useState<'active' | 'closed' | 'all'>('active')
  const [tidioView, setTidioView] = useState<TidioView>('all')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [detailsOpen, setDetailsOpen] = useState(true)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [sessionNotes, setSessionNotes] = useState<Record<string, string>>({})

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const prevWaitingCountRef = useRef<number>(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  // Melodic Web Audio chime (G5 -> C6) for new incoming visitor chats
  const playEscalationChime = useCallback(() => {
    if (!soundEnabled || typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime

      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(784, now) // G5
      gain1.gain.setValueAtTime(0.2, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.3)

      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(1046.5, now + 0.12) // C6
      gain2.gain.setValueAtTime(0.25, now + 0.12)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.12)
      osc2.stop(now + 0.55)
    } catch {
      // Audio context guard
    }
  }, [soundEnabled])

  // AI assistant state: Suggested Replies (3 tones) + Summarize
  const [aiReplies, setAiReplies] = useState<{ text: string; tone: string }[] | null>(null)
  const [aiRepliesLoading, setAiRepliesLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Check URL query param ?session=<id> on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const sessionParam = params.get('session')
      if (sessionParam) {
        setSelectedSessionId(sessionParam)
      }
    }
  }, [])

  // Fetch session list
  const fetchSessions = useCallback(async () => {
    try {
      const res = await authFetch(`/api/chat/sessions?status=${filter}`)
      if (!res.ok) return
      const data = await res.json()
      const list: ChatSession[] = data.sessions || []
      const waitingCount = list.filter((s) => s.status === 'waiting_for_agent').length

      // Play audio chime when waiting sessions increase
      if (prevWaitingCountRef.current !== -1 && waitingCount > prevWaitingCountRef.current) {
        playEscalationChime()
        toast.info('New visitor waiting for live operator!', {
          description: 'A customer has requested human assistance.',
        })
      }
      prevWaitingCountRef.current = waitingCount

      setSessions(list)
    } catch {
      // silent network catch
    } finally {
      setLoading(false)
    }
  }, [filter, playEscalationChime])

  useEffect(() => {
    setLoading(true)
    fetchSessions()
    const interval = setInterval(() => {
      fetchSessions()
    }, 5000)

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchSessions()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchSessions])

  // Fetch messages for selected session
  const fetchMessages = useCallback(async (sessionId: string, since?: string) => {
    try {
      const params = since ? `?since=${encodeURIComponent(since)}` : ''
      const res = await authFetch(`/api/chat/sessions/${sessionId}/messages${params}`)
      if (!res.ok) return
      const data = await res.json()
      if (since) {
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id))
          const newMsgs = (data.messages || []).filter((m: ChatMessage) => !existing.has(m.id))
          return [...prev, ...newMsgs]
        })
      } else {
        setMessages(data.messages || [])
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    setAiReplies(null)
    setAiSummary(null)
    setAiError(null)

    if (!selectedSessionId) {
      setMessages([])
      return
    }

    setLoadingMessages(true)
    fetchMessages(selectedSessionId).finally(() => setLoadingMessages(false))

    const lastMsgTime = () => {
      const last = messages[messages.length - 1]
      return last ? last.createdAt : undefined
    }

    pollRef.current = setInterval(() => {
      fetchMessages(selectedSessionId, lastMsgTime())
    }, 3000)

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchMessages(selectedSessionId, lastMsgTime())
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [selectedSessionId, fetchMessages])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send admin reply
  async function handleSend(customText?: string) {
    const textToSend = (customText !== undefined ? customText : inputText).trim()
    if (!textToSend || !selectedSessionId || sending) return

    setSending(true)
    setInputText('')

    const optimistic: ChatMessage = {
      id: `temp_${Date.now()}`,
      senderType: 'admin',
      senderName: 'You',
      body: textToSend,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const res = await authFetch(`/api/chat/sessions/${selectedSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: textToSend }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send')
      }
      const data = await res.json()
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? data.message : m)))
      fetchSessions()
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...m, body: `${m.body} [Failed to send]` } : m))
      )
      toast.error('Failed to send message', {
        description: err instanceof Error ? err.message : 'Please check your connection.',
      })
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  // Simulate a live visitor chat session
  async function handleSimulateTest() {
    setSimulating(true)
    try {
      const res = await authFetch('/api/chat/simulate-test', { method: 'POST' })
      if (!res.ok) {
        throw new Error('Simulation failed')
      }
      const data = await res.json()
      toast.success('Simulated visitor chat created!', {
        description: `Incoming chat from ${data.session.visitorName || 'Visitor'}.`,
      })
      playEscalationChime()
      await fetchSessions()
      if (data.session?.id) {
        setSelectedSessionId(data.session.id)
      }
    } catch (err) {
      toast.error('Could not simulate test chat', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setSimulating(false)
    }
  }

  // AI Suggest Reply
  async function handleAiSuggestReply() {
    if (!selectedSessionId || aiRepliesLoading) return
    setAiRepliesLoading(true)
    setAiError(null)
    setAiReplies(null)
    try {
      const res = await authFetch('/api/ai/chat-suggested-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: selectedSessionId, messageType: 'reply' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `Failed to generate AI replies (${res.status})`)
      }
      setAiReplies(Array.isArray(data.replies) ? data.replies : [])
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI suggestions currently unavailable')
    } finally {
      setAiRepliesLoading(false)
    }
  }

  // AI Summarize
  async function handleAiSummarize() {
    if (!selectedSessionId || aiSummaryLoading) return
    setAiSummaryLoading(true)
    setAiError(null)
    setAiSummary(null)
    try {
      const res = await authFetch('/api/ai/chat-suggested-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: selectedSessionId, messageType: 'summary' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `Failed to summarize (${res.status})`)
      }
      setAiSummary(typeof data.summary === 'string' ? data.summary : '')
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI summary failed')
    } finally {
      setAiSummaryLoading(false)
    }
  }

  // Claim Chat
  async function handleClaimSession() {
    if (!selectedSessionId) return
    try {
      await authFetch(`/api/chat/sessions/${selectedSessionId}/claim`, { method: 'POST' })
      toast.success('You have claimed this chat session!')
      fetchSessions()
      fetchMessages(selectedSessionId)
    } catch {
      toast.error('Failed to claim session')
    }
  }

  // Hand Back to AI
  async function handleHandBackToBot() {
    if (!selectedSessionId) return
    try {
      await authFetch(`/api/chat/sessions/${selectedSessionId}/claim?action=hand_back_to_bot`, { method: 'POST' })
      toast.info('Conversation returned to AI Assistant')
      fetchSessions()
      fetchMessages(selectedSessionId)
    } catch {
      toast.error('Failed to hand back to AI')
    }
  }

  // Close Session
  async function handleCloseSession() {
    if (!selectedSessionId) return
    if (!confirm('Are you sure you want to end and close this live chat session?')) return
    try {
      await authFetch(`/api/chat/sessions/${selectedSessionId}/claim?action=close`, { method: 'POST' })
      toast.success('Chat session closed')
      fetchSessions()
      setSelectedSessionId(null)
    } catch {
      toast.error('Failed to close session')
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedField(label)
      toast.success(`Copied ${label} to clipboard!`)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }

  // Tidio Counts (Take.app & Tidio Suite Parity)
  const counts = useMemo(() => {
    let unassigned = 0
    let myOpen = 0
    let solved = 0
    let lyroAi = 0
    let products = 0
    let orderStatus = 0
    let orderIssues = 0
    let shipping = 0
    let whatsapp = 0
    let web = 0

    sessions.forEach((s) => {
      if (s.status === 'waiting_for_agent' || s.status === 'active') unassigned++
      if (s.status === 'claimed') myOpen++
      if (s.status === 'closed') solved++
      if (s.status !== 'claimed') lyroAi++

      const text = `${s.lastMessage?.body || ''} ${s.formName || ''}`.toLowerCase()
      if (/(product|price|menu|cake|pizza|item|buy|cost|catalog|stock)/i.test(text)) products++
      if (/(order|status|where|tracking|track|ready|prepare|deliver)/i.test(text)) orderStatus++
      if (/(return|refund|cancel|wrong|broken|damaged|delay|late|missing|complaint)/i.test(text)) orderIssues++
      if (/(shipping|delivery|address|area|pincode|charge|ship|courier|pickup)/i.test(text)) shipping++

      if (s.visitorPhone) whatsapp++
      else web++
    })

    return {
      all: sessions.length,
      unassigned,
      myOpen,
      solved,
      lyroAi,
      products,
      orderStatus,
      orderIssues,
      shipping,
      whatsapp,
      web,
    }
  }, [sessions])

  // Filtered session list based on search, filter, and Tidio view
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // 1. Tidio folder filter
      if (tidioView === 'unassigned') {
        if (s.status !== 'waiting_for_agent' && s.status !== 'active') return false
      } else if (tidioView === 'my_open') {
        if (s.status !== 'claimed') return false
      } else if (tidioView === 'solved') {
        if (s.status !== 'closed') return false
      } else if (tidioView === 'lyro_ai') {
        if (s.status === 'claimed') return false
      } else if (tidioView === 'view_products') {
        const text = `${s.lastMessage?.body || ''} ${s.formName || ''}`.toLowerCase()
        if (!/(product|price|menu|cake|pizza|item|buy|cost|catalog|stock)/i.test(text)) return false
      } else if (tidioView === 'view_order_status') {
        const text = `${s.lastMessage?.body || ''} ${s.formName || ''}`.toLowerCase()
        if (!/(order|status|where|tracking|track|ready|prepare|deliver)/i.test(text)) return false
      } else if (tidioView === 'view_order_issues') {
        const text = `${s.lastMessage?.body || ''} ${s.formName || ''}`.toLowerCase()
        if (!/(return|refund|cancel|wrong|broken|damaged|delay|late|missing|complaint)/i.test(text)) return false
      } else if (tidioView === 'view_shipping') {
        const text = `${s.lastMessage?.body || ''} ${s.formName || ''}`.toLowerCase()
        if (!/(shipping|delivery|address|area|pincode|charge|ship|courier|pickup)/i.test(text)) return false
      } else if (tidioView === 'channel_whatsapp') {
        if (!s.visitorPhone) return false
      } else if (tidioView === 'channel_web') {
        if (s.visitorPhone) return false
      }

      // 2. Search query filter
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      const name = (s.visitorName || '').toLowerCase()
      const email = (s.visitorEmail || '').toLowerCase()
      const phone = (s.visitorPhone || '').toLowerCase()
      const body = (s.lastMessage?.body || '').toLowerCase()
      const form = (s.formName || '').toLowerCase()
      return name.includes(q) || email.includes(q) || phone.includes(q) || body.includes(q) || form.includes(q)
    })
  }, [sessions, tidioView, searchQuery])

  const selectedSession = sessions.find((s) => s.id === selectedSessionId)

  // Parse session metadata if available
  const parsedMetadata = useMemo(() => {
    if (!selectedSession?.metadataJson) return {}
    try {
      return JSON.parse(selectedSession.metadataJson) as Record<string, string>
    } catch {
      return {}
    }
  }, [selectedSession?.metadataJson])

  const waitingCount = sessions.filter((s) => s.status === 'waiting_for_agent').length

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background overflow-hidden border-t">
      {/* ── TIDIO INBOX NAV PANE (Tidio Parity) ── */}
      <div className="hidden md:flex flex-col w-60 border-r bg-muted/20 shrink-0 select-none text-xs">
        {/* Tidio Top Search / Title */}
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="size-4 text-emerald-600" />
            <span className="font-bold text-foreground">Inbox</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono font-bold text-muted-foreground">
            {sessions.length} total
          </Badge>
        </div>

        <ScrollArea className="flex-1 min-h-0 py-2">
          {/* Section: Live Conversations */}
          <div className="px-3 py-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Live Conversations
            </span>
            <div className="mt-1 space-y-0.5">
              {[
                { id: 'all', label: 'All Conversations', icon: MessageSquare, count: counts.all },
                { id: 'unassigned', label: 'Unassigned', icon: Circle, count: counts.unassigned, pulse: counts.unassigned > 0 },
                { id: 'my_open', label: 'My open', icon: CheckCheck, count: counts.myOpen },
                { id: 'solved', label: 'Solved', icon: CheckCircle2, count: counts.solved },
              ].map((item) => {
                const Icon = item.icon
                const active = tidioView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setTidioView(item.id as TidioView)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      active
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={`size-3.5 ${item.pulse ? 'text-amber-500 fill-amber-500' : ''}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                          active
                            ? 'bg-emerald-600 text-white'
                            : item.pulse
                            ? 'bg-amber-500 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section: Lyro AI Agent */}
          <div className="px-3 py-1.5 pt-3 border-t border-border/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1">
              <Bot className="size-3 text-purple-600" />
              Lyro AI Agent
            </span>
            <div className="mt-1 space-y-0.5">
              <button
                onClick={() => setTidioView('lyro_ai')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  tidioView === 'lyro_ai'
                    ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Sparkles className="size-3.5 text-purple-600" />
                  <span className="truncate">Autonomous AI</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-muted text-muted-foreground">
                  {counts.lyroAi}
                </span>
              </button>
            </div>
          </div>

          {/* Section: Views (Tidio E-Commerce Smart Folders) */}
          <div className="px-3 py-1.5 pt-3 border-t border-border/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Views
            </span>
            <div className="mt-1 space-y-0.5">
              {[
                { id: 'view_products', label: '🛍️ Products', count: counts.products },
                { id: 'view_order_status', label: '📖 Order status', count: counts.orderStatus },
                { id: 'view_order_issues', label: '📦 Order issues', count: counts.orderIssues },
                { id: 'view_shipping', label: '🚚 Shipping policy', count: counts.shipping },
              ].map((item) => {
                const active = tidioView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setTidioView(item.id as TidioView)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      active
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.count > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-muted text-muted-foreground">
                        {item.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section: Channels */}
          <div className="px-3 py-1.5 pt-3 border-t border-border/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Channels
            </span>
            <div className="mt-1 space-y-0.5">
              {[
                { id: 'channel_whatsapp', label: 'WhatsApp', icon: MessageCircle, count: counts.whatsapp, color: 'text-emerald-600' },
                { id: 'channel_web', label: 'Live Chat (Web)', icon: Globe, count: counts.web, color: 'text-blue-600' },
                { id: 'channel_instagram', label: 'Instagram', icon: Instagram, count: 0, color: 'text-pink-600' },
                { id: 'channel_messenger', label: 'Messenger', icon: MessageSquare, count: 0, color: 'text-indigo-600' },
              ].map((item) => {
                const Icon = item.icon
                const active = tidioView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setTidioView(item.id as TidioView)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      active
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={`size-3.5 ${item.color}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.count > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-muted text-muted-foreground">
                        {item.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* ── LEFT PANE: Session Queue (Text.com Parity) ── */}
      <div
        className={`${
          selectedSessionId ? 'hidden lg:flex' : 'flex'
        } flex-col w-full lg:w-88 border-r shrink-0 bg-card/60 backdrop-blur-xs select-none`}
      >
        {/* Header Strip */}
        <div className="p-3.5 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                <MessageSquare className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-foreground truncate max-w-[150px]">
                  {tidioView === 'all'
                    ? 'All Live Chats'
                    : tidioView === 'unassigned'
                    ? 'Unassigned'
                    : tidioView === 'my_open'
                    ? 'My Open'
                    : tidioView === 'solved'
                    ? 'Solved'
                    : tidioView === 'lyro_ai'
                    ? 'Lyro AI Handled'
                    : tidioView === 'view_products'
                    ? '🛍️ Products'
                    : tidioView === 'view_order_status'
                    ? '📖 Order Status'
                    : tidioView === 'view_order_issues'
                    ? '📦 Order Issues'
                    : tidioView === 'view_shipping'
                    ? '🚚 Shipping'
                    : tidioView === 'channel_whatsapp'
                    ? 'WhatsApp'
                    : 'Live Web'}
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>{filteredSessions.length} conversations</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={() => setSoundEnabled((prev) => !prev)}
                title={soundEnabled ? 'Chime alerts enabled (Click to mute)' : 'Chime alerts muted (Click to unmute)'}
              >
                {soundEnabled ? <Volume2 className="size-4 text-emerald-600" /> : <VolumeX className="size-4 text-muted-foreground" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs font-medium border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                onClick={handleSimulateTest}
                disabled={simulating}
                title="Create a simulated visitor chat to test live interactions"
              >
                {simulating ? <Loader2 className="size-3.5 animate-spin" /> : <PlusCircle className="size-3.5" />}
                <span className="hidden sm:inline">Test Chat</span>
              </Button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search visitors, messages, emails…"
              className="h-8 pl-8 text-xs bg-background/80"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex rounded-lg bg-muted p-0.5 text-xs">
            {(['active', 'closed', 'all'] as const).map((tab) => {
              const count =
                tab === 'active'
                  ? sessions.filter((s) => s.status !== 'closed').length
                  : tab === 'closed'
                  ? sessions.filter((s) => s.status === 'closed').length
                  : sessions.length
              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`flex-1 py-1 px-2 font-medium capitalize rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    filter === tab
                      ? 'bg-background text-foreground shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      tab === 'active' && waitingCount > 0
                        ? 'bg-amber-500 text-white font-bold animate-pulse'
                        : 'bg-muted-foreground/15 text-muted-foreground'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Sessions Scrollable List */}
        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="p-3 space-y-2.5">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-8 text-center space-y-3 text-muted-foreground">
              <div className="size-12 rounded-full bg-muted/60 mx-auto flex items-center justify-center text-muted-foreground/50">
                <MessageSquare className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">No {filter} chat sessions found</p>
                <p className="text-[11px] leading-relaxed">
                  {searchQuery ? 'Try matching another name or keyword.' : 'Waiting for incoming visitors from your website widget.'}
                </p>
              </div>
              {!searchQuery && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSimulateTest}
                  disabled={simulating}
                  className="text-xs gap-1.5 h-8 mt-2"
                >
                  <PlusCircle className="size-3.5 text-emerald-600" />
                  Simulate Test Visitor
                </Button>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredSessions.map((s) => {
                const isSelected = selectedSessionId === s.id
                const isWaiting = s.status === 'waiting_for_agent'
                const isClaimed = s.status === 'claimed'
                const initials = (s.visitorName || 'Visitor')
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()

                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSessionId(s.id)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all relative ${
                      isSelected
                        ? 'bg-accent/80 border-emerald-500/40 shadow-2xs'
                        : 'border-transparent hover:bg-accent/40 hover:border-border/60'
                    } ${isWaiting ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300/40' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Avatar */}
                      <div className="relative shrink-0 mt-0.5">
                        <div
                          className={`size-9 rounded-full flex items-center justify-center font-bold text-xs ${
                            isWaiting
                              ? 'bg-amber-500 text-white'
                              : isClaimed
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {initials || <User className="size-4" />}
                        </div>
                        {/* Status Dot */}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background ${
                            isWaiting
                              ? 'bg-amber-500 animate-pulse'
                              : isClaimed
                              ? 'bg-blue-500'
                              : s.status === 'active'
                              ? 'bg-emerald-500'
                              : 'bg-slate-400'
                          }`}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-semibold text-xs text-foreground truncate">
                            {s.visitorName || 'Anonymous Visitor'}
                          </span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {s.lastMessageAt ? formatTime(s.lastMessageAt) : ''}
                          </span>
                        </div>

                        {s.formName && (
                          <div className="inline-flex items-center gap-1 text-[9px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.2 rounded mb-1 truncate max-w-full">
                            <FileText className="size-2.5 shrink-0" />
                            <span className="truncate">{s.formName}</span>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground line-clamp-1 leading-snug">
                          {s.lastMessage?.senderType === 'admin' ? (
                            <span className="font-medium text-foreground">You: </span>
                          ) : null}
                          {s.lastMessage?.body || 'No messages yet'}
                        </p>

                        <div className="flex items-center justify-between mt-1.5 pt-0.5">
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full ${
                              isWaiting
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold'
                                : isClaimed
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                : s.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {isWaiting
                              ? 'Needs Agent'
                              : isClaimed
                              ? 'Claimed (In Progress)'
                              : s.status === 'active'
                              ? 'Waiting'
                              : 'Closed'}
                          </span>

                          {s.unreadCount > 0 && (
                            <Badge className="bg-emerald-600 text-white text-[10px] h-4 min-w-4 px-1 flex items-center justify-center font-bold">
                              {s.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── MIDDLE PANE: Active Chat Conversation Stream ── */}
      <div
        className={`${
          selectedSessionId ? 'flex' : 'hidden lg:flex'
        } flex-col flex-1 min-w-0 bg-background relative`}
      >
        {!selectedSession ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="size-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="size-8" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="font-semibold text-base">Select a conversation</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Choose a customer from the left queue to answer inquiries, suggest AI replies, or test live interactions.
              </p>
            </div>
            <Button
              onClick={handleSimulateTest}
              disabled={simulating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-8 font-medium shadow-2xs"
            >
              {simulating ? <Loader2 className="size-3.5 animate-spin" /> : <PlusCircle className="size-3.5" />}
              Launch Instant Test Chat
            </Button>
          </div>
        ) : (
          <>
            {/* Conversation Header */}
            <div className="h-14 px-4 border-b flex items-center justify-between shrink-0 bg-card/40">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden size-8 -ml-1 text-muted-foreground"
                  onClick={() => setSelectedSessionId(null)}
                >
                  <ChevronLeft className="size-4" />
                </Button>

                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                    {(selectedSession.visitorName || 'V')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">
                        {selectedSession.visitorName || 'Anonymous Visitor'}
                      </h3>
                      <Badge
                        variant={
                          selectedSession.status === 'waiting_for_agent'
                            ? 'destructive'
                            : selectedSession.status === 'claimed'
                            ? 'default'
                            : 'secondary'
                        }
                        className="text-[10px] px-1.5 py-0 capitalize"
                      >
                        {selectedSession.status === 'waiting_for_agent' ? 'Needs Agent' : selectedSession.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      {selectedSession.visitorEmail && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="size-3" />
                          {selectedSession.visitorEmail}
                        </span>
                      )}
                      {selectedSession.visitorPhone && (
                        <span className="hidden sm:flex items-center gap-1">
                          <Phone className="size-3" />
                          {selectedSession.visitorPhone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAiSummarize}
                  disabled={aiSummaryLoading || messages.length === 0}
                  className="h-8 text-xs gap-1 font-medium text-emerald-700 dark:text-emerald-400 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  title="Summarize conversation with AI"
                >
                  {aiSummaryLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  <span className="hidden md:inline">Summarize</span>
                </Button>

                {selectedSession.status === 'waiting_for_agent' || selectedSession.status === 'active' ? (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-medium"
                    onClick={handleClaimSession}
                  >
                    Claim Chat
                  </Button>
                ) : selectedSession.status === 'claimed' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs h-8"
                    onClick={handleHandBackToBot}
                  >
                    Hand Back to AI
                  </Button>
                ) : null}

                {selectedSession.status !== 'closed' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={handleCloseSession}
                    title="Close session"
                  >
                    <X className="size-4" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className={`size-8 hidden sm:flex ${detailsOpen ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-muted-foreground'}`}
                  onClick={() => setDetailsOpen((prev) => !prev)}
                  title="Toggle customer details panel"
                >
                  <Info className="size-4" />
                </Button>
              </div>
            </div>

            {/* AI Summary Banner */}
            {(aiSummary || aiSummaryLoading) && (
              <div className="px-4 py-2 border-b bg-emerald-50/70 dark:bg-emerald-950/40 animate-in fade-in duration-200">
                <div className="flex items-start gap-2.5 text-xs text-foreground">
                  <Sparkles className="size-4 mt-0.5 text-emerald-600 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300">AI Conversation Summary: </span>
                    {aiSummaryLoading ? (
                      <span className="text-muted-foreground inline-flex items-center gap-1.5">
                        <Loader2 className="size-3 animate-spin" />
                        Analyzing customer request…
                      </span>
                    ) : (
                      <span>{aiSummary}</span>
                    )}
                  </div>
                  {!aiSummaryLoading && (
                    <button onClick={() => setAiSummary(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Messages Scroll Area */}
            <ScrollArea className="flex-1 p-4 min-h-0 bg-linear-to-b from-muted/10 to-background">
              {loadingMessages ? (
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                      <Skeleton className="h-14 w-2/3 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-16">
                  No messages yet. Send a greeting below!
                </div>
              ) : (
                <div className="space-y-3.5 max-w-3xl mx-auto">
                  {messages.map((msg) => (
                    <MessageRow key={msg.id} message={msg} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Composer Section */}
            {selectedSession.status !== 'closed' ? (
              <div className="p-3 border-t bg-card/60 space-y-2.5">
                {/* AI Suggested Replies Shelf */}
                {aiReplies && aiReplies.length > 0 && (
                  <div className="rounded-lg border bg-background/95 p-2.5 space-y-2 shadow-xs animate-in slide-in-from-bottom-2 duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <Sparkles className="size-3.5" />
                        <span>AI Suggested Responses (Click to insert)</span>
                      </div>
                      <button onClick={() => setAiReplies(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="size-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {aiReplies.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInputText(r.text)
                            setAiReplies(null)
                            inputRef.current?.focus()
                          }}
                          className="text-left p-2 rounded-md border bg-muted/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 transition-colors group"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-emerald-700">
                              {r.tone}
                            </span>
                            <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                          </div>
                          <p className="text-xs text-foreground line-clamp-2 leading-relaxed">{r.text}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Error Alert */}
                {aiError && (
                  <div className="flex items-center justify-between p-2 rounded-md bg-destructive/10 text-destructive text-xs">
                    <span>{aiError}</span>
                    <button onClick={() => setAiError(null)}>
                      <X className="size-3" />
                    </button>
                  </div>
                )}

                {/* Canned Quick Responses Ribbon */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
                    Canned:
                  </span>
                  {CANNED_RESPONSES.map((cr, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(cr.text)}
                      className="px-2.5 py-1 rounded-full border bg-background hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-400 text-xs text-foreground shrink-0 transition-colors shadow-2xs font-medium"
                    >
                      {cr.label}
                    </button>
                  ))}
                </div>

                {/* Input Controls */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      ref={inputRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                      placeholder="Type your message… (Press Enter to send)"
                      className="h-10 text-xs sm:text-sm pl-3 pr-10 bg-background"
                      disabled={sending}
                    />
                    <button
                      onClick={handleAiSuggestReply}
                      disabled={aiRepliesLoading || sending || messages.length === 0}
                      className="absolute right-2 top-2 size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-emerald-600 transition-colors"
                      title="Generate AI response suggestions"
                    >
                      {aiRepliesLoading ? <Loader2 className="size-4 animate-spin text-emerald-600" /> : <Sparkles className="size-4" />}
                    </button>
                  </div>

                  <Button
                    onClick={() => handleSend()}
                    disabled={sending || !inputText.trim()}
                    className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs gap-1.5 shadow-2xs"
                  >
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    <span>Send</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 border-t bg-muted/30 text-center text-xs text-muted-foreground">
                This chat session is closed. Select another session or start a test chat.
              </div>
            )}
          </>
        )}
      </div>

      {/* ── RIGHT PANE: Customer Context & Technical Details (Text.com Parity) ── */}
      {selectedSession && detailsOpen && (
        <div className="w-72 border-l bg-card/40 shrink-0 hidden xl:flex flex-col overflow-y-auto p-4 space-y-5">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              Visitor Profile
            </h4>
            <div className="space-y-3 bg-background rounded-lg border p-3">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                  {(selectedSession.visitorName || 'V')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-foreground truncate">
                    {selectedSession.visitorName || 'Anonymous Visitor'}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Website Visitor</div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t text-xs">
                {selectedSession.visitorEmail && (
                  <div className="flex items-center justify-between group">
                    <span className="text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="size-3" />
                      {selectedSession.visitorEmail}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedSession.visitorEmail!, 'email')}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {copiedField === 'email' ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    </button>
                  </div>
                )}

                {selectedSession.visitorPhone && (
                  <div className="flex items-center justify-between group">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Phone className="size-3" />
                      {selectedSession.visitorPhone}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedSession.visitorPhone!, 'phone')}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {copiedField === 'phone' ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Actions</h4>
            <div className="space-y-1.5">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs gap-2 h-8"
                onClick={() => {
                  const info = `Name: ${selectedSession.visitorName || 'N/A'}\nEmail: ${selectedSession.visitorEmail || 'N/A'}\nPhone: ${selectedSession.visitorPhone || 'N/A'}`
                  copyToClipboard(info, 'contact info')
                }}
              >
                <Copy className="size-3.5 text-muted-foreground" />
                Copy Lead Contact Info
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs gap-2 h-8 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                onClick={() => {
                  const bookingText = 'You can book your preferred appointment slot directly on our schedule here: https://fieseros.com/calendar'
                  handleSend(bookingText)
                }}
              >
                <Calendar className="size-3.5" />
                Share Booking Slot (Calendly)
              </Button>
            </div>
          </div>

          {/* Session & Browser Metadata */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Session Intelligence</h4>
            <div className="bg-background rounded-lg border p-3 space-y-2 text-xs">
              {selectedSession.formName && (
                <div>
                  <span className="text-[10px] text-muted-foreground block">Originating Source</span>
                  <span className="font-medium text-foreground">{selectedSession.formName}</span>
                </div>
              )}
              {parsedMetadata.currentPage && (
                <div>
                  <span className="text-[10px] text-muted-foreground block">Current Page</span>
                  <a
                    href={parsedMetadata.currentPage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-emerald-600 hover:underline truncate block flex items-center gap-1"
                  >
                    <Globe className="size-3 shrink-0" />
                    <span className="truncate">{parsedMetadata.currentPage}</span>
                  </a>
                </div>
              )}
              {parsedMetadata.browser && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Laptop className="size-3" />
                    Browser
                  </span>
                  <span className="font-medium text-foreground">{parsedMetadata.browser}</span>
                </div>
              )}
              {parsedMetadata.city && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Location</span>
                  <span className="font-medium text-foreground">{parsedMetadata.city}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-muted-foreground pt-1 border-t">
                <span>First Seen</span>
                <span className="font-medium text-foreground">{formatTime(selectedSession.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Operator Scratchpad Notes */}
          <div className="space-y-2 flex-1 flex flex-col">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Operator Notes</h4>
            <textarea
              value={sessionNotes[selectedSession.id] || ''}
              onChange={(e) => {
                const val = e.target.value
                setSessionNotes((prev) => ({ ...prev, [selectedSession.id]: val }))
              }}
              placeholder="Add private operator notes for this customer…"
              className="w-full flex-1 min-h-24 p-2 text-xs rounded-lg border bg-background focus:outline-hidden focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function MessageRow({ message }: { message: ChatMessage }) {
  if (message.senderType === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] font-medium text-muted-foreground bg-muted/80 border px-3 py-1 rounded-full shadow-2xs text-center max-w-md">
          {message.body}
        </span>
      </div>
    )
  }

  const isVisitor = message.senderType === 'visitor'

  return (
    <div className={`flex items-end gap-2 ${isVisitor ? 'justify-start' : 'justify-end'}`}>
      {isVisitor && (
        <div className="size-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 mb-1">
          {(message.senderName || 'V')[0].toUpperCase()}
        </div>
      )}

      <div className={`max-w-[78%] sm:max-w-[65%] space-y-1 ${isVisitor ? '' : 'items-end flex flex-col'}`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs break-words font-normal ${
            isVisitor
              ? 'bg-card border border-border/80 text-foreground rounded-bl-xs'
              : 'bg-emerald-600 text-white rounded-br-xs font-medium'
          }`}
        >
          {message.body}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
          {!isVisitor && (
            <>
              <span>You</span>
              <span>·</span>
            </>
          )}
          <span>{formatTime(message.createdAt)}</span>
          {!isVisitor && <CheckCheck className="size-3 text-emerald-600" />}
        </div>
      </div>
    </div>
  )
}

function formatTime(iso: string): string {
  try {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHr / 24)

    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    if (diffDay < 7) return `${diffDay}d ago`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}
