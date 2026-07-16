'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageSquare, Send, X, Phone, Mail, Clock, Circle, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface ChatSession {
  id: string
  visitorName: string | null
  visitorPhone: string | null
  visitorEmail: string | null
  status: string
  unreadCount: number
  lastMessageAt: string | null
  createdAt: string
  lastMessage: { body: string; senderType: string; createdAt: string } | null
}

interface ChatMessage {
  id: string
  senderType: string  // visitor | admin | system
  senderName: string | null
  body: string
  createdAt: string
}

/**
 * Admin Live Chat View
 *
 * Shows visitor chat sessions from the embeddable widget.
 * Two-pane layout: session list (left) + active conversation (right).
 *
 * Polls for new messages every 3 seconds when a session is selected.
 * (socket.io integration is handled by the realtime-service mini-service;
 * this UI uses polling for simplicity and reliability.)
 */
export function LiveChatView() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<'active' | 'closed' | 'all'>('active')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/sessions?status=${filter}`)
      if (!res.ok) return
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    setLoading(true)
    fetchSessions()
    const interval = setInterval(fetchSessions, 5000)  // refresh session list every 5s
    return () => clearInterval(interval)
  }, [fetchSessions])

  // Fetch messages for selected session
  const fetchMessages = useCallback(async (sessionId: string, since?: string) => {
    try {
      const params = since ? `?since=${encodeURIComponent(since)}` : ''
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages${params}`)
      if (!res.ok) return
      const data = await res.json()
      if (since) {
        // Incremental update — append new messages
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id))
          const newMsgs = (data.messages || []).filter((m: ChatMessage) => !existing.has(m.id))
          return [...prev, ...newMsgs]
        })
      } else {
        // Full refresh
        setMessages(data.messages || [])
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([])
      return
    }

    setLoadingMessages(true)
    fetchMessages(selectedSessionId).finally(() => setLoadingMessages(false))

    // Poll for new messages every 3s
    const lastMsgTime = () => {
      const last = messages[messages.length - 1]
      return last ? last.createdAt : undefined
    }

    pollRef.current = setInterval(() => {
      fetchMessages(selectedSessionId, lastMsgTime())
    }, 3000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [selectedSessionId, fetchMessages])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send admin reply
  async function handleSend() {
    if (!inputText.trim() || !selectedSessionId || sending) return
    setSending(true)
    const text = inputText.trim()
    setInputText('')

    // Optimistic
    const optimistic: ChatMessage = {
      id: `temp_${Date.now()}`,
      senderType: 'admin',
      senderName: 'You',
      body: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const res = await fetch(`/api/chat/sessions/${selectedSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send')
      }
      const data = await res.json()
      // Replace optimistic with real message
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? data.message : m))
    } catch (err) {
      // Mark as failed
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? { ...m, body: m.body + ' [failed]' } : m))
    } finally {
      setSending(false)
    }
  }

  async function handleCloseSession() {
    if (!selectedSessionId) return
    if (!confirm('Close this chat session?')) return
    try {
      await fetch(`/api/chat/sessions/${selectedSessionId}/claim?action=close`, { method: 'POST' })
      fetchSessions()
      setSelectedSessionId(null)
    } catch {
      // silent
    }
  }

  const selectedSession = sessions.find((s) => s.id === selectedSessionId)

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-background">
      {/* Session list */}
      <div className={`${selectedSessionId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r`}>
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-700" />
            Live Chat
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Visitor messages from your website widget
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b">
          {(['active', 'closed', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 px-3 py-2 text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'text-emerald-700 border-b-2 border-emerald-700'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Session items */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
              No {filter} chat sessions
            </div>
          ) : (
            <div className="divide-y">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`w-full text-left p-3 hover:bg-accent transition-colors ${
                    selectedSessionId === s.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {s.visitorName || 'Anonymous Visitor'}
                        </span>
                        {s.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            {s.unreadCount}
                          </Badge>
                        )}
                      </div>
                      {s.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {s.lastMessage.senderType === 'visitor' ? '' : 'You: '}
                          {s.lastMessage.body}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <Circle className={`h-2 w-2 fill-current ${
                          s.status === 'active' ? 'text-emerald-500' :
                          s.status === 'claimed' ? 'text-blue-500' :
                          'text-muted-foreground'
                        }`} />
                        <span className="text-xs text-muted-foreground">
                          {s.status === 'active' ? 'Waiting' :
                           s.status === 'claimed' ? 'Claimed' :
                           'Closed'}
                        </span>
                        {s.lastMessageAt && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatTime(s.lastMessageAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Conversation panel */}
      <div className={`${selectedSessionId ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
        {!selectedSession ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Select a chat session to view the conversation
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  onClick={() => setSelectedSessionId(null)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h3 className="font-semibold text-sm">
                    {selectedSession.visitorName || 'Anonymous Visitor'}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {selectedSession.visitorPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedSession.visitorPhone}
                      </span>
                    )}
                    {selectedSession.visitorEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {selectedSession.visitorEmail}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selectedSession.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                  {selectedSession.status}
                </Badge>
                {selectedSession.status !== 'closed' && (
                  <Button variant="ghost" size="sm" onClick={handleCloseSession}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-3/4" />)}
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No messages yet
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            {selectedSession.status !== 'closed' && (
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="Type your reply…"
                    disabled={sending}
                  />
                  <Button onClick={handleSend} disabled={sending || !inputText.trim()} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.senderType === 'system') {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.body}
        </span>
      </div>
    )
  }

  const isVisitor = message.senderType === 'visitor'
  return (
    <div className={`flex ${isVisitor ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[75%] ${isVisitor ? '' : 'text-right'}`}>
        <div className={`rounded-lg px-3 py-2 text-sm ${
          isVisitor
            ? 'bg-muted text-foreground'
            : 'bg-emerald-700 text-white'
        }`}>
          {message.body}
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          {!isVisitor && message.senderName && <span>{message.senderName} ·</span>}
          <Clock className="h-3 w-3" />
          {formatTime(message.createdAt)}
        </div>
      </div>
    </div>
  )
}

function formatTime(iso: string): string {
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
}
