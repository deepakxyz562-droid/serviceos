'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Repeat, Plus, Search, Play, Pause, Clock, Zap, Target,
  MessageSquare, Settings, Trash2, Pencil, RefreshCw,
  TrendingUp, ToggleLeft,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/stat-card';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RetargetingRule {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfigJson: string;
  actionType: string;
  actionConfigJson: string;
  status: string;
  priority: number;
  cooldownHours: number;
  maxTriggers: number;
  triggersToday: number;
  totalTriggers: number;
  lastTriggered: string | null;
  tenantId: string | null;
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RuleForm {
  name: string;
  description: string;
  triggerType: string;
  triggerConfigJson: string;
  actionType: string;
  actionConfigJson: string;
  status: string;
  cooldownHours: number;
  maxTriggers: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TRIGGER_TYPES = [
  { value: 'no_booking_days', label: 'No Booking (X days)' },
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

const DEFAULT_FORM: RuleForm = {
  name: '',
  description: '',
  triggerType: 'no_booking_days',
  triggerConfigJson: '{"days": 30}',
  actionType: 'whatsapp_reminder',
  actionConfigJson: '{"message": ""}',
  status: 'active',
  cooldownHours: 24,
  maxTriggers: 3,
};

function formatRelativeTime(dateStr: string | null) {
  if (!dateStr) return 'Never';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '--';
  }
}

function getTriggerLabel(value: string) {
  return TRIGGER_TYPES.find(t => t.value === value)?.label || value;
}

function getActionLabel(value: string) {
  return ACTION_TYPES.find(a => a.value === value)?.label || value;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RetargetingView() {
  const [rules, setRules] = useState<RetargetingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<RetargetingRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<RetargetingRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [form, setForm] = useState<RuleForm>(DEFAULT_FORM);

  // ─── Fetch rules ────────────────────────────────────────────────────────
  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/retargeting-rules');
      if (res.ok) {
        const json = await res.json();
        setRules(Array.isArray(json) ? json : json.data || []);
      }
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // ─── Filtered list ──────────────────────────────────────────────────────
  const filteredRules = rules.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Toggle status ──────────────────────────────────────────────────────
  const handleToggleStatus = async (id: string) => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;
    setTogglingId(id);
    const newStatus = rule.status === 'active' ? 'paused' : 'active';
    try {
      const res = await authFetch(`/api/retargeting-rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Rule ${newStatus === 'active' ? 'activated' : 'paused'}`);
        fetchRules();
      } else {
        toast.error('Failed to update status');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setTogglingId(null);
    }
  };

  // ─── Create ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name) { toast.error('Rule name is required'); return; }
    setSaving(true);
    try {
      const res = await authFetch('/api/retargeting-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Retargeting rule created');
        setShowCreateDialog(false);
        setForm(DEFAULT_FORM);
        fetchRules();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create rule');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Edit ───────────────────────────────────────────────────────────────
  const openEdit = (rule: RetargetingRule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      description: rule.description || '',
      triggerType: rule.triggerType,
      triggerConfigJson: rule.triggerConfigJson || '{}',
      actionType: rule.actionType,
      actionConfigJson: rule.actionConfigJson || '{}',
      status: rule.status,
      cooldownHours: rule.cooldownHours,
      maxTriggers: rule.maxTriggers,
    });
    setShowEditDialog(true);
  };

  const handleEdit = async () => {
    if (!editingRule || !form.name) { toast.error('Rule name is required'); return; }
    setSaving(true);
    try {
      const res = await authFetch(`/api/retargeting-rules/${editingRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Rule updated');
        setShowEditDialog(false);
        setEditingRule(null);
        setForm(DEFAULT_FORM);
        fetchRules();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update rule');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────
  const openDelete = (rule: RetargetingRule) => {
    setDeletingRule(rule);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingRule) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/retargeting-rules/${deletingRule.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Rule deleted');
        setShowDeleteDialog(false);
        setDeletingRule(null);
        fetchRules();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete rule');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Stats ──────────────────────────────────────────────────────────────
  const activeRules = rules.filter(r => r.status === 'active').length;
  const totalTriggers = rules.reduce((s, r) => s + r.totalTriggers, 0);
  const triggersToday = rules.reduce((s, r) => s + r.triggersToday, 0);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <ViewHeader
        icon={Repeat}
        title="Retargeting"
        description="WhatsApp retargeting automation"
        action={
          <Button className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]" onClick={() => { setForm(DEFAULT_FORM); setShowCreateDialog(true); }}>
            <Plus className="size-4 mr-1.5" /> Create Rule
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard label="Total Rules" value={rules.length} icon={Settings} />
        <StatCard label="Active" value={activeRules} icon={Play} color="text-emerald-600" />
        <StatCard label="Total Triggers" value={totalTriggers.toLocaleString()} icon={Zap} color="text-orange-600" />
        <StatCard label="Triggers Today" value={triggersToday.toLocaleString()} icon={TrendingUp} color="text-green-600" />
      </div>

      {/* Search + Refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search rules..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchRules()}>
          <RefreshCw className="size-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRules.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No retargeting rules found"
          description={search ? 'Try adjusting your search' : 'Create your first retargeting rule to automate WhatsApp outreach'}
          actionLabel={!search ? 'Create Rule' : undefined}
          onAction={!search ? () => { setForm(DEFAULT_FORM); setShowCreateDialog(true); } : undefined}
        />
      ) : (
        /* Rules List */
        <div className="space-y-4">
          {filteredRules.map(rule => {
            let triggerConfig: Record<string, unknown> = {};
            let actionConfig: Record<string, unknown> = {};
            try { triggerConfig = JSON.parse(rule.triggerConfigJson || '{}'); } catch { /* ignore */ }
            try { actionConfig = JSON.parse(rule.actionConfigJson || '{}'); } catch { /* ignore */ }

            return (
              <Card key={rule.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title + Status */}
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{rule.name}</h4>
                        <Badge variant="outline" className={cn(
                          'text-[10px]',
                          rule.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          rule.status === 'paused' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        )}>
                          {rule.status === 'active' && (
                            <span className="relative flex size-1.5 mr-1">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" />
                            </span>
                          )}
                          {rule.status}
                        </Badge>
                      </div>

                      {/* Description */}
                      {rule.description && (
                        <p className="text-xs text-muted-foreground mb-2">{rule.description}</p>
                      )}

                      {/* Trigger + Action type badges */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Target className="size-3 text-orange-500" />
                          {getTriggerLabel(rule.triggerType)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="size-3 text-emerald-500" />
                          {getActionLabel(rule.actionType)}
                        </span>
                      </div>

                      {/* Config preview */}
                      <div className="bg-muted/50 rounded-lg p-2 text-xs text-muted-foreground mb-2 space-y-1">
                        <div><span className="font-medium">Trigger:</span> {JSON.stringify(triggerConfig).slice(0, 80)}</div>
                        <div><span className="font-medium">Action:</span> {typeof actionConfig.message === 'string' ? actionConfig.message.slice(0, 80) : JSON.stringify(actionConfig).slice(0, 80)}</div>
                      </div>

                      {/* Cooldown + Max Triggers + Last Triggered */}
                      <div className="flex items-center gap-4 text-xs flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          Cooldown: {rule.cooldownHours}h
                        </span>
                        <span>Max: {rule.maxTriggers} triggers/customer</span>
                        <span>Last: {formatRelativeTime(rule.lastTriggered)}</span>
                      </div>
                    </div>

                    {/* Right side: stats + actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div>
                          <p className="text-sm font-bold text-orange-600">{rule.totalTriggers}</p>
                          <p className="text-[9px] text-muted-foreground">Total</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-emerald-600">{rule.triggersToday}</p>
                          <p className="text-[9px] text-muted-foreground">Today</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleToggleStatus(rule.id)}
                          disabled={togglingId === rule.id}
                        >
                          {togglingId === rule.id ? (
                            <RefreshCw className="size-3 mr-1 animate-spin" />
                          ) : rule.status === 'active' ? (
                            <><Pause className="size-3 mr-1" />Pause</>
                          ) : (
                            <><Play className="size-3 mr-1" />Activate</>
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(rule)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => openDelete(rule)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
              <Input placeholder="e.g., Win-back Inactive Customers" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="What does this rule do?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select value={form.triggerType} onValueChange={v => setForm({ ...form, triggerType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trigger Configuration (JSON)</Label>
              <Textarea placeholder='{"days": 30}' value={form.triggerConfigJson} onChange={e => setForm({ ...form, triggerConfigJson: e.target.value })} rows={2} className="font-mono text-xs" />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select value={form.actionType} onValueChange={v => setForm({ ...form, actionType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action Configuration (JSON)</Label>
              <Textarea
                placeholder='{"message": "Hey {{name}}, we miss you!"}'
                value={form.actionConfigJson}
                onChange={e => setForm({ ...form, actionConfigJson: e.target.value })}
                rows={3}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Use {'{{name}}'}, {'{{invoice_id}}'}, {'{{link}}'} as placeholders</p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cooldown (hours)</Label>
                <Input type="number" value={form.cooldownHours} onChange={e => setForm({ ...form, cooldownHours: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Max Triggers / Customer</Label>
                <Input type="number" value={form.maxTriggers} onChange={e => setForm({ ...form, maxTriggers: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Initial Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!form.name || saving}>
              {saving ? 'Creating...' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Retargeting Rule</DialogTitle>
            <DialogDescription>Update rule configuration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select value={form.triggerType} onValueChange={v => setForm({ ...form, triggerType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trigger Configuration (JSON)</Label>
              <Textarea value={form.triggerConfigJson} onChange={e => setForm({ ...form, triggerConfigJson: e.target.value })} rows={2} className="font-mono text-xs" />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select value={form.actionType} onValueChange={v => setForm({ ...form, actionType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action Configuration (JSON)</Label>
              <Textarea value={form.actionConfigJson} onChange={e => setForm({ ...form, actionConfigJson: e.target.value })} rows={3} className="font-mono text-xs" />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cooldown (hours)</Label>
                <Input type="number" value={form.cooldownHours} onChange={e => setForm({ ...form, cooldownHours: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Max Triggers / Customer</Label>
                <Input type="number" value={form.maxTriggers} onChange={e => setForm({ ...form, maxTriggers: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEdit} disabled={!form.name || saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Retargeting Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingRule?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
