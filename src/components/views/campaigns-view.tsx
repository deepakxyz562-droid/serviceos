'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Megaphone, Plus, Search, Play, Pause, Copy, Eye, Calendar,
  Users, Send, BarChart3, Clock, CheckCircle2, XCircle,
  MessageSquare, TrendingUp, Loader2, Trash2, Pencil,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { authFetch } from '@/lib/client-auth';

// ─── Types ──────────────────────────────────────────────────────────────────

type CampaignType = 'promotional' | 'transactional' | 'reminder' | 'seasonal' | 're_engagement' | 'follow_up';
type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
type CampaignChannel = 'whatsapp' | 'email' | 'sms' | 'multi';

interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  channel: CampaignChannel;
  audienceType: string;
  audienceId?: string;
  audienceFiltersJson?: string;
  messageContent: string;
  scheduledAt: string | null;
  timezone: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  clickedCount: number;
  repliedCount: number;
  convertedCount: number;
  failedCount: number;
  createdAt: string;
  ctaText?: string;
  ctaUrl?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CAMPAIGN_TYPES: { value: CampaignType; label: string }[] = [
  { value: 'promotional', label: 'Promotional' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 're_engagement', label: 'Re-engagement' },
  { value: 'follow_up', label: 'Follow-up' },
];

const CAMPAIGN_CHANNELS: { value: CampaignChannel; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'multi', label: 'Multi-channel' },
];

const AUDIENCE_TYPES = [
  'all', 'leads', 'customers', 'vip', 'inactive_30', 'recent',
  'unpaid', 'upcoming_bookings', 'custom',
];

const AUDIENCE_LABELS: Record<string, string> = {
  all: 'All Contacts',
  leads: 'All Leads',
  customers: 'All Customers',
  vip: 'VIP Customers',
  inactive_30: 'Inactive 30 Days',
  recent: 'Recent Customers',
  unpaid: 'Unpaid Invoices',
  upcoming_bookings: 'Upcoming Bookings',
  custom: 'Custom Segment',
  segment: 'Specific Group',
  contact_list: 'Specific Group',
  mixed: 'Group + Manual Emails',
};

// ─── Audience Mode helpers ────────────────────────────────────────────────
// The form exposes 4 conceptual audience modes that map to the backend
// Campaign fields `audienceType` (all|segment|contact_list|custom),
// `audienceId` (group id), and `audienceFiltersJson` (JSON string carrying
// `{ manualEmails: "a@b.com,c@d.com" }` when manual recipients are present).

type AudienceMode = 'all' | 'segment' | 'custom' | 'mixed';

const AUDIENCE_MODES: { value: AudienceMode; label: string }[] = [
  { value: 'all', label: 'All Contacts' },
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

function deriveAudienceMode(
  audienceType: string,
  audienceId: string | null | undefined,
  filtersJson: string | null | undefined,
): { mode: AudienceMode; groupId: string; manualEmails: string } {
  const manualEmails = parseManualEmails(filtersJson);
  const hasGroup = !!audienceId;
  const hasManual = !!manualEmails.trim();

  if (audienceType === 'segment' || audienceType === 'contact_list') {
    if (hasManual) return { mode: 'mixed', groupId: audienceId || '', manualEmails };
    if (hasGroup) return { mode: 'segment', groupId: audienceId || '', manualEmails: '' };
  }
  if (audienceType === 'custom') {
    if (hasGroup && hasManual) return { mode: 'mixed', groupId: audienceId || '', manualEmails };
    if (hasManual) return { mode: 'custom', groupId: '', manualEmails };
  }
  if (audienceType === 'all' && !hasGroup && !hasManual) {
    return { mode: 'all', groupId: '', manualEmails: '' };
  }
  // Legacy audience types (leads, customers, vip, etc.)
  if (hasManual) return { mode: 'custom', groupId: '', manualEmails };
  return { mode: 'all', groupId: '', manualEmails: '' };
}

function buildAudiencePayload(
  mode: AudienceMode,
  groupId: string,
  manualEmails: string,
): { audienceType: string; audienceId?: string; audienceFiltersJson?: string } {
  const cleanEmails = manualEmails
    .split(/[\s,\n]+/)
    .map(e => e.trim())
    .filter(Boolean)
    .join(', ');
  switch (mode) {
    case 'all':
      return { audienceType: 'all' };
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

function getAudienceDisplayLabel(campaign: {
  audienceType: string;
  audienceId?: string;
  audienceFiltersJson?: string;
}): string {
  const { mode } = deriveAudienceMode(
    campaign.audienceType,
    campaign.audienceId,
    campaign.audienceFiltersJson,
  );
  return AUDIENCE_MODES.find(a => a.value === mode)?.label || campaign.audienceType;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    scheduled: 'bg-sky-100 text-sky-700 border-sky-200',
    running: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    paused: 'bg-amber-100 text-amber-700 border-amber-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[status] || 'bg-slate-100 text-slate-600';
}

function getStatusIcon(status: string) {
  const map: Record<string, React.ReactNode> = {
    draft: <Clock className="size-3" />,
    scheduled: <Calendar className="size-3" />,
    running: <Play className="size-3" />,
    paused: <Pause className="size-3" />,
    completed: <CheckCircle2 className="size-3" />,
    cancelled: <XCircle className="size-3" />,
  };
  return map[status] || null;
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

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '', type: 'promotional' as CampaignType, channel: 'whatsapp' as CampaignChannel,
    audienceMode: 'all' as AudienceMode, audienceId: '', manualEmails: '',
    messageContent: '', ctaText: '', ctaUrl: '',
    scheduleDate: '', scheduleTime: '', timezone: 'Asia/Kolkata',
  });
  const [editForm, setEditForm] = useState({
    name: '', type: 'promotional' as CampaignType, channel: 'whatsapp' as CampaignChannel,
    audienceMode: 'all' as AudienceMode, audienceId: '', manualEmails: '',
    messageContent: '', ctaText: '', ctaUrl: '',
    scheduleDate: '', scheduleTime: '', timezone: 'Asia/Kolkata',
  });

  // ── Load campaigns from API ──
  const loadCampaigns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('limit', '50');
      // Exclude broadcasts from campaigns view
      params.set('type', 'promotional,reminder,seasonal,re_engagement,follow_up');

      const res = await authFetch(`/api/campaigns?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setCampaigns(result.data || []);
      } else {
        setError('Failed to load campaigns');
        toast.error('Failed to load campaigns');
      }
    } catch {
      setError('Network error. Please check your connection.');
      toast.error('Network error loading campaigns');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

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

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const filteredCampaigns = campaigns.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleStatusChange = async (id: string, newStatus: CampaignStatus) => {
    try {
      const res = await authFetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
        toast.success(`Campaign ${newStatus}`);
      }
    } catch {
      toast.error('Failed to update campaign');
    }
  };

  const handleClone = async (campaign: Campaign) => {
    try {
      const res = await authFetch('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: `${campaign.name} (Copy)`,
          type: campaign.type,
          channel: campaign.channel,
          audienceType: campaign.audienceType,
          audienceId: campaign.audienceId,
          audienceFiltersJson: campaign.audienceFiltersJson || '{}',
          messageContent: campaign.messageContent,
          status: 'draft',
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setCampaigns(prev => [result.data, ...prev]);
        toast.success('Campaign cloned');
      }
    } catch {
      toast.error('Failed to clone campaign');
    }
  };

  const handleCreate = async () => {
    if (!createForm.name) { toast.error('Campaign name is required'); return; }
    if (!createForm.messageContent) { toast.error('Message content is required'); return; }
    if ((createForm.audienceMode === 'segment' || createForm.audienceMode === 'mixed') && !createForm.audienceId) {
      toast.error('Please select a group for the audience'); return;
    }
    if ((createForm.audienceMode === 'custom' || createForm.audienceMode === 'mixed') && !createForm.manualEmails.trim()) {
      toast.error('Please enter at least one email address'); return;
    }

    const audience = buildAudiencePayload(createForm.audienceMode, createForm.audienceId, createForm.manualEmails);

    setIsCreating(true);
    try {
      const res = await authFetch('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name,
          type: createForm.type,
          channel: createForm.channel,
          audienceType: audience.audienceType,
          audienceId: audience.audienceId,
          audienceFiltersJson: audience.audienceFiltersJson,
          messageContent: createForm.messageContent,
          ctaText: createForm.ctaText || undefined,
          ctaUrl: createForm.ctaUrl || undefined,
          status: createForm.scheduleDate ? 'scheduled' : 'draft',
          scheduledAt: createForm.scheduleDate ? `${createForm.scheduleDate}T${createForm.scheduleTime || '09:00'}:00` : undefined,
          timezone: createForm.timezone,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setCampaigns(prev => [result.data, ...prev]);
        setShowCreateDialog(false);
        setCreateForm({
          name: '', type: 'promotional', channel: 'whatsapp',
          audienceMode: 'all', audienceId: '', manualEmails: '',
          messageContent: '', ctaText: '', ctaUrl: '',
          scheduleDate: '', scheduleTime: '', timezone: 'Asia/Kolkata',
        });
        toast.success('Campaign created');
      } else {
        toast.error('Failed to create campaign');
      }
    } catch {
      toast.error('Failed to create campaign');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Open the edit dialog pre-populated with a campaign's current values ──
  const openEditDialog = (campaign: Campaign) => {
    const derived = deriveAudienceMode(campaign.audienceType, campaign.audienceId, campaign.audienceFiltersJson);
    const scheduled = campaign.scheduledAt ? new Date(campaign.scheduledAt) : null;
    setEditingId(campaign.id);
    setEditForm({
      name: campaign.name,
      type: campaign.type,
      channel: campaign.channel,
      audienceMode: derived.mode,
      audienceId: derived.groupId,
      manualEmails: derived.manualEmails,
      messageContent: campaign.messageContent || '',
      ctaText: campaign.ctaText || '',
      ctaUrl: campaign.ctaUrl || '',
      scheduleDate: scheduled ? scheduled.toISOString().split('T')[0] : '',
      scheduleTime: scheduled ? scheduled.toTimeString().slice(0, 5) : '',
      timezone: campaign.timezone || 'Asia/Kolkata',
    });
    setShowDetailDialog(false);
    setShowEditDialog(true);
    if (groups.length === 0) loadGroups();
  };

  // ── Save edits via PUT /api/campaigns/[id] ──
  const handleEdit = async () => {
    if (!editingId) return;
    const id = editingId;
    if (!editForm.name) { toast.error('Campaign name is required'); return; }
    if (!editForm.messageContent) { toast.error('Message content is required'); return; }
    if ((editForm.audienceMode === 'segment' || editForm.audienceMode === 'mixed') && !editForm.audienceId) {
      toast.error('Please select a group for the audience'); return;
    }
    if ((editForm.audienceMode === 'custom' || editForm.audienceMode === 'mixed') && !editForm.manualEmails.trim()) {
      toast.error('Please enter at least one email address'); return;
    }

    const audience = buildAudiencePayload(editForm.audienceMode, editForm.audienceId, editForm.manualEmails);

    setIsEditing(true);
    try {
      const res = await authFetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name,
          type: editForm.type,
          channel: editForm.channel,
          audienceType: audience.audienceType,
          audienceId: audience.audienceId,
          audienceFiltersJson: audience.audienceFiltersJson,
          messageContent: editForm.messageContent,
          ctaText: editForm.ctaText || undefined,
          ctaUrl: editForm.ctaUrl || undefined,
          status: editForm.scheduleDate ? 'scheduled' : 'draft',
          scheduledAt: editForm.scheduleDate ? `${editForm.scheduleDate}T${editForm.scheduleTime || '09:00'}:00` : undefined,
          timezone: editForm.timezone,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setCampaigns(prev => prev.map(c => c.id === id ? result.data : c));
        setShowEditDialog(false);
        setEditingId(null);
        toast.success('Campaign updated');
      } else {
        toast.error('Failed to update campaign');
      }
    } catch {
      toast.error('Failed to update campaign');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCampaigns(prev => prev.filter(c => c.id !== id));
        toast.success('Campaign deleted');
      }
    } catch {
      toast.error('Failed to delete campaign');
    }
  };

  const stats = {
    total: campaigns.length,
    running: campaigns.filter(c => c.status === 'running').length,
    totalSent: campaigns.reduce((s, c) => s + c.sentCount, 0),
    avgReadRate: campaigns.filter(c => c.sentCount > 0).length > 0
      ? Math.round(campaigns.filter(c => c.sentCount > 0).reduce((s, c) => s + (c.readCount / c.sentCount * 100), 0) / campaigns.filter(c => c.sentCount > 0).length)
      : 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-44 mt-1" />
            </div>
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4"><div className="flex items-center gap-2"><Skeleton className="size-4" /><div><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-10 mt-1" /></div></div></Card>
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4"><div className="space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-10 w-full" /></div></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <Megaphone className="size-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">Failed to load campaigns</p>
        <p className="text-sm mt-1">{error}</p>
        <Button className="mt-4" variant="outline" onClick={loadCampaigns}>
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
            <Megaphone className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Campaigns</h2>
            <p className="text-sm text-muted-foreground">Multi-channel campaign engine</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
          <Plus className="size-4 mr-1.5" /> Create Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Total Campaigns', value: stats.total, icon: Megaphone, color: 'text-foreground' },
          { label: 'Active', value: stats.running, icon: Play, color: 'text-emerald-600' },
          { label: 'Total Sent', value: stats.totalSent.toLocaleString(), icon: Send, color: 'text-sky-600' },
          { label: 'Avg Read Rate', value: `${stats.avgReadRate}%`, icon: Eye, color: 'text-purple-600' },
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
            <TabsTrigger value="running" className="text-xs">Running</TabsTrigger>
            <TabsTrigger value="paused" className="text-xs">Paused</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Campaign List */}
      {filteredCampaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Megaphone className="size-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No campaigns found</p>
          <p className="text-sm mt-1">Create your first campaign to get started</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4 mr-1.5" /> Create Campaign
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {filteredCampaigns.map(campaign => (
            <Card key={campaign.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => { setSelectedCampaign(campaign); setShowDetailDialog(true); }}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-sm">{campaign.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`${getStatusColor(campaign.status)} text-[10px]`}>
                        {getStatusIcon(campaign.status)}
                        <span className="ml-1">{campaign.status}</span>
                      </Badge>
                      <Badge variant="secondary" className={`${getChannelColor(campaign.channel)} text-[10px]`}>
                        {campaign.channel}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">{campaign.type}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {campaign.status === 'running' && (
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleStatusChange(campaign.id, 'paused')}><Pause className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Pause</TooltipContent></Tooltip></TooltipProvider>
                    )}
                    {campaign.status === 'paused' && (
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleStatusChange(campaign.id, 'running')}><Play className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Resume</TooltipContent></Tooltip></TooltipProvider>
                    )}
                    {campaign.status === 'draft' && (
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleStatusChange(campaign.id, 'running')}><Play className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Start</TooltipContent></Tooltip></TooltipProvider>
                    )}
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit" onClick={() => openEditDialog(campaign)}><Pencil className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip></TooltipProvider>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleClone(campaign)}><Copy className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Clone</TooltipContent></Tooltip></TooltipProvider>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(campaign.id)}><Trash2 className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip></TooltipProvider>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="size-3" />{getAudienceDisplayLabel(campaign)}</span>
                  <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(campaign.createdAt).toLocaleDateString()}</span>
                </div>
                {campaign.sentCount > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                    {[
                      { label: 'Sent', value: campaign.sentCount, icon: Send },
                      { label: 'Read', value: campaign.readCount, icon: Eye },
                      { label: 'Replied', value: campaign.repliedCount, icon: MessageSquare },
                    ].map(stat => {
                      const Icon = stat.icon;
                      return (
                        <div key={stat.label} className="text-center">
                          <Icon className="size-3 text-muted-foreground mx-auto" />
                          <p className="font-medium text-sm">{stat.value.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>Set up a new multi-channel campaign</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input placeholder="e.g., Summer Cleaning Promo" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={createForm.type} onValueChange={v => setCreateForm({ ...createForm, type: v as CampaignType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={createForm.channel} onValueChange={v => setCreateForm({ ...createForm, channel: v as CampaignChannel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
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
            </div>
            <div className="space-y-2">
              <Label>Message Content *</Label>
              <Textarea placeholder="Type your message... Use {{name}}, {{service}}, {{amount}} as placeholders" value={createForm.messageContent} onChange={e => setCreateForm({ ...createForm, messageContent: e.target.value })} rows={4} />
              <p className="text-[10px] text-muted-foreground">{createForm.messageContent.length} characters</p>
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
            <div className="space-y-2">
              <Label>Schedule (optional)</Label>
              <div className="grid grid-cols-3 gap-3">
                <Input type="date" value={createForm.scheduleDate} onChange={e => setCreateForm({ ...createForm, scheduleDate: e.target.value })} />
                <Input type="time" value={createForm.scheduleTime} onChange={e => setCreateForm({ ...createForm, scheduleTime: e.target.value })} />
                <Select value={createForm.timezone} onValueChange={v => setCreateForm({ ...createForm, timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">IST (India)</SelectItem>
                    <SelectItem value="America/New_York">EST (New York)</SelectItem>
                    <SelectItem value="America/Chicago">CST (Chicago)</SelectItem>
                    <SelectItem value="America/Los_Angeles">PST (LA)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!createForm.name || !createForm.messageContent || isCreating}>
              {isCreating ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              {createForm.scheduleDate ? 'Schedule Campaign' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCampaign?.name}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`${getStatusColor(selectedCampaign?.status || '')} text-xs`}>
                  {selectedCampaign?.status}
                </Badge>
                <Badge variant="secondary" className={`${getChannelColor(selectedCampaign?.channel || '')} text-xs`}>
                  {selectedCampaign?.channel}
                </Badge>
              </div>
            </DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{selectedCampaign.type}</span></div>
                <div><span className="text-muted-foreground">Audience:</span> <span className="font-medium">{getAudienceDisplayLabel(selectedCampaign)}</span></div>
                <div><span className="text-muted-foreground">Channel:</span> <span className="font-medium">{selectedCampaign.channel}</span></div>
                <div><span className="text-muted-foreground">Timezone:</span> <span className="font-medium">{selectedCampaign.timezone}</span></div>
              </div>

              {selectedCampaign.messageContent && (
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">{selectedCampaign.messageContent}</p>
                  {selectedCampaign.ctaText && (
                    <Button size="sm" className="mt-3 bg-emerald-600 hover:bg-emerald-700 h-7 text-xs">
                      {selectedCampaign.ctaText}
                    </Button>
                  )}
                </div>
              )}

              <Separator />
              <div>
                <h4 className="font-medium text-sm mb-2">Campaign Analytics</h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Sent', value: selectedCampaign.sentCount, color: 'text-sky-600' },
                    { label: 'Delivered', value: selectedCampaign.deliveredCount, color: 'text-emerald-600' },
                    { label: 'Read', value: selectedCampaign.readCount, color: 'text-purple-600' },
                    { label: 'Clicked', value: selectedCampaign.clickedCount, color: 'text-orange-600' },
                    { label: 'Replied', value: selectedCampaign.repliedCount, color: 'text-amber-600' },
                    { label: 'Converted', value: selectedCampaign.convertedCount, color: 'text-green-600' },
                  ].map(stat => (
                    <Card key={stat.label} className="p-2 text-center">
                      <p className={`text-lg font-bold ${stat.color}`}>{stat.value.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </Card>
                  ))}
                </div>
                {selectedCampaign.sentCount > 0 && (
                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span>Delivery Rate</span><span>{Math.round(selectedCampaign.deliveredCount / selectedCampaign.sentCount * 100)}%</span></div>
                      <Progress value={selectedCampaign.deliveredCount / selectedCampaign.sentCount * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span>Read Rate</span><span>{Math.round(selectedCampaign.readCount / selectedCampaign.sentCount * 100)}%</span></div>
                      <Progress value={selectedCampaign.readCount / selectedCampaign.sentCount * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span>Conversion Rate</span><span>{Math.round(selectedCampaign.convertedCount / selectedCampaign.sentCount * 100)}%</span></div>
                      <Progress value={selectedCampaign.convertedCount / selectedCampaign.sentCount * 100} className="h-2" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Close</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => selectedCampaign && openEditDialog(selectedCampaign)}>
              <Pencil className="size-4 mr-1.5" /> Edit Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>Update campaign details and audience</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input placeholder="e.g., Summer Cleaning Promo" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editForm.type} onValueChange={v => setEditForm({ ...editForm, type: v as CampaignType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={editForm.channel} onValueChange={v => setEditForm({ ...editForm, channel: v as CampaignChannel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
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
            </div>
            <div className="space-y-2">
              <Label>Message Content *</Label>
              <Textarea placeholder="Type your message... Use {{name}}, {{service}}, {{amount}} as placeholders" value={editForm.messageContent} onChange={e => setEditForm({ ...editForm, messageContent: e.target.value })} rows={4} />
              <p className="text-[10px] text-muted-foreground">{editForm.messageContent.length} characters</p>
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
            <div className="space-y-2">
              <Label>Schedule (optional)</Label>
              <div className="grid grid-cols-3 gap-3">
                <Input type="date" value={editForm.scheduleDate} onChange={e => setEditForm({ ...editForm, scheduleDate: e.target.value })} />
                <Input type="time" value={editForm.scheduleTime} onChange={e => setEditForm({ ...editForm, scheduleTime: e.target.value })} />
                <Select value={editForm.timezone} onValueChange={v => setEditForm({ ...editForm, timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">IST (India)</SelectItem>
                    <SelectItem value="America/New_York">EST (New York)</SelectItem>
                    <SelectItem value="America/Chicago">CST (Chicago)</SelectItem>
                    <SelectItem value="America/Los_Angeles">PST (LA)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEdit} disabled={!editForm.name || !editForm.messageContent || isEditing}>
              {isEditing ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
