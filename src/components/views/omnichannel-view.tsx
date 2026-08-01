'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare, Globe, Facebook, Instagram, Target, Phone,
  Send, Search, Settings, Wifi, Users,
  CheckCheck, Loader2,
  ExternalLink, Sparkles, X, Filter,
  Mail, MessageCircle, User,
  BarChart3, Inbox, UserCheck, UserPlus,
  StickyNote, Clock, ChevronDown, Zap, ChevronRight, Star, Briefcase, Contact as ContactIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
import { CHANNELS as ALL_CHANNEL_DEFS, getChannel } from '@/lib/channel-meta';
// AutoReplyCard moved to channels-view.tsx (Channels & Credentials settings page).

// ─── Types ──────────────────────────────────────────────────────────────────

type ChannelType = 'whatsapp' | 'messenger' | 'instagram' | 'sms' | 'email' | 'livechat' | 'webwidget' | 'googlebusiness' | 'teams' | 'slack' | 'website' | 'facebook' | 'google_ads' | 'justdial' | 'phone' | 'manual';

interface ConversationMessage {
  id: string;
  conversationId: string;
  content: string;
  sender: 'customer' | 'agent' | 'system';
  senderName?: string;
  timestamp: string;
  channel: ChannelType;
}

interface LeadInfo {
  id: string;
  name: string;
  status: string;
  value?: number;
  source: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  channel: ChannelType;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'active' | 'closed' | 'pending';
  leadId?: string;
  lead?: LeadInfo;
  messages: ConversationMessage[];
  autoLeadCreated?: boolean;
  // Active assignee — surfaced by the conversations API via the
  // ConversationAssignment join. The conversation card shows a UserCheck
  // icon (emerald) when assigned, UserPlus (muted) when unassigned.
  assigneeId?: string;
  assigneeName?: string;
}

interface OmnichannelStats {
  totalConversations: number;
  leadsToday: number;
  activeChannels: number;
  unreadCount: number;
  byChannel: Record<ChannelType, { conversations: number; leads: number }>;
}

// Auto-Reply config types, defaults, and the AutoReplyCard component now live
// in src/components/settings/sections/auto-reply-card.tsx and are rendered in
// the Channels & Credentials settings page (channels-view.tsx), not here.

// ─── Channel Metadata ───────────────────────────────────────────────────────
// Channel styling is now sourced from the centralized registry in
// src/lib/channel-meta.ts. The getChannelMeta() helper below falls back to a
// DEFAULT_META for unknown/legacy channels (old conversations stored before
// the registry existed).

const DEFAULT_META = {
  label: 'Other',
  icon: MessageCircle,
  color: 'slate',
  bgColor: 'bg-slate-100',
  borderColor: 'border-slate-200',
  textColor: 'text-slate-700',
  badgeBg: 'bg-slate-500',
  _brandColor: '#64748B',
};

function getChannelMeta(channel: string) {
  // Try the new registry first, fall back to legacy for old conversation data
  const fromRegistry = getChannel(channel);
  if (fromRegistry) {
    return {
      label: fromRegistry.label,
      icon: fromRegistry.icon,
      color: fromRegistry.color,
      bgColor: fromRegistry.badgeClass.split(' ')[0], // approximate
      borderColor: 'border-transparent',
      textColor: fromRegistry.iconClass,
      badgeBg: fromRegistry.badgeClass,
      _brandColor: fromRegistry.color,
    };
  }
  // Legacy fallback for old conversations
  const legacyMap: Record<string, { label: string; icon: React.ElementType; brandColor: string }> = {
    website: { label: 'Website', icon: Globe, brandColor: '#3B82F6' },
    facebook: { label: 'Facebook', icon: Facebook, brandColor: '#0084FF' },
    google_ads: { label: 'Google Ads', icon: Target, brandColor: '#4285F4' },
    justdial: { label: 'JustDial', icon: Phone, brandColor: '#F59E0B' },
    phone: { label: 'Phone', icon: Phone, brandColor: '#06B6D4' },
    manual: { label: 'Manual', icon: User, brandColor: '#64748B' },
  };
  const legacy = legacyMap[channel];
  if (legacy) {
    return {
      label: legacy.label,
      icon: legacy.icon,
      color: 'slate',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-200',
      textColor: 'text-slate-700',
      badgeBg: 'bg-slate-500',
      _brandColor: legacy.brandColor,
    };
  }
  return { ...DEFAULT_META, _brandColor: '#64748B' };
}

// Channels shown in the inbox filter bar — use the 10 from the registry, plus legacy fallbacks
const ALL_CHANNELS: string[] = ALL_CHANNEL_DEFS.map(c => c.id);

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const API_BASE = '/api/omnichannel';

// ─── Channel Icon Component ─────────────────────────────────────────────────

function ChannelIcon({ channel, size = 'sm' }: { channel: string; size?: 'sm' | 'md' | 'lg' }) {
  const meta = getChannelMeta(channel);
  const Icon = meta.icon;
  const sizeClasses = size === 'sm' ? 'size-3' : size === 'md' ? 'size-4' : 'size-5';
  return <Icon className={sizeClasses} />;
}

function ChannelBadge({ channel, compact = false }: { channel: string; compact?: boolean }) {
  const meta = getChannelMeta(channel);
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium',
        compact ? 'text-[10px] px-1.5 py-0 h-5' : 'text-xs px-2 py-0.5',
        meta.bgColor, meta.textColor, meta.borderColor
      )}
    >
      <ChannelIcon channel={channel} size={compact ? 'sm' : 'sm'} />
      {!compact && meta.label}
    </Badge>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function OmnichannelView() {
  // ── State ──
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<OmnichannelStats | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeChannelFilter, setActiveChannelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);

  // ── New: Top tab bar + workspace features ──
  const [inboxTab, setInboxTab] = useState<'inbox' | 'assigned' | 'unassigned'>('inbox');
  const [openTabs, setOpenTabs] = useState<string[]>([]); // conversation IDs open as tabs
  const [composerMode, setComposerMode] = useState<'reply' | 'notes'>('reply');
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);

  // ── Customer Context (right panel stats grid + accordions) ──
  // Fetched when a conversation is selected. Powers the reference-design
  // stats grid (Reviews/Jobs/Contacts) + "Survey Results" (reviews) +
  // "Case History" (jobs) accordions in the contact profile panel.
  const [customerContext, setCustomerContext] = useState<{
    stats: { reviews: number; jobs: number; contacts: number };
    reviews: Array<{
      id: string;
      rating: number;
      comment: string | null;
      authorName: string | null;
      source: string;
      createdAt: string;
    }>;
    jobs: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      scheduledAt: string | null;
      quotedAmount: number | null;
      jobNumber: string | null;
      createdAt: string;
    }>;
  } | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [showSurveyResults, setShowSurveyResults] = useState(true);
  const [showCaseHistory, setShowCaseHistory] = useState(true);

  // ── Data Loading ──
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [convRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/conversations`),
        fetch(`${API_BASE}/stats`),
      ]);

      if (convRes.ok) {
        const convData = await convRes.json();
        if (Array.isArray(convData)) {
          setConversations(convData);
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData && typeof statsData === 'object' && 'totalConversations' in statsData) {
          setStats(statsData);
        }
      }
    } catch (err) {
      console.error('[OmnichannelView] Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedConversationId && filteredConversations.length > 0) {
      setSelectedConversationId(filteredConversations[0].id);
    }
  }, [conversations, activeChannelFilter]);

  // Scroll to bottom of messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversationId, conversations]);

  // Fetch customer context (stats + reviews + jobs) when a conversation is
  // selected. Powers the right-panel stats grid + accordions. Defensive —
  // any error just leaves customerContext null and the panel renders without
  // the stats section.
  useEffect(() => {
    if (!selectedConversationId) {
      setCustomerContext(null);
      return;
    }
    let cancelled = false;
    setContextLoading(true);
    fetch(`${API_BASE}/conversations/${selectedConversationId}/customer-context`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data && data.stats) {
          setCustomerContext(data);
        }
      })
      .catch(() => {
        // Silent — panel renders without stats
      })
      .finally(() => {
        if (!cancelled) setContextLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedConversationId]);

  // ── Derived Data ──
  const filteredConversations = conversations.filter(c => {
    // inboxTab filtering (moved into left sidebar):
    //   inbox       → all conversations
    //   assigned    → assigned to current user (assigneeId set)
    //   unassigned  → no assignee
    const auth = useAppStore.getState();
    const currentUserId = auth.user?.id ?? '';
    const matchesTab =
      inboxTab === 'inbox' ||
      (inboxTab === 'assigned' && !!c.assigneeId && c.assigneeId === currentUserId) ||
      (inboxTab === 'unassigned' && !c.assigneeId);
    const matchesChannel = activeChannelFilter === 'all' || c.channel === activeChannelFilter;
    const matchesSearch = searchQuery === '' ||
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.customerPhone?.includes(searchQuery) ?? false);
    return matchesTab && matchesChannel && matchesSearch;
  });

  const selectedConversation = conversations.find(c => c.id === selectedConversationId) ?? null;

  const channelCounts = ALL_CHANNELS.reduce((acc, ch) => {
    acc[ch] = conversations.filter(c => c.channel === ch).length;
    return acc;
  }, {} as Record<ChannelType, number>);

  // ── Handlers ──
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    // Open as a tab (if not already open)
    setOpenTabs(prev => prev.includes(id) ? prev : [...prev, id]);
    // Mark as read locally
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, unreadCount: 0 } : c
    ));
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs(prev => {
      const next = prev.filter(t => t !== id);
      if (selectedConversationId === id) {
        setSelectedConversationId(next.length > 0 ? next[next.length - 1] : null);
      }
      return next;
    });
  };

  // ── Assign / Unassign a conversation ──────────────────────────────────
  // The icon button lives inside each conversation card. Clicking it:
  //   - If unassigned → assigns to the current user (POST /assign)
  //   - If assigned   → unassigns (DELETE /assign)
  // The local state is updated optimistically so the icon flips immediately.
  const [assignBusy, setAssignBusy] = useState<string | null>(null);

  const handleToggleAssign = async (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    if (assignBusy) return;
    setAssignBusy(conv.id);

    const wasAssigned = !!conv.assigneeId;
    // Optimistic update
    setConversations(prev => prev.map(c =>
      c.id === conv.id
        ? wasAssigned
          ? { ...c, assigneeId: undefined, assigneeName: undefined }
          : { ...c, assigneeId: 'me', assigneeName: 'You' }
        : c
    ));

    try {
      const url = `/api/omnichannel/conversations/${conv.id}/assign`;
      const res = wasAssigned
        ? await fetch(url, { method: 'DELETE' })
        : await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      // Update with the real assignment data from the server
      if (!wasAssigned && data?.assignment) {
        setConversations(prev => prev.map(c =>
          c.id === conv.id
            ? { ...c, assigneeId: data.assignment.agentId, assigneeName: data.assignment.agentName }
            : c
        ));
      }
      toast.success(wasAssigned ? 'Unassigned' : `Assigned to ${data?.assignment?.agentName || 'you'}`);
    } catch (err) {
      // Revert on error
      setConversations(prev => prev.map(c =>
        c.id === conv.id
          ? wasAssigned
            ? { ...c, assigneeId: conv.assigneeId, assigneeName: conv.assigneeName }
            : { ...c, assigneeId: undefined, assigneeName: undefined }
          : c
      ));
      toast.error(err instanceof Error ? err.message : 'Failed to update assignment');
    } finally {
      setAssignBusy(null);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;
    const content = messageInput.trim();
    setMessageInput('');
    setSendingMessage(true);

    const optimisticMsg: ConversationMessage = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversation.id,
      content,
      sender: 'agent',
      senderName: 'You',
      timestamp: new Date().toISOString(),
      channel: selectedConversation.channel,
    };

    setConversations(prev => prev.map(c =>
      c.id === selectedConversation.id
        ? { ...c, messages: [...c.messages, optimisticMsg], lastMessage: content, lastMessageTime: optimisticMsg.timestamp }
        : c
    ));

    try {
      const res = await fetch(`${API_BASE}/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const savedMsg = await res.json();
        // Replace the optimistic message with the saved one
        setConversations(prev => prev.map(c =>
          c.id === selectedConversation.id
            ? { ...c, messages: c.messages.map(m => m.id === optimisticMsg.id ? savedMsg : m) }
            : c
        ));
      }
    } catch {
      // Keep optimistic update
    }

    setSendingMessage(false);
  };

  // ── Render ──

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-emerald-600" />
          <p className="text-sm text-muted-foreground">Loading omnichannel inbox...</p>
        </div>
      </div>
    );
  }

  const isEmpty = conversations.length === 0;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* ── Empty State ── */}
      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center py-16 px-4 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">No conversations yet</h3>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            Connect a channel (WhatsApp, SMS, Email, Web Chat) to start receiving customer messages here.
          </p>
          <Button onClick={() => useAppStore.getState().setCurrentView('channels')}>
            <Settings className="size-3.5 mr-2" /> Configure Channels
          </Button>
        </div>
      ) : (
        /* ── 3-Column Layout ──
            Fills 100% height from below the app header to viewport bottom.
            All 3 columns start at the same Y position (aligned top borders).
            Left + right sidebars scroll independently; center chat input
            is pinned and never scrolls away. */
        <div className="flex flex-1 min-h-0 overflow-hidden w-full">
          {/* ── Left Column: Conversation List ── */}
          <div className="w-80 flex-shrink-0 border-r bg-background flex flex-col hidden md:flex min-h-0">
            {/* Top Tab Bar (Inbox / Assigned / Unassigned) — moved here
                from the full-width header to save vertical space. */}
            <div className="flex-shrink-0 border-b bg-background">
              <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none px-1">
                {([
                  { key: 'inbox', label: 'Inbox', icon: Inbox },
                  { key: 'assigned', label: 'Assigned', icon: UserCheck },
                  { key: 'unassigned', label: 'Unassigned', icon: UserPlus },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setInboxTab(tab.key)}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
                      inboxTab === tab.key
                        ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <tab.icon className="size-3" />
                    {tab.label}
                    {tab.key === 'unassigned' && (
                      <span className="ml-0.5 text-[10px] font-bold text-white bg-amber-500 rounded-full size-4 flex items-center justify-center">
                        {conversations.filter(c => !c.leadId).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Search + 3 action buttons in one compact row */}
            <div className="flex-shrink-0 border-b bg-background p-2 flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs pr-6"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                title="Filter conversations"
              >
                <Filter className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0"
                onClick={() => setShowAnalyticsPanel(!showAnalyticsPanel)}
                title="Analytics"
              >
                <BarChart3 className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0"
                onClick={() => useAppStore.getState().setCurrentView('channels')}
                title="Configure channels"
              >
                <Settings className="size-3.5" />
              </Button>
            </div>

            {/* Conversation List */}
            <ScrollArea className="flex-1 min-h-0">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <Filter className="size-8 mx-auto mb-2 opacity-50" />
                  <p>No conversations found</p>
                  <p className="text-xs mt-1">Try a different filter or search</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map(conv => {
                    const meta = getChannelMeta(conv.channel);
                    const Icon = meta.icon;
                    const isSelected = conv.id === selectedConversationId;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={cn(
                          'w-full text-left p-3 hover:bg-muted/50 transition-colors',
                          isSelected && 'bg-muted'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex-shrink-0">
                            <Avatar className="size-10">
                              <AvatarFallback className="text-xs font-medium bg-slate-100 dark:bg-slate-800">
                                {getInitials(conv.customerName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className={cn(
                              'absolute -bottom-0.5 -right-0.5 size-5 rounded-full flex items-center justify-center ring-2 ring-background',
                              meta.bgColor
                            )}>
                              <Icon className="size-2.5" />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn(
                                'text-sm font-medium truncate',
                                conv.unreadCount > 0 ? 'font-bold' : ''
                              )}>
                                {conv.customerName}
                              </span>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                                {formatTime(conv.lastMessageTime)}
                              </span>
                            </div>

                            {conv.customerPhone && (
                              <p className="text-[11px] text-muted-foreground truncate">{conv.customerPhone}</p>
                            )}

                            <div className="flex items-center gap-2 mt-0.5">
                              <p className={cn(
                                'text-xs truncate flex-1',
                                conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                              )}>
                                {conv.lastMessage}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 mt-1.5">
                              <ChannelBadge channel={conv.channel} compact />
                              {conv.lead && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                                  <Sparkles className="size-2.5 mr-0.5" /> Lead
                                </Badge>
                              )}
                              {conv.status === 'closed' && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700">
                                  Closed
                                </Badge>
                              )}
                              {conv.unreadCount > 0 && (
                                <span className="text-[10px] font-bold text-white bg-emerald-500 rounded-full size-5 flex items-center justify-center flex-shrink-0">
                                  {conv.unreadCount}
                                </span>
                              )}
                              {/* Assign / Unassign icon — sits at the far right of the badge row.
                                  Shows UserCheck (emerald) when assigned, UserPlus (muted) when
                                  unassigned. Clicking toggles the assignment via the API. */}
                              <button
                                type="button"
                                onClick={(e) => handleToggleAssign(conv, e)}
                                disabled={assignBusy === conv.id}
                                title={
                                  conv.assigneeName
                                    ? `Assigned to ${conv.assigneeName} — click to unassign`
                                    : 'Click to assign to yourself'
                                }
                                className={cn(
                                  'ml-auto size-6 rounded-full flex items-center justify-center transition-colors flex-shrink-0',
                                  conv.assigneeId
                                    ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                                  assignBusy === conv.id && 'opacity-50 cursor-not-allowed'
                                )}
                              >
                                {conv.assigneeId ? (
                                  <UserCheck className="size-3.5" />
                                ) : (
                                  <UserPlus className="size-3.5" />
                                )}
                              </button>
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

          {/* ── Middle Column: Message Thread ──
              Fills 100% height between app header and viewport bottom.
              Conversation tabs pinned top (flex-shrink-0), messages scroll
              (flex-1 overflow-y-auto), input pinned bottom (flex-shrink-0). */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-50 dark:bg-slate-950">
            {/* ── Tabbed Conversation Switcher ── */}
            {openTabs.length > 0 && (
              <div className="flex-shrink-0 border-b bg-background px-2 flex items-center gap-0.5 overflow-x-auto scrollbar-none">
                {openTabs.map(tabId => {
                  const conv = conversations.find(c => c.id === tabId);
                  if (!conv) return null;
                  const meta = getChannelMeta(conv.channel);
                  const Icon = meta.icon;
                  const isActive = tabId === selectedConversationId;
                  return (
                    <button
                      key={tabId}
                      onClick={() => setSelectedConversationId(tabId)}
                      className={cn(
                        'group inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-r border-l border-transparent',
                        isActive ? 'bg-slate-50 dark:bg-slate-950 text-foreground' : 'text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      <Icon className="size-3" style={{ color: meta._brandColor }} />
                      <span className="max-w-[120px] truncate">{conv.customerName}</span>
                      <span
                        role="button"
                        onClick={(e) => handleCloseTab(tabId, e)}
                        className="ml-1 size-4 rounded-full hover:bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100"
                      >
                        <X className="size-2.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedConversation ? (
              <>
                {/* Conversation Header */}
                <div className="flex-shrink-0 border-b bg-background px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="md:hidden h-8 w-8 p-0"
                        onClick={() => setSelectedConversationId(null)}
                      >
                        &larr;
                      </Button>
                      <Avatar className="size-9">
                        <AvatarFallback className="text-xs font-medium">
                          {getInitials(selectedConversation.customerName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold">{selectedConversation.customerName}</h3>
                          <ChannelBadge channel={selectedConversation.channel} compact />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {selectedConversation.customerPhone || selectedConversation.customerEmail || getChannelMeta(selectedConversation.channel).label}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedConversation.lead && (
                        <Badge variant="outline" className="gap-1 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                          <Sparkles className="size-3" />
                          Lead: {selectedConversation.lead.name}
                          <ExternalLink className="size-2.5 ml-0.5" />
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 min-h-0 px-4 py-4">
                  <div className="max-w-2xl mx-auto space-y-3">
                    {selectedConversation.messages.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <MessageSquare className="size-8 mx-auto mb-2 opacity-30" />
                        <p>No messages yet</p>
                        <p className="text-xs mt-1">Send a message to start the conversation</p>
                      </div>
                    ) : (
                      selectedConversation.messages.map(msg => {
                        const isCustomer = msg.sender === 'customer';
                        const isSystem = msg.sender === 'system';

                        if (isSystem) {
                          return (
                            <div key={msg.id} className="flex justify-center">
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                                <Sparkles className="size-3" />
                                {msg.content}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={msg.id} className={cn('flex', isCustomer ? 'justify-start' : 'justify-end')}>
                            <div className={cn(
                              'max-w-[75%] rounded-2xl px-4 py-2.5',
                              isCustomer
                                ? 'bg-white dark:bg-slate-900 border shadow-sm'
                                : 'bg-emerald-600 text-white'
                            )}>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              <div className={cn(
                                'flex items-center gap-1 mt-1',
                                isCustomer ? 'justify-start' : 'justify-end'
                              )}>
                                <span className={cn(
                                  'text-[10px]',
                                  isCustomer ? 'text-muted-foreground' : 'text-emerald-200'
                                )}>
                                  {formatTime(msg.timestamp)}
                                </span>
                                {!isCustomer && (
                                  <CheckCheck className="size-3 text-emerald-200" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messageEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Composer */}
                <div className="flex-shrink-0 border-t bg-background p-3">
                  <div className="max-w-2xl mx-auto">
                    {/* Reply / Notes mode toggle */}
                    <div className="flex items-center gap-1 mb-2">
                      <button
                        onClick={() => setComposerMode('reply')}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                          composerMode === 'reply' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'text-muted-foreground hover:bg-muted'
                        )}
                      >
                        <Send className="size-3" /> Reply
                      </button>
                      <button
                        onClick={() => setComposerMode('notes')}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                          composerMode === 'notes' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' : 'text-muted-foreground hover:bg-muted'
                        )}
                      >
                        <StickyNote className="size-3" /> Notes
                      </button>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        Type <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">/</kbd> for suggestions
                      </span>
                    </div>

                    <div className="flex items-end gap-2">
                      <div className="flex-1 relative">
                        <Textarea
                          placeholder={
                            composerMode === 'notes'
                              ? 'Add an internal note (only visible to your team)...'
                              : `Reply via ${getChannelMeta(selectedConversation.channel).label}...`
                          }
                          value={messageInput}
                          onChange={e => {
                            setMessageInput(e.target.value);
                            setShowSlashCommands(e.target.value.startsWith('/'));
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          className={cn(
                            'min-h-[40px] max-h-32 resize-none pr-10 text-sm',
                            composerMode === 'notes' && 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20'
                          )}
                          rows={1}
                        />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9"
                            disabled={!messageInput.trim() || sendingMessage}
                            title="Send later"
                          >
                            <Clock className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toast.success('Scheduled to send in 1 hour')}>
                            In 1 hour
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.success('Scheduled to send tomorrow at 9 AM')}>
                            Tomorrow at 9 AM
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.success('Scheduled to send next Monday')}>
                            Next Monday
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        size="sm"
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || sendingMessage}
                        className={cn(
                          'h-9',
                          composerMode === 'notes'
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        )}
                      >
                        {sendingMessage ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : composerMode === 'notes' ? (
                          <StickyNote className="size-4" />
                        ) : (
                          <Send className="size-4" />
                        )}
                      </Button>
                    </div>

                    {/* Slash command suggestions */}
                    {showSlashCommands && (
                      <div className="mt-1 rounded-md border bg-popover shadow-md p-1 max-h-40 overflow-y-auto">
                        {[
                          { cmd: '/greeting', desc: 'Insert a greeting template' },
                          { cmd: '/quote', desc: 'Send a quote link' },
                          { cmd: '/appointment', desc: 'Send appointment confirmation' },
                          { cmd: '/faq', desc: 'Insert FAQ answer' },
                          { cmd: '/transfer', desc: 'Transfer to another agent' },
                          { cmd: '/close', desc: 'Close this conversation' },
                        ].map(s => (
                          <button
                            key={s.cmd}
                            onClick={() => {
                              setMessageInput('');
                              setShowSlashCommands(false);
                              toast.info(`Slash command: ${s.cmd} — ${s.desc}`);
                            }}
                            className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted flex items-center gap-2"
                          >
                            <code className="text-emerald-600 dark:text-emerald-400 font-mono">{s.cmd}</code>
                            <span className="text-muted-foreground">{s.desc}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                      {composerMode === 'notes'
                        ? 'Internal note — only your team can see this'
                        : `Replying via ${getChannelMeta(selectedConversation.channel).label} · Enter to send, Shift+Enter for new line`}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="size-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Select a conversation</p>
                  <p className="text-sm mt-1">Choose a conversation from the left to start messaging</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column: Details Panel ──
              Aligned with left + center columns (same top Y). Scrolls
              independently when content overflows. */}
          <div className="w-72 flex-shrink-0 border-l bg-background hidden lg:flex flex-col min-h-0">
            {selectedConversation ? (
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-4">
                  {/* Customer Info Card with cover image */}
                  <Card className="shadow-none overflow-hidden">
                    {/* Cover banner — gradient using the channel brand color */}
                    <div
                      className="h-20 relative"
                      style={{
                        background: `linear-gradient(135deg, ${getChannelMeta(selectedConversation.channel)._brandColor}40, ${getChannelMeta(selectedConversation.channel)._brandColor}80)`,
                      }}
                    >
                      <div className="absolute top-2 right-2">
                        <ChannelBadge channel={selectedConversation.channel} compact />
                      </div>
                    </div>
                    <CardHeader className="pb-3 pt-0 px-4 -mt-8">
                      <Avatar className="size-16 border-4 border-background">
                        <AvatarFallback className="text-lg font-medium bg-slate-100 dark:bg-slate-800">
                          {getInitials(selectedConversation.customerName)}
                        </AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-base font-semibold mt-2">{selectedConversation.customerName}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                      {selectedConversation.customerPhone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="size-3.5 text-muted-foreground" />
                          <span>{selectedConversation.customerPhone}</span>
                        </div>
                      )}
                      {selectedConversation.customerEmail && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="size-3.5 text-muted-foreground" />
                          <span>{selectedConversation.customerEmail}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="outline" className={cn(
                          'text-xs',
                          selectedConversation.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          selectedConversation.status === 'closed' ? 'bg-slate-50 text-slate-500 border-slate-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        )}>
                          {selectedConversation.status}
                        </Badge>
                      </div>
                      {/* Assignee row — shows who is handling this conversation.
                          Includes a quick toggle button to assign/unassign. */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Assignee:</span>
                        {selectedConversation.assigneeId ? (
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                            <UserCheck className="size-3 mr-1" />
                            {selectedConversation.assigneeName || 'Assigned'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                            Unassigned
                          </Badge>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleToggleAssign(selectedConversation, e)}
                          disabled={assignBusy === selectedConversation.id}
                          className="ml-auto text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium disabled:opacity-50"
                        >
                          {selectedConversation.assigneeId ? 'Unassign' : 'Assign to me'}
                        </button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lead Details Card */}
                  {selectedConversation.lead && (
                    <Card className="shadow-none border-emerald-200 dark:border-emerald-800">
                      <CardHeader className="pb-3 pt-4 px-4">
                        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                          <Sparkles className="size-3.5 text-emerald-500" />
                          Lead Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Name</p>
                          <p className="text-sm font-medium">{selectedConversation.lead.name}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                              {selectedConversation.lead.status}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Source</p>
                            <Badge variant="outline" className="text-xs">
                              {selectedConversation.lead.source}
                            </Badge>
                          </div>
                        </div>
                        {selectedConversation.lead.value !== undefined && selectedConversation.lead.value > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground">Value</p>
                            <p className="text-sm font-semibold">₹{selectedConversation.lead.value.toLocaleString('en-IN')}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="text-xs">{new Date(selectedConversation.lead.createdAt).toLocaleString('en-IN')}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* ── Stats Grid (Reviews / Jobs / Contacts) ──
                      Reference design maps social stats (Tweets/Followers/
                      Following) to our CRM data: Reviews, Jobs, Contacts. */}
                  <Card className="shadow-none">
                    <CardContent className="px-4 py-3">
                      {contextLoading ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="flex flex-col items-center gap-0.5 py-1">
                            <Star className="size-3.5 text-amber-500 mb-0.5" />
                            <span className="text-lg font-bold text-foreground">
                              {customerContext?.stats.reviews ?? 0}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Reviews</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 py-1 border-x">
                            <Briefcase className="size-3.5 text-emerald-500 mb-0.5" />
                            <span className="text-lg font-bold text-foreground">
                              {customerContext?.stats.jobs ?? 0}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Jobs</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 py-1">
                            <ContactIcon className="size-3.5 text-sky-500 mb-0.5" />
                            <span className="text-lg font-bold text-foreground">
                              {customerContext?.stats.contacts ?? 0}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Contacts</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* ── Survey Results Accordion (→ customer Reviews) ── */}
                  <Card className="shadow-none">
                    <button
                      type="button"
                      onClick={() => setShowSurveyResults(!showSurveyResults)}
                      className="w-full flex items-center justify-between px-4 pt-4 pb-2 text-left"
                    >
                      <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                        <Star className="size-3.5 text-amber-500" />
                        Survey Results
                        {customerContext && customerContext.reviews.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
                            {customerContext.reviews.length}
                          </Badge>
                        )}
                      </CardTitle>
                      <ChevronRight className={cn(
                        'size-4 text-muted-foreground transition-transform',
                        showSurveyResults && 'rotate-90'
                      )} />
                    </button>
                    {showSurveyResults && (
                      <CardContent className="px-4 pb-4 space-y-2">
                        {!customerContext || customerContext.reviews.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2 text-center">
                            No reviews yet
                          </p>
                        ) : (
                          customerContext.reviews.map(r => (
                            <div key={r.id} className="rounded-md border p-2.5 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-foreground">
                                  {r.authorName || 'Verified Customer'}
                                </span>
                                <div className="flex items-center gap-0.5">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={cn(
                                        'size-2.5',
                                        i < r.rating
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'text-muted-foreground/30'
                                      )}
                                    />
                                  ))}
                                </div>
                              </div>
                              {r.comment && (
                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                  {r.comment}
                                </p>
                              )}
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                {r.source !== 'internal' && <span className="ml-1">· via {r.source}</span>}
                              </p>
                            </div>
                          ))
                        )}
                      </CardContent>
                    )}
                  </Card>

                  {/* ── Case History Accordion (→ past Jobs) ── */}
                  <Card className="shadow-none">
                    <button
                      type="button"
                      onClick={() => setShowCaseHistory(!showCaseHistory)}
                      className="w-full flex items-center justify-between px-4 pt-4 pb-2 text-left"
                    >
                      <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                        <Briefcase className="size-3.5 text-emerald-500" />
                        Case History
                        {customerContext && customerContext.jobs.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
                            {customerContext.jobs.length}
                          </Badge>
                        )}
                      </CardTitle>
                      <ChevronRight className={cn(
                        'size-4 text-muted-foreground transition-transform',
                        showCaseHistory && 'rotate-90'
                      )} />
                    </button>
                    {showCaseHistory && (
                      <CardContent className="px-4 pb-4 space-y-2">
                        {!customerContext || customerContext.jobs.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2 text-center">
                            No job history
                          </p>
                        ) : (
                          customerContext.jobs.map(j => (
                            <div key={j.id} className="rounded-md border p-2.5 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-foreground truncate flex-1">
                                  {j.title}
                                </span>
                                <Badge variant="outline" className={cn(
                                  'text-[9px] px-1.5 h-4 whitespace-nowrap',
                                  j.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400' :
                                  j.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400' :
                                  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400'
                                )}>
                                  {j.status}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>
                                  {j.jobNumber ? `#${j.jobNumber} · ` : ''}
                                  {new Date(j.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                </span>
                                {j.quotedAmount != null && j.quotedAmount > 0 && (
                                  <span className="font-medium text-foreground">
                                    ₹{j.quotedAmount.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    )}
                  </Card>

                  {/* Channel Info Card */}
                  <Card className="shadow-none">
                    <CardHeader className="pb-3 pt-4 px-4">
                      <CardTitle className="text-sm font-semibold">Channel Info</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <ChannelBadge channel={selectedConversation.channel} />
                      </div>
                      {selectedConversation.autoLeadCreated && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                          <Sparkles className="size-3" />
                          <span>Lead auto-created from this channel</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="shadow-none">
                    <CardHeader className="pb-3 pt-4 px-4">
                      <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                        <MessageSquare className="size-3.5" />
                        Send WhatsApp
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                <p>Select a conversation</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default OmnichannelView;
