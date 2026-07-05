'use client';

import { useState } from 'react';
import {
  Megaphone, Plus, Search, DollarSign, TrendingUp, Users,
  ArrowRight, Facebook, MousePointer, Eye, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AdCampaign {
  id: string;
  name: string;
  platform: 'facebook' | 'instagram';
  budget: number;
  startDate: string;
  endDate: string;
  leads: number;
  costPerLead: number;
  conversionRate: number;
  status: 'active' | 'paused' | 'completed';
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_ADS: AdCampaign[] = [
  { id: 'ad1', name: 'Spring Cleaning Promo', platform: 'facebook', budget: 500, startDate: '2025-03-01', endDate: '2025-03-31', leads: 45, costPerLead: 11.11, conversionRate: 24, status: 'active' },
  { id: 'ad2', name: 'Plumbing Services', platform: 'facebook', budget: 300, startDate: '2025-02-15', endDate: '2025-03-15', leads: 28, costPerLead: 10.71, conversionRate: 32, status: 'active' },
  { id: 'ad3', name: 'Moving Services IG', platform: 'instagram', budget: 400, startDate: '2025-02-01', endDate: '2025-02-28', leads: 35, costPerLead: 11.43, conversionRate: 20, status: 'completed' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function AdsIntegrationView() {
  const [ads, setAds] = useState<AdCampaign[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', platform: 'facebook' as AdCampaign['platform'], budget: '', startDate: '', endDate: '' });

  const handleCreate = () => {
    if (!createForm.name) { toast.error('Campaign name required'); return; }
    const newAd: AdCampaign = {
      id: `ad-${Date.now()}`, name: createForm.name, platform: createForm.platform,
      budget: parseFloat(createForm.budget) || 0, startDate: createForm.startDate || new Date().toISOString().split('T')[0],
      endDate: createForm.endDate || '', leads: 0, costPerLead: 0, conversionRate: 0, status: 'active',
    };
    setAds(prev => [newAd, ...prev]);
    setShowCreateDialog(false);
    setCreateForm({ name: '', platform: 'facebook', budget: '', startDate: '', endDate: '' });
    toast.success('Ad campaign created');
  };

  const totalLeads = ads.reduce((s, a) => s + a.leads, 0);
  const totalSpend = ads.reduce((s, a) => s + a.budget, 0);
  const avgCPL = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : '0';

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Megaphone className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Click to WhatsApp Ads</h2>
            <p className="text-sm text-muted-foreground">Facebook & Instagram ad integration</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
          <Plus className="size-4 mr-1.5" /> Create Ad Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Active Campaigns', value: ads.filter(a => a.status === 'active').length, icon: Megaphone, color: 'text-emerald-600' },
          { label: 'Total Leads', value: totalLeads, icon: Users, color: 'text-blue-600' },
          { label: 'Total Spend', value: `$${totalSpend.toLocaleString()}`, icon: DollarSign, color: 'text-orange-600' },
          { label: 'Avg Cost/Lead', value: `$${avgCPL}`, icon: TrendingUp, color: 'text-purple-600' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-2"><Icon className={`size-4 ${stat.color}`} /><div><p className="text-xs text-muted-foreground">{stat.label}</p><p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p></div></div>
            </Card>
          );
        })}
      </div>

      {/* Flow Visualization */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-medium text-sm mb-4">Conversion Flow</h3>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {[
              { icon: Megaphone, label: 'Facebook Ad', color: 'bg-blue-100 text-blue-700' },
              { icon: ArrowRight, label: '', color: 'text-muted-foreground' },
              { icon: MessageSquare, label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-700' },
              { icon: ArrowRight, label: '', color: 'text-muted-foreground' },
              { icon: Users, label: 'Lead', color: 'bg-purple-100 text-purple-700' },
              { icon: ArrowRight, label: '', color: 'text-muted-foreground' },
              { icon: DollarSign, label: 'CRM', color: 'bg-orange-100 text-orange-700' },
              { icon: ArrowRight, label: '', color: 'text-muted-foreground' },
              { icon: BarChart3, label: 'Automation', color: 'bg-amber-100 text-amber-700' },
            ].map((step, i) => {
              const Icon = step.icon;
              if (step.label === '') {
                return <ArrowRight key={i} className="size-5 text-muted-foreground" />;
              }
              return (
                <div key={i} className={cn('flex flex-col items-center gap-1 p-3 rounded-lg border', step.color)}>
                  <Icon className="size-5" />
                  <span className="text-[10px] font-medium">{step.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Ad Campaign List */}
      {ads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Megaphone className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No ad campaigns yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Create a Click to WhatsApp ad campaign to drive leads from Facebook and Instagram directly to your WhatsApp.
          </p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4 mr-1.5" /> Create Ad Campaign
          </Button>
        </div>
      ) : (
      <div className="space-y-4">
        {ads.map(ad => (
          <Card key={ad.id} className="hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{ad.name}</h4>
                    <Badge variant="outline" className={ad.platform === 'facebook' ? 'bg-blue-100 text-blue-700 text-[10px]' : 'bg-pink-100 text-pink-700 text-[10px]'}>
                      {ad.platform === 'facebook' ? 'Facebook' : 'Instagram'}
                    </Badge>
                    <Badge variant="outline" className={ad.status === 'active' ? 'bg-emerald-100 text-emerald-700 text-[10px]' : ad.status === 'paused' ? 'bg-amber-100 text-amber-700 text-[10px]' : 'bg-slate-100 text-slate-600 text-[10px]'}>
                      {ad.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Budget: ${ad.budget} | {ad.startDate} → {ad.endDate || 'Ongoing'}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center shrink-0">
                  <div><p className="text-sm font-bold text-blue-600">{ad.leads}</p><p className="text-[10px] text-muted-foreground">Leads</p></div>
                  <div><p className="text-sm font-bold text-emerald-600">${ad.costPerLead.toFixed(2)}</p><p className="text-[10px] text-muted-foreground">Cost/Lead</p></div>
                  <div><p className="text-sm font-bold text-purple-600">{ad.conversionRate}%</p><p className="text-[10px] text-muted-foreground">Conv. Rate</p></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Ad Campaign</DialogTitle>
            <DialogDescription>Set up a Click to WhatsApp ad</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input placeholder="e.g., Spring Promo" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={createForm.platform} onValueChange={v => setCreateForm({ ...createForm, platform: v as AdCampaign['platform'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Daily Budget ($)</Label>
              <Input type="number" placeholder="e.g., 50" value={createForm.budget} onChange={e => setCreateForm({ ...createForm, budget: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={createForm.startDate} onChange={e => setCreateForm({ ...createForm, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={createForm.endDate} onChange={e => setCreateForm({ ...createForm, endDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!createForm.name}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageSquare(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
