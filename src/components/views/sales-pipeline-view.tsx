'use client';

import { useState } from 'react';
import {
  TrendingUp, Plus, Search, DollarSign, User,
  ArrowRight, ChevronRight, BarChart3, Briefcase,
  GripVertical, Sparkles, Clock, Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Deal {
  id: string;
  title: string;
  value: number;
  customerName: string;
  probability: number;
  assignee: string;
  stage: string;
  createdAt: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const STAGES = [
  { id: 'new_lead', label: 'New Lead', color: 'border-t-teal-500', headerBg: 'bg-teal-500' },
  { id: 'contacted', label: 'Contacted', color: 'border-t-amber-500', headerBg: 'bg-amber-500' },
  { id: 'qualified', label: 'Qualified', color: 'border-t-cyan-500', headerBg: 'bg-cyan-500' },
  { id: 'quote_sent', label: 'Quote Sent', color: 'border-t-orange-500', headerBg: 'bg-orange-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'border-t-violet-500', headerBg: 'bg-violet-500' },
  { id: 'won', label: 'Won', color: 'border-t-emerald-500', headerBg: 'bg-emerald-500' },
  { id: 'lost', label: 'Lost', color: 'border-t-red-500', headerBg: 'bg-red-500' },
];

const MOCK_DEALS: Deal[] = [
  { id: 'd1', title: 'Office Cleaning Contract', value: 2400, customerName: 'Robert Kim', probability: 80, assignee: 'Sarah Johnson', stage: 'negotiation', createdAt: '2025-02-15' },
  { id: 'd2', title: 'Deep Cleaning Service', value: 450, customerName: 'Alex Rivera', probability: 60, assignee: 'Mike Chen', stage: 'quote_sent', createdAt: '2025-03-01' },
  { id: 'd3', title: 'Window Cleaning', value: 800, customerName: 'Sophie Chen', probability: 40, assignee: 'Sarah Johnson', stage: 'qualified', createdAt: '2025-03-05' },
  { id: 'd4', title: 'Plumbing Repair', value: 350, customerName: 'James Wilson', probability: 20, assignee: 'Mike Chen', stage: 'contacted', createdAt: '2025-03-08' },
  { id: 'd5', title: 'Packing Service', value: 1200, customerName: 'Lisa Park', probability: 10, assignee: 'Priya Patel', stage: 'new_lead', createdAt: '2025-03-10' },
  { id: 'd6', title: 'Monthly Cleaning Plan', value: 6000, customerName: 'Carlos Mendoza', probability: 90, assignee: 'Sarah Johnson', stage: 'won', createdAt: '2025-01-20' },
  { id: 'd7', title: 'Restaurant Cleaning', value: 1800, customerName: 'Emily Davis', probability: 0, assignee: 'Mike Chen', stage: 'lost', createdAt: '2025-02-01' },
  { id: 'd8', title: 'Move-out Cleaning', value: 550, customerName: 'Maria Santos', probability: 50, assignee: 'Priya Patel', stage: 'qualified', createdAt: '2025-03-12' },
];

const ASSIGNEES = ['Sarah Johnson', 'Mike Chen', 'Priya Patel', 'David Brown', 'Emma Wilson'];

// ─── Component ──────────────────────────────────────────────────────────────

export function SalesPipelineView() {
  const [deals, setDeals] = useState<Deal[]>(MOCK_DEALS);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', value: '', customerName: '', assignee: 'Sarah Johnson', stage: 'new_lead' });
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const handleCreate = () => {
    if (!createForm.title) { toast.error('Deal title required'); return; }
    const newDeal: Deal = {
      id: `d-${Date.now()}`, title: createForm.title,
      value: parseFloat(createForm.value) || 0, customerName: createForm.customerName,
      probability: 10, assignee: createForm.assignee, stage: createForm.stage,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setDeals(prev => [...prev, newDeal]);
    setShowCreateDialog(false);
    setCreateForm({ title: '', value: '', customerName: '', assignee: 'Sarah Johnson', stage: 'new_lead' });
    toast.success('Deal created');
  };

  const handleMoveStage = (dealId: string, newStage: string) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const stageIdx = STAGES.findIndex(s => s.id === newStage);
      const probability = Math.min(stageIdx * 15 + 10, 95);
      return { ...d, stage: newStage, probability };
    }));
    toast.success('Deal moved');
  };

  const totalPipelineValue = deals.filter(d => !['won', 'lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0);
  const wonValue = deals.filter(d => d.stage === 'won').reduce((s, d) => s + d.value, 0);
  const weightedPipeline = deals.filter(d => !['won', 'lost'].includes(d.stage)).reduce((s, d) => s + (d.value * d.probability / 100), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600 shadow-lg shadow-emerald-600/20">
            <TrendingUp className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Sales Pipeline</h2>
            <p className="text-sm text-muted-foreground">WhatsApp-driven sales pipeline</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]" onClick={() => setShowCreateDialog(true)}>
          <Plus className="size-4 mr-1.5" /> Add Deal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Pipeline Value', value: `$${totalPipelineValue.toLocaleString()}`, color: 'text-teal-600', bg: 'bg-teal-50', icon: Target },
          { label: 'Weighted Value', value: `$${Math.round(weightedPipeline).toLocaleString()}`, color: 'text-violet-600', bg: 'bg-violet-50', icon: BarChart3 },
          { label: 'Won Revenue', value: `$${wonValue.toLocaleString()}`, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: TrendingUp },
          { label: 'Active Deals', value: deals.filter(d => !['won', 'lost'].includes(d.stage)).length, color: 'text-orange-600', bg: 'bg-orange-50', icon: Briefcase },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className={cn('p-4 border', stat.bg)}>
              <div className="flex items-center gap-2">
                <Icon className={cn('size-4 shrink-0', stat.color)} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Revenue Forecast */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <BarChart3 className="size-4 text-emerald-600" />
            Revenue Forecast
          </h3>
          <div className="flex items-end gap-1 h-24">
            {STAGES.filter(s => !['won', 'lost'].includes(s.id)).map(stage => {
              const stageValue = deals.filter(d => d.stage === stage.id).reduce((s, d) => s + d.value, 0);
              const maxVal = Math.max(...STAGES.map(s => deals.filter(d => d.stage === s.id).reduce((sum, d) => sum + d.value, 0)), 1);
              return (
                <div key={stage.id} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[9px] font-medium text-emerald-600">${stageValue.toLocaleString()}</div>
                  <div className="w-full bg-gradient-to-t from-emerald-400 to-emerald-300 rounded-t shadow-sm" style={{ height: `${Math.max((stageValue / maxVal) * 64, 4)}px` }} />
                  <div className="text-[9px] text-muted-foreground text-center truncate w-full">{stage.label}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {STAGES.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage.id);
            const stageValue = stageDeals.reduce((s, d) => s + d.value, 0);
            return (
              <div key={stage.id} className="w-72 shrink-0">
                {/* Column header with colored bar */}
                <div className={cn('rounded-t-lg border-t-4 bg-muted/40 p-2.5', stage.color)}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs">{stage.label}</span>
                    <Badge variant="secondary" className="text-[9px] h-4">{stageDeals.length}</Badge>
                  </div>
                  {stageValue > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <DollarSign className="size-3 text-emerald-600" />
                      <span className="text-[11px] font-semibold text-emerald-600">${stageValue.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                {/* Column body with drop zone visual cue */}
                <div className="bg-muted/20 rounded-b-lg border border-t-0 border-dashed p-2 min-h-[80px]">
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2">
                      {stageDeals.map(deal => (
                        <Card
                          key={deal.id}
                          className="cursor-pointer hover:shadow-md transition-all group relative"
                          onClick={() => setSelectedDeal(deal)}
                        >
                          <CardContent className="p-3 space-y-2">
                            {/* Drag cue */}
                            <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-40 transition-opacity">
                              <GripVertical className="size-3 text-muted-foreground" />
                            </div>

                            {/* Title & value */}
                            <div className="pl-3">
                              <h5 className="font-medium text-sm truncate">{deal.title}</h5>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-sm font-bold text-emerald-600">${deal.value.toLocaleString()}</span>
                                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{deal.probability}%</span>
                              </div>
                            </div>

                            {/* Probability bar */}
                            <Progress value={deal.probability} className="h-1" />

                            {/* Customer & Assignee */}
                            <div className="flex items-center justify-between pl-3">
                              <span className="text-xs text-muted-foreground truncate">{deal.customerName}</span>
                              <Avatar className="size-5">
                                <AvatarFallback className="text-[8px] bg-emerald-100 text-emerald-700">
                                  {deal.assignee[0]}
                                </AvatarFallback>
                              </Avatar>
                            </div>

                            {/* Move buttons */}
                            <div className="flex gap-1 pt-1 border-t pl-3">
                              {stage.id !== 'new_lead' && (
                                <Button variant="ghost" size="sm" className="h-6 text-[9px] px-1.5 min-h-[24px]" onClick={(e) => { e.stopPropagation(); const idx = STAGES.findIndex(s => s.id === deal.stage); if (idx > 0) handleMoveStage(deal.id, STAGES[idx - 1].id); }}>
                                  ← Back
                                </Button>
                              )}
                              {stage.id !== 'lost' && (
                                <Button variant="ghost" size="sm" className="h-6 text-[9px] px-1.5 ml-auto min-h-[24px] text-emerald-600 hover:text-emerald-700" onClick={(e) => { e.stopPropagation(); const idx = STAGES.findIndex(s => s.id === deal.stage); if (idx < STAGES.length - 1) handleMoveStage(deal.id, STAGES[idx + 1].id); }}>
                                  Next →
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {stageDeals.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground border-2 border-dashed rounded-lg border-muted/50">
                          <Plus className="size-5 mb-1 opacity-30" />
                          <p className="text-xs">Drop deals here</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deal Detail */}
      <Dialog open={!!selectedDeal} onOpenChange={() => setSelectedDeal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="size-4 text-emerald-600" />
              {selectedDeal?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedDeal && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-100">
                  <p className="text-xs text-muted-foreground">Value</p>
                  <p className="font-bold text-emerald-600">${selectedDeal.value.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2 border">
                  <p className="text-xs text-muted-foreground">Probability</p>
                  <p className="font-medium">{selectedDeal.probability}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedDeal.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assignee</p>
                  <p className="font-medium">{selectedDeal.assignee}</p>
                </div>
              </div>
              <Separator />
              <div>
                <Label className="text-xs">Move to Stage</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {STAGES.map(stage => (
                    <Button key={stage.id} variant={selectedDeal.stage === stage.id ? 'default' : 'outline'} size="sm" className="h-6 text-[10px] min-h-[24px]" onClick={() => handleMoveStage(selectedDeal.id, stage.id)}>
                      {stage.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Deal Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-4 text-emerald-600" />
              Add Deal
            </DialogTitle>
            <DialogDescription>Create a new deal in the pipeline</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Deal Title *</Label>
              <Input placeholder="e.g., Office Cleaning Contract" value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Value ($)</Label>
                <Input type="number" placeholder="0" value={createForm.value} onChange={e => setCreateForm({ ...createForm, value: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={createForm.stage} onValueChange={v => setCreateForm({ ...createForm, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input placeholder="Customer name" value={createForm.customerName} onChange={e => setCreateForm({ ...createForm, customerName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={createForm.assignee} onValueChange={v => setCreateForm({ ...createForm, assignee: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNEES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]" onClick={handleCreate} disabled={!createForm.title}>Create Deal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
