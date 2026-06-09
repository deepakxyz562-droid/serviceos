'use client';

import { useState } from 'react';
import {
  GitBranch, Plus, Search, Play, Pause, Eye, Clock,
  Zap, MessageSquare, Mail, Tag, User, Users, ArrowRight,
  Settings, Trash2, CheckCircle2,
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/stat-card';

// ─── Types ──────────────────────────────────────────────────────────────────

interface JourneyNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'branch';
  label: string;
  config: string;
  color: string;
}

interface Journey {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'draft';
  enrolledCount: number;
  completedCount: number;
  nodes: JourneyNode[];
  createdAt: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_JOURNEYS: Journey[] = [
  {
    id: 'j1', name: 'New Lead Onboarding', status: 'active', enrolledCount: 245, completedCount: 178,
    nodes: [
      { id: 'jn1', type: 'trigger', label: 'New Lead', config: 'When a new lead is created', color: 'bg-blue-100 text-blue-700 border-blue-300' },
      { id: 'jn2', type: 'action', label: 'Send WhatsApp', config: 'Welcome message with service info', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
      { id: 'jn3', type: 'delay', label: 'Wait 2 Hours', config: '2 hours', color: 'bg-amber-100 text-amber-700 border-amber-300' },
      { id: 'jn4', type: 'condition', label: 'Replied?', config: 'Check if lead responded', color: 'bg-orange-100 text-orange-700 border-orange-300' },
      { id: 'jn5', type: 'action', label: 'Send Follow-up', config: 'Follow-up message if no reply', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
      { id: 'jn6', type: 'action', label: 'Assign Agent', config: 'Assign to sales team', color: 'bg-purple-100 text-purple-700 border-purple-300' },
    ],
    createdAt: '2025-01-15',
  },
  {
    id: 'j2', name: 'Job Completion Follow-up', status: 'active', enrolledCount: 156, completedCount: 134,
    nodes: [
      { id: 'jn10', type: 'trigger', label: 'Job Completed', config: 'When job status changes to completed', color: 'bg-blue-100 text-blue-700 border-blue-300' },
      { id: 'jn11', type: 'delay', label: 'Wait 1 Day', config: '1 day', color: 'bg-amber-100 text-amber-700 border-amber-300' },
      { id: 'jn12', type: 'action', label: 'Request Review', config: 'Send review request via WhatsApp', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
      { id: 'jn13', type: 'delay', label: 'Wait 3 Days', config: '3 days', color: 'bg-amber-100 text-amber-700 border-amber-300' },
      { id: 'jn14', type: 'condition', label: 'Left Review?', config: 'Check if review submitted', color: 'bg-orange-100 text-orange-700 border-orange-300' },
      { id: 'jn15', type: 'action', label: 'Send Reminder', config: 'Gentle review reminder', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    ],
    createdAt: '2025-02-01',
  },
  {
    id: 'j3', name: 'Payment Received', status: 'inactive', enrolledCount: 89, completedCount: 75,
    nodes: [
      { id: 'jn20', type: 'trigger', label: 'Payment Received', config: 'When payment is confirmed', color: 'bg-blue-100 text-blue-700 border-blue-300' },
      { id: 'jn21', type: 'action', label: 'Send Thank You', config: 'Thank you message with receipt', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
      { id: 'jn22', type: 'action', label: 'Update CRM', config: 'Mark invoice as paid', color: 'bg-purple-100 text-purple-700 border-purple-300' },
      { id: 'jn23', type: 'action', label: 'Add Tag', config: 'Tag: paid_customer', color: 'bg-pink-100 text-pink-700 border-pink-300' },
    ],
    createdAt: '2025-03-01',
  },
];

const TRIGGER_TYPES = ['New Lead', 'New Customer', 'New Booking', 'Job Assigned', 'Job Completed', 'Payment Received'];
const ACTION_TYPES = ['WhatsApp', 'Email', 'Task', 'Tag', 'CRM Update'];

// ─── Component ──────────────────────────────────────────────────────────────

export function JourneyAutomationView() {
  const [journeys, setJourneys] = useState<Journey[]>(MOCK_JOURNEYS);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', trigger: 'New Lead' });

  const filteredJourneys = journeys.filter(j =>
    j.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (id: string) => {
    setJourneys(prev => prev.map(j =>
      j.id === id ? { ...j, status: j.status === 'active' ? 'inactive' : 'active' } : j
    ));
    toast.success('Journey status updated');
  };

  const handleCreate = () => {
    if (!createForm.name) { toast.error('Journey name required'); return; }
    const newJourney: Journey = {
      id: `j-${Date.now()}`, name: createForm.name, status: 'draft',
      enrolledCount: 0, completedCount: 0,
      nodes: [
        { id: `jn-${Date.now()}`, type: 'trigger', label: createForm.trigger, config: `When ${createForm.trigger.toLowerCase()}`, color: 'bg-blue-100 text-blue-700 border-blue-300' },
        { id: `jn-${Date.now()}-a`, type: 'action', label: 'Send WhatsApp', config: 'Welcome message', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
      ],
      createdAt: new Date().toISOString().split('T')[0],
    };
    setJourneys(prev => [newJourney, ...prev]);
    setShowCreateDialog(false);
    setCreateForm({ name: '', trigger: 'New Lead' });
    toast.success('Journey created');
  };

  const getNodeIcon = (type: string) => {
    const map: Record<string, React.ReactNode> = {
      trigger: <Zap className="size-4" />,
      action: <ArrowRight className="size-4" />,
      condition: <GitBranch className="size-4" />,
      delay: <Clock className="size-4" />,
      branch: <GitBranch className="size-4" />,
    };
    return map[type] || <Settings className="size-4" />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <ViewHeader
        icon={GitBranch}
        title="Journey Automation"
        description="Customer journey builder"
        action={
          <Button className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4 mr-1.5" /> Create Journey
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard label="Total Journeys" value={journeys.length} icon={GitBranch} />
        <StatCard label="Active" value={journeys.filter(j => j.status === 'active').length} icon={Play} color="text-emerald-600" />
        <StatCard label="Enrolled" value={journeys.reduce((s, j) => s + j.enrolledCount, 0).toLocaleString()} icon={Users} color="text-teal-600" />
        <StatCard label="Completed" value={journeys.reduce((s, j) => s + j.completedCount, 0).toLocaleString()} icon={CheckCircle2} color="text-green-600" />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search journeys..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Journey List */}
      {filteredJourneys.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No journeys found"
          description={search ? 'Try adjusting your search' : 'Create your first customer journey automation'}
          actionLabel={!search ? 'Create Journey' : undefined}
          onAction={!search ? () => setShowCreateDialog(true) : undefined}
        />
      ) : (
      <div className="space-y-4">
        {filteredJourneys.map(journey => {
          const completionRate = journey.enrolledCount > 0 ? Math.round(journey.completedCount / journey.enrolledCount * 100) : 0;
          return (
          <Card key={journey.id} className="hover:shadow-md transition-all group">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold">{journey.name}</h4>
                    <Badge variant="outline" className={cn('text-[10px] gap-1', journey.status === 'active' ? 'bg-emerald-100 text-emerald-700' : journey.status === 'inactive' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700')}>
                      {journey.status === 'active' && <span className="relative flex size-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" /></span>}
                      {journey.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                    <span>{journey.enrolledCount} enrolled</span>
                    <span>{journey.completedCount} completed</span>
                    <span>{journey.nodes.length} steps</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="outline" size="sm" className="min-h-[36px] text-xs" onClick={() => handleToggle(journey.id)}>
                    {journey.status === 'active' ? <><Pause className="size-3 mr-1" />Pause</> : <><Play className="size-3 mr-1" />Activate</>}
                  </Button>
                  <Button variant="outline" size="sm" className="min-h-[36px] text-xs" onClick={() => setSelectedJourney(journey)}>
                    <Eye className="size-3 mr-1" /> View
                  </Button>
                </div>
              </div>
              {/* Completion Rate */}
              {journey.enrolledCount > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Completion Rate</span>
                    <span className={cn('font-semibold', completionRate >= 70 ? 'text-emerald-600' : completionRate >= 40 ? 'text-amber-600' : 'text-red-600')}>{completionRate}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', completionRate >= 70 ? 'bg-emerald-500' : completionRate >= 40 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${completionRate}%` }} />
                  </div>
                </div>
              )}
              {/* Visual Flow */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-2 border-t">
                {journey.nodes.map((node, idx) => (
                  <div key={node.id} className="flex items-center gap-1.5 shrink-0">
                    <div className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium', node.color)}>
                      {getNodeIcon(node.type)}
                      <span>{node.label}</span>
                    </div>
                    {idx < journey.nodes.length - 1 && (
                      <div className="flex items-center">
                        <div className="w-4 h-px bg-muted-foreground/30" />
                        <ArrowRight className="size-2.5 text-muted-foreground/50 shrink-0" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
      )}
      {selectedJourney && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{selectedJourney.name} - Flow Details</CardTitle>
              <Button variant="ghost" size="sm" className="h-7" onClick={() => setSelectedJourney(null)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="w-full">
              <div className="flex items-start gap-4 pb-4 min-w-max">
                {selectedJourney.nodes.map((node, idx) => (
                  <div key={node.id} className="flex items-start gap-3">
                    <div className={cn('flex flex-col items-center gap-1 p-3 rounded-lg border-2 min-w-[140px] transition-all', node.color)}>
                      {getNodeIcon(node.type)}
                      <span className="text-xs font-medium">{node.label}</span>
                      <span className="text-[9px] opacity-70 text-center">{node.config}</span>
                    </div>
                    {idx < selectedJourney.nodes.length - 1 && <ArrowRight className="size-4 text-muted-foreground shrink-0 mt-4" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Journey</DialogTitle>
            <DialogDescription>Set up a customer journey automation</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Journey Name *</Label>
              <Input placeholder="e.g., New Lead Onboarding" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select value={createForm.trigger} onValueChange={v => setCreateForm({ ...createForm, trigger: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div>
              <Label className="text-xs mb-2 block">Available Actions</Label>
              <div className="flex flex-wrap gap-2">
                {ACTION_TYPES.map(a => (
                  <Badge key={a} variant="outline" className="text-xs cursor-pointer hover:bg-emerald-50">{a}</Badge>
                ))}
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
