'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Radio, Plus, Search, Send, Clock, Users, CheckCircle2,
  XCircle, Eye, BarChart3, MessageSquare, Calendar,
  AlertCircle, Copy, Trash2, Loader2,
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
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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
];

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
    audienceType: 'all', segmentId: '',
    scheduleDate: '', scheduleTime: '', timezone: 'Asia/Kolkata',
    isRecurring: false, recurringInterval: 'weekly',
  });

  // ── Load broadcasts from API ──
  const loadBroadcasts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');

      const res = await fetch(`/api/campaigns?${params.toString()}`);
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

    setIsCreating(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          type: createForm.type,
          channel: createForm.channel,
          audienceType: createForm.audienceType,
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
          audienceCount: 0,
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
          ctaText: '', ctaUrl: '', audienceType: 'all', segmentId: '',
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

  const handleSendNow = async (id: string) => {
    setBroadcasts(prev => prev.map(b => b.id === id ? { ...b, status: 'sending' as const } : b));
    toast.success('Broadcast started sending');
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'running' }),
      });
      if (res.ok) {
        // Re-fetch to get updated counts from the server
        await loadBroadcasts();
      } else {
        toast.error('Failed to start broadcast');
        setBroadcasts(prev => prev.map(b => b.id === id ? { ...b, status: 'failed' as const } : b));
      }
    } catch {
      toast.error('Network error starting broadcast');
      setBroadcasts(prev => prev.map(b => b.id === id ? { ...b, status: 'failed' as const } : b));
    }
  };

  const handleClone = async (broadcast: Broadcast) => {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${broadcast.name} (Copy)`,
          type: broadcast.type,
          channel: broadcast.channel,
          audienceType: broadcast.audienceType,
          messageContent: broadcast.message,
          status: 'draft',
        }),
      });
      if (res.ok) {
        const result = await res.json();
        const cloned: Broadcast = {
          id: result.data.id, name: result.data.name, type: broadcast.type,
          status: 'draft', channel: broadcast.channel, message: broadcast.message,
          audienceType: broadcast.audienceType, audienceCount: 0,
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
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBroadcasts(prev => prev.filter(b => b.id !== id));
        toast.success('Broadcast deleted');
      }
    } catch {
      toast.error('Failed to delete broadcast');
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
                        <span className="flex items-center gap-1"><Users className="size-3" />{AUDIENCE_TYPES.find(a => a.value === broadcast.audienceType)?.label || broadcast.audienceType} ({broadcast.audienceCount.toLocaleString()})</span>
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
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleClone(broadcast)}>
                        <Copy className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(broadcast.id)}>
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
                <div><span className="text-muted-foreground">Audience:</span> <span className="font-medium">{AUDIENCE_TYPES.find(a => a.value === selectedBroadcast.audienceType)?.label || selectedBroadcast.audienceType}</span></div>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
