'use client';

import { useState } from 'react';
import {
  Megaphone, Plus, Search, Play, Pause, Copy, Eye, Calendar,
  Users, Send, BarChart3, Clock, CheckCircle2, XCircle,
  ArrowRight, MousePointer, MessageSquare, TrendingUp,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/stat-card';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  type: 'promotional' | 'transactional' | 'reminder' | 'follow_up';
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed';
  audience: string;
  template: string;
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
  replied: number;
  converted: number;
  scheduledAt?: string;
  createdAt: string;
  timezone: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_CAMPAIGNS: Campaign[] = [
  { id: 'camp1', name: 'Spring Cleaning Promo', type: 'promotional', status: 'running', audience: 'All Customers', template: 'Spring Promo', sent: 1250, delivered: 1180, read: 890, clicked: 234, replied: 89, converted: 45, createdAt: '2025-03-01', timezone: 'America/Chicago' },
  { id: 'camp2', name: 'Appointment Reminder', type: 'reminder', status: 'completed', audience: 'Upcoming Bookings', template: 'Booking Reminder', sent: 320, delivered: 315, read: 298, clicked: 56, replied: 42, converted: 38, createdAt: '2025-02-20', timezone: 'America/Chicago' },
  { id: 'camp3', name: 'Win-back Inactive', type: 'follow_up', status: 'scheduled', audience: 'Inactive 30 Days', template: 'Win-back Offer', sent: 0, delivered: 0, read: 0, clicked: 0, replied: 0, converted: 0, scheduledAt: '2025-03-15T10:00:00', createdAt: '2025-03-10', timezone: 'America/New_York' },
  { id: 'camp4', name: 'Payment Follow-up', type: 'transactional', status: 'draft', audience: 'Unpaid Invoices', template: 'Payment Reminder', sent: 0, delivered: 0, read: 0, clicked: 0, replied: 0, converted: 0, createdAt: '2025-03-12', timezone: 'America/Los_Angeles' },
  { id: 'camp5', name: 'Summer Special Offer', type: 'promotional', status: 'paused', audience: 'VIP Customers', template: 'Summer Promo', sent: 500, delivered: 490, read: 380, clicked: 120, replied: 45, converted: 22, createdAt: '2025-02-01', timezone: 'America/Chicago' },
];

const TEMPLATES = ['Spring Promo', 'Booking Reminder', 'Win-back Offer', 'Payment Reminder', 'Summer Promo', 'Welcome Message', 'Thank You', 'Feedback Request'];
const AUDIENCES = ['All Customers', 'VIP Customers', 'Inactive 30 Days', 'Upcoming Bookings', 'Unpaid Invoices', 'Window Cleaning Customers'];
const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'UTC'];

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

// ─── Component ──────────────────────────────────────────────────────────────

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '', type: 'promotional', audience: 'All Customers', template: 'Spring Promo',
    message: '', media: '', cta: '', scheduleDate: '', scheduleTime: '', timezone: 'America/Chicago',
  });

  const filteredCampaigns = campaigns.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleStatusChange = (id: string, newStatus: Campaign['status']) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    toast.success(`Campaign ${newStatus}`);
  };

  const handleClone = (campaign: Campaign) => {
    const cloned: Campaign = {
      ...campaign, id: `camp-${Date.now()}`, name: `${campaign.name} (Copy)`,
      status: 'draft', sent: 0, delivered: 0, read: 0, clicked: 0, replied: 0, converted: 0,
    };
    setCampaigns(prev => [cloned, ...prev]);
    toast.success('Campaign cloned');
  };

  const handleCreate = () => {
    if (!createForm.name) { toast.error('Campaign name is required'); return; }
    const newCampaign: Campaign = {
      id: `camp-${Date.now()}`, name: createForm.name, type: createForm.type as Campaign['type'],
      status: createForm.scheduleDate ? 'scheduled' : 'draft', audience: createForm.audience,
      template: createForm.template, sent: 0, delivered: 0, read: 0, clicked: 0, replied: 0, converted: 0,
      scheduledAt: createForm.scheduleDate ? `${createForm.scheduleDate}T${createForm.scheduleTime || '09:00'}` : undefined,
      createdAt: new Date().toISOString().split('T')[0], timezone: createForm.timezone,
    };
    setCampaigns(prev => [newCampaign, ...prev]);
    setShowCreateDialog(false);
    setCreateForm({ name: '', type: 'promotional', audience: 'All Customers', template: 'Spring Promo', message: '', media: '', cta: '', scheduleDate: '', scheduleTime: '', timezone: 'America/Chicago' });
    toast.success('Campaign created');
  };

  const stats = {
    total: campaigns.length,
    running: campaigns.filter(c => c.status === 'running').length,
    totalSent: campaigns.reduce((s, c) => s + c.sent, 0),
    avgReadRate: campaigns.filter(c => c.sent > 0).length > 0
      ? Math.round(campaigns.filter(c => c.sent > 0).reduce((s, c) => s + (c.read / c.sent * 100), 0) / campaigns.filter(c => c.sent > 0).length)
      : 0,
  };

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

      {/* Campaign List */}
      {filteredCampaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns found"
          description={search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first WhatsApp campaign to reach your customers'}
          actionLabel={!search && statusFilter === 'all' ? 'Create Campaign' : undefined}
          onAction={!search && statusFilter === 'all' ? () => setShowCreateDialog(true) : undefined}
        />
      ) : (
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
                      <Badge variant="secondary" className="text-[10px] bg-teal-50 text-teal-700">{campaign.type.replace('_', ' ')}</Badge>
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
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleClone(campaign)}><Copy className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Clone</TooltipContent></Tooltip></TooltipProvider>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="size-3" />{campaign.audience}</span>
                  <span className="flex items-center gap-1"><Calendar className="size-3" />{campaign.createdAt}</span>
                </div>
                {campaign.sent > 0 ? (
                  <div className="space-y-2.5 pt-2 border-t">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Open Rate', value: `${Math.round(campaign.read / campaign.sent * 100)}%`, icon: Eye, color: 'text-teal-600' },
                        { label: 'Click Rate', value: `${Math.round(campaign.clicked / campaign.sent * 100)}%`, icon: MousePointer, color: 'text-amber-600' },
                        { label: 'Conversion', value: `${Math.round(campaign.converted / campaign.sent * 100)}%`, icon: TrendingUp, color: 'text-emerald-600' },
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
                      <span className="flex items-center gap-1"><Send className="size-3" /> {campaign.sent.toLocaleString()} sent</span>
                      <span className="flex items-center gap-1"><MessageSquare className="size-3" /> {campaign.replied} replied</span>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={createForm.type} onValueChange={v => setCreateForm({ ...createForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={createForm.audience} onValueChange={v => setCreateForm({ ...createForm, audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={createForm.template} onValueChange={v => setCreateForm({ ...createForm, template: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea placeholder="Type your WhatsApp message..." value={createForm.message} onChange={e => setCreateForm({ ...createForm, message: e.target.value })} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>CTA Button Text</Label>
              <Input placeholder="e.g., Book Now, Learn More" value={createForm.cta} onChange={e => setCreateForm({ ...createForm, cta: e.target.value })} />
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
                    {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz.replace('America/', '')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!createForm.name}>Create Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCampaign?.name}</DialogTitle>
            <DialogDescription>
              <Badge variant="outline" className={`${getStatusColor(selectedCampaign?.status || '')} text-xs`}>
                {selectedCampaign?.status}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{selectedCampaign.type}</span></div>
                <div><span className="text-muted-foreground">Audience:</span> <span className="font-medium">{selectedCampaign.audience}</span></div>
                <div><span className="text-muted-foreground">Template:</span> <span className="font-medium">{selectedCampaign.template}</span></div>
                <div><span className="text-muted-foreground">Timezone:</span> <span className="font-medium">{selectedCampaign.timezone}</span></div>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium text-sm mb-2">Campaign Analytics</h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Sent', value: selectedCampaign.sent, color: 'text-teal-600' },
                    { label: 'Delivered', value: selectedCampaign.delivered, color: 'text-emerald-600' },
                    { label: 'Read', value: selectedCampaign.read, color: 'text-purple-600' },
                    { label: 'Clicked', value: selectedCampaign.clicked, color: 'text-orange-600' },
                    { label: 'Replied', value: selectedCampaign.replied, color: 'text-amber-600' },
                    { label: 'Converted', value: selectedCampaign.converted, color: 'text-green-600' },
                  ].map(stat => (
                    <Card key={stat.label} className="p-2 text-center">
                      <p className={`text-lg font-bold ${stat.color}`}>{stat.value.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </Card>
                  ))}
                </div>
                {selectedCampaign.sent > 0 && (
                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span>Delivery Rate</span><span>{Math.round(selectedCampaign.delivered / selectedCampaign.sent * 100)}%</span></div>
                      <Progress value={selectedCampaign.delivered / selectedCampaign.sent * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span>Read Rate</span><span>{Math.round(selectedCampaign.read / selectedCampaign.sent * 100)}%</span></div>
                      <Progress value={selectedCampaign.read / selectedCampaign.sent * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span>Conversion Rate</span><span>{Math.round(selectedCampaign.converted / selectedCampaign.sent * 100)}%</span></div>
                      <Progress value={selectedCampaign.converted / selectedCampaign.sent * 100} className="h-2" />
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
