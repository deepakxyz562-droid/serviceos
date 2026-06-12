'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare, Globe, Facebook, Instagram, Target, Phone,
  Send, Search, Settings, Wifi, WifiOff, Users,
  Plus, CheckCheck, Loader2,
  ExternalLink, Sparkles, X, Filter,
  Inbox, Mail, MessageCircle, User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

type ChannelType = 'whatsapp' | 'website' | 'facebook' | 'instagram' | 'google_ads' | 'justdial' | 'email' | 'sms' | 'phone' | 'manual';

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
}

interface ChannelConfigItem {
  id: string;
  type: ChannelType;
  name: string;
  connected: boolean;
  config: Record<string, string>;
}

interface OmnichannelStats {
  totalConversations: number;
  leadsToday: number;
  activeChannels: number;
  unreadCount: number;
  byChannel: Record<ChannelType, { conversations: number; leads: number }>;
}

// ─── Channel Metadata ───────────────────────────────────────────────────────

const DEFAULT_META = {
  label: 'Other',
  icon: MessageCircle,
  color: 'slate',
  bgColor: 'bg-slate-100',
  borderColor: 'border-slate-200',
  textColor: 'text-slate-700',
  badgeBg: 'bg-slate-500',
};

const CHANNEL_META: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
}> = {
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageSquare,
    color: 'emerald',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    badgeBg: 'bg-emerald-500',
  },
  website: {
    label: 'Website',
    icon: Globe,
    color: 'sky',
    bgColor: 'bg-sky-100',
    borderColor: 'border-sky-200',
    textColor: 'text-sky-700',
    badgeBg: 'bg-sky-500',
  },
  facebook: {
    label: 'Facebook',
    icon: Facebook,
    color: 'blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-600',
    badgeBg: 'bg-blue-600',
  },
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    color: 'pink',
    bgColor: 'bg-pink-100',
    borderColor: 'border-pink-200',
    textColor: 'text-pink-700',
    badgeBg: 'bg-pink-500',
  },
  google_ads: {
    label: 'Google Ads',
    icon: Target,
    color: 'orange',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    badgeBg: 'bg-orange-500',
  },
  justdial: {
    label: 'JustDial',
    icon: Phone,
    color: 'amber',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    badgeBg: 'bg-amber-500',
  },
  email: {
    label: 'Email',
    icon: Mail,
    color: 'violet',
    bgColor: 'bg-violet-100',
    borderColor: 'border-violet-200',
    textColor: 'text-violet-700',
    badgeBg: 'bg-violet-500',
  },
  sms: {
    label: 'SMS',
    icon: MessageCircle,
    color: 'teal',
    bgColor: 'bg-teal-100',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-700',
    badgeBg: 'bg-teal-500',
  },
  phone: {
    label: 'Phone',
    icon: Phone,
    color: 'cyan',
    bgColor: 'bg-cyan-100',
    borderColor: 'border-cyan-200',
    textColor: 'text-cyan-700',
    badgeBg: 'bg-cyan-500',
  },
  manual: {
    label: 'Manual',
    icon: User,
    color: 'slate',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-700',
    badgeBg: 'bg-slate-500',
  },
};

function getChannelMeta(channel: string) {
  return CHANNEL_META[channel] || DEFAULT_META;
}

const CHANNEL_CONFIG_FIELDS: Record<ChannelType, { key: string; label: string; type: string }[]> = {
  whatsapp: [
    { key: 'phoneNumber', label: 'Phone Number', type: 'tel' },
    { key: 'apiKey', label: 'API Key', type: 'password' },
  ],
  website: [
    { key: 'webhookUrl', label: 'Webhook URL', type: 'url' },
    { key: 'embedCode', label: 'Embed Code', type: 'text' },
  ],
  facebook: [
    { key: 'pageId', label: 'Page ID', type: 'text' },
    { key: 'accessToken', label: 'Access Token', type: 'password' },
  ],
  instagram: [
    { key: 'businessAccountId', label: 'Business Account ID', type: 'text' },
    { key: 'accessToken', label: 'Access Token', type: 'password' },
  ],
  google_ads: [
    { key: 'customerId', label: 'Google Ads Customer ID', type: 'text' },
    { key: 'developerToken', label: 'Developer Token', type: 'password' },
  ],
  justdial: [
    { key: 'apiKey', label: 'API Key', type: 'password' },
    { key: 'listingId', label: 'Listing ID', type: 'text' },
  ],
  email: [
    { key: 'smtpHost', label: 'SMTP Host', type: 'text' },
    { key: 'smtpPassword', label: 'SMTP Password', type: 'password' },
  ],
  sms: [
    { key: 'provider', label: 'SMS Provider', type: 'text' },
    { key: 'apiKey', label: 'API Key', type: 'password' },
  ],
  phone: [
    { key: 'phoneNumber', label: 'Phone Number', type: 'tel' },
    { key: 'provider', label: 'Provider', type: 'text' },
  ],
  manual: [],
};

const ALL_CHANNELS: ChannelType[] = ['whatsapp', 'website', 'facebook', 'instagram', 'google_ads', 'justdial'];

// Test data for creating leads per channel
const TEST_CUSTOMERS: Record<ChannelType, { name: string; phone: string; message: string }> = {
  whatsapp: { name: 'Priya Sharma', phone: '+91 98765 43210', message: 'I need a deep cleaning service for my 3BHK apartment' },
  website: { name: 'Rahul Verma', phone: '+91 87654 32109', message: 'What are your pricing plans for office cleaning?' },
  facebook: { name: 'Anita Desai', phone: '', message: 'Do you offer pest control services in Bandra?' },
  instagram: { name: 'Vikram Patel', phone: '', message: 'Loved your recent post! Can I book a home sanitization?' },
  google_ads: { name: 'Meera Joshi', phone: '+91 76543 21098', message: 'I clicked your ad - need plumbing service urgently' },
  justdial: { name: 'Suresh Kumar', phone: '+91 65432 10987', message: 'Found you on JustDial - need AC repair service' },
  email: { name: 'Deepa Nair', phone: '', message: 'I am writing to inquire about your home cleaning packages' },
  sms: { name: 'Arjun Reddy', phone: '+91 94321 87654', message: 'Need pest control service ASAP' },
  phone: { name: 'Kavita Shah', phone: '+91 83210 76543', message: 'Calling to book a deep cleaning appointment' },
  manual: { name: 'Ravi Menon', phone: '+91 72109 65432', message: 'Walk-in customer inquiry about plumbing services' },
};

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
  const [channels, setChannels] = useState<ChannelConfigItem[]>([]);
  const [stats, setStats] = useState<OmnichannelStats | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeChannelFilter, setActiveChannelFilter] = useState<ChannelType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [ingestingChannel, setIngestingChannel] = useState<ChannelType | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const [editConfig, setEditConfig] = useState<Record<string, string>>({});
  const [configChannelId, setConfigChannelId] = useState<string | null>(null);

  // ── Data Loading ──
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [convRes, channelRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/conversations`),
        fetch(`${API_BASE}/channels`),
        fetch(`${API_BASE}/stats`),
      ]);

      if (convRes.ok) {
        const convData = await convRes.json();
        if (Array.isArray(convData)) {
          setConversations(convData);
        }
      }

      if (channelRes.ok) {
        const channelData = await channelRes.json();
        if (Array.isArray(channelData)) {
          setChannels(channelData);
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

  // ── Derived Data ──
  const filteredConversations = conversations.filter(c => {
    const matchesChannel = activeChannelFilter === 'all' || c.channel === activeChannelFilter;
    const matchesSearch = searchQuery === '' ||
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.customerPhone?.includes(searchQuery) ?? false);
    return matchesChannel && matchesSearch;
  });

  const selectedConversation = conversations.find(c => c.id === selectedConversationId) ?? null;

  const channelCounts = ALL_CHANNELS.reduce((acc, ch) => {
    acc[ch] = conversations.filter(c => c.channel === ch).length;
    return acc;
  }, {} as Record<ChannelType, number>);

  // ── Handlers ──
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    // Mark as read locally
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, unreadCount: 0 } : c
    ));
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

  const handleToggleChannel = async (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return;

    const newConnected = !channel.connected;

    setChannels(prev => prev.map(c =>
      c.id === channelId ? { ...c, connected: newConnected } : c
    ));

    try {
      const res = await fetch(`${API_BASE}/channels/${channelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connected: newConnected }),
      });
      if (res.ok) {
        toast.success(newConnected ? `${channel.name} connected` : `${channel.name} disconnected`);
      } else {
        throw new Error('Failed');
      }
    } catch {
      toast.error('Failed to update channel');
      // Revert
      setChannels(prev => prev.map(c =>
        c.id === channelId ? { ...c, connected: !newConnected } : c
      ));
    }
  };

  const handleOpenConfig = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return;
    setConfigChannelId(channelId);
    setEditConfig({ ...channel.config });
    setShowConfigDialog(true);
  };

  const handleSaveConfig = async () => {
    if (!configChannelId) return;
    const channel = channels.find(c => c.id === configChannelId);
    if (!channel) return;

    // Optimistically update
    setChannels(prev => prev.map(c =>
      c.id === configChannelId ? { ...c, config: { ...editConfig } } : c
    ));

    try {
      const res = await fetch(`${API_BASE}/channels/${configChannelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: editConfig }),
      });
      if (res.ok) {
        toast.success(`${channel.name} configuration saved`);
      } else {
        throw new Error('Failed');
      }
    } catch {
      toast.error('Failed to save configuration');
    }

    setShowConfigDialog(false);
    setConfigChannelId(null);
  };

  const handleIngestTest = async (channelType: ChannelType) => {
    const testData = TEST_CUSTOMERS[channelType];
    if (!testData) return;

    setIngestingChannel(channelType);
    try {
      const res = await fetch(`${API_BASE}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: channelType,
          name: testData.name,
          phone: testData.phone || undefined,
          message: testData.message,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(`Test lead created via ${getChannelMeta(channelType).label}${result.autoLeadCreated ? ' (auto-lead created!)' : ''}`);
        setShowTestDialog(false);
        // Reload data to show the new conversation
        await loadData();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || `Failed to ingest test lead via ${getChannelMeta(channelType).label}`);
      }
    } catch {
      toast.error('Failed to ingest test lead');
    } finally {
      setIngestingChannel(null);
    }
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
    <div className="flex flex-col h-full max-h-full">
      {/* ── Header ── */}
      <div className="flex-shrink-0 border-b bg-background px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
              <MessageSquare className="size-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Omnichannel Inbox</h2>
              <p className="text-sm text-muted-foreground">All leads, one inbox</p>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Users className="size-4 text-muted-foreground" />
              <span className="font-semibold">{stats?.totalConversations ?? 0}</span>
              <span className="text-muted-foreground">conversations</span>
            </div>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 text-emerald-500" />
              <span className="font-semibold">{stats?.leadsToday ?? 0}</span>
              <span className="text-muted-foreground">leads today</span>
            </div>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2 text-sm">
              <Wifi className="size-4 text-sky-500" />
              <span className="font-semibold">{stats?.activeChannels ?? 0}</span>
              <span className="text-muted-foreground">active channels</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowTestDialog(true)}>
              <Plus className="size-3.5 mr-1" /> Create Test Lead
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowConfigDialog(true)}>
              <Settings className="size-3.5 mr-1" /> Configure
            </Button>
          </div>
        </div>
      </div>

      {/* ── Channel Filter Bar ── */}
      <div className="flex-shrink-0 border-b bg-background/95 px-4 sm:px-6 py-2">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveChannelFilter('all')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              activeChannelFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            All
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full',
              activeChannelFilter === 'all' ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-700'
            )}>
              {conversations.length}
            </span>
          </button>

          {ALL_CHANNELS.map(ch => {
            const meta = getChannelMeta(ch);
            const Icon = meta.icon;
            const count = channelCounts[ch as ChannelType];
            const isActive = activeChannelFilter === ch;
            return (
              <button
                key={ch}
                onClick={() => setActiveChannelFilter(ch)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? cn(meta.bgColor, meta.textColor, 'border', meta.borderColor)
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <Icon className="size-3.5" />
                {meta.label}
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full',
                  isActive ? cn(meta.bgColor, meta.textColor) : 'bg-slate-200 dark:bg-slate-700'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Empty State ── */}
      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="text-center max-w-md px-6">
            <div className="flex items-center justify-center size-16 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto mb-4">
              <Inbox className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Start by creating a test lead from any channel, or connect your channels to receive incoming messages.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_CHANNELS.map(ch => {
                const meta = getChannelMeta(ch);
                const Icon = meta.icon;
                const isConnected = channels.find(c => c.type === ch)?.connected;
                return (
                  <Button
                    key={ch}
                    variant="outline"
                    size="sm"
                    className={cn('gap-1.5 h-auto py-2', isConnected ? meta.borderColor : '')}
                    onClick={() => handleIngestTest(ch)}
                    disabled={!!ingestingChannel}
                  >
                    {ingestingChannel === ch ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                    {meta.label}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Each test creates a conversation with auto-lead creation
            </p>
          </div>
        </div>
      ) : (
        /* ── 3-Column Layout ── */
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── Left Column: Conversation List ── */}
          <div className="w-80 flex-shrink-0 border-r bg-background flex flex-col hidden md:flex">
            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Conversation List */}
            <ScrollArea className="flex-1">
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
                                <span className="ml-auto text-[10px] font-bold text-white bg-emerald-500 rounded-full size-5 flex items-center justify-center flex-shrink-0">
                                  {conv.unreadCount}
                                </span>
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

          {/* ── Middle Column: Message Thread ── */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950">
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
                <ScrollArea className="flex-1 px-4 py-4">
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
                    <div className="flex items-end gap-2">
                      <div className="flex-1 relative">
                        <Textarea
                          placeholder={`Reply via ${getChannelMeta(selectedConversation.channel).label}...`}
                          value={messageInput}
                          onChange={e => setMessageInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          className="min-h-[40px] max-h-32 resize-none pr-10 text-sm"
                          rows={1}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || sendingMessage}
                        className="bg-emerald-600 hover:bg-emerald-700 h-9"
                      >
                        {sendingMessage ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                      Replying via {getChannelMeta(selectedConversation.channel).label} · Press Enter to send, Shift+Enter for new line
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

          {/* ── Right Column: Details Panel ── */}
          <div className="w-72 flex-shrink-0 border-l bg-background hidden lg:flex flex-col">
            {selectedConversation ? (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Customer Info Card */}
                  <Card className="shadow-none">
                    <CardHeader className="pb-3 pt-4 px-4">
                      <CardTitle className="text-sm font-semibold">Customer Info</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-12">
                          <AvatarFallback className="text-sm font-medium bg-slate-100 dark:bg-slate-800">
                            {getInitials(selectedConversation.customerName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{selectedConversation.customerName}</p>
                          <ChannelBadge channel={selectedConversation.channel} compact />
                        </div>
                      </div>
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
                      {!selectedConversation.lead && (
                        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => {
                          handleIngestTest(selectedConversation.channel);
                        }} disabled={!!ingestingChannel}>
                          {ingestingChannel ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                          Create Lead
                        </Button>
                      )}
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

      {/* ── Create Test Lead Dialog ── */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Test Lead</DialogTitle>
            <DialogDescription>
              Create a test lead from any channel to see how the omnichannel inbox works with auto-lead creation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {ALL_CHANNELS.map(ch => {
              const meta = getChannelMeta(ch);
              const Icon = meta.icon;
              const isRunning = ingestingChannel === ch;
              return (
                <Button
                  key={ch}
                  variant="outline"
                  className={cn('h-auto py-3 flex flex-col items-center gap-2', meta.borderColor)}
                  onClick={() => handleIngestTest(ch)}
                  disabled={!!ingestingChannel}
                >
                  {isRunning ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <div className={cn('size-10 rounded-full flex items-center justify-center', meta.bgColor)}>
                      <Icon className={cn('size-5', meta.textColor)} />
                    </div>
                  )}
                  <span className="text-xs font-medium">{meta.label}</span>
                </Button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowTestDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Channel Configuration Dialog ── */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Configure Channels</DialogTitle>
            <DialogDescription>
              Connect and configure your messaging channels. Connected channels will automatically create leads from incoming messages.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-4 py-4">
              {channels.map(ch => {
                const meta = getChannelMeta(ch.type);
                const Icon = meta.icon;
                const configFields = CHANNEL_CONFIG_FIELDS[ch.type as ChannelType];
                const isEditing = configChannelId === ch.id;

                return (
                  <Card key={ch.id} className="shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('size-10 rounded-full flex items-center justify-center', meta.bgColor)}>
                            <Icon className={cn('size-5', meta.textColor)} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{ch.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {ch.connected ? 'Connected' : 'Disconnected'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={ch.connected}
                            onCheckedChange={() => handleToggleChannel(ch.id)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (isEditing) {
                                handleSaveConfig();
                              } else {
                                handleOpenConfig(ch.id);
                              }
                            }}
                          >
                            {isEditing ? 'Save' : <Settings className="size-4" />}
                          </Button>
                        </div>
                      </div>

                      {isEditing && configFields && (
                        <div className="space-y-3 border-t pt-3">
                          {configFields.map(field => (
                            <div key={field.key} className="space-y-1">
                              <Label className="text-xs">{field.label}</Label>
                              <Input
                                type={field.type}
                                value={editConfig[field.key] || ''}
                                onChange={e => setEditConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                                className="h-8 text-sm"
                              />
                            </div>
                          ))}
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setConfigChannelId(null)}>
                              Cancel
                            </Button>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveConfig}>
                              Save Config
                            </Button>
                          </div>
                        </div>
                      )}

                      {!ch.connected && !isEditing && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                          <WifiOff className="size-3" />
                          <span>Connect to start receiving messages</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setShowConfigDialog(false);
              setConfigChannelId(null);
            }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default OmnichannelView;
