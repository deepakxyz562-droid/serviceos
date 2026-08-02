'use client';

/**
 * MessageDrawer — Skype-style left-side quick-access drawer.
 *
 * Opens from the left edge (below the header) with 3 tabs:
 *   • SMS          — /api/conversations?channel=sms
 *   • Live Chat    — /api/chat/sessions (website widget visitors)
 *   • WhatsApp     — /api/conversations?channel=whatsapp
 *
 * Each tab shows a scrollable list of recent conversations. Clicking a row
 * opens an inline chat panel (last ~10 messages + a Send box) so users can
 * reply without leaving their current page. A footer link switches the main
 * view to the full inbox / live-chat / whatsapp page and closes the drawer.
 *
 * Desktop: 400px overlay panel, NO backdrop (rest of page stays interactive).
 * Mobile:  full-width with a tap-to-close backdrop.
 *
 * Unread count: a heuristic — for SMS/WhatsApp a conversation counts as
 * "unread" when its lastDirection is 'inbound' and status==='active'; for
 * live chat we sum the session's unreadCount field. The header reads this
 * via the parent-supplied onUnreadChange callback (polled every 60s while
 * the drawer is mounted).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageSquare,
  MessageCircle,
  Headphones,
  X,
  Send,
  Search,
  Phone,
  ArrowRight,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';

// ─── Shared types ────────────────────────────────────────────────────────────

type Channel = 'sms' | 'livechat' | 'whatsapp';

interface ConversationMessage {
  id?: string;
  direction?: 'inbound' | 'outbound';
  body: string;
  timestamp?: string;
  senderType?: string;
  senderName?: string | null;
}

interface ConversationListItem {
  id: string;
  conversationId: string;
  customerPhone: string;
  customerName?: string | null;
  customerWhatsappId?: string | null;
  status: string;
  currentStage?: string;
  channel?: string;
  lastMessageAt: string;
  lastMessageBody?: string | null;
  lastDirection?: string | null;
  customer?: { id: string; name: string | null; phone: string; email?: string | null } | null;
}

interface LiveChatSession {
  id: string;
  visitorName: string | null;
  visitorPhone: string | null;
  visitorEmail: string | null;
  status: string;
  unreadCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  lastMessage: { body: string; senderType: string; createdAt: string } | null;
}

interface LiveChatMessage {
  id: string;
  senderType: string; // visitor | admin | system
  senderName: string | null;
  body: string;
  createdAt: string;
}

interface MessageDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful send so the parent can refresh the badge count. */
  onRefresh?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getInitials(name: string | null | undefined, phone: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-2) || '??';
}

function isUnreadConversation(c: ConversationListItem): boolean {
  // Heuristic: an inbound last message that the agent hasn't replied to yet
  // on an active conversation. There's no dedicated unreadCount column on
  // the Conversation model, so we treat "lastDirection=inbound + active"
  // as "waiting for reply" = unread.
  return c.status === 'active' && c.lastDirection === 'inbound';
}

// ─── Drawer Header ───────────────────────────────────────────────────────────

function DrawerHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 h-14 border-b bg-background shrink-0">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-4 text-emerald-600" />
        <span className="font-semibold text-sm">Messages</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onClose}
        aria-label="Close messages drawer"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

// ─── Conversation list (SMS + WhatsApp share this) ───────────────────────────

interface ConversationListProps {
  channel: 'sms' | 'whatsapp';
  onSelect: (c: ConversationListItem) => void;
  selectedId: string | null;
  reloadKey: number; // bump to force a refetch
}

function ConversationList({ channel, onSelect, selectedId, reloadKey }: ConversationListProps) {
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/conversations?channel=${channel}&limit=20&status=active`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data.conversations) ? data.conversations : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useEffect(() => {
    fetchData();
  }, [fetchData, reloadKey]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (c) =>
        (c.customerName?.toLowerCase().includes(q) ?? false) ||
        c.customerPhone.toLowerCase().includes(q),
    );
  }, [items, search]);

  if (loading) {
    return (
      <div className="p-3 space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-xs text-destructive mb-2">Failed to load conversations</p>
        <Button variant="outline" size="sm" onClick={fetchData}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search row */}
      <div className="relative px-3 py-2 border-b">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${channel === 'sms' ? 'SMS' : 'WhatsApp'}…`}
          className="h-8 pl-8 text-xs rounded-md bg-muted/50 border-transparent focus-visible:bg-background"
        />
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            {channel === 'sms' ? (
              <MessageSquare className="size-8 mx-auto mb-2 opacity-30" />
            ) : (
              <MessageCircle className="size-8 mx-auto mb-2 opacity-30" />
            )}
            No {channel === 'sms' ? 'SMS' : 'WhatsApp'} conversations
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((c) => {
              const unread = isUnreadConversation(c);
              return (
                <button
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className={cn(
                    'w-full text-left p-3 hover:bg-accent transition-colors flex items-start gap-3',
                    selectedId === c.id && 'bg-accent',
                  )}
                >
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback
                      className={cn(
                        'text-[10px] font-semibold',
                        channel === 'sms'
                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
                      )}
                    >
                      {getInitials(c.customerName, c.customerPhone)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">
                        {c.customerName || c.customerPhone}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatTime(c.lastMessageAt)}
                      </span>
                    </div>
                    {c.customerName && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                        <Phone className="size-2.5" />
                        <span className="truncate">{c.customerPhone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p
                        className={cn(
                          'text-xs truncate',
                          unread ? 'text-foreground font-medium' : 'text-muted-foreground',
                        )}
                      >
                        {c.lastDirection === 'outbound' && 'You: '}
                        {c.lastMessageBody || 'No messages yet'}
                      </p>
                      {unread && (
                        <span className="size-2 rounded-full bg-emerald-500 shrink-0" aria-label="unread" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ─── Live chat session list ──────────────────────────────────────────────────

interface LiveChatListProps {
  onSelect: (s: LiveChatSession) => void;
  selectedId: string | null;
  reloadKey: number;
}

function LiveChatList({ onSelect, selectedId, reloadKey }: LiveChatListProps) {
  const [items, setItems] = useState<LiveChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/chat/sessions?status=active');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, reloadKey]);

  if (loading) {
    return (
      <div className="p-3 space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-xs text-destructive mb-2">Failed to load live chat sessions</p>
        <Button variant="outline" size="sm" onClick={fetchData}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 min-h-0">
      {items.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          <Headphones className="size-8 mx-auto mb-2 opacity-30" />
          No active live chat sessions
        </div>
      ) : (
        <div className="divide-y">
          {items.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={cn(
                'w-full text-left p-3 hover:bg-accent transition-colors flex items-start gap-3',
                selectedId === s.id && 'bg-accent',
              )}
            >
              <Avatar className="size-9 shrink-0">
                <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-semibold">
                  {s.visitorName ? s.visitorName.slice(0, 2).toUpperCase() : 'V?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {s.visitorName || 'Anonymous Visitor'}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatTime(s.lastMessageAt || s.createdAt)}
                  </span>
                </div>
                <p
                  className={cn(
                    'text-xs truncate mt-0.5',
                    s.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}
                >
                  {s.lastMessage
                    ? `${s.lastMessage.senderType === 'visitor' ? '' : 'You: '}${s.lastMessage.body}`
                    : 'No messages yet'}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      s.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground',
                    )}
                  />
                  <span className="text-[10px] text-muted-foreground capitalize">{s.status}</span>
                  {s.unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-auto text-[9px] h-3.5 px-1 leading-none"
                    >
                      {s.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}

// ─── Inline chat panel (conversation detail) ─────────────────────────────────

interface InlineChatPanelProps {
  channel: Channel;
  // For SMS / WhatsApp:
  conversation?: ConversationListItem | null;
  // For Live Chat:
  session?: LiveChatSession | null;
  onBack: () => void;
  onSent: () => void; // trigger a list refresh after a successful send
}

function InlineChatPanel({ channel, conversation, session, onBack, onSent }: InlineChatPanelProps) {
  const [messages, setMessages] = useState<ConversationMessage[] | LiveChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Resolve display header
  const title = useMemo(() => {
    if (channel === 'livechat') {
      return session?.visitorName || 'Anonymous Visitor';
    }
    return conversation?.customerName || conversation?.customerPhone || 'Unknown';
  }, [channel, conversation, session]);

  const subtitle = useMemo(() => {
    if (channel === 'livechat') {
      return session?.visitorPhone || session?.visitorEmail || `Session ${session?.id.slice(-6)}`;
    }
    return conversation?.customerPhone || '';
  }, [channel, conversation, session]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (channel === 'livechat') {
      if (!session) return;
      setLoading(true);
      try {
        const res = await authFetch(`/api/chat/sessions/${session.id}/messages`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setLoading(false);
      }
      return;
    }

    // SMS / WhatsApp: GET /api/conversations/:id returns conversation.messages
    if (!conversation) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/conversations/${conversation.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const conv = data.conversation;
      const parsed: ConversationMessage[] = Array.isArray(conv?.messages) ? conv.messages : [];
      // Show only the last 10
      setMessages(parsed.slice(-10));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [channel, conversation, session]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput('');
    setError(null);

    // Optimistic message
    const optimisticId = `temp_${Date.now()}`;
    if (channel === 'livechat') {
      const optimistic: LiveChatMessage = {
        id: optimisticId,
        senderType: 'admin',
        senderName: 'You',
        body: text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
    } else {
      const optimistic: ConversationMessage = {
        id: optimisticId,
        direction: 'outbound',
        body: text,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
    }

    try {
      if (channel === 'livechat') {
        if (!session) throw new Error('No active session');
        const res = await authFetch(`/api/chat/sessions/${session.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        const real = data.message;
        if (real?.id) {
          setMessages((prev) =>
            prev.map((m) => (m.id === optimisticId ? real : m)),
          );
        }
      } else if (channel === 'sms') {
        if (!conversation) throw new Error('No conversation');
        const res = await authFetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: conversation.customerPhone,
            body: text,
            conversationId: conversation.id,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        // Replace optimistic with server timestamp
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticId
              ? { ...m, id: `srv_${Date.now()}`, timestamp: new Date().toISOString() }
              : m,
          ),
        );
      } else if (channel === 'whatsapp') {
        if (!conversation) throw new Error('No conversation');
        // 1. Send via WhatsApp provider
        const res = await authFetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: conversation.customerPhone,
            message: text,
            type: 'text',
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        // 2. Persist to the conversation timeline (best-effort)
        await authFetch(`/api/conversations/${conversation.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: { body: text, direction: 'outbound', type: 'text' },
          }),
        }).catch(() => {
          /* non-critical — message already sent via WhatsApp */
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticId
              ? { ...m, id: `srv_${Date.now()}`, timestamp: new Date().toISOString() }
              : m,
          ),
        );
      }
      onSent();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send';
      setError(msg);
      toast.error(msg);
      // Mark optimistic as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId ? { ...m, body: `${m.body} [failed]` } : m,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-14 border-b bg-background shrink-0">
        <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onBack} aria-label="Back to list">
          <ChevronLeft className="size-4" />
        </Button>
        <Avatar className="size-8">
          <AvatarFallback
            className={cn(
              'text-[10px] font-semibold',
              channel === 'sms'
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                : channel === 'whatsapp'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
            )}
          >
            {channel === 'livechat'
              ? session?.visitorName?.slice(0, 2).toUpperCase() || 'V?'
              : getInitials(conversation?.customerName, conversation?.customerPhone || '')}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2"
      >
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-2/3 rounded-md" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8">
            No messages yet
          </div>
        ) : (
          messages.map((m) => {
            const isVisitor =
              channel === 'livechat'
                ? (m as LiveChatMessage).senderType === 'visitor'
                : (m as ConversationMessage).direction !== 'outbound';
            const isSystem =
              channel === 'livechat' && (m as LiveChatMessage).senderType === 'system';
            if (isSystem) {
              return (
                <div key={m.id || (m as LiveChatMessage).createdAt} className="flex justify-center">
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {m.body}
                  </span>
                </div>
              );
            }
            return (
              <div
                key={m.id || (m as LiveChatMessage).createdAt || m.body}
                className={cn('flex', isVisitor ? 'justify-start' : 'justify-end')}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-3 py-1.5 text-xs',
                    isVisitor
                      ? 'bg-muted text-foreground'
                      : 'bg-emerald-600 text-white',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={cn(
                      'text-[9px] mt-0.5',
                      isVisitor ? 'text-muted-foreground' : 'text-emerald-100',
                    )}
                  >
                    {formatTime(
                      (m as ConversationMessage).timestamp ||
                        (m as LiveChatMessage).createdAt,
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-1.5">
          <p className="text-[10px] text-destructive text-center">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t bg-background shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a reply…"
            disabled={sending}
            className="h-9 text-xs"
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            aria-label="Send message"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main drawer component ───────────────────────────────────────────────────

export function MessageDrawer({ open, onClose, onRefresh }: MessageDrawerProps) {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [tab, setTab] = useState<Channel>('sms');
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [selectedSession, setSelectedSession] = useState<LiveChatSession | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Internal close handler — clears the inline-chat selection BEFORE
  // notifying the parent. (Avoids the setState-in-effect anti-pattern by
  // resetting at the user-action source rather than as a side-effect of
  // the `open` prop changing.)
  const handleClose = useCallback(() => {
    setSelectedConversation(null);
    setSelectedSession(null);
    onClose();
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  // Trigger a list refresh (in-drawer) + parent badge refresh after a send.
  const refreshAll = useCallback(() => {
    setReloadKey((k) => k + 1);
    onRefresh?.();
  }, [onRefresh]);

  const openFullView = useCallback(() => {
    const view = tab === 'livechat' ? 'liveChat' : tab === 'whatsapp' ? 'whatsapp' : 'inbox';
    setCurrentView(view);
    handleClose();
  }, [tab, setCurrentView, handleClose]);

  return (
    <>
      {/* Backdrop — mobile only (sm: hidden) */}
      <div
        className={cn(
          'fixed inset-0 top-0 bg-black/40 z-40 sm:hidden transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={cn(
          'fixed z-50 top-0 left-0 h-screen w-full sm:w-[400px]',
          'bg-background border-r shadow-xl',
          'flex flex-col',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-[-100%]',
          // respect safe-area top (notch) — header bar handles its own padding
          'pt-[env(safe-area-inset-top,0px)]',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Messages drawer"
      >
        <DrawerHeader onClose={handleClose} />

        {/* Tabs */}
        <div className="px-2 pt-2 border-b bg-background shrink-0">
          <Tabs value={tab} onValueChange={(v) => { setTab(v as Channel); setSelectedConversation(null); setSelectedSession(null); }}>
            <TabsList className="w-full h-9">
              <TabsTrigger value="sms" className="gap-1 text-xs">
                <MessageSquare className="size-3.5" />
                SMS
              </TabsTrigger>
              <TabsTrigger value="livechat" className="gap-1 text-xs">
                <Headphones className="size-3.5" />
                Live Chat
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="gap-1 text-xs">
                <MessageCircle className="size-3.5" />
                WhatsApp
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content — list OR inline chat */}
        <div className="flex-1 min-h-0 flex flex-col">
          {tab === 'sms' && (
            selectedConversation ? (
              <InlineChatPanel
                channel="sms"
                conversation={selectedConversation}
                onBack={() => setSelectedConversation(null)}
                onSent={refreshAll}
              />
            ) : (
              <ConversationList
                channel="sms"
                onSelect={setSelectedConversation}
                selectedId={selectedConversation?.id ?? null}
                reloadKey={reloadKey}
              />
            )
          )}

          {tab === 'livechat' && (
            selectedSession ? (
              <InlineChatPanel
                channel="livechat"
                session={selectedSession}
                onBack={() => setSelectedSession(null)}
                onSent={refreshAll}
              />
            ) : (
              <LiveChatList
                onSelect={setSelectedSession}
                selectedId={selectedSession?.id ?? null}
                reloadKey={reloadKey}
              />
            )
          )}

          {tab === 'whatsapp' && (
            selectedConversation ? (
              <InlineChatPanel
                channel="whatsapp"
                conversation={selectedConversation}
                onBack={() => setSelectedConversation(null)}
                onSent={refreshAll}
              />
            ) : (
              <ConversationList
                channel="whatsapp"
                onSelect={setSelectedConversation}
                selectedId={selectedConversation?.id ?? null}
                reloadKey={reloadKey}
              />
            )
          )}
        </div>

        {/* Footer */}
        <button
          onClick={openFullView}
          className="flex items-center justify-center gap-1.5 px-4 h-11 border-t bg-background text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-accent transition-colors shrink-0"
        >
          <Inbox className="size-3.5" />
          Open full view
          <ChevronRight className="size-3.5" />
          <ArrowRight className="size-3.5" />
        </button>
      </aside>
    </>
  );
}
