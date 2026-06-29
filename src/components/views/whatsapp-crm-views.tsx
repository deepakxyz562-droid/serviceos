'use client';

import { useState } from 'react';
import {
  UserCircle, Megaphone, Layers, Target, Radio, FileText, Monitor,
  Search, Plus, Send, Users, TrendingUp, BarChart3, Eye, CheckCircle2, Clock, MessageSquare, MousePointerClick,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// ─── Shared ────────────────────────────────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, color, bg }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={cn('p-2.5 rounded-xl', bg)}><Icon className={cn('size-5', color)} /></div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Customer360View ───────────────────────────────────────────────
const mockCustomer = { name: 'Sarah Mitchell', email: 'sarah@email.com', phone: '+1 (555) 234-5678', tags: ['VIP', 'Plumbing', 'Repeat'], totalSpent: 4250, lifetimeJobs: 12, valueScore: 92 };
const mockTimeline = [
  { title: 'WhatsApp message received', desc: 'When will the plumber arrive?', time: '2 hrs ago', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: MessageSquare },
  { title: 'Job created', desc: 'Plumbing repair - JOB-1001', time: '1 day ago', color: 'text-teal-600', bg: 'bg-teal-50', icon: CheckCircle2 },
  { title: 'Invoice paid', desc: 'INV-2026-089 - $320.00', time: '3 days ago', color: 'text-green-600', bg: 'bg-green-50', icon: TrendingUp },
  { title: 'Job completed', desc: 'HVAC maintenance - JOB-0997', time: '5 days ago', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: Clock },
];

export function Customer360View() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<typeof mockCustomer | null>(null);
  const [timeline, setTimeline] = useState<typeof mockTimeline>([]);

  const handleSearch = () => {
    // In a real app, this would fetch from API. For now, show empty state.
    if (!searchQuery.trim()) {
      setSelectedCustomer(null);
      setTimeline([]);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-50"><UserCircle className="size-5 text-emerald-600" /></div>
        <div>
          <h1 className="text-xl font-bold">Customer 360&deg;</h1>
          <p className="text-sm text-muted-foreground">Complete customer profile and interaction history</p>
        </div>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search customers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
      </div>
      {!selectedCustomer ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UserCircle className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No customer selected</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Search for a customer by name or phone number to view their complete profile and interaction history.
          </p>
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="flex items-start gap-4">
                  <Avatar className="size-16"><AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-bold">{selectedCustomer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold">{selectedCustomer.name}</h2>
                      {selectedCustomer.tags.map(tag => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{selectedCustomer.email} &middot; {selectedCustomer.phone}</p>
                    <div className="mt-2 w-48">
                      <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Value Score</span><span className="font-semibold text-emerald-600">{selectedCustomer.valueScore}/100</span></div>
                      <Progress value={selectedCustomer.valueScore} className="h-2" />
                    </div>
                  </div>
                </div>
                <div className="md:ml-auto grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-xs text-muted-foreground">Total Spent</p><p className="text-lg font-bold">${selectedCustomer.totalSpent.toLocaleString()}</p></div>
                  <div><p className="text-xs text-muted-foreground">Lifetime Jobs</p><p className="text-lg font-bold">{selectedCustomer.lifetimeJobs}</p></div>
                  <div><p className="text-xs text-muted-foreground">Value Score</p><p className="text-lg font-bold text-emerald-600">{selectedCustomer.valueScore}</p></div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Activity Timeline</CardTitle></CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No activity recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {timeline.map((event, i) => { const Icon = event.icon; return (
                    <div key={i} className="flex items-start gap-3">
                      <div className={cn('p-2 rounded-full shrink-0', event.bg)}><Icon className={cn('size-4', event.color)} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{event.title}</p><span className="text-[10px] text-muted-foreground shrink-0">{event.time}</span></div>
                        <p className="text-xs text-muted-foreground mt-0.5">{event.desc}</p>
                      </div>
                    </div>
                  ); })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── CampaignsView ─────────────────────────────────────────────────
const mockCampaigns = [
  { id: 'camp-1', name: 'Spring HVAC Promo', type: 'Seasonal', status: 'Active', sent: 2450, delivered: 2398, read: 1876, replied: 312 },
  { id: 'camp-2', name: 'Monthly Service Reminder', type: 'Reminder', status: 'Active', sent: 1200, delivered: 1189, read: 956, replied: 145 },
  { id: 'camp-3', name: 'VIP Customer Exclusive', type: 'Promotional', status: 'Paused', sent: 340, delivered: 338, read: 298, replied: 87 },
  { id: 'camp-4', name: 'Post-Service Follow-up', type: 'Follow-up', status: 'Completed', sent: 890, delivered: 885, read: 756, replied: 198 },
  { id: 'camp-5', name: 'March Newsletter', type: 'Newsletter', status: 'Draft', sent: 0, delivered: 0, read: 0, replied: 0 },
];

const campStatusColors: Record<string, string> = {
  'Active': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Paused': 'bg-amber-100 text-amber-700 border-amber-200',
  'Completed': 'bg-green-100 text-green-700 border-green-200',
  'Draft': 'bg-slate-100 text-slate-600 border-slate-200',
};

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<typeof mockCampaigns>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const filtered = campaigns.filter(c => searchQuery === '' || c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalSent = campaigns.reduce((s, c) => s + c.sent, 0);
  const deliveryRate = totalSent > 0 ? ((campaigns.reduce((s, c) => s + c.delivered, 0) / totalSent) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50"><Megaphone className="size-5 text-emerald-600" /></div>
          <div><h1 className="text-xl font-bold">WhatsApp Campaigns</h1><p className="text-sm text-muted-foreground">Create and manage bulk messaging campaigns</p></div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2"><Plus className="size-4" />Create Campaign</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Campaigns" value={campaigns.filter(c => c.status === 'Active').length.toString()} icon={Megaphone} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Messages Sent" value={totalSent.toLocaleString()} icon={Send} color="text-teal-600" bg="bg-teal-50" />
        <StatCard title="Delivery Rate" value={`${deliveryRate}%`} icon={Target} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Conversion Rate" value="0%" icon={TrendingUp} color="text-emerald-700" bg="bg-emerald-50" />
      </div>
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Megaphone className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No campaigns yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Create your first WhatsApp campaign to start reaching your customers with targeted messages and promotions.
          </p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700"><Plus className="size-4 mr-1.5" />Create Campaign</Button>
        </div>
      ) : (
      <Card>
        <CardHeader className="pb-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search campaigns..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50"><Megaphone className="size-4 text-emerald-600" /></div>
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.type} &middot; Sent: {c.sent.toLocaleString()} &middot; Replied: {c.replied.toLocaleString()}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn('text-xs', campStatusColors[c.status])}>{c.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}

// ─── SegmentsView ──────────────────────────────────────────────────
const mockSegments = [
  { id: 'seg-1', name: 'VIP Customers', members: 245, growth: '+12%', criteria: ['Total spent > $2,000', 'Jobs completed > 5'], color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'seg-2', name: 'New Leads', members: 189, growth: '+28%', criteria: ['Created within 30 days', 'No completed jobs'], color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'seg-3', name: 'Inactive Customers', members: 134, growth: '-5%', criteria: ['Last activity > 90 days ago', 'No messages in 60 days'], color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'seg-4', name: 'High Value', members: 98, growth: '+8%', criteria: ['Lifetime value > $5,000', 'Avg job value > $400'], color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

export function SegmentsView() {
  const [segments, setSegments] = useState<typeof mockSegments>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const filtered = segments.filter(s => searchQuery === '' || s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalMembers = segments.reduce((s, seg) => s + seg.members, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50"><Layers className="size-5 text-emerald-600" /></div>
          <div><h1 className="text-xl font-bold">Customer Segments</h1><p className="text-sm text-muted-foreground">Create and manage dynamic customer segments</p></div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2"><Plus className="size-4" />Create Segment</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Segments" value={segments.length.toString()} icon={Layers} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Total Members" value={totalMembers.toLocaleString()} icon={Users} color="text-teal-600" bg="bg-teal-50" />
        <StatCard title="Avg Segment Size" value={segments.length > 0 ? Math.round(totalMembers / segments.length).toString() : '0'} icon={BarChart3} color="text-green-600" bg="bg-green-50" />
      </div>
      {segments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Layers className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No segments yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Create customer segments to organize your audience and send targeted WhatsApp campaigns.
          </p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700"><Plus className="size-4 mr-1.5" />Create Segment</Button>
        </div>
      ) : (
      <>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search segments..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(seg => (
          <Card key={seg.id} className="hover:shadow-md transition-shadow cursor-pointer hover:border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={cn('p-3 rounded-xl shrink-0', seg.bg)}><Users className={cn('size-5', seg.color)} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm">{seg.name}</h3>
                    <Badge variant="outline" className={cn('text-[10px] shrink-0', seg.growth.startsWith('+') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200')}>{seg.growth}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2"><Users className="size-3.5 text-muted-foreground" /><span className="text-sm font-semibold">{seg.members.toLocaleString()}</span><span className="text-xs text-muted-foreground">members</span></div>
                  <Progress value={(seg.members / totalMembers) * 100} className="h-1.5 mt-2" />
                  <div className="mt-3 space-y-1">{seg.criteria.map((c, i) => <p key={i} className="text-xs text-muted-foreground">&bull; {c}</p>)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      </>
      )}
    </div>
  );
}

// ─── RetargetingView ───────────────────────────────────────────────
const mockRules = [
  { id: 'r1', name: 'Cart Abandonment Recovery', trigger: 'Cart Abandonment', action: 'Send Template', status: 'active', triggered: 47, conversions: 12, rate: 26.7 },
  { id: 'r2', name: 'No Response Follow-up', trigger: 'No Response', action: 'Send Message', status: 'active', triggered: 23, conversions: 8, rate: 34.8 },
  { id: 'r3', name: 'Post-Service Review Request', trigger: 'Post-Service', action: 'Send Template', status: 'active', triggered: 31, conversions: 19, rate: 61.3 },
  { id: 'r4', name: 'Win-back Inactive Customers', trigger: 'Inactivity', action: 'Trigger Workflow', status: 'paused', triggered: 0, conversions: 22, rate: 14.1 },
];

export function RetargetingView() {
  const [rules, setRules] = useState<typeof mockRules>([]);
  const avgConversion = rules.length > 0 ? (rules.reduce((s, r) => s + r.rate, 0) / rules.length).toFixed(1) : '0';
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50"><Target className="size-5 text-emerald-600" /></div>
          <div><h1 className="text-xl font-bold">Retargeting Rules</h1><p className="text-sm text-muted-foreground">Automate follow-ups based on customer behavior</p></div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2"><Plus className="size-4" />Create Rule</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Rules" value={rules.filter(r => r.status === 'active').length.toString()} subtitle={`of ${rules.length} total`} icon={Target} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Triggered Today" value={rules.reduce((s, r) => s + r.triggered, 0).toString()} icon={TrendingUp} color="text-amber-600" bg="bg-amber-50" />
        <StatCard title="Messages Sent" value="0" subtitle="via automated rules" icon={MessageSquare} color="text-teal-600" bg="bg-teal-50" />
        <StatCard title="Avg Conversion" value={`${avgConversion}%`} subtitle="across all rules" icon={TrendingUp} color="text-emerald-700" bg="bg-emerald-50" />
      </div>
      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Target className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No retargeting rules yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Create retargeting rules to automatically follow up with customers based on their behavior.
          </p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700"><Plus className="size-4 mr-1.5" />Create Rule</Button>
        </div>
      ) : (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Rule Performance</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">{rule.name}</p>
                  <p className="text-xs text-muted-foreground">{rule.trigger} &rarr; {rule.action}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right"><p className="text-xs text-muted-foreground">Rate</p><p className="text-sm font-semibold text-emerald-600">{rule.rate}%</p></div>
                  <Badge variant="outline" className={cn('text-[10px]', rule.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200')}>{rule.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}

// ─── BroadcastView ─────────────────────────────────────────────────
const mockBroadcasts = [
  { id: 'b1', name: 'Spring Promo Announcement', audience: 'All Active Customers', status: 'sent', audienceSize: 3200, delivered: 3145, replied: 312 },
  { id: 'b2', name: 'Monthly Service Reminder', audience: 'Service Due Segment', status: 'sent', audienceSize: 1500, delivered: 1489, replied: 145 },
  { id: 'b3', name: 'New Feature Launch', audience: 'Premium Customers', status: 'scheduled', audienceSize: 2800, delivered: 0, replied: 0 },
  { id: 'b4', name: 'Weekend Special Offer', audience: 'All Subscribers', status: 'draft', audienceSize: 4500, delivered: 0, replied: 0 },
];

const bStatusColors: Record<string, string> = { sent: 'bg-emerald-100 text-emerald-700 border-emerald-200', scheduled: 'bg-amber-100 text-amber-700 border-amber-200', draft: 'bg-slate-100 text-slate-600 border-slate-200' };

export function BroadcastView() {
  const [broadcasts, setBroadcasts] = useState<typeof mockBroadcasts>([]);
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50"><Radio className="size-5 text-emerald-600" /></div>
          <div><h1 className="text-xl font-bold">WhatsApp Broadcast</h1><p className="text-sm text-muted-foreground">Send bulk messages to segmented audiences</p></div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2"><Plus className="size-4" />Create Broadcast</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Broadcasts Sent" value={broadcasts.filter(b => b.status === 'sent').length.toString()} icon={Radio} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Recipients Reached" value={broadcasts.reduce((s, b) => s + b.delivered, 0).toLocaleString()} icon={Users} color="text-teal-600" bg="bg-teal-50" />
        <StatCard title="Response Rate" value="0%" icon={TrendingUp} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Opt-out Rate" value="0%" icon={Eye} color="text-rose-600" bg="bg-rose-50" />
      </div>
      {broadcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Radio className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No broadcasts yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Create a WhatsApp broadcast to send bulk messages to your segmented audiences.
          </p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700"><Plus className="size-4 mr-1.5" />Create Broadcast</Button>
        </div>
      ) : (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">All Broadcasts</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {broadcasts.map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-sm font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.audience} &middot; {b.audienceSize.toLocaleString()} recipients</p>
                </div>
                <div className="flex items-center gap-3">
                  {b.delivered > 0 && <span className="text-xs text-muted-foreground">Delivered: {b.delivered.toLocaleString()}</span>}
                  <Badge variant="outline" className={cn('text-xs', bStatusColors[b.status])}>{b.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}

// ─── FormBuilderView ───────────────────────────────────────────────
const mockForms = [
  { id: 'f1', name: 'Lead Capture Form', type: 'Lead', status: 'active', submissions: 342, conversion: 24.5, fields: 5 },
  { id: 'f2', name: 'Service Booking Form', type: 'Booking', status: 'active', submissions: 189, conversion: 38.2, fields: 5 },
  { id: 'f3', name: 'Customer Feedback Form', type: 'Feedback', status: 'active', submissions: 567, conversion: 61.3, fields: 4 },
  { id: 'f4', name: 'Quote Request Form', type: 'Quote', status: 'paused', submissions: 98, conversion: 15.8, fields: 6 },
];

const formTypeColors: Record<string, string> = { Lead: 'bg-emerald-100 text-emerald-700 border-emerald-200', Booking: 'bg-teal-100 text-teal-700 border-teal-200', Feedback: 'bg-amber-100 text-amber-700 border-amber-200', Quote: 'bg-sky-100 text-sky-700 border-sky-200' };

export function FormBuilderView() {
  const [forms, setForms] = useState<typeof mockForms>([]);
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50"><FileText className="size-5 text-emerald-600" /></div>
          <div><h1 className="text-xl font-bold">WhatsApp Form Builder</h1><p className="text-sm text-muted-foreground">Create and manage interactive forms with WhatsApp auto-replies</p></div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2"><Plus className="size-4" />Create Form</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Forms" value={forms.length.toString()} subtitle={`${forms.filter(f => f.status === 'active').length} active`} icon={FileText} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Total Submissions" value={forms.reduce((s, f) => s + f.submissions, 0).toLocaleString()} icon={CheckCircle2} color="text-teal-600" bg="bg-teal-50" />
        <StatCard title="Avg Conversion" value={forms.length > 0 ? `${(forms.reduce((s, f) => s + f.conversion, 0) / forms.length).toFixed(1)}%` : '0%'} icon={TrendingUp} color="text-green-600" bg="bg-green-50" />
        <StatCard title="WhatsApp Replies" value="0" subtitle="automated" icon={MessageSquare} color="text-emerald-700" bg="bg-emerald-50" />
      </div>
      {forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No forms yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Create WhatsApp forms to collect leads, bookings, and feedback with automated replies.
          </p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700"><Plus className="size-4 mr-1.5" />Create Form</Button>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forms.map(form => (
          <Card key={form.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50"><FileText className="size-4 text-emerald-600" /></div>
                  <div>
                    <p className="font-semibold text-sm">{form.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={cn('text-[10px]', formTypeColors[form.type])}>{form.type}</Badge>
                      <Badge variant="outline" className={cn('text-[10px]', form.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200')}>{form.status}</Badge>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><p className="text-[10px] text-muted-foreground">Submissions</p><p className="text-lg font-bold">{form.submissions}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Conversion</p><p className="text-lg font-bold text-emerald-600">{form.conversion}%</p></div>
                <div><p className="text-[10px] text-muted-foreground">Fields</p><p className="text-lg font-bold">{form.fields}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}

// ─── WebviewEngineView ─────────────────────────────────────────────
const mockWebviews = [
  { id: 'wv1', name: 'Online Booking Portal', type: 'booking', status: 'active', views: 4520, clicks: 3180, conversions: 892, rate: 28.1 },
  { id: 'wv2', name: 'Secure Payment Gateway', type: 'payment', status: 'active', views: 2890, clicks: 2340, conversions: 1870, rate: 79.9 },
  { id: 'wv3', name: 'Customer Self-Service Portal', type: 'portal', status: 'active', views: 6780, clicks: 5120, conversions: 3200, rate: 62.5 },
  { id: 'wv4', name: 'Invoice Viewer', type: 'invoice', status: 'paused', views: 1250, clicks: 980, conversions: 670, rate: 68.4 },
];

const wvTypeColors: Record<string, string> = { booking: 'bg-teal-100 text-teal-700 border-teal-200', payment: 'bg-emerald-100 text-emerald-700 border-emerald-200', portal: 'bg-violet-100 text-violet-700 border-violet-200', invoice: 'bg-sky-100 text-sky-700 border-sky-200' };

export function WebviewEngineView() {
  const [webviews, setWebviews] = useState<typeof mockWebviews>([]);
  const totalViews = webviews.reduce((s, w) => s + w.views, 0);
  const totalClicks = webviews.reduce((s, w) => s + w.clicks, 0);
  const avgConv = webviews.length > 0 ? (webviews.reduce((s, w) => s + w.rate, 0) / webviews.length).toFixed(1) : '0';
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50"><Monitor className="size-5 text-emerald-600" /></div>
          <div><h1 className="text-xl font-bold">WhatsApp Webview Engine</h1><p className="text-sm text-muted-foreground">Embed web experiences inside WhatsApp conversations</p></div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2"><Plus className="size-4" />Create Webview</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Webviews" value={webviews.filter(w => w.status === 'active').length.toString()} subtitle={`of ${webviews.length} total`} icon={Monitor} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Total Views" value={totalViews.toLocaleString()} icon={Eye} color="text-teal-600" bg="bg-teal-50" />
        <StatCard title="Total Clicks" value={totalClicks.toLocaleString()} icon={MousePointerClick} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Avg Conversion" value={`${avgConv}%`} icon={TrendingUp} color="text-emerald-700" bg="bg-emerald-50" />
      </div>
      {webviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Monitor className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No webviews yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Create a WhatsApp webview to embed web experiences like booking portals and payment pages inside conversations.
          </p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700"><Plus className="size-4 mr-1.5" />Create Webview</Button>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {webviews.map(wv => (
          <Card key={wv.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50"><Monitor className="size-4 text-emerald-600" /></div>
                  <div>
                    <p className="font-semibold text-sm">{wv.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={cn('text-[10px]', wvTypeColors[wv.type])}>{wv.type}</Badge>
                      <Badge variant="outline" className={cn('text-[10px]', wv.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200')}>{wv.status}</Badge>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><p className="text-[10px] text-muted-foreground">Views</p><p className="text-sm font-bold">{wv.views.toLocaleString()}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Clicks</p><p className="text-sm font-bold">{wv.clicks.toLocaleString()}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Conversions</p><p className="text-sm font-bold text-emerald-600">{wv.conversions.toLocaleString()}</p></div>
              </div>
              <div className="mt-3"><Progress value={wv.rate} className="h-1.5" /><p className="text-[10px] text-muted-foreground mt-1">{wv.rate}% conversion rate</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}
