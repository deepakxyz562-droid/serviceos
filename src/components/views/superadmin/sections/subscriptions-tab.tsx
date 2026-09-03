'use client';

// ─────────────────────────────────────────────────────────────────────────────
// SubscriptionsTab — list, filter, pause/resume/cancel/change-plan actions.
//
// Extracted from `superadmin-view.tsx` so it's a stable module-level component
// — no more unmount/remount on parent re-render. All data + handlers arrive
// via props.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { DataTable, type Column } from '@/components/ui/data-table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2, XCircle, Clock, Pause, PlayCircle, Edit3,
  BarChart3, Filter, Loader2, CreditCard,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

import {
  KpiCard,
  getStatusBadgeClasses, getPlanBadgeClasses,
} from '@/components/views/superadmin/_shared';
import type { Subscription } from '@/components/views/superadmin/types';

export interface SubscriptionsTabProps {
  subscriptions: Subscription[];
  subsLoading: boolean;
  /** Currency formatter from `useCompanyCurrency().format`. */
  format: (amount: number, sourceCurrency?: string) => string;
}

export function SubscriptionsTab({ subscriptions, subsLoading, format }: SubscriptionsTabProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionDialog, setActionDialog] = useState<{ sub: Subscription; action: 'pause' | 'resume' | 'cancel' | 'change_plan' } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [newPlan, setNewPlan] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredSubs = useMemo(() => {
    if (statusFilter === 'all') return subscriptions;
    return subscriptions.filter((s) => s.status === statusFilter);
  }, [subscriptions, statusFilter]);

  const planDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    subscriptions.forEach((s) => { dist[s.plan] = (dist[s.plan] || 0) + 1; });
    return dist;
  }, [subscriptions]);

  const totalSubs = subscriptions.length;
  const maxDist = Math.max(...Object.values(planDistribution), 1);

  const planChartColors: Record<string, string> = {
    trial: 'oklch(0.7 0 0)',
    starter: 'oklch(0.6 0.15 245)',
    growth: 'oklch(0.696 0.17 162.48)',
    pro: 'oklch(0.6 0.118 184.704)',
    enterprise: 'oklch(0.55 0.2 303)',
  };

  const handleAction = async () => {
    if (!actionDialog) return;
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: actionDialog.sub.id,
          action: actionDialog.action,
          reason: actionReason.trim() || undefined,
          newPlan: actionDialog.action === 'change_plan' ? newPlan : undefined,
        }),
      });
      if (res.ok) {
        toast.success(`Subscription ${actionDialog.action === 'pause' ? 'paused' : actionDialog.action === 'resume' ? 'resumed' : actionDialog.action === 'cancel' ? 'cancelled' : 'updated'} successfully`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update subscription');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
      setActionDialog(null);
      setActionReason('');
      setNewPlan('');
    }
  };

  const subscriptionColumns: Column<Subscription>[] = [
    { key: 'tenant', header: 'Tenant', render: (s) => <span className="font-medium text-foreground">{s.tenantName}</span> },
    { key: 'plan', header: 'Plan', render: (s) => <Badge variant="outline" className={cn('capitalize text-[10px]', getPlanBadgeClasses(s.plan))}>{s.plan}</Badge> },
    { key: 'status', header: 'Status', render: (s) => <Badge variant="outline" className={cn('capitalize text-[10px]', getStatusBadgeClasses(s.status))}>{s.status}</Badge> },
    { key: 'amount', header: 'Amount', render: (s) => <span className="text-right text-foreground block">{format(s.amount)}</span>, className: 'text-right' },
    {
      key: 'actions', header: 'Actions', render: (s) => (
        <div className="flex items-center justify-end gap-0.5">
          {s.status === 'active' && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700" onClick={() => { setActionReason(''); setActionDialog({ sub: s, action: 'pause' }); }} title="Pause">
              <Pause className="size-3.5" />
            </Button>
          )}
          {s.status === 'paused' && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700" onClick={() => setActionDialog({ sub: s, action: 'resume' })} title="Resume">
              <PlayCircle className="size-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-sky-600 hover:text-sky-700" onClick={() => { setNewPlan(s.plan); setActionDialog({ sub: s, action: 'change_plan' }); }} title="Change Plan">
            <Edit3 className="size-3.5" />
          </Button>
          {s.status !== 'cancelled' && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700" onClick={() => { setActionReason(''); setActionDialog({ sub: s, action: 'cancel' }); }} title="Cancel">
              <XCircle className="size-3.5" />
            </Button>
          )}
        </div>
      ), className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active', value: subscriptions.filter((s) => s.status === 'active').length, icon: CheckCircle2, color: 'emerald' as const },
          { label: 'Trial', value: subscriptions.filter((s) => s.status === 'trial').length, icon: Clock, color: 'amber' as const },
          { label: 'Paused', value: subscriptions.filter((s) => s.status === 'paused').length, icon: Pause, color: 'sky' as const },
          { label: 'Cancelled', value: subscriptions.filter((s) => s.status === 'cancelled').length, icon: XCircle, color: 'red' as const },
        ].map((stat) => <KpiCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} color={stat.color} />)}
      </div>

      {/* Plan Distribution + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              Plan Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={Object.entries(planDistribution).map(([plan, count]) => ({ plan, count }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.928 0.005 256)" strokeOpacity={0.5} />
                <XAxis dataKey="plan" tick={{ fontSize: 10, fill: 'oklch(0.55 0.015 256)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'oklch(0.55 0.015 256)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'oklch(1 0 0)', border: '1px solid oklch(0.928 0.005 256)', borderRadius: '0.5rem', fontSize: '12px' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {Object.entries(planDistribution).map(([plan]) => (
                    <Cell key={plan} fill={planChartColors[plan] || 'oklch(0.696 0.17 162.48)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-shadow lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">All Subscriptions</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">{filteredSubs.length} found</CardDescription>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] text-xs">
                  <Filter className="size-3 mr-1" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={subscriptionColumns}
              data={filteredSubs}
              rowKey={(s) => s.id}
              loading={subsLoading}
              emptyMessage="No subscriptions found"
              emptyIcon={CreditCard}
              className="max-h-80"
            />
          </CardContent>
        </Card>
      </div>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => { if (!open) { setActionDialog(null); setActionReason(''); setNewPlan(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === 'pause' ? 'Pause Subscription' :
               actionDialog?.action === 'resume' ? 'Resume Subscription' :
               actionDialog?.action === 'cancel' ? 'Cancel Subscription' : 'Change Plan'}
            </DialogTitle>
            <DialogDescription>{actionDialog?.sub.tenantName} — {actionDialog?.sub.plan} plan</DialogDescription>
          </DialogHeader>
          {actionDialog?.action === 'change_plan' ? (
            <Select value={newPlan} onValueChange={setNewPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          ) : (actionDialog?.action === 'pause' || actionDialog?.action === 'cancel') ? (
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea placeholder="e.g. Customer request, payment issue..." value={actionReason} onChange={(e) => setActionReason(e.target.value)} rows={3} />
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setActionDialog(null); setActionReason(''); setNewPlan(''); }}>Cancel</Button>
            <Button
              variant={actionDialog?.action === 'resume' ? 'default' : actionDialog?.action === 'change_plan' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={saving || (actionDialog?.action === 'change_plan' && !newPlan)}
            >
              {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
