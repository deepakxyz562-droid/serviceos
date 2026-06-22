'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Radio, Plus, Search, Send, Clock, Users, CheckCircle2,
  XCircle, Eye, BarChart3, MessageSquare, Calendar,
  AlertCircle, Copy, Trash2, Loader2, Pencil,
  Mail, Plug, ArrowRight, AlertTriangle, UserCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { authFetch } from '@/lib/client-auth';

// ─── Types ──────────────────────────────────────────────────────────────────

type BroadcastType = 'promotional' | 'transactional' | 'reminder' | 'announcement';
type BroadcastStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
type BroadcastChannel = 'whatsapp' | 'email' | 'sms' | 'multi';

interface Broadcast {
  id: string;
  name: string;
  type: BroadcastType;
  status: BroadcastStatus;
  channel: BroadcastChannel;
  message: string;
  mediaUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  audienceType: string;
  audienceId?: string;
  audienceFiltersJson?: string;
  audienceCount: number;
  segmentId?: string;
  scheduledAt?: string;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  repliedCount: number;
  clickedCount: number;
  failedCount: number;
  createdAt: string;
  timezone: string;
  isRecurring: boolean;
  recurringInterval?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const BROADCAST_CHANNELS: { value: BroadcastChannel; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'multi', label: 'Multi-channel' },
];

const AUDIENCE_TYPES = [
  { value: 'all', label: 'All Contacts' },
  { value: 'leads', label: 'All Leads' },
  { value: 'customers', label: 'All Customers' },
  { value: 'vip', label: 'VIP Customers' },
  { value: 'inactive_30', label: 'Inactive 30 Days' },
  { value: 'upcoming_bookings', label: 'Upcoming Bookings' },
  { value: 'recent', label: 'Recent Customers' },
  { value: 'custom', label: 'Custom Segment' },
  { value: 'segment', label: 'Specific Group' },
  { value: 'mixed', label: 'Group + Manual Emails' },
];

// ─── Audience Mode helpers ────────────────────────────────────────────────
// The form exposes 5 conceptual audience modes. These map to the backend
// Campaign fields `audienceType` (all|segment|contact_list|custom),
// `audienceId` (group id), and `audienceFiltersJson` (JSON string that may
// carry `{ manualEmails: "a@b.com,c@d.com", customerIds: ["id1","id2"] }`).

type AudienceMode = 'all' | 'segment' | 'custom' | 'mixed' | 'customers';

const AUDIENCE_MODES: { value: AudienceMode; label: string }[] = [
  { value: 'all', label: 'All Contacts' },
  { value: 'customers', label: 'Specific Customers' },
  { value: 'segment', label: 'Specific Group' },
  { value: 'custom', label: 'Manual Emails' },
  { value: 'mixed', label: 'Group + Manual Emails' },
];

interface GroupOption {
  id: string;
  name: string;
  type: string;
  memberCount: number;
}

interface CustomerOption {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

interface EmailProvider {
  id: string;
  name: string;
  providerType: string;
  usageType: string;
  isDefaultMarketing: boolean;
  isPlatform: boolean;
  status: string;
}

// Pull the `manualEmails` string out of an audienceFiltersJson value.
function parseManualEmails(filtersJson: string | null | undefined): string {
  if (!filtersJson) return '';
  try {
    const parsed = JSON.parse(filtersJson) as Record<string, unknown>;
    const val = parsed?.manualEmails;
    return typeof val === 'string' ? val : '';
  } catch {
    return '';
  }
}

// Pull the `customerIds` array out of an audienceFiltersJson value.
function parseCustomerIds(filtersJson: string | null | undefined): string[] {
  if (!filtersJson) return [];
  try {
    const parsed = JSON.parse(filtersJson) as Record<string, unknown>;
    const val = parsed?.customerIds;
    return Array.isArray(val) ? val.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

// Reverse the backend fields into the form's audience mode + group + emails + customers.
function deriveAudienceMode(
  audienceType: string,
  audienceId: string | null | undefined,
  filtersJson: string | null | undefined,
): { mode: AudienceMode; groupId: string; manualEmails: string; customerIds: string[] } {
  const manualEmails = parseManualEmails(filtersJson);
  const customerIds = parseCustomerIds(filtersJson);
  const hasGroup = !!audienceId;
  const hasManual = !!manualEmails.trim();
  const hasCustomers = customerIds.length > 0;

  if (audienceType === 'segment' || audienceType === 'contact_list') {
    if (hasManual) return { mode: 'mixed', groupId: audienceId || '', manualEmails, customerIds: [] };
    if (hasGroup) return { mode: 'segment', groupId: audienceId || '', manualEmails: '', customerIds: [] };
  }
  if (audienceType === 'custom') {
    if (hasGroup && hasManual) return { mode: 'mixed', groupId: audienceId || '', manualEmails, customerIds: [] };
    if (hasCustomers) return { mode: 'customers', groupId: '', manualEmails: '', customerIds };
    if (hasManual) return { mode: 'custom', groupId: '', manualEmails, customerIds: [] };
  }
  if (audienceType === 'all' && !hasGroup && !hasManual && !hasCustomers) {
    return { mode: 'all', groupId: '', manualEmails: '', customerIds: [] };
  }
  // Legacy audience types (leads, customers, vip, etc.) — default sensibly.
  if (hasCustomers) return { mode: 'customers', groupId: '', manualEmails: '', customerIds };
  if (hasManual) return { mode: 'custom', groupId: '', manualEmails, customerIds: [] };
  return { mode: 'all', groupId: '', manualEmails: '', customerIds: [] };
}

// Build the backend audience fields from the form values.
function buildAudiencePayload(
  mode: AudienceMode,
  groupId: string,
  manualEmails: string,
  customerIds: string[],
): { audienceType: string; audienceId?: string; audienceFiltersJson?: string } {
  const cleanEmails = manualEmails
    .split(/[\s,\n]+/)
    .map(e => e.trim())
    .filter(Boolean)
    .join(', ');
  switch (mode) {
    case 'all':
      return { audienceType: 'all' };
    case 'customers':
      return {
        audienceType: 'custom',
        audienceFiltersJson: JSON.stringify({ customerIds }),
      };
    case 'segment':
      return {
        audienceType: 'segment',
        audienceId: groupId || undefined,
        audienceFiltersJson: '{}',
      };
    case 'custom':
      return {
        audienceType: 'custom',
        audienceFiltersJson: JSON.stringify({ manualEmails: cleanEmails }),
      };
    case 'mixed':
      // Backend has no 'mixed' type — keep audienceId for the group and stash
      // the manual emails in audienceFiltersJson, using 'custom' as the type.
      return {
        audienceType: 'custom',
        audienceId: groupId || undefined,
        audienceFiltersJson: JSON.stringify({ manualEmails: cleanEmails }),
      };
  }
}

// Human-readable label for a broadcast's audience, used in list/detail views.
function getAudienceDisplayLabel(broadcast: {
  audienceType: string;
  audienceId?: string;
  audienceFiltersJson?: string;
}): string {
  const { mode } = deriveAudienceMode(
    broadcast.audienceType,
    broadcast.audienceId,
    broadcast.audienceFiltersJson,
  );
  return AUDIENCE_MODES.find(a => a.value === mode)?.label || broadcast.audienceType;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusConfig(status: string) {
  const map: Record<string, { color: string; icon: React.ReactNode }> = {
    draft: { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <Clock className="size-3" /> },
    scheduled: { color: 'bg-sky-100 text-sky-700 border-sky-200', icon: <Calendar className="size-3" /> },
    sending: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Send className="size-3 animate-pulse" /> },
    sent: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="size-3" /> },
    failed: { color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="size-3" /> },
  };
  return map[status] || map.draft;
}

function getTypeColor(type: string) {
  const map: Record<string, string> = {
    promotional: 'bg-purple-100 text-purple-700',
    transactional: 'bg-sky-100 text-sky-700',
    reminder: 'bg-amber-100 text-amber-700',
    announcement: 'bg-emerald-100 text-emerald-700',
  };
  return map[type] || 'bg-slate-100 text-slate-600';
}

function getChannelColor(channel: string) {
  const map: Record<string, string> = {
    whatsapp: 'bg-emerald-100 text-emerald-700',
    email: 'bg-sky-100 text-sky-700',
    sms: 'bg-purple-100 text-purple-700',
    multi: 'bg-amber-100 text-amber-700',
  };
  return map[channel] || 'bg-slate-100 text-slate-600';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BroadcastView() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '', type: 'promotional' as BroadcastType, channel: 'whatsapp' as BroadcastChannel,
    message: '', mediaUrl: '', ctaText: '', ctaUrl: '',
    audienceMode: 'all' as AudienceMode, audienceId: '', manualEmails: '', customerIds: [] as string[],
    scheduleDate: '', scheduleTime: '', timezone: 'Asia/Kolkata',
    isRecurring: false, recurringInterval: 'weekly',
  });
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [liveAudienceCount, setLiveAudienceCount] = useState<number | null>(null);
  const [isLoadingAudienceCount, setIsLoadingAudienceCount] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', type: 'promotional' as BroadcastType, channel: 'whatsapp' as BroadcastChannel,
    message: '', mediaUrl: '', ctaText: '', ctaUrl: '',
    audienceMode: 'all' as AudienceMode, audienceId: '', manualEmails: '', customerIds: [] as string[],
    scheduleDate: '', scheduleTime: '', timezone: 'Asia/Kolkata',
    isRecurring: false, recurringInterval: 'weekly',
  });

  // ── Send Now dialog state (for email/multi-channel broadcasts) ──
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState<Broadcast | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [emailProviders, setEmailProviders] = useState<EmailProvider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [sendForm, setSendForm] = useState({
    providerId: '',
    subject: '',
    html: '',
    message: '',
  });

  // ── Load broadcasts from API ──
  const loadBroadcasts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('type', 'broadcast');

      const res = await authFetch(`/api/campaigns?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        // Map campaigns to broadcast format
        const mapped: Broadcast[] = (result.data || []).map((c: Record<string, unknown>) => ({
          id: c.id as string,
          name: (c.name as string) || '',
          type: ((c.type as string) || 'promotional') as BroadcastType,
          status: mapCampaignStatus((c.status as string) || 'draft'),
          channel: ((c.channel as string) || 'whatsapp') as BroadcastChannel,
          message: (c.messageContent as string) || '',
          ctaText: (c.ctaText as string) || undefined,
          ctaUrl: (c.ctaUrl as string) || undefined,
          audienceType: (c.audienceType as string) || 'all',
          audienceId: (c.audienceId as string) || undefined,
          audienceFiltersJson: (c.audienceFiltersJson as string) || undefined,
          audienceCount: (c.totalRecipients as number) || 0,
          scheduledAt: c.scheduledAt as string || undefined,
          sentCount: (c.sentCount as number) || 0,
          deliveredCount: (c.deliveredCount as number) || 0,
          readCount: (c.readCount as number) || 0,
          repliedCount: (c.repliedCount as number) || 0,
          clickedCount: (c.clickedCount as number) || 0,
          failedCount: (c.failedCount as number) || 0,
          createdAt: (c.createdAt as string) || new Date().toISOString(),
          timezone: (c.timezone as string) || 'UTC',
          isRecurring: false,
        }));
        setBroadcasts(mapped);
      } else {
        setError('Failed to load broadcasts');
        toast.error('Failed to load broadcasts');
      }
    } catch {
      setError('Network error. Please check your connection.');
      toast.error('Network error loading broadcasts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBroadcasts();
  }, [loadBroadcasts]);

  // ── Load groups for the audience selector ──
  const loadGroups = useCallback(async () => {
    setIsLoadingGroups(true);
    try {
      const res = await authFetch('/api/groups');
      if (res.ok) {
        const result = await res.json();
        setGroups((result.data || []) as GroupOption[]);
      }
    } catch {
      // Non-blocking — the selector just shows an empty list.
    } finally {
      setIsLoadingGroups(false);
    }
  }, []);

  // ── Load customers for the "Specific Customers" audience selector ──
  const loadCustomers = useCallback(async () => {
    setIsLoadingCustomers(true);
    try {
      const res = await authFetch('/api/customers?limit=500');
      if (res.ok) {
        const result = await res.json();
        const list = (result.data || result) as CustomerOption[];
        setCustomers(list);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingCustomers(false);
    }
  }, []);

  // ── Load email providers for the Send Now flow ──
  // Fetches all active providers. Any active provider can be used for sending
  // (the backend uses it directly when providerId is passed).
  const loadEmailProviders = useCallback(async () => {
    setIsLoadingProviders(true);
    try {
      const res = await authFetch('/api/email-providers');
      if (res.ok) {
        const raw = await res.json();
        const all = (Array.isArray(raw) ? raw : (raw?.data || [])) as EmailProvider[];
        const eligible = all.filter(p => p.status === 'active');
        setEmailProviders(eligible);
        return eligible;
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingProviders(false);
    }
    return [];
  }, []);

  // ── Fetch the live audience count for a given audience config ──
  // Used by the create/edit form to show "X recipients" as the user picks
  // the audience mode, group, customers, or manual emails.
  const fetchLiveAudienceCount = useCallback(async (
    mode: AudienceMode,
    groupId: string,
    manualEmails: string,
    customerIds: string[],
    channel: BroadcastChannel,
  ) => {
    setIsLoadingAudienceCount(true);
    try {
      const audience = buildAudiencePayload(mode, groupId, manualEmails, customerIds);
      const params = new URLSearchParams();
      params.set('audienceType', audience.audienceType);
      if (audience.audienceId) params.set('audienceId', audience.audienceId);
      if (audience.audienceFiltersJson) params.set('audienceFiltersJson', audience.audienceFiltersJson);
      params.set('channel', channel);
      const res = await authFetch(`/api/campaigns/audience-count?${params.toString()}`);
      if (res.ok) {
        const data = await res.json() as { total?: number; withEmail?: number; withPhone?: number };
        setLiveAudienceCount(data.total ?? 0);
      } else {
        setLiveAudienceCount(null);
      }
    } catch {
      setLiveAudienceCount(null);
    } finally {
      setIsLoadingAudienceCount(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
    loadCustomers();
  }, [loadGroups, loadCustomers]);

  // ── Recompute live audience count when create form audience fields change ──
  useEffect(() => {
    fetchLiveAudienceCount(
      createForm.audienceMode,
      createForm.audienceId,
      createForm.manualEmails,
      createForm.customerIds,
      createForm.channel,
    );
  }, [
    createForm.audienceMode, createForm.audienceId, createForm.manualEmails,
    createForm.customerIds, createForm.channel, fetchLiveAudienceCount,
  ]);

  // ── Recompute live audience count when edit form audience fields change ──
  useEffect(() => {
    if (!showEditDialog) return;
    fetchLiveAudienceCount(
      editForm.audienceMode,
      editForm.audienceId,
      editForm.manualEmails,
      editForm.customerIds,
      editForm.channel,
    );
  }, [
    showEditDialog,
    editForm.audienceMode, editForm.audienceId, editForm.manualEmails,
    editForm.customerIds, editForm.channel, fetchLiveAudienceCount,
  ]);

  function mapCampaignStatus(status: string): BroadcastStatus {
    const map: Record<string, BroadcastStatus> = {
      draft: 'draft',
      scheduled: 'scheduled',
      running: 'sending',
      completed: 'sent',
      cancelled: 'failed',
      paused: 'draft',
    };
    return map[status] || 'draft';
  }

  const filteredBroadcasts = broadcasts.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!createForm.name) { toast.error('Broadcast name is required'); return; }
    if (!createForm.message) { toast.error('Message is required'); return; }
    if ((createForm.audienceMode === 'segment' || createForm.audienceMode === 'mixed') && !createForm.audienceId) {
      toast.error('Please select a group for the audience'); return;
    }
    if ((createForm.audienceMode === 'custom' || createForm.audienceMode === 'mixed') && !createForm.manualEmails.trim()) {
      toast.error('Please enter at least one email address'); return;
    }
    if (createForm.audienceMode === 'customers' && createForm.customerIds.length === 0) {
      toast.error('Please select at least one customer'); return;
    }

    const audience = buildAudiencePayload(createForm.audienceMode, createForm.audienceId, createForm.manualEmails, createForm.customerIds);

    setIsCreating(true);
    try {
      const res = await authFetch('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name,
          type: 'broadcast',
          channel: createForm.channel,
          audienceType: audience.audienceType,
          audienceId: audience.audienceId,
          audienceFiltersJson: audience.audienceFiltersJson,
          messageContent: createForm.message,
          mediaUrl: createForm.mediaUrl || undefined,
          ctaText: createForm.ctaText || undefined,
          ctaUrl: createForm.ctaUrl || undefined,
          status: createForm.scheduleDate ? 'scheduled' : 'draft',
          scheduledAt: createForm.scheduleDate ? `${createForm.scheduleDate}T${createForm.scheduleTime || '09:00'}:00` : undefined,
          timezone: createForm.timezone,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        const newBroadcast: Broadcast = {
          id: result.data.id,
          name: result.data.name,
          type: result.data.type,
          status: mapCampaignStatus(result.data.status),
          channel: result.data.channel,
          message: result.data.messageContent || '',
          ctaText: result.data.ctaText || undefined,
          ctaUrl: result.data.ctaUrl || undefined,
          audienceType: result.data.audienceType || 'all',
          audienceId: result.data.audienceId || undefined,
          audienceFiltersJson: result.data.audienceFiltersJson || undefined,
          audienceCount: result.data.totalRecipients || 0,
          scheduledAt: result.data.scheduledAt || undefined,
          sentCount: 0, deliveredCount: 0, readCount: 0, repliedCount: 0, clickedCount: 0, failedCount: 0,
          createdAt: result.data.createdAt,
          timezone: result.data.timezone || 'UTC',
          isRecurring: false,
        };
        setBroadcasts(prev => [newBroadcast, ...prev]);
        setShowCreateDialog(false);
        setCreateForm({
          name: '', type: 'promotional', channel: 'whatsapp', message: '', mediaUrl: '',
          ctaText: '', ctaUrl: '', audienceMode: 'all', audienceId: '', manualEmails: '', customerIds: [],
          scheduleDate: '', scheduleTime: '', timezone: 'Asia/Kolkata',
          isRecurring: false, recurringInterval: 'weekly',
        });
        toast.success('Broadcast created');
      } else {
        toast.error('Failed to create broadcast');
      }
    } catch {
      toast.error('Failed to create broadcast');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Open the Send Now dialog for a broadcast ──
  // For email/multi-channel broadcasts, this opens a dialog with provider
  // selection, subject, HTML body, and message fields. For WhatsApp/SMS, we
  // dispatch directly via /api/campaigns/send (no provider dialog needed).
  const openSendDialog = async (broadcast: Broadcast) => {
    setSendingBroadcast(broadcast);
    if (broadcast.channel === 'email' || broadcast.channel === 'multi') {
      // Pre-fill the form with the broadcast's message as the HTML body
      setSendForm({
        providerId: '',
        subject: broadcast.name,
        html: broadcast.message || '',
        message: broadcast.message || '',
      });
      // Load providers and pre-select the default
      const providers = await loadEmailProviders();
      if (providers.length > 0) {
        const defaultMkt = providers.find(p => p.isDefaultMarketing);
        const first = defaultMkt || providers[0];
        setSendForm(prev => ({ ...prev, providerId: first.id }));
      }
      setShowSendDialog(true);
    } else {
      // WhatsApp / SMS — dispatch directly via /api/campaigns/send
      await doSendBroadcast(broadcast, null);
    }
  };

  // ── Actually dispatch a broadcast via the unified /api/campaigns/send ──
  // For email/multi-channel: requires emailConfig (providerId + subject + html).
  // For WhatsApp/SMS: uses the broadcast's stored message field.
  // The backend resolves the audience from the stored campaign fields, sends
  // personalized emails/WhatsApp messages, and updates campaign analytics.
  const doSendBroadcast = async (
    broadcast: Broadcast,
    emailConfig: { providerId: string; subject: string; html: string } | null,
  ) => {
    setBroadcasts(prev => prev.map(b => b.id === broadcast.id ? { ...b, status: 'sending' as const } : b));
    try {
      const payload: Record<string, unknown> = {
        campaignId: broadcast.id,
        name: broadcast.name,
        channel: broadcast.channel,
      };

      if (broadcast.channel === 'email' || broadcast.channel === 'multi') {
        if (!emailConfig) {
          toast.error('Email configuration is required');
          setBroadcasts(prev => prev.map(b => b.id === broadcast.id ? { ...b, status: 'draft' as const } : b));
          return;
        }
        payload.subject = emailConfig.subject;
        payload.html = emailConfig.html;
        payload.providerId = emailConfig.providerId;
        if (broadcast.channel === 'multi') {
          payload.message = broadcast.message || emailConfig.html;
        }
      } else {
        // WhatsApp / SMS — pass the broadcast's message field
        payload.message = broadcast.message || '';
      }

      const res = await authFetch('/api/campaigns/send', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data as { success?: boolean }).success) {
        const result = data as { sent?: number; failed?: number; skipped?: number; totalAudience?: number; channel?: string };
        const channelLabel = result.channel === 'whatsapp' ? 'WhatsApp'
          : result.channel === 'sms' ? 'SMS'
          : result.channel === 'multi' ? 'Multi-channel'
          : 'Broadcast';
        toast.success(
          `${channelLabel} sent — ${result.sent || 0} delivered, ${result.failed || 0} failed` +
          (result.skipped ? `, ${result.skipped} skipped` : '')
        );
        setShowSendDialog(false);
        await loadBroadcasts();
      } else {
        const errMsg = (data as { message?: string; error?: string }).message || (data as { error?: string }).error || 'Failed to send broadcast';
        toast.error(errMsg);
        setBroadcasts(prev => prev.map(b => b.id === broadcast.id ? { ...b, status: 'failed' as const } : b));
      }
    } catch {
      toast.error('Network error sending broadcast');
      setBroadcasts(prev => prev.map(b => b.id === broadcast.id ? { ...b, status: 'failed' as const } : b));
    }
  };

  // Convenience wrapper for the Send Now button
  const handleSendNow = (id: string) => {
    const broadcast = broadcasts.find(b => b.id === id);
    if (!broadcast) return;
    openSendDialog(broadcast);
  };

  // Called from the Send Now dialog's "Send" button
  const handleConfirmSend = async () => {
    if (!sendingBroadcast) return;
    if (!sendForm.subject.trim()) { toast.error('Subject is required'); return; }
    if (!sendForm.html.trim()) { toast.error('Email body is required'); return; }
    if (!sendForm.providerId) { toast.error('Please select an email provider'); return; }
    setIsSending(true);
    await doSendBroadcast(sendingBroadcast, {
      providerId: sendForm.providerId,
      subject: sendForm.subject,
      html: sendForm.html,
    });
    setIsSending(false);
  };

  const handleClone = async (broadcast: Broadcast) => {
    try {
      const res = await authFetch('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: `${broadcast.name} (Copy)`,
          type: 'broadcast',
          channel: broadcast.channel,
          audienceType: broadcast.audienceType,
          audienceId: broadcast.audienceId,
          audienceFiltersJson: broadcast.audienceFiltersJson || '{}',
          messageContent: broadcast.message,
          status: 'draft',
        }),
      });
      if (res.ok) {
        const result = await res.json();
        const cloned: Broadcast = {
          id: result.data.id, name: result.data.name, type: broadcast.type,
          status: 'draft', channel: broadcast.channel, message: broadcast.message,
          audienceType: broadcast.audienceType,
          audienceId: result.data.audienceId || broadcast.audienceId,
          audienceFiltersJson: result.data.audienceFiltersJson || broadcast.audienceFiltersJson,
          audienceCount: result.data.totalRecipients || 0,
          sentCount: 0, deliveredCount: 0, readCount: 0, repliedCount: 0, clickedCount: 0, failedCount: 0,
          createdAt: result.data.createdAt, timezone: broadcast.timezone, isRecurring: false,
        };
        setBroadcasts(prev => [cloned, ...prev]);
        toast.success('Broadcast cloned');
      }
    } catch {
      toast.error('Failed to clone broadcast');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBroadcasts(prev => prev.filter(b => b.id !== id));
        toast.success('Broadcast deleted');
      }
    } catch {
      toast.error('Failed to delete broadcast');
    }
  };

  // ── Open the edit dialog pre-populated with a broadcast's current values ──
  const openEditDialog = (broadcast: Broadcast) => {
    const derived = deriveAudienceMode(broadcast.audienceType, broadcast.audienceId, broadcast.audienceFiltersJson);
    const scheduled = broadcast.scheduledAt ? new Date(broadcast.scheduledAt) : null;
    setEditingId(broadcast.id);
    setEditForm({
      name: broadcast.name,
      type: broadcast.type,
      channel: broadcast.channel,
      message: broadcast.message,
      mediaUrl: broadcast.mediaUrl || '',
      ctaText: broadcast.ctaText || '',
      ctaUrl: broadcast.ctaUrl || '',
      audienceMode: derived.mode,
      audienceId: derived.groupId,
      manualEmails: derived.manualEmails,
      customerIds: derived.customerIds,
      scheduleDate: scheduled ? scheduled.toISOString().split('T')[0] : '',
      scheduleTime: scheduled ? scheduled.toTimeString().slice(0, 5) : '',
      timezone: broadcast.timezone || 'Asia/Kolkata',
      isRecurring: broadcast.isRecurring,
      recurringInterval: broadcast.recurringInterval || 'weekly',
    });
    setShowDetailDialog(false);
    setShowEditDialog(true);
    if (groups.length === 0) loadGroups();
    if (customers.length === 0) loadCustomers();
  };

  // ── Save edits via PUT /api/broadcasts/[id] ──
  const handleEdit = async () => {
    if (!editingId) return;
    const id = editingId;
    if (!editForm.name) { toast.error('Broadcast name is required'); return; }
    if (!editForm.message) { toast.error('Message is required'); return; }
    if ((editForm.audienceMode === 'segment' || editForm.audienceMode === 'mixed') && !editForm.audienceId) {
      toast.error('Please select a group for the audience'); return;
    }
    if ((editForm.audienceMode === 'custom' || editForm.audienceMode === 'mixed') && !editForm.manualEmails.trim()) {
      toast.error('Please enter at least one email address'); return;
    }
    if (editForm.audienceMode === 'customers' && editForm.customerIds.length === 0) {
      toast.error('Please select at least one customer'); return;
    }

    const audience = buildAudiencePayload(editForm.audienceMode, editForm.audienceId, editForm.manualEmails, editForm.customerIds);

    setIsEditing(true);
    try {
      const res = await authFetch(`/api/broadcasts/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name,
          type: 'broadcast',
          channel: editForm.channel,
          audienceType: audience.audienceType,
          audienceId: audience.audienceId,
          audienceFiltersJson: audience.audienceFiltersJson,
          messageContent: editForm.message,
          mediaUrl: editForm.mediaUrl || undefined,
          ctaText: editForm.ctaText || undefined,
          ctaUrl: editForm.ctaUrl || undefined,
          status: editForm.scheduleDate ? 'scheduled' : 'draft',
          scheduledAt: editForm.scheduleDate ? `${editForm.scheduleDate}T${editForm.scheduleTime || '09:00'}:00` : undefined,
          timezone: editForm.timezone,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        const updated: Broadcast = {
          id: result.data.id,
          name: result.data.name,
          type: result.data.type,
          status: mapCampaignStatus(result.data.status),
          channel: result.data.channel,
          message: result.data.messageContent || '',
          ctaText: result.data.ctaText || undefined,
          ctaUrl: result.data.ctaUrl || undefined,
          audienceType: result.data.audienceType || 'all',
          audienceId: result.data.audienceId || undefined,
          audienceFiltersJson: result.data.audienceFiltersJson || undefined,
          audienceCount: result.data.totalRecipients || 0,
          scheduledAt: result.data.scheduledAt || undefined,
          sentCount: result.data.sentCount || 0,
          deliveredCount: result.data.deliveredCount || 0,
          readCount: result.data.readCount || 0,
          repliedCount: result.data.repliedCount || 0,
          clickedCount: result.data.clickedCount || 0,
          failedCount: result.data.failedCount || 0,
          createdAt: result.data.createdAt,
          timezone: result.data.timezone || 'UTC',
          isRecurring: false,
        };
        setBroadcasts(prev => prev.map(b => b.id === id ? updated : b));
        setShowEditDialog(false);
        setEditingId(null);
        toast.success('Broadcast updated');
      } else {
        toast.error('Failed to update broadcast');
      }
    } catch {
      toast.error('Failed to update broadcast');
    } finally {
      setIsEditing(false);
    }
  };

  const stats = {
    total: broadcasts.length,
    sent: broadcasts.filter(b => b.status === 'sent').length,
    totalSent: broadcasts.reduce((s, b) => s + b.sentCount, 0),
    avgDeliveryRate: broadcasts.filter(b => b.sentCount > 0).length > 0
      ? Math.round(broadcasts.filter(b => b.sentCount > 0).reduce((s, b) => s + (b.deliveredCount / b.sentCount * 100), 0) / broadcasts.filter(b => b.sentCount > 0).length)
      : 0,
    avgReadRate: broadcasts.filter(b => b.sentCount > 0).length > 0
      ? Math.round(broadcasts.filter(b => b.sentCount > 0).reduce((s, b) => s + (b.readCount / b.sentCount * 100), 0) / broadcasts.filter(b => b.sentCount > 0).length)
      : 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-48 mt-1" />
            </div>
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4"><div className="flex items-center gap-2"><Skeleton className="size-4" /><div><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-8 mt-1" /></div></div></Card>
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4"><div className="space-y-3"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-2/3" /><Skeleton className="h-8 w-full" /></div></Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <Radio className="size-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">Failed to load broadcasts</p>
        <p className="text-sm mt-1">{error}</p>
        <Button className="mt-4" variant="outline" onClick={loadBroadcasts}>
          <Loader2 className="size-4 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Radio className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Broadcast</h2>
            <p className="text-sm text-muted-foreground">Multi-channel broadcast messaging</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
          <Plus className="size-4 mr-1.5" /> New Broadcast
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        {[
          { label: 'Total', value: stats.total, icon: Radio, color: 'text-foreground' },
          { label: 'Sent', value: stats.sent, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Messages Sent', value: stats.totalSent.toLocaleString(), icon: Send, color: 'text-sky-600' },
          { label: 'Avg Delivery', value: `${stats.avgDeliveryRate}%`, icon: BarChart3, color: 'text-purple-600' },
          { label: 'Avg Read Rate', value: `${stats.avgReadRate}%`, icon: Eye, color: 'text-amber-600' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-2">
                <Icon className={`size-4 ${stat.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="draft" className="text-xs">Draft</TabsTrigger>
            <TabsTrigger value="scheduled" className="text-xs">Scheduled</TabsTrigger>
            <TabsTrigger value="sending" className="text-xs">Sending</TabsTrigger>
            <TabsTrigger value="sent" className="text-xs">Sent</TabsTrigger>
            <TabsTrigger value="failed" className="text-xs">Failed</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search broadcasts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Broadcast List */}
      {filteredBroadcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Radio className="size-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No broadcasts found</p>
          <p className="text-sm">Create your first broadcast to reach customers</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4 mr-1.5" /> New Broadcast
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBroadcasts.map(broadcast => {
            const statusConfig = getStatusConfig(broadcast.status);
            return (
              <Card key={broadcast.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => { setSelectedBroadcast(broadcast); setShowDetailDialog(true); }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{broadcast.name}</h4>
                        <Badge variant="outline" className={`${statusConfig.color} text-[10px]`}>
                          {statusConfig.icon}
                          <span className="ml-1">{broadcast.status}</span>
                        </Badge>
                        <Badge variant="secondary" className={`${getTypeColor(broadcast.type)} text-[10px]`}>
                          {broadcast.type}
                        </Badge>
                        <Badge variant="secondary" className={`${getChannelColor(broadcast.channel)} text-[10px]`}>
                          {broadcast.channel}
                        </Badge>
                        {broadcast.isRecurring && (
                          <Badge variant="outline" className="text-[10px] bg-cyan-50 text-cyan-700 border-cyan-200">
                            🔄 {broadcast.recurringInterval}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{broadcast.message}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="size-3" />{getAudienceDisplayLabel(broadcast)} ({broadcast.audienceCount.toLocaleString()})</span>
                        {broadcast.scheduledAt && (
                          <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(broadcast.scheduledAt).toLocaleString()}</span>
                        )}
                        {broadcast.ctaText && (
                          <span className="flex items-center gap-1"><MessageSquare className="size-3" />CTA: {broadcast.ctaText}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {broadcast.status === 'draft' && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleSendNow(broadcast.id)}>
                          <Send className="size-3 mr-1" /> Send Now
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit" onClick={() => openEditDialog(broadcast)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Clone" onClick={() => handleClone(broadcast)}>
                        <Copy className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" title="Delete" onClick={() => handleDelete(broadcast.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  {broadcast.sentCount > 0 && (
                    <div className="grid grid-cols-6 gap-2 mt-3 pt-3 border-t">
                      {[
                        { label: 'Sent', value: broadcast.sentCount, color: 'text-sky-600' },
                        { label: 'Delivered', value: broadcast.deliveredCount, color: 'text-emerald-600' },
                        { label: 'Read', value: broadcast.readCount, color: 'text-purple-600' },
                        { label: 'Clicked', value: broadcast.clickedCount, color: 'text-orange-600' },
                        { label: 'Replied', value: broadcast.repliedCount, color: 'text-amber-600' },
                        { label: 'Failed', value: broadcast.failedCount, color: 'text-red-600' },
                      ].map(stat => (
                        <div key={stat.label} className="text-center">
                          <p className={`text-sm font-bold ${stat.color}`}>{stat.value.toLocaleString()}</p>
                          <p className="text-[9px] text-muted-foreground">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Broadcast Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Broadcast</DialogTitle>
            <DialogDescription>Send a message to multiple contacts at once</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Broadcast Name *</Label>
              <Input placeholder="e.g., Summer Sale Announcement" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={createForm.type} onValueChange={v => setCreateForm({ ...createForm, type: v as BroadcastType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={createForm.channel} onValueChange={v => setCreateForm({ ...createForm, channel: v as BroadcastChannel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BROADCAST_CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={createForm.audienceMode} onValueChange={v => setCreateForm({ ...createForm, audienceMode: v as AudienceMode })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCE_MODES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {createForm.audienceMode === 'customers' && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <UserCheck className="size-3" /> Select Customers ({createForm.customerIds.length} selected)
                  </Label>
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {isLoadingCustomers ? (
                      <div className="p-3 text-xs text-muted-foreground">Loading customers...</div>
                    ) : customers.length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground">No customers found</div>
                    ) : (
                      customers.map(c => (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b last:border-0"
                        >
                          <input
                            type="checkbox"
                            checked={createForm.customerIds.includes(c.id)}
                            onChange={e => {
                              const next = e.target.checked
                                ? [...createForm.customerIds, c.id]
                                : createForm.customerIds.filter(id => id !== c.id);
                              setCreateForm({ ...createForm, customerIds: next });
                            }}
                            className="rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{c.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {c.email || 'no email'} · {c.phone || 'no phone'}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
              {(createForm.audienceMode === 'segment' || createForm.audienceMode === 'mixed') && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Group</Label>
                  <Select value={createForm.audienceId || undefined} onValueChange={v => setCreateForm({ ...createForm, audienceId: v })}>
                    <SelectTrigger><SelectValue placeholder={isLoadingGroups ? 'Loading groups...' : 'Select a group'} /></SelectTrigger>
                    <SelectContent>
                      {groups.length === 0 ? (
                        <SelectItem value="_none" disabled>No groups available</SelectItem>
                      ) : (
                        groups.map(g => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name} ({g.memberCount || 0})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(createForm.audienceMode === 'custom' || createForm.audienceMode === 'mixed') && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Manual Emails (comma or newline separated)</Label>
                  <Textarea
                    placeholder="alice@example.com, bob@example.com"
                    value={createForm.manualEmails}
                    onChange={e => setCreateForm({ ...createForm, manualEmails: e.target.value })}
                    rows={3}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {createForm.manualEmails.split(/[\s,\n]+/).map(s => s.trim()).filter(Boolean).length} email(s) entered
                  </p>
                </div>
              )}
              {/* Live audience count */}
              <div className="flex items-center gap-1.5 text-[11px]">
                {isLoadingAudienceCount ? (
                  <><Loader2 className="size-3 animate-spin" /> <span className="text-muted-foreground">Counting recipients...</span></>
                ) : liveAudienceCount !== null ? (
                  <>
                    <Users className="size-3 text-sky-600" />
                    <span className="font-medium text-sky-700 dark:text-sky-300">{liveAudienceCount.toLocaleString()} recipient(s)</span>
                    <span className="text-muted-foreground">will receive this broadcast via {createForm.channel}</span>
                  </>
                ) : null}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                placeholder="Type your message... Use {{name}}, {{service}}, {{amount}} as placeholders"
                value={createForm.message}
                onChange={e => setCreateForm({ ...createForm, message: e.target.value })}
                rows={4}
              />
              <p className="text-[10px] text-muted-foreground">{createForm.message.length} characters {createForm.message.length > 1024 ? '· ⚠️ Exceeds WhatsApp limit' : '· ✅ Within limit'}</p>
            </div>

            <div className="space-y-2">
              <Label>Media URL (optional)</Label>
              <Input placeholder="https://example.com/image.jpg" value={createForm.mediaUrl} onChange={e => setCreateForm({ ...createForm, mediaUrl: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>CTA Button Text</Label>
                <Input placeholder="e.g., Book Now" value={createForm.ctaText} onChange={e => setCreateForm({ ...createForm, ctaText: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CTA URL</Label>
                <Input placeholder="https://..." value={createForm.ctaUrl} onChange={e => setCreateForm({ ...createForm, ctaUrl: e.target.value })} />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label>Schedule for later</Label>
              <Switch checked={!!createForm.scheduleDate} onCheckedChange={checked => setCreateForm({ ...createForm, scheduleDate: checked ? new Date().toISOString().split('T')[0] : '' })} />
            </div>
            {createForm.scheduleDate && (
              <div className="grid grid-cols-3 gap-3">
                <Input type="date" value={createForm.scheduleDate} onChange={e => setCreateForm({ ...createForm, scheduleDate: e.target.value })} />
                <Input type="time" value={createForm.scheduleTime} onChange={e => setCreateForm({ ...createForm, scheduleTime: e.target.value })} />
                <Select value={createForm.timezone} onValueChange={v => setCreateForm({ ...createForm, timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">IST</SelectItem>
                    <SelectItem value="America/New_York">EST</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>Recurring Broadcast</Label>
              <Switch checked={createForm.isRecurring} onCheckedChange={checked => setCreateForm({ ...createForm, isRecurring: checked })} />
            </div>
            {createForm.isRecurring && (
              <Select value={createForm.recurringInterval} onValueChange={v => setCreateForm({ ...createForm, recurringInterval: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!createForm.name || !createForm.message || isCreating}>
              {isCreating ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              {createForm.scheduleDate ? 'Schedule Broadcast' : 'Save as Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBroadcast?.name}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`${getStatusConfig(selectedBroadcast?.status || '').color} text-xs`}>
                  {selectedBroadcast?.status}
                </Badge>
                <Badge variant="secondary" className={`${getTypeColor(selectedBroadcast?.type || '')} text-xs`}>
                  {selectedBroadcast?.type}
                </Badge>
                <Badge variant="secondary" className={`${getChannelColor(selectedBroadcast?.channel || '')} text-xs`}>
                  {selectedBroadcast?.channel}
                </Badge>
              </div>
            </DialogDescription>
          </DialogHeader>
          {selectedBroadcast && (
            <div className="space-y-4">
              {/* Message Preview */}
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{selectedBroadcast.message}</p>
                {selectedBroadcast.ctaText && (
                  <div className="mt-3">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs">
                      {selectedBroadcast.ctaText}
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Audience:</span> <span className="font-medium">{getAudienceDisplayLabel(selectedBroadcast)}</span></div>
                <div><span className="text-muted-foreground">Recipients:</span> <span className="font-medium">{selectedBroadcast.audienceCount.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Timezone:</span> <span className="font-medium">{selectedBroadcast.timezone}</span></div>
                <div><span className="text-muted-foreground">Recurring:</span> <span className="font-medium">{selectedBroadcast.isRecurring ? selectedBroadcast.recurringInterval : 'No'}</span></div>
              </div>

              {selectedBroadcast.sentCount > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm mb-3">Delivery Analytics</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Sent', value: selectedBroadcast.sentCount, color: 'text-sky-600' },
                        { label: 'Delivered', value: selectedBroadcast.deliveredCount, color: 'text-emerald-600' },
                        { label: 'Read', value: selectedBroadcast.readCount, color: 'text-purple-600' },
                        { label: 'Clicked', value: selectedBroadcast.clickedCount, color: 'text-orange-600' },
                        { label: 'Replied', value: selectedBroadcast.repliedCount, color: 'text-amber-600' },
                        { label: 'Failed', value: selectedBroadcast.failedCount, color: 'text-red-600' },
                      ].map(stat => (
                        <Card key={stat.label} className="p-2 text-center">
                          <p className={`text-lg font-bold ${stat.color}`}>{stat.value.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                        </Card>
                      ))}
                    </div>
                    <div className="mt-3 space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span>Delivery Rate</span><span>{Math.round(selectedBroadcast.deliveredCount / selectedBroadcast.sentCount * 100)}%</span></div>
                        <Progress value={selectedBroadcast.deliveredCount / selectedBroadcast.sentCount * 100} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span>Read Rate</span><span>{Math.round(selectedBroadcast.readCount / selectedBroadcast.sentCount * 100)}%</span></div>
                        <Progress value={selectedBroadcast.readCount / selectedBroadcast.sentCount * 100} className="h-2" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {selectedBroadcast.status === 'failed' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700">Broadcast Failed</p>
                    <p className="text-xs text-red-600">Some messages failed to send. This could be due to invalid numbers or rate limiting. Try sending again or reduce the audience size.</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Close</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => selectedBroadcast && openEditDialog(selectedBroadcast)}>
              <Pencil className="size-4 mr-1.5" /> Edit Broadcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Broadcast Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Broadcast</DialogTitle>
            <DialogDescription>Update broadcast details and audience</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Broadcast Name *</Label>
              <Input placeholder="e.g., Summer Sale Announcement" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editForm.type} onValueChange={v => setEditForm({ ...editForm, type: v as BroadcastType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={editForm.channel} onValueChange={v => setEditForm({ ...editForm, channel: v as BroadcastChannel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BROADCAST_CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={editForm.audienceMode} onValueChange={v => setEditForm({ ...editForm, audienceMode: v as AudienceMode })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCE_MODES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {editForm.audienceMode === 'customers' && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <UserCheck className="size-3" /> Select Customers ({editForm.customerIds.length} selected)
                  </Label>
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {isLoadingCustomers ? (
                      <div className="p-3 text-xs text-muted-foreground">Loading customers...</div>
                    ) : customers.length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground">No customers found</div>
                    ) : (
                      customers.map(c => (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b last:border-0"
                        >
                          <input
                            type="checkbox"
                            checked={editForm.customerIds.includes(c.id)}
                            onChange={e => {
                              const next = e.target.checked
                                ? [...editForm.customerIds, c.id]
                                : editForm.customerIds.filter(id => id !== c.id);
                              setEditForm({ ...editForm, customerIds: next });
                            }}
                            className="rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{c.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {c.email || 'no email'} · {c.phone || 'no phone'}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
              {(editForm.audienceMode === 'segment' || editForm.audienceMode === 'mixed') && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Group</Label>
                  <Select value={editForm.audienceId || undefined} onValueChange={v => setEditForm({ ...editForm, audienceId: v })}>
                    <SelectTrigger><SelectValue placeholder={isLoadingGroups ? 'Loading groups...' : 'Select a group'} /></SelectTrigger>
                    <SelectContent>
                      {groups.length === 0 ? (
                        <SelectItem value="_none" disabled>No groups available</SelectItem>
                      ) : (
                        groups.map(g => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name} ({g.memberCount || 0})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(editForm.audienceMode === 'custom' || editForm.audienceMode === 'mixed') && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Manual Emails (comma or newline separated)</Label>
                  <Textarea
                    placeholder="alice@example.com, bob@example.com"
                    value={editForm.manualEmails}
                    onChange={e => setEditForm({ ...editForm, manualEmails: e.target.value })}
                    rows={3}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {editForm.manualEmails.split(/[\s,\n]+/).map(s => s.trim()).filter(Boolean).length} email(s) entered
                  </p>
                </div>
              )}
              {/* Live audience count */}
              <div className="flex items-center gap-1.5 text-[11px]">
                {isLoadingAudienceCount ? (
                  <><Loader2 className="size-3 animate-spin" /> <span className="text-muted-foreground">Counting recipients...</span></>
                ) : liveAudienceCount !== null ? (
                  <>
                    <Users className="size-3 text-sky-600" />
                    <span className="font-medium text-sky-700 dark:text-sky-300">{liveAudienceCount.toLocaleString()} recipient(s)</span>
                    <span className="text-muted-foreground">will receive via {editForm.channel}</span>
                  </>
                ) : null}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                placeholder="Type your message... Use {{name}}, {{service}}, {{amount}} as placeholders"
                value={editForm.message}
                onChange={e => setEditForm({ ...editForm, message: e.target.value })}
                rows={4}
              />
              <p className="text-[10px] text-muted-foreground">{editForm.message.length} characters {editForm.message.length > 1024 ? '· ⚠️ Exceeds WhatsApp limit' : '· ✅ Within limit'}</p>
            </div>

            <div className="space-y-2">
              <Label>Media URL (optional)</Label>
              <Input placeholder="https://example.com/image.jpg" value={editForm.mediaUrl} onChange={e => setEditForm({ ...editForm, mediaUrl: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>CTA Button Text</Label>
                <Input placeholder="e.g., Book Now" value={editForm.ctaText} onChange={e => setEditForm({ ...editForm, ctaText: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CTA URL</Label>
                <Input placeholder="https://..." value={editForm.ctaUrl} onChange={e => setEditForm({ ...editForm, ctaUrl: e.target.value })} />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label>Schedule for later</Label>
              <Switch checked={!!editForm.scheduleDate} onCheckedChange={checked => setEditForm({ ...editForm, scheduleDate: checked ? new Date().toISOString().split('T')[0] : '' })} />
            </div>
            {editForm.scheduleDate && (
              <div className="grid grid-cols-3 gap-3">
                <Input type="date" value={editForm.scheduleDate} onChange={e => setEditForm({ ...editForm, scheduleDate: e.target.value })} />
                <Input type="time" value={editForm.scheduleTime} onChange={e => setEditForm({ ...editForm, scheduleTime: e.target.value })} />
                <Select value={editForm.timezone} onValueChange={v => setEditForm({ ...editForm, timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">IST</SelectItem>
                    <SelectItem value="America/New_York">EST</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEdit} disabled={!editForm.name || !editForm.message || isEditing}>
              {isEditing ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Send Now Dialog (email/multi-channel broadcasts) ─────────────── */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="size-5 text-sky-600" />
              Send Broadcast: {sendingBroadcast?.name}
            </DialogTitle>
            <DialogDescription>
              Review and send this {sendingBroadcast?.channel === 'multi' ? 'multi-channel' : 'email'} broadcast to your audience.
              Audience: {sendingBroadcast ? getAudienceDisplayLabel(sendingBroadcast) : ''} ({(sendingBroadcast?.audienceCount || 0).toLocaleString()} recipients)
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] pr-1">
            <div className="space-y-4 pr-3">
              {/* No providers warning */}
              {emailProviders.length === 0 && !isLoadingProviders && (
                <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                        Email Provider Required
                      </p>
                      <p className="text-xs text-amber-800 dark:text-amber-200 mt-0.5">
                        Connect SMTP, Resend, SendGrid, Amazon SES, Mailgun or Brevo in Settings → Providers before sending.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Audience info */}
              {sendingBroadcast && (
                <div className="rounded-md border bg-slate-50 dark:bg-slate-900 p-3 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="size-3.5 text-sky-600" />
                    <span className="font-medium">Audience</span>
                  </div>
                  <div className="text-muted-foreground">
                    {getAudienceDisplayLabel(sendingBroadcast)} · {sendingBroadcast.audienceCount.toLocaleString()} stored recipient(s)
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    Channel: <span className="font-medium uppercase">{sendingBroadcast.channel}</span>
                  </div>
                </div>
              )}

              {/* Subject (email + multi) */}
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  placeholder="Email subject (supports {{name}})"
                  value={sendForm.subject}
                  onChange={e => setSendForm({ ...sendForm, subject: e.target.value })}
                />
              </div>

              {/* HTML body */}
              <div className="space-y-2">
                <Label>Email Body (HTML, supports variables)</Label>
                <Textarea
                  rows={8}
                  className="font-mono text-xs"
                  placeholder="<h1>Hello {{name}}</h1>"
                  value={sendForm.html}
                  onChange={e => setSendForm({ ...sendForm, html: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground">{sendForm.html.length} characters</p>
              </div>

              {/* For multi-channel: WhatsApp message body */}
              {sendingBroadcast?.channel === 'multi' && (
                <div className="space-y-2">
                  <Label>WhatsApp / SMS Message (text, supports variables)</Label>
                  <Textarea
                    rows={3}
                    placeholder="Hello {{name}}, ..."
                    value={sendForm.message}
                    onChange={e => setSendForm({ ...sendForm, message: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Multi-channel sends email to recipients with email AND WhatsApp to recipients with phone.
                  </p>
                </div>
              )}

              {/* Email Provider dropdown */}
              <div className="space-y-2">
                <Label>Email Provider</Label>
                <Select
                  value={sendForm.providerId}
                  onValueChange={v => setSendForm({ ...sendForm, providerId: v })}
                  disabled={emailProviders.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isLoadingProviders
                          ? 'Loading providers...'
                          : emailProviders.length === 0
                            ? 'No providers connected'
                            : 'Select a provider'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {emailProviders.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} <span className="text-muted-foreground">({p.providerType.toUpperCase()})</span>
                        {p.isDefaultMarketing ? ' ★' : ''}
                        {p.isPlatform && <span className="text-muted-foreground ml-1">· platform</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Mail className="size-3" />
                  All active email providers are listed. If none appear, connect one in Settings → Providers.
                </p>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={handleConfirmSend}
              disabled={
                isSending ||
                !sendForm.subject.trim() ||
                !sendForm.html.trim() ||
                !sendForm.providerId
              }
            >
              {isSending ? (
                <><Loader2 className="size-4 mr-1.5 animate-spin" /> Sending...</>
              ) : (
                <><Send className="size-4 mr-1.5" /> Send Now</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
