'use client';

// ─────────────────────────────────────────────────────────────────────────────
// TenantsTab — Workspaces management (list, search, filter, suspend/reactivate,
// delete, edit plan, create, edit credits).
//
// Extracted from `superadmin-view.tsx` so it's a stable module-level component
// — no more unmount/remount on parent re-render. All data + handlers arrive
// via props.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Search, Loader2, Eye, Ban, PlayCircle, Pause, Trash2, Edit3, Wallet,
  Plus, Building2, CheckCircle2, Mail,
} from 'lucide-react';

import {
  TableSkeleton, EmptyState, formatDate, formatDateTime,
  getStatusBadgeClasses, getPlanBadgeClasses,
} from '@/components/views/superadmin/_shared';
import type { Tenant, CreditInfo } from '@/components/views/superadmin/types';
import { OutreachSendDialog } from './outreach-send-dialog';

export interface TenantsTabProps {
  tenants: Tenant[];
  tenantsLoading: boolean;
  creditsData: CreditInfo[];
  /** Currency formatter from `useCompanyCurrency().format`. */
  format: (amount: number, sourceCurrency?: string) => string;
  /** Refetch tenants list (e.g. after suspend/reactivate/delete/create). */
  refetchTenants: () => void;
  /** Re-pull credits for all tenants (used after a credit edit). */
  fetchAllCredits: () => void;
}

export function TenantsTab({
  tenants, tenantsLoading, creditsData, format, refetchTenants, fetchAllCredits,
}: TenantsTabProps) {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [suspendDialog, setSuspendDialog] = useState<{ tenant: Tenant; action: 'suspend' | 'reactivate' | 'delete' } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null);
  const [editPlanDialog, setEditPlanDialog] = useState<Tenant | null>(null);
  const [newPlan, setNewPlan] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [newTenantForm, setNewTenantForm] = useState({ name: '', email: '', plan: 'starter', ownerName: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [creditEditTenant, setCreditEditTenant] = useState<CreditInfo | null>(null);
  const [creditEditForm, setCreditEditForm] = useState({
    trialWhatsappCredits: 10,
    platformWhatsappEnabled: true,
    ownWhatsappConnected: false,
    ownEmailProviderConnected: false,
  });
  const [creditSaving, setCreditSaving] = useState(false);
  const [sendDialogTenant, setSendDialogTenant] = useState<Tenant | null>(null);

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase());
      const matchesPlan = planFilter === 'all' || t.plan === planFilter;
      const matchesStatus = statusFilter === 'all' || t.planStatus === statusFilter || (statusFilter === 'suspended' && t.suspendedAt);
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [tenants, search, planFilter, statusFilter]);

  const handleAction = async () => {
    if (!suspendDialog) return;
    if (suspendDialog.action === 'suspend' && !suspendReason.trim()) {
      toast.error('Please provide a reason for suspension');
      return;
    }
    setSaving(true);
    try {
      const endpoint = `/api/superadmin/tenants/${suspendDialog.tenant.id}`;
      const method = suspendDialog.action === 'delete' ? 'DELETE' : 'PATCH';
      const body = suspendDialog.action === 'suspend'
        ? { status: 'suspended', reason: suspendReason.trim() }
        : suspendDialog.action === 'reactivate'
        ? { status: 'active' }
        : undefined;

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) {
        toast.success(`Tenant ${suspendDialog.action === 'delete' ? 'deleted' : suspendDialog.action === 'suspend' ? 'suspended' : 'reactivated'} successfully`);
        refetchTenants();
      } else {
        const data = await res.json();
        toast.error(data.error || `Failed to ${suspendDialog.action} tenant`);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
      setSuspendDialog(null);
      setSuspendReason('');
    }
  };

  const handleEditPlan = async () => {
    if (!editPlanDialog || !newPlan) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/tenants/${editPlanDialog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      });
      if (res.ok) {
        toast.success(`Plan updated to ${newPlan}`);
        refetchTenants();
      } else {
        toast.error('Failed to update plan');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
      setEditPlanDialog(null);
    }
  };

  const handleCreateTenant = async () => {
    if (!newTenantForm.name.trim() || !newTenantForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/superadmin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTenantForm),
      });
      if (res.ok) {
        toast.success('Tenant created successfully');
        setCreateDialog(false);
        setNewTenantForm({ name: '', email: '', plan: 'starter', ownerName: '', password: '' });
        refetchTenants();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create tenant');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setCreating(false);
    }
  };

  const handleCreditEdit = (tenant: Tenant) => {
    const existing = creditsData.find((c) => c.tenantId === tenant.id);
    const creditInfo: CreditInfo = existing ?? {
      tenantId: tenant.id, tenantName: tenant.name, plan: tenant.plan,
      trialWhatsappCredits: 10, trialWhatsappUsed: 0,
      platformWhatsappEnabled: true, ownWhatsappConnected: false, ownEmailProviderConnected: false,
    };
    setCreditEditTenant(creditInfo);
    setCreditEditForm({
      trialWhatsappCredits: creditInfo.trialWhatsappCredits,
      platformWhatsappEnabled: creditInfo.platformWhatsappEnabled,
      ownWhatsappConnected: creditInfo.ownWhatsappConnected,
      ownEmailProviderConnected: creditInfo.ownEmailProviderConnected,
    });
  };

  const handleCreditSave = async () => {
    if (!creditEditTenant) return;
    setCreditSaving(true);
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: creditEditTenant.tenantId, ...creditEditForm }),
      });
      if (res.ok) {
        toast.success('Credit settings updated');
        setCreditEditTenant(null);
        fetchAllCredits();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update credit settings');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setCreditSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search, Filters, Create */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants by name or email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Plan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="growth">Growth</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateDialog(true)} className="shrink-0">
          <Plus className="size-4 mr-1.5" /> New Tenant
        </Button>
      </div>

      {/* Table */}
      {tenantsLoading ? <TableSkeleton /> : filteredTenants.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No tenants found"
          subtitle="Try adjusting your filters, or create a new tenant to get started."
          action={<Button onClick={() => setCreateDialog(true)}><Plus className="size-4 mr-1.5" /> New Tenant</Button>}
        />
      ) : (
        <Card className="card-shadow">
          <ScrollArea className="max-h-[calc(100vh-320px)]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">WA Credits</TableHead>
                  <TableHead className="text-center">Email</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => {
                  const tenantCredit = creditsData.find((c) => c.tenantId === tenant.id);
                  const isPaidWithOwnWhatsApp = tenantCredit && tenantCredit.plan !== 'trial' && tenantCredit.ownWhatsappConnected;
                  return (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="size-3.5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate">{tenant.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{tenant.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('capitalize text-[10px]', getPlanBadgeClasses(tenant.plan))}>
                          {tenant.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('capitalize text-[10px]', getStatusBadgeClasses(tenant.planStatus))}>
                          {tenant.planStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {isPaidWithOwnWhatsApp ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">Unlimited</Badge>
                        ) : tenantCredit ? (
                          <span className="text-xs text-muted-foreground">{tenantCredit.trialWhatsappUsed}/{tenantCredit.trialWhatsappCredits}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {tenantCredit?.ownEmailProviderConnected ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">Own</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Platform</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-foreground">{format(tenant.mrr)}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{tenant.userCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setViewTenant(tenant)} title="View">
                            <Eye className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditPlanDialog(tenant); setNewPlan(tenant.plan); }} title="Edit Plan">
                            <Edit3 className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleCreditEdit(tenant)} title="Credits">
                            <Wallet className="size-3.5" />
                          </Button>
                          {tenant.planStatus === 'suspended' ? (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700" onClick={() => setSuspendDialog({ tenant, action: 'reactivate' })} title="Reactivate">
                              <PlayCircle className="size-3.5" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700" onClick={() => { setSuspendReason(''); setSuspendDialog({ tenant, action: 'suspend' }); }} title="Suspend">
                              <Pause className="size-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700" onClick={() => setSuspendDialog({ tenant, action: 'delete' })} title="Delete">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* View Tenant Dialog */}
      <Dialog open={!!viewTenant} onOpenChange={(open) => { if (!open) setViewTenant(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" /> {viewTenant?.name}
            </DialogTitle>
            <DialogDescription>Tenant details</DialogDescription>
          </DialogHeader>
          {viewTenant && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><Label className="text-muted-foreground text-xs">Email</Label><p className="text-foreground">{viewTenant.email || '—'}</p></div>
              <div><Label className="text-muted-foreground text-xs">Phone</Label><p className="text-foreground">{viewTenant.phone || '—'}</p></div>
              <div><Label className="text-muted-foreground text-xs">Plan</Label><Badge variant="outline" className={cn('capitalize', getPlanBadgeClasses(viewTenant.plan))}>{viewTenant.plan}</Badge></div>
              <div><Label className="text-muted-foreground text-xs">Status</Label><Badge variant="outline" className={cn('capitalize', getStatusBadgeClasses(viewTenant.planStatus))}>{viewTenant.planStatus}</Badge></div>
              <div><Label className="text-muted-foreground text-xs">Industry</Label><p className="text-foreground">{viewTenant.industry || '—'}</p></div>
              <div><Label className="text-muted-foreground text-xs">Country</Label><p className="text-foreground">{viewTenant.country || '—'}</p></div>
              <div><Label className="text-muted-foreground text-xs">Currency</Label><p className="text-foreground">{viewTenant.currency || '—'}</p></div>
              <div><Label className="text-muted-foreground text-xs">Users</Label><p className="text-foreground">{viewTenant.userCount}</p></div>
              <div><Label className="text-muted-foreground text-xs">MRR</Label><p className="text-foreground">{format(viewTenant.mrr)}</p></div>
              <div><Label className="text-muted-foreground text-xs">ARR</Label><p className="text-foreground">{format(viewTenant.arr)}</p></div>
              <div><Label className="text-muted-foreground text-xs">Created</Label><p className="text-foreground">{formatDate(viewTenant.createdAt)}</p></div>
              <div><Label className="text-muted-foreground text-xs">Onboarding</Label><p className="text-foreground">{viewTenant.onboardingCompleted ? 'Completed' : 'Pending'}</p></div>
              {viewTenant.suspendedAt && (
                <div className="col-span-2"><Label className="text-muted-foreground text-xs">Suspended</Label><p className="text-red-600 dark:text-red-400 text-xs">{formatDateTime(viewTenant.suspendedAt)} — {viewTenant.suspensionReason || 'No reason'}</p></div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {viewTenant && (
              <Button
                variant="default"
                onClick={() => setSendDialogTenant(viewTenant)}
                disabled={!viewTenant.email}
                title={viewTenant.email ? 'Send outreach email' : 'No email on file'}
              >
                <Mail className="size-4 mr-1" /> Send Email
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewTenant(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend/Reactivate/Delete Dialog */}
      <Dialog open={!!suspendDialog} onOpenChange={(open) => { if (!open) { setSuspendDialog(null); setSuspendReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {suspendDialog?.action === 'suspend' ? <Pause className="size-5 text-amber-500" /> :
               suspendDialog?.action === 'delete' ? <Trash2 className="size-5 text-red-500" /> :
               <PlayCircle className="size-5 text-emerald-500" />}
              {suspendDialog?.action === 'suspend' ? 'Suspend Tenant' : suspendDialog?.action === 'delete' ? 'Delete Tenant' : 'Reactivate Tenant'}
            </DialogTitle>
            <DialogDescription>
              {suspendDialog?.action === 'delete'
                ? `This will permanently delete "${suspendDialog?.tenant.name}" and all its data. This cannot be undone.`
                : suspendDialog?.action === 'suspend'
                ? `This will block access for "${suspendDialog?.tenant.name}".`
                : `This will restore access for "${suspendDialog?.tenant.name}".`}
            </DialogDescription>
          </DialogHeader>
          {suspendDialog?.action === 'suspend' && (
            <div className="space-y-2">
              <Label>Reason for suspension</Label>
              <Textarea
                placeholder="e.g. Payment failure, policy violation..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setSuspendDialog(null); setSuspendReason(''); }}>Cancel</Button>
            <Button
              variant={suspendDialog?.action === 'reactivate' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={saving || (suspendDialog?.action === 'suspend' && !suspendReason.trim())}
            >
              {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
              {suspendDialog?.action === 'suspend' ? 'Suspend' : suspendDialog?.action === 'delete' ? 'Delete' : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editPlanDialog} onOpenChange={(open) => { if (!open) setEditPlanDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit3 className="size-5 text-primary" /> Change Plan</DialogTitle>
            <DialogDescription>Update the plan for {editPlanDialog?.name}</DialogDescription>
          </DialogHeader>
          <Select value={newPlan} onValueChange={setNewPlan}>
            <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditPlanDialog(null)}>Cancel</Button>
            <Button onClick={handleEditPlan} disabled={saving || !newPlan}>
              {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null} Update Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Tenant Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="size-5 text-primary" /> Create New Tenant</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Company Name *</Label><Input className="mt-1" value={newTenantForm.name} onChange={(e) => setNewTenantForm((p) => ({ ...p, name: e.target.value }))} placeholder="Acme Corp" /></div>
            <div><Label>Owner Email *</Label><Input className="mt-1" type="email" value={newTenantForm.email} onChange={(e) => setNewTenantForm((p) => ({ ...p, email: e.target.value }))} placeholder="admin@acme.com" /></div>
            <div><Label>Owner Name</Label><Input className="mt-1" value={newTenantForm.ownerName} onChange={(e) => setNewTenantForm((p) => ({ ...p, ownerName: e.target.value }))} placeholder="John Doe" /></div>
            <div><Label>Password</Label><Input className="mt-1" type="password" value={newTenantForm.password} onChange={(e) => setNewTenantForm((p) => ({ ...p, password: e.target.value }))} placeholder="••••••••" /></div>
            <div><Label>Plan</Label>
              <Select value={newTenantForm.plan} onValueChange={(v) => setNewTenantForm((p) => ({ ...p, plan: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateTenant} disabled={creating || !newTenantForm.name.trim() || !newTenantForm.email.trim()}>
              {creating ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Plus className="size-4 mr-1.5" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Edit Dialog */}
      <Dialog open={!!creditEditTenant} onOpenChange={(open) => { if (!open) setCreditEditTenant(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wallet className="size-5 text-primary" /> Edit Credit Settings</DialogTitle>
            <DialogDescription>Manage credits for {creditEditTenant?.tenantName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Trial WhatsApp Credits</Label>
              <Input
                type="number" min={0}
                value={creditEditForm.trialWhatsappCredits}
                onChange={(e) => setCreditEditForm((p) => ({ ...p, trialWhatsappCredits: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-[11px] text-muted-foreground">Current usage: {creditEditTenant?.trialWhatsappUsed ?? 0} credits used</p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Platform WhatsApp</Label>
                <p className="text-[11px] text-muted-foreground">Enable platform-provided WhatsApp</p>
              </div>
              <Switch checked={creditEditForm.platformWhatsappEnabled} onCheckedChange={(checked) => setCreditEditForm((p) => ({ ...p, platformWhatsappEnabled: checked }))} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Own WhatsApp Connected</Label>
                <p className="text-[11px] text-muted-foreground">Tenant has connected their own WhatsApp</p>
              </div>
              <Switch checked={creditEditForm.ownWhatsappConnected} onCheckedChange={(checked) => setCreditEditForm((p) => ({ ...p, ownWhatsappConnected: checked }))} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Own Email Provider</Label>
                <p className="text-[11px] text-muted-foreground">Tenant has connected their own email provider</p>
              </div>
              <Switch checked={creditEditForm.ownEmailProviderConnected} onCheckedChange={(checked) => setCreditEditForm((p) => ({ ...p, ownEmailProviderConnected: checked }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreditEditTenant(null)}>Cancel</Button>
            <Button onClick={handleCreditSave} disabled={creditSaving}>
              {creditSaving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="size-4 mr-1.5" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outreach Send Email Dialog (opened from the View Tenant footer) */}
      <OutreachSendDialog
        open={!!sendDialogTenant}
        onOpenChange={(open) => { if (!open) setSendDialogTenant(null) }}
        tenantId={sendDialogTenant?.id || ''}
        tenantName={sendDialogTenant?.name || ''}
        tenantEmail={sendDialogTenant?.email || null}
        tenantClaimed={sendDialogTenant?.claimed || false}
        onSent={refetchTenants}
      />
    </div>
  );
}
