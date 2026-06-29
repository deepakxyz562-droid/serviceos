'use client';

import { useState } from 'react';
import {
  Repeat, Plus, Search, Play, Pause, Clock, Zap, Target,
  MessageSquare, DollarSign, TrendingUp, Settings, Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RetargetingRule {
  id: string;
  name: string;
  status: 'active' | 'paused';
  triggerType: string;
  triggerConfig: string;
  actionType: string;
  actionConfig: string;
  cooldownDays: number;
  maxTriggers: number;
  stats: { triggered: number; delivered: number; converted: number };
  createdAt: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_RULES: RetargetingRule[] = [
  { id: 'r1', name: 'No Booking 30 Days', status: 'active', triggerType: 'no_booking', triggerConfig: '30 days', actionType: 'whatsapp_reminder', actionConfig: 'Hey {{name}}, we miss you! Book now and get 15% off.', cooldownDays: 7, maxTriggers: 3, stats: { triggered: 245, delivered: 230, converted: 34 }, createdAt: '2025-01-10' },
  { id: 'r2', name: 'Unpaid Invoice Follow-up', status: 'active', triggerType: 'unpaid_invoice', triggerConfig: 'Overdue by 3 days', actionType: 'whatsapp_reminder', actionConfig: 'Hi {{name}}, your invoice #{{invoice_id}} is overdue. Please pay at {{link}}', cooldownDays: 3, maxTriggers: 5, stats: { triggered: 89, delivered: 85, converted: 52 }, createdAt: '2025-02-01' },
  { id: 'r3', name: 'Quote Not Accepted', status: 'active', triggerType: 'quote_not_accepted', triggerConfig: '2 days after quote sent', actionType: 'special_offer', actionConfig: 'Special offer: 10% off if you accept the quote today!', cooldownDays: 5, maxTriggers: 2, stats: { triggered: 156, delivered: 148, converted: 41 }, createdAt: '2025-02-15' },
  { id: 'r4', name: 'Job Not Scheduled', status: 'paused', triggerType: 'job_not_scheduled', triggerConfig: '1 day after lead qualification', actionType: 'follow_up_sequence', actionConfig: '3-step follow-up sequence', cooldownDays: 2, maxTriggers: 3, stats: { triggered: 67, delivered: 60, converted: 18 }, createdAt: '2025-03-01' },
  { id: 'r5', name: 'Click No Conversion', status: 'active', triggerType: 'clicked_no_conversion', triggerConfig: '24 hours after click', actionType: 'special_offer', actionConfig: 'Still interested? Here\'s a special deal just for you!', cooldownDays: 7, maxTriggers: 2, stats: { triggered: 312, delivered: 298, converted: 89 }, createdAt: '2025-01-20' },
];

const TRIGGER_TYPES = [
  { value: 'no_booking', label: 'No Booking (X days)' },
  { value: 'unpaid_invoice', label: 'Unpaid Invoice' },
  { value: 'quote_not_accepted', label: 'Quote Not Accepted' },
  { value: 'job_not_scheduled', label: 'Job Not Scheduled' },
  { value: 'clicked_no_conversion', label: 'Clicked No Conversion' },
];

const ACTION_TYPES = [
  { value: 'whatsapp_reminder', label: 'WhatsApp Reminder' },
  { value: 'special_offer', label: 'Special Offer' },
  { value: 'follow_up_sequence', label: 'Follow-up Sequence' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function RetargetingView() {
  const [rules, setRules] = useState<RetargetingRule[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '', triggerType: 'no_booking', triggerConfig: '', actionType: 'whatsapp_reminder',
    actionConfig: '', cooldownDays: 7, maxTriggers: 3,
  });

  const filteredRules = rules.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleStatus = (id: string) => {
    setRules(prev => prev.map(r =>
      r.id === id ? { ...r, status: r.status === 'active' ? 'paused' : 'active' } : r
    ));
    toast.success('Rule status updated');
  };

  const handleCreate = () => {
    if (!createForm.name) { toast.error('Rule name is required'); return; }
    const newRule: RetargetingRule = {
      id: `r-${Date.now()}`, name: createForm.name, status: 'active',
      triggerType: createForm.triggerType, triggerConfig: createForm.triggerConfig,
      actionType: createForm.actionType, actionConfig: createForm.actionConfig,
      cooldownDays: createForm.cooldownDays, maxTriggers: createForm.maxTriggers,
      stats: { triggered: 0, delivered: 0, converted: 0 },
      createdAt: new Date().toISOString().split('T')[0],
    };
    setRules(prev => [newRule, ...prev]);
    setShowCreateDialog(false);
    setCreateForm({ name: '', triggerType: 'no_booking', triggerConfig: '', actionType: 'whatsapp_reminder', actionConfig: '', cooldownDays: 7, maxTriggers: 3 });
    toast.success('Retargeting rule created');
  };

  const handleDelete = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success('Rule deleted');
  };

  const totalTriggered = rules.reduce((s, r) => s + r.stats.triggered, 0);
  const totalConverted = rules.reduce((s, r) => s + r.stats.converted, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Repeat className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Retargeting</h2>
            <p className="text-sm text-muted-foreground">WhatsApp retargeting automation</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
          <Plus className="size-4 mr-1.5" /> Create Rule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Total Rules', value: rules.length, icon: Settings, color: 'text-foreground' },
          { label: 'Active', value: rules.filter(r => r.status === 'active').length, icon: Play, color: 'text-emerald-600' },
          { label: 'Total Triggered', value: totalTriggered.toLocaleString(), icon: Zap, color: 'text-orange-600' },
          { label: 'Conversions', value: totalConverted.toLocaleString(), icon: TrendingUp, color: 'text-green-600' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-2"><Icon className={`size-4 ${stat.color}`} /><div><p className="text-xs text-muted-foreground">{stat.label}</p><p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p></div></div>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search rules..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Rules List */}
      {filteredRules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Repeat className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No retargeting rules yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Create retargeting rules to automatically follow up with customers based on their behavior and actions.
          </p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4 mr-1.5" /> Create Rule
          </Button>
        </div>
      ) : (
      <div className="space-y-4">
        {filteredRules.map(rule => (
          <Card key={rule.id} className="hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{rule.name}</h4>
                    <Badge variant="outline" className={rule.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]' : 'bg-amber-100 text-amber-700 border-amber-200 text-[10px]'}>
                      {rule.status === 'active' ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1"><Target className="size-3" /> Trigger: {TRIGGER_TYPES.find(t => t.value === rule.triggerType)?.label}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="size-3" /> Action: {ACTION_TYPES.find(a => a.value === rule.actionType)?.label}</span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-xs text-muted-foreground mb-2">
                    <span className="font-medium">Config:</span> {rule.triggerConfig} → {rule.actionConfig.slice(0, 80)}{rule.actionConfig.length > 80 ? '...' : ''}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span><Clock className="size-3 inline mr-1" />Cooldown: {rule.cooldownDays} days</span>
                    <span>Max: {rule.maxTriggers} triggers</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-sm font-bold text-blue-600">{rule.stats.triggered}</p><p className="text-[9px] text-muted-foreground">Triggered</p></div>
                    <div><p className="text-sm font-bold text-emerald-600">{rule.stats.delivered}</p><p className="text-[9px] text-muted-foreground">Delivered</p></div>
                    <div><p className="text-sm font-bold text-green-600">{rule.stats.converted}</p><p className="text-[9px] text-muted-foreground">Converted</p></div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleToggleStatus(rule.id)}>
                      {rule.status === 'active' ? <><Pause className="size-3 mr-1" />Pause</> : <><Play className="size-3 mr-1" />Activate</>}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(rule.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Create Rule Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Retargeting Rule</DialogTitle>
            <DialogDescription>Set up automated WhatsApp retargeting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input placeholder="e.g., Win-back Inactive Customers" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select value={createForm.triggerType} onValueChange={v => setCreateForm({ ...createForm, triggerType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trigger Configuration</Label>
              <Input placeholder="e.g., 30 days, Overdue by 3 days" value={createForm.triggerConfig} onChange={e => setCreateForm({ ...createForm, triggerConfig: e.target.value })} />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select value={createForm.actionType} onValueChange={v => setCreateForm({ ...createForm, actionType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action Configuration (Message)</Label>
              <Textarea placeholder="Type the WhatsApp message..." value={createForm.actionConfig} onChange={e => setCreateForm({ ...createForm, actionConfig: e.target.value })} rows={3} />
              <p className="text-[10px] text-muted-foreground">Use {'{{name}}'}, {'{{invoice_id}}'}, {'{{link}}'} as placeholders</p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cooldown (days)</Label>
                <Input type="number" value={createForm.cooldownDays} onChange={e => setCreateForm({ ...createForm, cooldownDays: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Max Triggers</Label>
                <Input type="number" value={createForm.maxTriggers} onChange={e => setCreateForm({ ...createForm, maxTriggers: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!createForm.name}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
