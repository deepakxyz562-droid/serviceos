'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  MessageSquare, Search, Send, Phone, User, Tag, Flag,
  ArrowRightLeft, StickyNote, AtSign, MoreVertical,
  Check, CheckCheck, ChevronLeft, Smile, Paperclip,
  Circle, Inbox, RefreshCw, AlertCircle, PanelRightOpen, PanelRightClose,
  Globe, Mail, MessageCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── API Types ──────────────────────────────────────────────────────────────

interface CustomerInfo {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
}

interface LeadInfo {
  id: string;
  name: string | null;
  status: string;
  serviceType: string | null;
}

interface JobInfo {
  id: string;
  title: string | null;
  status: string;
}

interface ConversationData {
  id: string;
  conversationId: string;
  customerPhone: string;
  customerName: string | null;
  customerWhatsappId: string | null;
  customerId: string | null;
  leadId: string | null;
  jobId: string | null;
  channel: string;
  status: string;
  currentStage: string | null;
  intentDetected: string | null;
  intentConfidence: number | null;
  lastMessageAt: string;
  lastMessageBody: string | null;
  lastDirection: string | null;
  messagesJson: string;
  metadataJson: string;
  tenantId: string | null;
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
  customer: CustomerInfo | null;
  lead: LeadInfo | null;
  job: JobInfo | null;
}

interface InboxMessageData {
  id: string;
  conversationId: string;
  senderType: string;
  senderId: string | null;
  senderName: string | null;
  content: string;
  messageType: string;
  mediaUrl: string | null;
  mediaCaption: string | null;
  direction: string;
  status: string;
  externalId: string | null;
  replyToId: string | null;
  isInternalNote: boolean;
  mentionsJson: string;
  reactionsJson: string;
  metadataJson: string;
  tenantId: string | null;
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EmployeeData {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  avatar: string | null;
  [key: string]: unknown;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    new: 'bg-blue-100 text-blue-700 border-blue-200',
    assigned: 'bg-amber-100 text-amber-700 border-amber-200',
    in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    waiting: 'bg-orange-100 text-orange-700 border-orange-200',
    resolved: 'bg-green-100 text-green-700 border-green-200',
    closed: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600 border-slate-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    urgent: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[priority] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getChannelIcon(channel: string): { icon: typeof MessageSquare; label: string; color: string } {
  switch (channel) {
    case 'whatsapp':
      return { icon: Phone, label: 'WhatsApp', color: 'text-emerald-600' };
    case 'web':
    case 'website':
      return { icon: Globe, label: 'Website', color: 'text-blue-600' };
    case 'email':
      return { icon: Mail, label: 'Email', color: 'text-purple-600' };
    case 'sms':
      return { icon: MessageCircle, label: 'SMS', color: 'text-sky-600' };
    default:
      return { icon: MessageSquare, label: 'Chat', color: 'text-slate-600' };
  }
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-emerald-600 mr-0.5">typing</span>
      <span className="flex gap-0.5">
        <span className="size-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:0ms]" />
        <span className="size-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:150ms]" />
        <span className="size-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]" />
      </span>
    </div>
  );
}

function MessageStatusIcon({ status }: { status: string }) {
  if (status === 'read') return <CheckCheck className="size-3.5 text-emerald-300" />;
  if (status === 'delivered') return <CheckCheck className="size-3.5 text-emerald-200/60" />;
  return <Check className="size-3.5 text-emerald-200/60" />;
}

function AutoGrowTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={1}
      className={cn(
        'resize-none w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background',
        'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1',
        'max-h-[120px] overflow-y-auto',
        className
      )}
    />
  );
}

function ConversationListSkeleton() {
  return (
    <div className="divide-y divide-border/50">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-3 flex items-start gap-2.5">
          <Skeleton className="size-10 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-1">
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageListSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
          <Skeleton className={cn('h-12 rounded-2xl', i % 2 === 0 ? 'w-64' : 'w-48')} />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function InboxView() {
  // Data state
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<InboxMessageData[]>([]);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);

  // Loading state
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Error state
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  // UI state
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferAgent, setTransferAgent] = useState('');
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // ─── Detect mobile viewport ───────────────────────────────────────────

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ─── Fetch conversations ──────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      const res = await fetch(`/api/conversations?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const data = await res.json();
      setConversations(data.conversations || []);
      setConversationsError(null);
    } catch (err) {
      setConversationsError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setConversationsLoading(false);
    }
  }, [filter]);

  // ─── Fetch messages for a conversation ────────────────────────────────

  const fetchMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const res = await fetch(`/api/inbox-messages?conversationId=${encodeURIComponent(conversationId)}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(data.data || []);
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // ─── Fetch employees ──────────────────────────────────────────────────

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      if (!res.ok) throw new Error('Failed to fetch employees');
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch {
      // Non-critical - employees are for assignment dropdown
    }
  }, []);

  // ─── Initial data load ────────────────────────────────────────────────

  useEffect(() => {
    fetchConversations();
    fetchEmployees();
  }, [fetchConversations, fetchEmployees]);

  // ─── Auto-refresh conversations every 30 seconds ──────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // ─── Fetch messages when conversation selected ────────────────────────

  useEffect(() => {
    if (selectedConversation?.conversationId) {
      fetchMessages(selectedConversation.conversationId);
    } else {
      setMessages([]);
    }
  }, [selectedConversation?.conversationId, fetchMessages]);

  // ─── Scroll to bottom on new messages ─────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Filter conversations ─────────────────────────────────────────────

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (filter !== 'all' && c.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (c.customerName || c.customerPhone || '').toLowerCase();
        const body = (c.lastMessageBody || '').toLowerCase();
        return name.includes(q) || body.includes(q);
      }
      return true;
    });
  }, [conversations, filter, search]);

  // ─── Stats ────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: conversations.length,
    active: conversations.filter((c) => c.status === 'active').length,
    new: conversations.filter((c) => c.status === 'new').length,
    waiting: conversations.filter((c) => c.status === 'waiting').length,
    resolved: conversations.filter((c) => c.status === 'resolved').length,
  }), [conversations]);

  // ─── Select conversation ──────────────────────────────────────────────

  const handleSelectConversation = useCallback((conv: ConversationData) => {
    setSelectedConversation(conv);
    if (isMobile) setMobileShowThread(true);
  }, [isMobile]);

  // ─── Send message ─────────────────────────────────────────────────────

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    setSendingMessage(true);
    try {
      const res = await fetch('/api/inbox-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.conversationId,
          senderType: 'agent',
          senderName: 'You',
          content: messageInput.trim(),
          messageType: 'text',
          direction: 'outbound',
          isInternalNote,
        }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      const { data: newMsg } = await res.json();

      setMessages((prev) => [...prev, newMsg]);
      setMessageInput('');

      // Update conversation's last message in local state
      setConversations((prev) =>
        prev.map((c) =>
          c.conversationId === selectedConversation.conversationId
            ? {
                ...c,
                lastMessageBody: messageInput.trim(),
                lastMessageAt: new Date().toISOString(),
                lastDirection: 'outbound',
              }
            : c
        )
      );

      toast.success(isInternalNote ? 'Internal note added' : 'Message sent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // ─── Transfer conversation ────────────────────────────────────────────

  const handleTransfer = () => {
    if (!selectedConversation || !transferAgent) return;
    const agent = employees.find((e) => e.id === transferAgent);
    setShowTransferDialog(false);
    setTransferAgent('');
    toast.success(`Conversation transferred to ${agent?.name || 'agent'}`);
  };

  // ─── Group messages by date ───────────────────────────────────────────

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: InboxMessageData[] }[] = [];
    let currentDate = '';

    const sorted = [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const msg of sorted) {
      const date = new Date(msg.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  }, [messages]);

  // ─── Customer info panel content ──────────────────────────────────────

  const customerInfoContent = selectedConversation ? (
    <div className="space-y-5">
      {/* Customer Card */}
      <div className="flex flex-col items-center pt-2">
        <Avatar className="size-16 mb-3">
          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg font-semibold">
            {getInitials(selectedConversation.customerName)}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold text-sm">
          {selectedConversation.customerName || selectedConversation.customerPhone}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{selectedConversation.customerPhone}</p>
        {selectedConversation.customer?.email && (
          <p className="text-xs text-muted-foreground mt-0.5">{selectedConversation.customer.email}</p>
        )}
      </div>

      <Separator />

      {/* Conversation Details */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Channel</span>
            <div className="flex items-center gap-1">
              {(() => {
                const ch = getChannelIcon(selectedConversation.channel);
                const ChIcon = ch.icon;
                return <ChIcon className={cn('size-3', ch.color)} />;
              })()}
              <span className="text-xs font-medium capitalize">{selectedConversation.channel}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <Badge variant="outline" className={cn(getStatusColor(selectedConversation.status), 'text-[10px] h-5')}>
              {selectedConversation.status.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Stage</span>
            <span className="text-xs font-medium capitalize">{selectedConversation.currentStage || '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Created</span>
            <span className="text-xs">{formatRelativeTime(selectedConversation.createdAt)}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Related Lead */}
      {selectedConversation.lead && (
        <>
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Related Lead</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Name</span>
                <span className="text-xs font-medium">{selectedConversation.lead.name || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <Badge variant="outline" className="text-[10px] h-5">{selectedConversation.lead.status}</Badge>
              </div>
              {selectedConversation.lead.serviceType && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Service</span>
                  <span className="text-xs">{selectedConversation.lead.serviceType}</span>
                </div>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Related Job */}
      {selectedConversation.job && (
        <>
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Related Job</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Title</span>
                <span className="text-xs font-medium">{selectedConversation.job.title || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <Badge variant="outline" className="text-[10px] h-5">{selectedConversation.job.status}</Badge>
              </div>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Intent */}
      {selectedConversation.intentDetected && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detected Intent</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Intent</span>
              <span className="text-xs font-medium">{selectedConversation.intentDetected}</span>
            </div>
            {selectedConversation.intentConfidence !== null && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Confidence</span>
                <span className="text-xs">{Math.round(selectedConversation.intentConfidence * 100)}%</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  ) : null;

  // ─── Conversation List Panel ──────────────────────────────────────────

  const conversationListPanel = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b bg-emerald-50/50 dark:bg-emerald-950/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Inbox className="size-5 text-emerald-600" />
            <h2 className="font-semibold text-sm">Inbox</h2>
            <Badge className="bg-emerald-600 text-white text-[10px] h-5 px-1.5">
              {stats.total}
            </Badge>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    setConversationsLoading(true);
                    fetchConversations();
                  }}
                >
                  <RefreshCw className={cn('size-3.5', conversationsLoading && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-background"
          />
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={setFilter} className="w-full mt-2">
          <TabsList className="w-full h-7 p-0.5">
            <TabsTrigger value="all" className="text-[10px] flex-1 h-6">
              All {stats.total > 0 && <span className="ml-0.5 opacity-60">{stats.total}</span>}
            </TabsTrigger>
            <TabsTrigger value="active" className="text-[10px] flex-1 h-6">
              Active {stats.active > 0 && <span className="ml-0.5 opacity-60">{stats.active}</span>}
            </TabsTrigger>
            <TabsTrigger value="waiting" className="text-[10px] flex-1 h-6">
              Waiting {stats.waiting > 0 && <span className="ml-0.5 opacity-60">{stats.waiting}</span>}
            </TabsTrigger>
            <TabsTrigger value="resolved" className="text-[10px] flex-1 h-6">
              Done {stats.resolved > 0 && <span className="ml-0.5 opacity-60">{stats.resolved}</span>}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {conversationsLoading ? (
          <ConversationListSkeleton />
        ) : conversationsError ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <AlertCircle className="size-10 mb-3 text-red-400" />
            <p className="text-sm font-medium text-red-600">Failed to load conversations</p>
            <p className="text-xs text-muted-foreground mt-1">{conversationsError}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchConversations}>
              <RefreshCw className="size-3.5 mr-1" /> Retry
            </Button>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageSquare className="size-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">No conversations</p>
            <p className="text-xs mt-1">
              {search ? 'Try adjusting your search' : 'Conversations will appear here when customers message you'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredConversations.map((conv) => {
              const isActive = selectedConversation?.conversationId === conv.conversationId;
              const channel = getChannelIcon(conv.channel);
              const ChannelIcon = channel.icon;
              const displayName = conv.customerName || conv.customerPhone;
              const isInbound = conv.lastDirection === 'inbound';

              return (
                <button
                  key={conv.id}
                  className={cn(
                    'w-full p-3 text-left transition-all duration-150',
                    'hover:bg-muted/40',
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-l-[3px] border-l-emerald-600'
                      : 'border-l-[3px] border-l-transparent',
                    isInbound && !isActive && 'bg-muted/20'
                  )}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="relative shrink-0">
                      <Avatar className="size-10">
                        <AvatarFallback className={cn(
                          'text-xs font-medium',
                          isActive
                            ? 'bg-emerald-200 text-emerald-800'
                            : 'bg-emerald-100 text-emerald-700'
                        )}>
                          {getInitials(conv.customerName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5">
                        <ChannelIcon className={cn('size-2.5', channel.color)} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={cn(
                          'text-sm truncate',
                          isInbound ? 'font-semibold' : 'font-medium'
                        )}>
                          {displayName}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                          {formatRelativeTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <p className={cn(
                          'text-xs truncate flex-1',
                          isInbound ? 'text-foreground font-medium' : 'text-muted-foreground'
                        )}>
                          {conv.lastMessageBody || 'No messages yet'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        <Badge variant="outline" className={cn(getStatusColor(conv.status), 'text-[9px] h-4 px-1.5')}>
                          {conv.status.replace('_', ' ')}
                        </Badge>
                        {conv.channel === 'whatsapp' && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-emerald-50 text-emerald-600 border-emerald-200">
                            WhatsApp
                          </Badge>
                        )}
                        {conv.intentDetected && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-violet-50 text-violet-600 border-violet-200">
                            {conv.intentDetected}
                          </Badge>
                        )}
                      </div>
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

  // ─── Chat Thread Panel ────────────────────────────────────────────────

  const chatThreadPanel = selectedConversation ? (
    <div className="flex flex-col h-full">
      {/* Thread Header */}
      <div className="px-4 py-2.5 border-b flex items-center justify-between gap-2 bg-background">
        <div className="flex items-center gap-2.5 min-w-0">
          {isMobile && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setMobileShowThread(false)}>
              <ChevronLeft className="size-5" />
            </Button>
          )}
          <Avatar className="size-9 shrink-0">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-medium">
              {getInitials(selectedConversation.customerName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">
                {selectedConversation.customerName || selectedConversation.customerPhone}
              </span>
              <Badge variant="outline" className={cn(getStatusColor(selectedConversation.status), 'text-[10px] h-5 shrink-0')}>
                {selectedConversation.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{selectedConversation.customerPhone}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Assign */}
          <Select onValueChange={(v) => toast.success(`Assigned to ${employees.find((e) => e.id === v)?.name || 'agent'}`)}>
            <SelectTrigger className="h-8 w-auto text-xs border-0 gap-1">
              <User className="size-3.5" />
              <span className="hidden lg:inline">Assign</span>
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  <span className="flex items-center gap-1.5">
                    <Circle className={cn(
                      'size-2',
                      emp.status === 'available' ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-300 text-slate-300'
                    )} />
                    {emp.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority */}
          <Select onValueChange={(v) => toast.success(`Priority set to ${v}`)}>
            <SelectTrigger className="h-8 w-auto text-xs border-0 gap-1">
              <Flag className="size-3.5" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          {/* Labels */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Tag className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Labels</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Transfer */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowTransferDialog(true)}>
                  <ArrowRightLeft className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Transfer</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Info Panel Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowInfoPanel(!showInfoPanel)}>
                  {showInfoPanel ? <PanelRightClose className="size-3.5" /> : <PanelRightOpen className="size-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showInfoPanel ? 'Hide Details' : 'Show Details'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* More */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Check className="size-3 mr-2" /> Mark Resolved
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MessageSquare className="size-3 mr-2" /> Close Conversation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <AlertCircle className="size-3 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 max-w-3xl mx-auto">
          {messagesLoading ? (
            <MessageListSkeleton />
          ) : messagesError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="size-10 mb-3 text-red-400" />
              <p className="text-sm font-medium text-red-600">Failed to load messages</p>
              <p className="text-xs text-muted-foreground mt-1">{messagesError}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => fetchMessages(selectedConversation.conversationId)}>
                <RefreshCw className="size-3.5 mr-1" /> Retry
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <MessageSquare className="size-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs mt-1">Start the conversation by sending a message</p>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <span className="bg-muted text-[10px] text-muted-foreground px-3 py-1 rounded-full">
                    {group.date}
                  </span>
                </div>
                {/* Messages */}
                <div className="space-y-1">
                  {group.messages.map((msg, idx, arr) => {
                    const prevMsg = idx > 0 ? arr[idx - 1] : null;
                    const isSameSender = prevMsg && prevMsg.senderType === msg.senderType && prevMsg.isInternalNote === msg.isInternalNote;
                    const isInternalNote = msg.isInternalNote;
                    const isCustomer = msg.senderType === 'customer';
                    const isAgent = msg.senderType === 'agent' && !isInternalNote;

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex',
                          isInternalNote ? 'justify-center' : isAgent ? 'justify-end' : 'justify-start',
                          !isSameSender ? 'mt-4' : 'mt-0.5'
                        )}
                      >
                        {isInternalNote ? (
                          <div className="max-w-[85%] rounded-lg px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-1 mb-1 text-[10px] text-amber-600 font-medium">
                              <StickyNote className="size-3" /> Internal Note
                            </div>
                            <p className="text-sm text-amber-900 dark:text-amber-200">{msg.content}</p>
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-500">
                              <span>{msg.senderName || 'Agent'}</span>
                              <span>&middot;</span>
                              <span>{formatMessageTime(msg.createdAt)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className={cn(
                            'max-w-[75%] flex flex-col',
                            isAgent ? 'items-end' : 'items-start'
                          )}>
                            {!isSameSender && (
                              <span className={cn(
                                'text-[10px] font-medium mb-1 px-1',
                                isAgent ? 'text-emerald-700' : 'text-muted-foreground'
                              )}>
                                {msg.senderName || (isCustomer ? 'Customer' : 'Agent')}
                              </span>
                            )}
                            <div className={cn(
                              'rounded-2xl px-3 py-2',
                              isAgent
                                ? 'bg-emerald-600 text-white rounded-br-md'
                                : 'bg-muted rounded-bl-md',
                              isSameSender && isAgent && 'rounded-br-2xl',
                              isSameSender && isCustomer && 'rounded-bl-2xl'
                            )}>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              <div className={cn(
                                'flex items-center gap-1 mt-1',
                                isAgent ? 'justify-end' : 'justify-start'
                              )}>
                                <span className={cn(
                                  'text-[10px]',
                                  isAgent ? 'text-emerald-200' : 'text-muted-foreground'
                                )}>
                                  {formatMessageTime(msg.createdAt)}
                                </span>
                                {isAgent && <MessageStatusIcon status={msg.status} />}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Compose Area */}
      <div className="px-4 py-3 border-t bg-background">
        {/* Internal note indicator */}
        {isInternalNote && (
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <StickyNote className="size-3 text-amber-600" />
            <span className="text-[11px] font-medium text-amber-600">Internal Note Mode</span>
            <Button variant="ghost" size="sm" className="h-5 text-[10px] ml-auto p-0" onClick={() => setIsInternalNote(false)}>
              Cancel
            </Button>
          </div>
        )}
        {/* Quick actions */}
        <div className="flex items-center gap-0.5 mb-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                  <Smile className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Emoji</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                  <Paperclip className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                  <AtSign className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mention</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 w-7 p-0',
                    isInternalNote ? 'text-amber-600 hover:text-amber-700' : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setIsInternalNote(!isInternalNote)}
                >
                  <StickyNote className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Internal Note</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {/* Input + Send */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <AutoGrowTextarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={isInternalNote ? 'Write an internal note...' : 'Type a message... (Shift+Enter for new line)'}
            />
          </div>
          <Button
            size="sm"
            className={cn(
              'h-9 w-9 p-0 rounded-xl shrink-0',
              isInternalNote
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700',
              (!messageInput.trim() || sendingMessage) && 'opacity-50 cursor-not-allowed'
            )}
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || sendingMessage}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
      <MessageSquare className="size-16 mb-4 opacity-20" />
      <p className="text-lg font-medium">Select a conversation</p>
      <p className="text-sm mt-1">Choose from the list to start messaging</p>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/30">
              <Inbox className="size-4 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Inbox</h1>
              <p className="text-xs text-muted-foreground">Manage customer conversations</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Circle className="size-2 fill-emerald-500 text-emerald-500" />
            <span>{stats.active} active</span>
            <span className="text-border">|</span>
            <Circle className="size-2 fill-orange-400 text-orange-400" />
            <span>{stats.waiting} waiting</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile: Show either list or thread */}
        {isMobile ? (
          <div className="flex-1 flex overflow-hidden">
            {!mobileShowThread ? (
              <div className="w-full border-r overflow-hidden">{conversationListPanel}</div>
            ) : (
              <div className="w-full">{chatThreadPanel}</div>
            )}
          </div>
        ) : (
          <>
            {/* Left Panel - Conversation List */}
            <div className="w-80 border-r shrink-0 overflow-hidden">{conversationListPanel}</div>

            {/* Center Panel - Chat Thread */}
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex overflow-hidden">{chatThreadPanel}</div>

              {/* Right Panel - Customer Info (collapsible) */}
              {showInfoPanel && selectedConversation && (
                <div className="w-72 border-l shrink-0">
                  <ScrollArea className="h-full">
                    <div className="p-4">{customerInfoContent}</div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Mobile Info Sheet */}
      {isMobile && selectedConversation && (
        <Sheet open={showInfoPanel} onOpenChange={setShowInfoPanel}>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle className="text-sm">Customer Details</SheetTitle>
              <SheetDescription className="text-xs">Conversation and customer information</SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 -mx-4">
              <div className="px-4 pb-4">{customerInfoContent}</div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Conversation</DialogTitle>
            <DialogDescription>
              Transfer this conversation to another team member.
            </DialogDescription>
          </DialogHeader>
          <Select value={transferAgent} onValueChange={setTransferAgent}>
            <SelectTrigger>
              <SelectValue placeholder="Select an agent..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  <span className="flex items-center gap-1.5">
                    <Circle className={cn(
                      'size-2',
                      emp.status === 'available' ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-300 text-slate-300'
                    )} />
                    {emp.name} - {emp.role}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={!transferAgent} className="bg-emerald-600 hover:bg-emerald-700">
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
