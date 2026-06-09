'use client';

import { useState } from 'react';
import {
  Radio, Plus, Search, Send, Clock, Users, CheckCircle2,
  XCircle, Eye, BarChart3, MessageSquare, Calendar,
  Upload, FileText, AlertCircle, Copy, Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/stat-card';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Broadcast {
  id: string;
  name: string;
  type: 'promotional' | 'transactional' | 'reminder' | 'announcement';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
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

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_BROADCASTS: Broadcast[] = [
  {
    id: 'b1', name: 'Summer Sale Announcement', type: 'promotional', status: 'sent',
    message: '🔥 Summer Sale! Get 30% off on all cleaning services this week. Book now!',
    ctaText: 'Book Now', ctaUrl: 'https://serviceos.com/summer-sale',
    audienceType: 'All Customers', audienceCount: 1250,
    sentCount: 1250, deliveredCount: 1180, readCount: 890, repliedCount: 89, clickedCount: 234, failedCount: 12,
    createdAt: '2025-03-10', timezone: 'Asia/Kolkata', isRecurring: false,
  },
  {
    id: 'b2', name: 'Service Reminder', type: 'reminder', status: 'sent',
    message: 'Hi {{name}}! Your scheduled cleaning is tomorrow at 2 PM. Reply YES to confirm or RESCHEDULE to change.',
    audienceType: 'Upcoming Bookings', audienceCount: 45,
    sentCount: 45, deliveredCount: 44, readCount: 42, repliedCount: 38, clickedCount: 0, failedCount: 1,
    createdAt: '2025-03-12', timezone: 'Asia/Kolkata', isRecurring: true, recurringInterval: 'daily',
  },
  {
    id: 'b3', name: 'New Service Launch', type: 'announcement', status: 'scheduled',
    message: '🎉 We are excited to announce our new Deep Cleaning service! Limited time offer: First booking at 50% off.',
    ctaText: 'Learn More', ctaUrl: 'https://serviceos.com/deep-cleaning',
    audienceType: 'VIP Customers', audienceCount: 320,
    scheduledAt: '2025-03-15T10:00:00',
    sentCount: 0, deliveredCount: 0, readCount: 0, repliedCount: 0, clickedCount: 0, failedCount: 0,
    createdAt: '2025-03-12', timezone: 'Asia/Kolkata', isRecurring: false,
  },
  {
    id: 'b4', name: 'Payment Confirmation', type: 'transactional', status: 'draft',
    message: 'Hi {{name}}, your payment of ₹{{amount}} has been received. Invoice #{{invoice_id}} is attached.',
    audienceType: 'Recent Payments', audienceCount: 0,
    sentCount: 0, deliveredCount: 0, readCount: 0, repliedCount: 0, clickedCount: 0, failedCount: 0,
    createdAt: '2025-03-13', timezone: 'Asia/Kolkata', isRecurring: false,
  },
  {
    id: 'b5', name: 'Weekend Special', type: 'promotional', status: 'failed',
    message: '🌟 Weekend Special! Book any service on Saturday & get Sunday cleaning FREE!',
    ctaText: 'Claim Offer', audienceType: 'Inactive 30 Days', audienceCount: 145,
    sentCount: 45, deliveredCount: 40, readCount: 28, repliedCount: 5, clickedCount: 12, failedCount: 100,
    createdAt: '2025-03-11', timezone: 'Asia/Kolkata', isRecurring: false,
  },
];

const AUDIENCE_TYPES = [
  'All Customers', 'VIP Customers', 'Inactive 30 Days', 'Upcoming Bookings',
  'Recent Payments', 'Window Cleaning Customers', 'Plumbing Customers',
  'New Customers (7 days)', 'Custom Segment',
];

const TIMEZONES = ['Asia/Kolkata', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'UTC'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusConfig(status: string) {
  const map: Record<string, { color: string; icon: React.ReactNode }> = {
    draft: { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <FileText className="size-3" /> },
    scheduled: { color: 'bg-teal-100 text-teal-700 border-teal-200', icon: <Calendar className="size-3" /> },
    sending: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Send className="size-3 animate-pulse" /> },
    sent: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="size-3" /> },
    failed: { color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="size-3" /> },
  };
  return map[status] || map.draft;
}

function getTypeColor(type: string) {
  const map: Record<string, string> = {
    promotional: 'bg-teal-100 text-teal-700',
    transactional: 'bg-purple-100 text-purple-700',
    reminder: 'bg-amber-100 text-amber-700',
    announcement: 'bg-emerald-100 text-emerald-700',
  };
  return map[type] || 'bg-slate-100 text-slate-600';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BroadcastView() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(MOCK_BROADCASTS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '', type: 'promotional' as Broadcast['type'],
    message: '', mediaUrl: '', ctaText: '', ctaUrl: '',
    audienceType: 'All Customers', segmentId: '',
    scheduleDate: '', scheduleTime: '', timezone: 'Asia/Kolkata',
    isRecurring: false, recurringInterval: 'weekly',
  });

  const filteredBroadcasts = broadcasts.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = () => {
    if (!createForm.name) { toast.error('Broadcast name is required'); return; }
    if (!createForm.message) { toast.error('Message is required'); return; }
    const newBroadcast: Broadcast = {
      id: `b-${Date.now()}`, name: createForm.name, type: createForm.type,
      status: createForm.scheduleDate ? 'scheduled' : 'draft',
      message: createForm.message, mediaUrl: createForm.mediaUrl || undefined,
      ctaText: createForm.ctaText || undefined, ctaUrl: createForm.ctaUrl || undefined,
      audienceType: createForm.audienceType, audienceCount: 0,
      scheduledAt: createForm.scheduleDate ? `${createForm.scheduleDate}T${createForm.scheduleTime || '09:00'}` : undefined,
      sentCount: 0, deliveredCount: 0, readCount: 0, repliedCount: 0, clickedCount: 0, failedCount: 0,
      createdAt: new Date().toISOString().split('T')[0], timezone: createForm.timezone,
      isRecurring: createForm.isRecurring, recurringInterval: createForm.isRecurring ? createForm.recurringInterval : undefined,
    };
    setBroadcasts(prev => [newBroadcast, ...prev]);
    setShowCreateDialog(false);
    setCreateForm({
      name: '', type: 'promotional', message: '', mediaUrl: '', ctaText: '', ctaUrl: '',
      audienceType: 'All Customers', segmentId: '', scheduleDate: '', scheduleTime: '',
      timezone: 'Asia/Kolkata', isRecurring: false, recurringInterval: 'weekly',
    });
    toast.success('Broadcast created');
  };

  const handleSendNow = (id: string) => {
    setBroadcasts(prev => prev.map(b => b.id === id ? { ...b, status: 'sending' as const } : b));
    toast.success('Broadcast started sending');
    // Simulate sending completion
    setTimeout(() => {
      setBroadcasts(prev => prev.map(b => {
        if (b.id !== id) return b;
        const count = b.audienceCount || Math.floor(Math.random() * 500) + 100;
        return {
          ...b, status: 'sent' as const, audienceCount: count,
          sentCount: count, deliveredCount: Math.floor(count * 0.94),
          readCount: Math.floor(count * 0.75), repliedCount: Math.floor(count * 0.08),
          clickedCount: Math.floor(count * 0.18), failedCount: Math.floor(count * 0.06),
        };
      }));
    }, 3000);
  };

  const handleClone = (broadcast: Broadcast) => {
    const cloned: Broadcast = {
      ...broadcast, id: `b-${Date.now()}`, name: `${broadcast.name} (Copy)`,
      status: 'draft' as const, sentCount: 0, deliveredCount: 0, readCount: 0,
      repliedCount: 0, clickedCount: 0, failedCount: 0,
    };
    setBroadcasts(prev => [cloned, ...prev]);
    toast.success('Broadcast cloned');
  };

  const handleDelete = (id: string) => {
    setBroadcasts(prev => prev.filter(b => b.id !== id));
    toast.success('Broadcast deleted');
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
        <StatCard label="Sent" value={stats.sent} icon={CheckCircle2} color="text-emerald-600" />
        <StatCard label="Messages Sent" value={stats.totalSent.toLocaleString()} icon={Send} color="text-teal-600" />
        <StatCard label="Avg Delivery" value={`${stats.avgDeliveryRate}%`} icon={BarChart3} color="text-purple-600" />
        <StatCard label="Avg Read Rate" value={`${stats.avgReadRate}%`} icon={Eye} color="text-amber-600" />
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
        <EmptyState
          icon={Radio}
          title="No broadcasts found"
          description={search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first broadcast to reach customers on WhatsApp'}
          actionLabel={!search && statusFilter === 'all' ? 'New Broadcast' : undefined}
          onAction={!search && statusFilter === 'all' ? () => setShowCreateDialog(true) : undefined}
        />
      ) : (
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
                        <Badge variant="secondary" className={`${getTypeColor(broadcast.type)} text-[10px]`}>
                          {broadcast.type}
                        </Badge>
                        {broadcast.isRecurring && (
                          <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200">
                            🔄 {broadcast.recurringInterval}
                          </Badge>
                        )}
                        {broadcast.status === 'sending' && <span className="relative flex size-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" /><span className="relative inline-flex rounded-full size-2 bg-amber-500" /></span>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{broadcast.message}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md"><Users className="size-3" />{broadcast.audienceCount.toLocaleString()} recipients</span>
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
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleClone(broadcast)}>
                        <Copy className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(broadcast.id)}>
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
                        { label: 'Failed', value: broadcast.failedCount, color: 'text-red-600' },
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={createForm.type} onValueChange={v => setCreateForm({ ...createForm, type: v as Broadcast['type'] })}>
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
                <Label>Audience</Label>
                <Select value={createForm.audienceType} onValueChange={v => setCreateForm({ ...createForm, audienceType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_TYPES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                placeholder="Type your WhatsApp message... Use {{name}}, {{service}}, {{amount}} as placeholders"
                value={createForm.message}
                onChange={e => setCreateForm({ ...createForm, message: e.target.value })}
                rows={4}
              />
              <p className="text-[10px] text-muted-foreground">{createForm.message.length} characters • {createForm.message.length > 1024 ? '⚠️ Exceeds WhatsApp limit' : '✅ Within limit'}</p>
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
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!createForm.name || !createForm.message}>
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
                <div><span className="text-muted-foreground">Audience:</span> <span className="font-medium">{selectedBroadcast.audienceType}</span></div>
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
                        { label: 'Sent', value: selectedBroadcast.sentCount, color: 'text-blue-600' },
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
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span>Click Rate</span><span>{Math.round(selectedBroadcast.clickedCount / selectedBroadcast.sentCount * 100)}%</span></div>
                        <Progress value={selectedBroadcast.clickedCount / selectedBroadcast.sentCount * 100} className="h-2" />
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
                    <p className="text-xs text-red-600">100 messages failed to send. This could be due to invalid numbers or rate limiting. Try sending again or reduce the audience size.</p>
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
