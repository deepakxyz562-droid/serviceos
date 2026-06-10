'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Megaphone, Plus, Search, Play, Pause, Copy, Eye, Calendar,
  Users, Send, BarChart3, Clock, CheckCircle2,
  ArrowRight, MousePointer, MessageSquare, TrendingUp,
  Pencil, Trash2, Loader2,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/stat-card';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  audienceType: string;
  messageContent: string;
  mediaUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  scheduledAt?: string;
  timezone: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  clickedCount: number;
  repliedCount: number;
  convertedCount: number;
  tenantId?: string;
  workspaceId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CAMPAIGN_TYPES = [
  { value: 'promotional', label: 'Promotional' },
  { value: 'service_reminder', label: 'Service Reminder' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 're_engagement', label: 'Re-engagement' },
  { value: 'follow_up', label: 'Follow-up' },
];

const AUDIENCE_TYPES = [
  { value: 'all', label: 'All Customers' },
  { value: 'segment', label: 'Segment' },
  { value: 'contact_list', label: 'Contact List' },
  { value: 'custom', label: 'Custom' },
];

const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Asia/Kolkata'];

const DEFAULT_CREATE_FORM = {
  name: '', description: '', type: 'promotional', audienceType: 'all',
  messageContent: '', ctaText: '', ctaUrl: '',
  scheduleDate: '', scheduleTime: '', timezone: 'UTC',
};

const DEFAULT_EDIT_FORM = {
  name: '', description: '', type: 'promotional', status: 'draft', audienceType: 'all',
  messageContent: '', ctaText: '', ctaUrl: '',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    scheduled: 'bg-teal-100 text-teal-700 border-teal-200',
    running: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    paused: 'bg-amber-100 text-amber-700 border-amber-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
}

function getStatusIcon(status: string) {
  const map: Record<string, React.ReactNode> = {
    draft: <Clock className="size-3" />,
    scheduled: <Calendar className="size-3" />,
    running: <Play className="size-3" />,
    paused: <Pause className="size-3" />,
    completed: <CheckCircle2 className="size-3" />,
  };
  return map[status] || null;
}

function getTypeLabel(type: string) {
  return CAMPAIGN_TYPES.find(t => t.value === type)?.label || type.replace('_', ' ');
}

function getAudienceLabel(audienceType: string) {
  return AUDIENCE_TYPES.find(a => a.value === audienceType)?.label || audienceType;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
  const [editForm, setEditForm] = useState(DEFAULT_EDIT_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/campaigns');
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      const json = await res.json();
      setCampaigns(json.data || []);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // ─── Filters ────────────────────────────────────────────────────────────

  const filteredCampaigns = campaigns.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!createForm.name) { toast.error('Campaign name is required'); return; }
    if (!createForm.messageContent) { toast.error('Message content is required'); return; }
    try {
      setSubmitting(true);
      const body: Record<string, unknown> = {
        name: createForm.name,
        description: createForm.description,
        type: createForm.type,
        audienceType: createForm.audienceType,
        messageContent: createForm.messageContent,
        ctaText: createForm.ctaText || undefined,
        ctaUrl: createForm.ctaUrl || undefined,
        timezone: createForm.timezone,
      };
      if (createForm.scheduleDate) {
        body.status = 'scheduled';
        body.scheduledAt = `${createForm.scheduleDate}T${createForm.scheduleTime || '09:00'}`;
      }
      const res = await authFetch('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create campaign');
      toast.success('Campaign created');
      setShowCreateDialog(false);
      setCreateForm(DEFAULT_CREATE_FORM);
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedCampaign) return;
    if (!editForm.name) { toast.error('Campaign name is required'); return; }
    try {
      setSubmitting(true);
      const res = await authFetch(`/api/campaigns/${selectedCampaign.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          type: editForm.type,
          status: editForm.status,
          audienceType: editForm.audienceType,
          messageContent: editForm.messageContent,
          ctaText: editForm.ctaText || undefined,
          ctaUrl: editForm.ctaUrl || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to update campaign');
      toast.success('Campaign updated');
      setShowEditDialog(false);
      setSelectedCampaign(null);
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      const res = await authFetch(`/api/campaigns/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete campaign');
      toast.success('Campaign deleted');
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await authFetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success(`Campaign ${newStatus}`);
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  const handleClone = async (campaign: Campaign) => {
    try {
      const res = await authFetch('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: `${campaign.name} (Copy)`,
          description: campaign.description,
          type: campaign.type,
          status: 'draft',
          audienceType: campaign.audienceType,
          messageContent: campaign.messageContent,
          ctaText: campaign.ctaText,
          ctaUrl: campaign.ctaUrl,
          timezone: campaign.timezone,
          cloneFromId: campaign.id,
          tenantId: campaign.tenantId,
          workspaceId: campaign.workspaceId,
        }),
      });
      if (!res.ok) throw new Error('Failed to clone campaign');
      toast.success('Campaign cloned');
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      toast.error('Failed to clone campaign');
    }
  };

  const openEditDialog = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setEditForm({
      name: campaign.name,
      description: campaign.description || '',
      type: campaign.type,
      status: campaign.status,
      audienceType: campaign.audienceType,
      messageContent: campaign.messageContent || '',
      ctaText: campaign.ctaText || '',
      ctaUrl: campaign.ctaUrl || '',
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (campaign: Campaign) => {
    setDeleteTarget(campaign);
    setShowDeleteDialog(true);
  };

  // ─── Stats ──────────────────────────────────────────────────────────────

  const stats = {
    total: campaigns.length,
    running: campaigns.filter(c => c.status === 'running').length,
    totalSent: campaigns.reduce((s, c) => s + c.sentCount, 0),
    avgReadRate: campaigns.filter(c => c.sentCount > 0).length > 0
      ? Math.round(campaigns.filter(c => c.sentCount > 0).reduce((s, c) => s + (c.readCount / c.sentCount * 100), 0) / campaigns.filter(c => c.sentCount > 0).length)
      : 0,
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <ViewHeader
        icon={Megaphone}
        title="Campaigns"
        description="WhatsApp campaign engine"
        action={
          <Button className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4 mr-1.5" /> Create Campaign
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard label="Total Campaigns" value={stats.total} icon={Megaphone} />
        <StatCard label="Active" value={stats.running} icon={Play} color="text-emerald-600" />
        <StatCard label="Total Sent" value={stats.totalSent.toLocaleString()} icon={Send} color="text-teal-600" />
        <StatCard label="Avg Read Rate" value={`${stats.avgReadRate}%`} icon={Eye} color="text-amber-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all" className="text-xs gap-1">All <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none">{campaigns.length}</span></TabsTrigger>
            <TabsTrigger value="draft" className="text-xs gap-1">Draft <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none">{campaigns.filter(c => c.status === 'draft').length}</span></TabsTrigger>
            <TabsTrigger value="scheduled" className="text-xs gap-1">Scheduled <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none">{campaigns.filter(c => c.status === 'scheduled').length}</span></TabsTrigger>
            <TabsTrigger value="running" className="text-xs gap-1">Running <span className="ml-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] leading-none text-emerald-700">{campaigns.filter(c => c.status === 'running').length}</span></TabsTrigger>
            <TabsTrigger value="paused" className="text-xs gap-1">Paused <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none">{campaigns.filter(c => c.status === 'paused').length}</span></TabsTrigger>
            <TabsTrigger value="completed" className="text-xs gap-1">Completed <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none">{campaigns.filter(c => c.status === 'completed').length}</span></TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Campaign List */}
      {!loading && filteredCampaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns found"
          description={search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first WhatsApp campaign to reach your customers'}
          actionLabel={!search && statusFilter === 'all' ? 'Create Campaign' : undefined}
          onAction={!search && statusFilter === 'all' ? () => setShowCreateDialog(true) : undefined}
        />
      ) : !loading && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {filteredCampaigns.map(campaign => (
            <Card key={campaign.id} className="hover:shadow-md transition-all cursor-pointer group" onClick={() => { setSelectedCampaign(campaign); setShowDetailDialog(true); }}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{campaign.name}</h4>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge variant="outline" className={`${getStatusColor(campaign.status)} text-[10px] gap-1`}>
                        {getStatusIcon(campaign.status)}
                        <span>{campaign.status}</span>
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] bg-teal-50 text-teal-700">{getTypeLabel(campaign.type)}</Badge>
                      {campaign.status === 'running' && <span className="relative flex size-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full size-2 bg-emerald-500" /></span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {campaign.status === 'running' && (
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleStatusChange(campaign.id, 'paused')}><Pause className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Pause</TooltipContent></Tooltip></TooltipProvider>
                    )}
                    {campaign.status === 'paused' && (
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleStatusChange(campaign.id, 'running')}><Play className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Resume</TooltipContent></Tooltip></TooltipProvider>
                    )}
                    {campaign.status === 'draft' && (
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleStatusChange(campaign.id, 'running')}><Play className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Start</TooltipContent></Tooltip></TooltipProvider>
                    )}
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditDialog(campaign)}><Pencil className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip></TooltipProvider>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleClone(campaign)}><Copy className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Clone</TooltipContent></Tooltip></TooltipProvider>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600" onClick={() => openDeleteDialog(campaign)}><Trash2 className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip></TooltipProvider>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="size-3" />{getAudienceLabel(campaign.audienceType)}</span>
                  <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(campaign.createdAt).toLocaleDateString()}</span>
                </div>
                {campaign.sentCount > 0 ? (
                  <div className="space-y-2.5 pt-2 border-t">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Open Rate', value: `${Math.round(campaign.readCount / campaign.sentCount * 100)}%`, icon: Eye, color: 'text-teal-600' },
                        { label: 'Click Rate', value: `${Math.round(campaign.clickedCount / campaign.sentCount * 100)}%`, icon: MousePointer, color: 'text-amber-600' },
                        { label: 'Conversion', value: `${Math.round(campaign.convertedCount / campaign.sentCount * 100)}%`, icon: TrendingUp, color: 'text-emerald-600' },
                      ].map(stat => {
                        const Icon = stat.icon;
                        return (
                          <div key={stat.label} className="text-center p-1.5 rounded-md bg-muted/40">
                            <Icon className={`size-3 ${stat.color} mx-auto`} />
                            <p className={`font-semibold text-sm ${stat.color}`}>{stat.value}</p>
                            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Send className="size-3" /> {campaign.sentCount.toLocaleString()} sent</span>
                      <span className="flex items-center gap-1"><MessageSquare className="size-3" /> {campaign.repliedCount} replied</span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground italic">No metrics yet — campaign not started</p>
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
            <DialogDescription>Set up a new WhatsApp campaign</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input placeholder="e.g., Spring Cleaning Promo" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Brief description of this campaign" value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={createForm.type} onValueChange={v => setCreateForm({ ...createForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={createForm.audienceType} onValueChange={v => setCreateForm({ ...createForm, audienceType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message Content *</Label>
              <Textarea placeholder="Type your WhatsApp message..." value={createForm.messageContent} onChange={e => setCreateForm({ ...createForm, messageContent: e.target.value })} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>CTA Button Text</Label>
                <Input placeholder="e.g., Book Now, Learn More" value={createForm.ctaText} onChange={e => setCreateForm({ ...createForm, ctaText: e.target.value })} />
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
                    {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz.replace('America/', '').replace('Asia/', '')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={submitting}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!createForm.name || !createForm.messageContent || submitting}>
              {submitting && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>Update campaign details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input placeholder="Campaign name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Brief description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editForm.type} onValueChange={v => setEditForm({ ...editForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={editForm.audienceType} onValueChange={v => setEditForm({ ...editForm, audienceType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCE_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message Content</Label>
              <Textarea placeholder="Type your WhatsApp message..." value={editForm.messageContent} onChange={e => setEditForm({ ...editForm, messageContent: e.target.value })} rows={4} />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={submitting}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEdit} disabled={!editForm.name || submitting}>
              {submitting && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={submitting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>{selectedCampaign?.name}</DialogTitle>
              {selectedCampaign && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setShowDetailDialog(false); openEditDialog(selectedCampaign); }}>
                  <Pencil className="size-3.5" />
                </Button>
              )}
            </div>
            <DialogDescription>
              <Badge variant="outline" className={`${getStatusColor(selectedCampaign?.status || '')} text-xs`}>
                {selectedCampaign?.status}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{getTypeLabel(selectedCampaign.type)}</span></div>
                <div><span className="text-muted-foreground">Audience:</span> <span className="font-medium">{getAudienceLabel(selectedCampaign.audienceType)}</span></div>
                <div><span className="text-muted-foreground">Timezone:</span> <span className="font-medium">{selectedCampaign.timezone}</span></div>
                <div><span className="text-muted-foreground">Recipients:</span> <span className="font-medium">{selectedCampaign.totalRecipients.toLocaleString()}</span></div>
              </div>
              {selectedCampaign.messageContent && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Message</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedCampaign.messageContent}</p>
                  {selectedCampaign.ctaText && (
                    <Button size="sm" className="mt-2 bg-emerald-600 hover:bg-emerald-700 h-7 text-xs">
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
                    { label: 'Sent', value: selectedCampaign.sentCount, color: 'text-teal-600' },
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
