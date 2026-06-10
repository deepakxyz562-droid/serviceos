'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Radio, Plus, Search, Send, Clock, Users, CheckCircle2,
  XCircle, Eye, BarChart3, MessageSquare, Calendar,
  FileText, AlertCircle, Copy, Trash2, Pencil, Loader2,
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
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/stat-card';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Broadcast {
  id: string;
  name: string;
  description?: string;
  type: string; // always 'broadcast'
  status: string; // draft, scheduled, running, paused, completed
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

const AUDIENCE_TYPES = [
  { value: 'all', label: 'All Customers' },
  { value: 'segment', label: 'Segment' },
  { value: 'contact_list', label: 'Contact List' },
  { value: 'custom', label: 'Custom' },
];

const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Asia/Kolkata'];

const DEFAULT_CREATE_FORM = {
  name: '', description: '', messageContent: '', mediaUrl: '',
  ctaText: '', ctaUrl: '', audienceType: 'all',
  scheduleDate: '', scheduleTime: '', timezone: 'UTC',
};

const DEFAULT_EDIT_FORM = {
  name: '', description: '', messageContent: '', audienceType: 'all',
  scheduledAt: '',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusConfig(status: string) {
  const map: Record<string, { color: string; icon: React.ReactNode }> = {
    draft: { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <FileText className="size-3" /> },
    scheduled: { color: 'bg-teal-100 text-teal-700 border-teal-200', icon: <Calendar className="size-3" /> },
    running: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Send className="size-3 animate-pulse" /> },
    completed: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="size-3" /> },
    paused: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Clock className="size-3" /> },
  };
  return map[status] || map.draft;
}

function getAudienceLabel(audienceType: string) {
  return AUDIENCE_TYPES.find(a => a.value === audienceType)?.label || audienceType;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BroadcastView() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
  const [editForm, setEditForm] = useState(DEFAULT_EDIT_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Broadcast | null>(null);

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchBroadcasts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/broadcasts');
      if (!res.ok) throw new Error('Failed to fetch broadcasts');
      const json = await res.json();
      setBroadcasts(json.data || []);
    } catch (err) {
      console.error('Failed to fetch broadcasts:', err);
      toast.error('Failed to load broadcasts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBroadcasts(); }, [fetchBroadcasts]);

  // ─── Filters ────────────────────────────────────────────────────────────

  const filteredBroadcasts = broadcasts.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!createForm.name) { toast.error('Broadcast name is required'); return; }
    if (!createForm.messageContent) { toast.error('Message is required'); return; }
    try {
      setSubmitting(true);
      const body: Record<string, unknown> = {
        name: createForm.name,
        description: createForm.description,
        type: 'broadcast',
        messageContent: createForm.messageContent,
        mediaUrl: createForm.mediaUrl || undefined,
        ctaText: createForm.ctaText || undefined,
        ctaUrl: createForm.ctaUrl || undefined,
        audienceType: createForm.audienceType,
        timezone: createForm.timezone,
      };
      if (createForm.scheduleDate) {
        body.status = 'scheduled';
        body.scheduledAt = `${createForm.scheduleDate}T${createForm.scheduleTime || '09:00'}`;
      }
      const res = await authFetch('/api/broadcasts', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create broadcast');
      toast.success('Broadcast created');
      setShowCreateDialog(false);
      setCreateForm(DEFAULT_CREATE_FORM);
      fetchBroadcasts();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create broadcast');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedBroadcast) return;
    if (!editForm.name) { toast.error('Broadcast name is required'); return; }
    try {
      setSubmitting(true);
      const body: Record<string, unknown> = {
        name: editForm.name,
        description: editForm.description,
        messageContent: editForm.messageContent,
        audienceType: editForm.audienceType,
      };
      if (editForm.scheduledAt) {
        body.scheduledAt = editForm.scheduledAt;
      }
      const res = await authFetch(`/api/broadcasts/${selectedBroadcast.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update broadcast');
      toast.success('Broadcast updated');
      setShowEditDialog(false);
      setSelectedBroadcast(null);
      fetchBroadcasts();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update broadcast');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      const res = await authFetch(`/api/broadcasts/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete broadcast');
      toast.success('Broadcast deleted');
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      fetchBroadcasts();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete broadcast');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendNow = async (id: string) => {
    try {
      const res = await authFetch(`/api/broadcasts/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'running' }),
      });
      if (!res.ok) throw new Error('Failed to start broadcast');
      toast.success('Broadcast started sending');
      fetchBroadcasts();
    } catch (err) {
      console.error(err);
      toast.error('Failed to start broadcast');
    }
  };

  const handleClone = async (broadcast: Broadcast) => {
    try {
      const res = await authFetch('/api/broadcasts', {
        method: 'POST',
        body: JSON.stringify({
          name: `${broadcast.name} (Copy)`,
          description: broadcast.description,
          type: 'broadcast',
          status: 'draft',
          messageContent: broadcast.messageContent,
          mediaUrl: broadcast.mediaUrl,
          ctaText: broadcast.ctaText,
          ctaUrl: broadcast.ctaUrl,
          audienceType: broadcast.audienceType,
          timezone: broadcast.timezone,
          cloneFromId: broadcast.id,
          tenantId: broadcast.tenantId,
          workspaceId: broadcast.workspaceId,
        }),
      });
      if (!res.ok) throw new Error('Failed to clone broadcast');
      toast.success('Broadcast cloned');
      fetchBroadcasts();
    } catch (err) {
      console.error(err);
      toast.error('Failed to clone broadcast');
    }
  };

  const openEditDialog = (broadcast: Broadcast) => {
    setSelectedBroadcast(broadcast);
    setEditForm({
      name: broadcast.name,
      description: broadcast.description || '',
      messageContent: broadcast.messageContent || '',
      audienceType: broadcast.audienceType,
      scheduledAt: broadcast.scheduledAt ? new Date(broadcast.scheduledAt).toISOString().slice(0, 16) : '',
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (broadcast: Broadcast) => {
    setDeleteTarget(broadcast);
    setShowDeleteDialog(true);
  };

  // ─── Stats ──────────────────────────────────────────────────────────────

  const stats = {
    total: broadcasts.length,
    sent: broadcasts.filter(b => b.status === 'completed').length,
    totalSent: broadcasts.reduce((s, b) => s + b.sentCount, 0),
    avgDeliveryRate: broadcasts.filter(b => b.sentCount > 0).length > 0
      ? Math.round(broadcasts.filter(b => b.sentCount > 0).reduce((s, b) => s + (b.deliveredCount / b.sentCount * 100), 0) / broadcasts.filter(b => b.sentCount > 0).length)
      : 0,
    avgReadRate: broadcasts.filter(b => b.sentCount > 0).length > 0
      ? Math.round(broadcasts.filter(b => b.sentCount > 0).reduce((s, b) => s + (b.readCount / b.sentCount * 100), 0) / broadcasts.filter(b => b.sentCount > 0).length)
      : 0,
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <ViewHeader
        icon={Radio}
        title="Broadcast"
        description="WhatsApp broadcast messaging"
        action={
          <Button className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4 mr-1.5" /> New Broadcast
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        <StatCard label="Total" value={stats.total} icon={Radio} />
        <StatCard label="Completed" value={stats.sent} icon={CheckCircle2} color="text-emerald-600" />
        <StatCard label="Messages Sent" value={stats.totalSent.toLocaleString()} icon={Send} color="text-teal-600" />
        <StatCard label="Avg Delivery" value={`${stats.avgDeliveryRate}%`} icon={BarChart3} color="text-purple-600" />
        <StatCard label="Avg Read Rate" value={`${stats.avgReadRate}%`} icon={Eye} color="text-amber-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all" className="text-xs">All <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none">{broadcasts.length}</span></TabsTrigger>
            <TabsTrigger value="draft" className="text-xs">Draft</TabsTrigger>
            <TabsTrigger value="scheduled" className="text-xs">Scheduled</TabsTrigger>
            <TabsTrigger value="running" className="text-xs">Running</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
            <TabsTrigger value="paused" className="text-xs">Paused</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search broadcasts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Broadcast List */}
      {!loading && filteredBroadcasts.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No broadcasts found"
          description={search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first broadcast to reach customers on WhatsApp'}
          actionLabel={!search && statusFilter === 'all' ? 'New Broadcast' : undefined}
          onAction={!search && statusFilter === 'all' ? () => setShowCreateDialog(true) : undefined}
        />
      ) : !loading && (
        <div className="space-y-4">
          {filteredBroadcasts.map(broadcast => {
            const statusConfig = getStatusConfig(broadcast.status);
            return (
              <Card key={broadcast.id} className="hover:shadow-md transition-all cursor-pointer group" onClick={() => { setSelectedBroadcast(broadcast); setShowDetailDialog(true); }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-sm">{broadcast.name}</h4>
                        <Badge variant="outline" className={`${statusConfig.color} text-[10px] gap-1`}>
                          {statusConfig.icon}
                          <span>{broadcast.status}</span>
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700">
                          broadcast
                        </Badge>
                        {broadcast.status === 'running' && <span className="relative flex size-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" /><span className="relative inline-flex rounded-full size-2 bg-amber-500" /></span>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{broadcast.messageContent}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md"><Users className="size-3" />{broadcast.totalRecipients.toLocaleString()} recipients</span>
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
                        <Button variant="outline" size="sm" className="min-h-[36px] text-xs" onClick={() => handleSendNow(broadcast.id)}>
                          <Send className="size-3 mr-1" /> Send Now
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditDialog(broadcast)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleClone(broadcast)}>
                        <Copy className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600" onClick={() => openDeleteDialog(broadcast)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  {broadcast.sentCount > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3 pt-3 border-t">
                      {[
                        { label: 'Sent', value: broadcast.sentCount, color: 'text-teal-600' },
                        { label: 'Delivered', value: broadcast.deliveredCount, color: 'text-emerald-600' },
                        { label: 'Read', value: broadcast.readCount, color: 'text-purple-600' },
                        { label: 'Clicked', value: broadcast.clickedCount, color: 'text-orange-600' },
                        { label: 'Replied', value: broadcast.repliedCount, color: 'text-amber-600' },
                        { label: 'Converted', value: broadcast.convertedCount, color: 'text-green-600' },
                      ].map(stat => (
                        <div key={stat.label} className="text-center p-1.5 rounded-md bg-muted/40">
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
            <DialogDescription>Send a WhatsApp message to multiple contacts at once</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Broadcast Name *</Label>
              <Input placeholder="e.g., Summer Sale Announcement" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Brief description" value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
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

            <Separator />

            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                placeholder="Type your WhatsApp message... Use {{name}}, {{service}}, {{amount}} as placeholders"
                value={createForm.messageContent}
                onChange={e => setCreateForm({ ...createForm, messageContent: e.target.value })}
                rows={4}
              />
              <p className="text-[10px] text-muted-foreground">{createForm.messageContent.length} characters • {createForm.messageContent.length > 1024 ? '⚠️ Exceeds WhatsApp limit' : '✅ Within limit'}</p>
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
                    {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={submitting}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!createForm.name || !createForm.messageContent || submitting}>
              {submitting && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {createForm.scheduleDate ? 'Schedule Broadcast' : 'Save as Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Broadcast Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Broadcast</DialogTitle>
            <DialogDescription>Update broadcast details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Broadcast Name *</Label>
              <Input placeholder="Broadcast name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Brief description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Type your WhatsApp message..."
                value={editForm.messageContent}
                onChange={e => setEditForm({ ...editForm, messageContent: e.target.value })}
                rows={4}
              />
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
              <Label>Scheduled At</Label>
              <Input type="datetime-local" value={editForm.scheduledAt} onChange={e => setEditForm({ ...editForm, scheduledAt: e.target.value })} />
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
            <DialogTitle>Delete Broadcast</DialogTitle>
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

      {/* Broadcast Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>{selectedBroadcast?.name}</DialogTitle>
              {selectedBroadcast && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setShowDetailDialog(false); openEditDialog(selectedBroadcast); }}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600" onClick={() => { setShowDetailDialog(false); openDeleteDialog(selectedBroadcast); }}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`${getStatusConfig(selectedBroadcast?.status || '').color} text-xs`}>
                  {selectedBroadcast?.status}
                </Badge>
                <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">broadcast</Badge>
              </div>
            </DialogDescription>
          </DialogHeader>
          {selectedBroadcast && (
            <div className="space-y-4">
              {/* Message Preview */}
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{selectedBroadcast.messageContent}</p>
                {selectedBroadcast.ctaText && (
                  <div className="mt-3">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs">
                      {selectedBroadcast.ctaText}
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Audience:</span> <span className="font-medium">{getAudienceLabel(selectedBroadcast.audienceType)}</span></div>
                <div><span className="text-muted-foreground">Recipients:</span> <span className="font-medium">{selectedBroadcast.totalRecipients.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Timezone:</span> <span className="font-medium">{selectedBroadcast.timezone}</span></div>
                {selectedBroadcast.scheduledAt && (
                  <div><span className="text-muted-foreground">Scheduled:</span> <span className="font-medium">{new Date(selectedBroadcast.scheduledAt).toLocaleString()}</span></div>
                )}
              </div>

              {selectedBroadcast.sentCount > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm mb-3">Delivery Analytics</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Sent', value: selectedBroadcast.sentCount, color: 'text-teal-600' },
                        { label: 'Delivered', value: selectedBroadcast.deliveredCount, color: 'text-emerald-600' },
                        { label: 'Read', value: selectedBroadcast.readCount, color: 'text-purple-600' },
                        { label: 'Clicked', value: selectedBroadcast.clickedCount, color: 'text-orange-600' },
                        { label: 'Replied', value: selectedBroadcast.repliedCount, color: 'text-amber-600' },
                        { label: 'Converted', value: selectedBroadcast.convertedCount, color: 'text-green-600' },
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
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span>Click Rate</span><span>{Math.round(selectedBroadcast.clickedCount / selectedBroadcast.sentCount * 100)}%</span></div>
                        <Progress value={selectedBroadcast.clickedCount / selectedBroadcast.sentCount * 100} className="h-2" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
