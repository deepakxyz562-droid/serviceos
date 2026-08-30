'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Plan Catalog — superadmin CRUD UI for the Plan table.
//
// Lists every plan (active + inactive) sorted by sortOrder, with KPI cards,
// a table view, and a create/edit dialog covering all Plan fields grouped
// into Pricing / Limits / Features & Marketplace sections.
//
// - Fetches `/api/superadmin/plans` on mount (TanStack Query).
// - Create → POST /api/superadmin/plans.
// - Update → PUT /api/superadmin/plans/[id].
// - Delete → DELETE /api/superadmin/plans/[id] (hard-delete; 409 if a
//   Subscription still references the plan code).
// - All mutations invalidate the `['superadmin-plans']` query key.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Tags,
  Plus,
  Pencil,
  Trash2,
  Star,
  Loader2,
  AlertCircle,
  Package,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { DataTable, type Column } from '@/components/ui/data-table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SectionHeader, KpiCard, EmptyState, KPISkeleton,
  getPlanBadgeClasses, formatCurrency,
} from '@/components/views/superadmin/_shared';
import { authFetch } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  originalMonthlyPrice: number;
  originalYearlyPrice: number;
  discountBadge: string | null;
  currency: string;
  maxUsers: number;
  maxJobs: number;
  maxWorkflows: number;
  aiQuota: number;
  whatsappQuota: number;
  emailQuota: number;
  smsQuota: number;
  storageQuotaMb: number;
  featuresJson: string;
  limitsJson: string;
  isAddon: boolean;
  parentPlanCode: string | null;
  marketplaceAccess: string;
  popular: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface PlansResponse { plans: Plan[] }
interface PlanResponse { plan: Plan }

type MarketplaceAccess = 'none' | 'browse_only' | 'receive_bookings' | 'priority';

const MARKETPLACE_ACCESS_LABELS: Record<MarketplaceAccess, string> = {
  none: 'None',
  browse_only: 'Browse only',
  receive_bookings: 'Receive bookings',
  priority: 'Priority',
};

// Empty form state — used when opening the "Create Plan" dialog.
const EMPTY_FORM: PlanFormState = {
  code: '',
  name: '',
  description: '',
  monthlyPrice: '0',
  yearlyPrice: '0',
  originalMonthlyPrice: '0',
  originalYearlyPrice: '0',
  discountBadge: '',
  currency: 'USD',
  maxUsers: '1',
  maxJobs: '100',
  maxWorkflows: '10',
  aiQuota: '100',
  whatsappQuota: '1000',
  emailQuota: '5000',
  smsQuota: '500',
  storageQuotaMb: '1024',
  featuresJson: '{}',
  limitsJson: '{}',
  isAddon: false,
  parentPlanCode: '',
  marketplaceAccess: 'none',
  popular: false,
  isActive: true,
  sortOrder: '0',
};

interface PlanFormState {
  code: string;
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  originalMonthlyPrice: string;
  originalYearlyPrice: string;
  discountBadge: string;
  currency: string;
  maxUsers: string;
  maxJobs: string;
  maxWorkflows: string;
  aiQuota: string;
  whatsappQuota: string;
  emailQuota: string;
  smsQuota: string;
  storageQuotaMb: string;
  featuresJson: string;
  limitsJson: string;
  isAddon: boolean;
  parentPlanCode: string;
  marketplaceAccess: MarketplaceAccess;
  popular: boolean;
  isActive: boolean;
  sortOrder: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PlanCatalogSection() {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['superadmin-plans'] as const, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<Plan[]>({
    queryKey,
    queryFn: async () => {
      const res = await authFetch('/api/superadmin/plans');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Failed to load plans');
      }
      const body = (await res.json()) as PlansResponse;
      return body.plans;
    },
    staleTime: 30_000,
  });

  const plans = data ?? [];

  // Create mutation.
  const createMutation = useMutation({
    mutationFn: async (payload: PlanFormState) => {
      const res = await authFetch('/api/superadmin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload(payload)),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as { error?: string }).error || 'Failed to create plan');
      }
      return body as PlanResponse;
    },
    onSuccess: () => {
      toast.success('Plan created');
      void queryClient.invalidateQueries({ queryKey });
      setDialogOpen(false);
    },
    onError: (err) => {
      toast.error('Create failed', { description: err instanceof Error ? err.message : 'Unknown error' });
    },
  });

  // Update mutation.
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: PlanFormState }) => {
      const res = await authFetch(`/api/superadmin/plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload(payload)),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as { error?: string }).error || 'Failed to update plan');
      }
      return body as PlanResponse;
    },
    onSuccess: () => {
      toast.success('Plan updated');
      void queryClient.invalidateQueries({ queryKey });
      setDialogOpen(false);
    },
    onError: (err) => {
      toast.error('Update failed', { description: err instanceof Error ? err.message : 'Unknown error' });
    },
  });

  // Delete mutation.
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/superadmin/plans/${id}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as { error?: string }).error || 'Failed to delete plan');
      }
      return body;
    },
    onSuccess: () => {
      toast.success('Plan deleted');
      void queryClient.invalidateQueries({ queryKey });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error('Delete failed', { description: err instanceof Error ? err.message : 'Unknown error' });
    },
  });

  // Inline toggle for `isActive` (no dialog).
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await authFetch(`/api/superadmin/plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as { error?: string }).error || 'Failed to toggle plan');
      }
      return body as PlanResponse;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      toast.error('Toggle failed', { description: err instanceof Error ? err.message : 'Unknown error' });
    },
  });

  // ─── Dialog helpers ──────────────────────────────────────────────────────
  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditingId(plan.id);
    setForm(planToForm(plan));
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: form });
    } else {
      createMutation.mutate(form);
    }
  }

  // ─── Derived KPI values ──────────────────────────────────────────────────
  const totalPlans = plans.length;
  const activePlans = plans.filter((p) => p.isActive).length;
  const addonsCount = plans.filter((p) => p.isAddon).length;
  const monthlyRevenuePotential = plans
    .filter((p) => p.isActive && !p.isAddon && p.monthlyPrice > 0)
    .reduce((sum, p) => sum + p.monthlyPrice, 0);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Update a single field on the form state.
  function setField<K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const planColumns: Column<Plan>[] = [
    {
      key: 'name', header: 'Name', render: (plan) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{plan.name}</span>
            {plan.isAddon && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Add-on</Badge>
            )}
          </div>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 w-fit ${getPlanBadgeClasses(plan.code)}`}>
            {plan.code}
          </Badge>
          {plan.discountBadge && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">{plan.discountBadge}</span>
          )}
        </div>
      ), className: 'min-w-[200px]',
    },
    {
      key: 'monthly', header: 'Monthly', render: (plan) => (
        <PriceCell price={plan.monthlyPrice} original={plan.originalMonthlyPrice} currency={plan.currency} />
      ), className: 'min-w-[140px]',
    },
    {
      key: 'yearly', header: 'Yearly', render: (plan) => (
        <PriceCell price={plan.yearlyPrice} original={plan.originalYearlyPrice} currency={plan.currency} />
      ), className: 'min-w-[120px]',
    },
    { key: 'users', header: 'Users', render: (plan) => <span className="text-sm">{formatInt(plan.maxUsers)}</span>, className: 'text-center' },
    { key: 'jobs', header: 'Jobs', render: (plan) => <span className="text-sm">{formatInt(plan.maxJobs)}</span>, className: 'text-center' },
    {
      key: 'marketplace', header: 'Marketplace', render: (plan) => (
        <span className="text-xs capitalize">
          {MARKETPLACE_ACCESS_LABELS[plan.marketplaceAccess as MarketplaceAccess] || plan.marketplaceAccess}
        </span>
      ), className: 'min-w-[140px]',
    },
    {
      key: 'popular', header: 'Popular', render: (plan) => (
        plan.popular ? <Star className="size-4 text-amber-500 fill-amber-500 inline" /> : <span className="text-muted-foreground">—</span>
      ), className: 'text-center',
    },
    {
      key: 'active', header: 'Active', render: (plan) => (
        <div className="flex items-center justify-center">
          <Switch
            checked={plan.isActive}
            disabled={toggleActiveMutation.isPending}
            onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: plan.id, isActive: checked })}
            aria-label={`Toggle active for ${plan.name}`}
          />
        </div>
      ), className: 'text-center',
    },
    {
      key: 'actions', header: 'Actions', render: (plan) => (
        <div className="text-right">
          <div className="inline-flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => openEdit(plan)} aria-label={`Edit ${plan.name}`}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(plan)}
              aria-label={`Delete ${plan.name}`}
              className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ), className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <SectionHeader
        title="Plan Catalog"
        description="Manage pricing, limits, and feature flags for each subscription tier."
        icon={Tags}
        actions={
          <Button onClick={openCreate} size="sm">
            <Plus className="size-4 mr-2" />
            Create Plan
          </Button>
        }
      />

      {/* KPI cards */}
      {isLoading ? (
        <KPISkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Plans"
            value={totalPlans}
            icon={Tags}
            color="sky"
            sub="Includes inactive"
          />
          <KpiCard
            label="Active Plans"
            value={activePlans}
            icon={CheckCircle2}
            color="emerald"
            sub={`${totalPlans - activePlans} inactive`}
          />
          <KpiCard
            label="Add-ons"
            value={addonsCount}
            icon={Package}
            color="violet"
            sub="Billed separately"
          />
          <KpiCard
            label="Revenue Potential"
            value={formatCurrency(monthlyRevenuePotential, 'USD')}
            icon={DollarSign}
            color="amber"
            sub="Sum of active non-addon monthly prices"
          />
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <Card className="card-shadow">
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <Card className="border-red-500/30">
          <CardContent className="p-6 flex flex-col items-center text-center gap-3">
            <AlertCircle className="size-8 text-red-500" />
            <p className="text-sm font-medium">Failed to load plans</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !isError && plans.length === 0 && (
        <EmptyState
          icon={Tags}
          title="No plans yet"
          subtitle="Create your first subscription plan to get started."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4 mr-2" />
              Create Plan
            </Button>
          }
        />
      )}

      {/* Plans table */}
      {!isLoading && !isError && plans.length > 0 && (
        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Plans</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={planColumns}
              data={plans}
              rowKey={(p) => p.id}
              emptyMessage="No plans configured"
              emptyIcon={Tags}
            />
          </CardContent>
        </Card>
      )}

      {/* ─── Create / Edit dialog ──────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update pricing, limits, and feature flags. The plan code cannot be changed after creation.'
                : 'Define a new subscription tier or add-on.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* ── Identity ────────────────────────────────────────────────── */}
            <FormSection title="Identity">
              <FormField label="Code" required hint="Unique business key (e.g. starter, growth).">
                <Input
                  value={form.code}
                  onChange={(e) => setField('code', e.target.value)}
                  disabled={!!editingId}
                  placeholder="starter"
                  className="font-mono"
                />
              </FormField>
              <FormField label="Name" required>
                <Input
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Starter"
                />
              </FormField>
              <FormField label="Description" full>
                <Textarea
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  rows={2}
                  placeholder="For solo professionals. CRM, jobs, estimates…"
                />
              </FormField>
            </FormSection>

            {/* ── Pricing ─────────────────────────────────────────────────── */}
            <FormSection title="Pricing">
              <FormField label="Monthly Price">
                <Input
                  type="number"
                  value={form.monthlyPrice}
                  onChange={(e) => setField('monthlyPrice', e.target.value)}
                  min="0"
                  step="0.01"
                />
              </FormField>
              <FormField label="Yearly Price">
                <Input
                  type="number"
                  value={form.yearlyPrice}
                  onChange={(e) => setField('yearlyPrice', e.target.value)}
                  min="0"
                  step="0.01"
                />
              </FormField>
              <FormField label="Original Monthly Price" hint="Strikethrough price (0 = no discount).">
                <Input
                  type="number"
                  value={form.originalMonthlyPrice}
                  onChange={(e) => setField('originalMonthlyPrice', e.target.value)}
                  min="0"
                  step="0.01"
                />
              </FormField>
              <FormField label="Original Yearly Price" hint="Strikethrough price (0 = no discount).">
                <Input
                  type="number"
                  value={form.originalYearlyPrice}
                  onChange={(e) => setField('originalYearlyPrice', e.target.value)}
                  min="0"
                  step="0.01"
                />
              </FormField>
              <FormField label="Discount Badge" hint="Optional override text like ‘Launch offer’.">
                <Input
                  value={form.discountBadge}
                  onChange={(e) => setField('discountBadge', e.target.value)}
                  placeholder="Launch offer"
                />
              </FormField>
              <FormField label="Currency">
                <Input
                  value={form.currency}
                  onChange={(e) => setField('currency', e.target.value)}
                  placeholder="USD"
                  className="font-mono"
                />
              </FormField>
            </FormSection>

            {/* ── Limits ──────────────────────────────────────────────────── */}
            <FormSection title="Limits">
              <FormField label="Max Users">
                <Input
                  type="number"
                  value={form.maxUsers}
                  onChange={(e) => setField('maxUsers', e.target.value)}
                  min="0"
                />
              </FormField>
              <FormField label="Max Jobs">
                <Input
                  type="number"
                  value={form.maxJobs}
                  onChange={(e) => setField('maxJobs', e.target.value)}
                  min="0"
                />
              </FormField>
              <FormField label="Max Workflows">
                <Input
                  type="number"
                  value={form.maxWorkflows}
                  onChange={(e) => setField('maxWorkflows', e.target.value)}
                  min="0"
                />
              </FormField>
              <FormField label="Storage Quota (MB)">
                <Input
                  type="number"
                  value={form.storageQuotaMb}
                  onChange={(e) => setField('storageQuotaMb', e.target.value)}
                  min="0"
                />
              </FormField>
              <FormField label="AI Quota">
                <Input
                  type="number"
                  value={form.aiQuota}
                  onChange={(e) => setField('aiQuota', e.target.value)}
                  min="0"
                />
              </FormField>
              <FormField label="WhatsApp Quota">
                <Input
                  type="number"
                  value={form.whatsappQuota}
                  onChange={(e) => setField('whatsappQuota', e.target.value)}
                  min="0"
                />
              </FormField>
              <FormField label="Email Quota">
                <Input
                  type="number"
                  value={form.emailQuota}
                  onChange={(e) => setField('emailQuota', e.target.value)}
                  min="0"
                />
              </FormField>
              <FormField label="SMS Quota">
                <Input
                  type="number"
                  value={form.smsQuota}
                  onChange={(e) => setField('smsQuota', e.target.value)}
                  min="0"
                />
              </FormField>
            </FormSection>

            {/* ── Features & Marketplace ─────────────────────────────────── */}
            <FormSection title="Features & Marketplace">
              <FormField label="Features JSON" full hint="Object of feature-key → boolean.">
                <Textarea
                  value={form.featuresJson}
                  onChange={(e) => setField('featuresJson', e.target.value)}
                  rows={4}
                  className="font-mono text-xs"
                  placeholder='{"customerPortal":true,"invoicing":true}'
                />
              </FormField>
              <FormField label="Limits JSON" full hint="Object of limit-key → number/string.">
                <Textarea
                  value={form.limitsJson}
                  onChange={(e) => setField('limitsJson', e.target.value)}
                  rows={4}
                  className="font-mono text-xs"
                  placeholder='{"maxBranches":1,"maxEmployees":1}'
                />
              </FormField>
              <FormField label="Marketplace Access">
                <Select
                  value={form.marketplaceAccess}
                  onValueChange={(v) => setField('marketplaceAccess', v as MarketplaceAccess)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MARKETPLACE_ACCESS_LABELS) as MarketplaceAccess[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {MARKETPLACE_ACCESS_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Sort Order" hint="Lower numbers appear first.">
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setField('sortOrder', e.target.value)}
                  min="0"
                />
              </FormField>
              <FormField label="Parent Plan Code" hint="If add-on, which plan codes it can attach to (blank = all).">
                <Input
                  value={form.parentPlanCode}
                  onChange={(e) => setField('parentPlanCode', e.target.value)}
                  placeholder="(all plans)"
                  className="font-mono"
                />
              </FormField>
              <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <ToggleField
                  label="Popular"
                  checked={form.popular}
                  onChange={(v) => setField('popular', v)}
                />
                <ToggleField
                  label="Active"
                  checked={form.isActive}
                  onChange={(v) => setField('isActive', v)}
                />
                <ToggleField
                  label="Is Add-on"
                  checked={form.isAddon}
                  onChange={(v) => setField('isAddon', v)}
                />
              </div>
            </FormSection>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : editingId ? (
                'Save Changes'
              ) : (
                'Create Plan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete plan “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. If any subscriptions still reference this plan&apos;s
              code ({deleteTarget?.code}), the delete will be rejected — deactivate the
              plan instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function FormField({
  label,
  required,
  hint,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <div className="mt-1">{children}</div>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border p-2.5">
      <Label className="text-xs font-medium cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function PriceCell({
  price,
  original,
  currency,
}: {
  price: number;
  original: number;
  currency: string;
}) {
  if (price === 0) {
    return <span className="text-sm text-muted-foreground">Custom</span>;
  }
  const hasDiscount = original > price && price > 0;
  if (hasDiscount) {
    return (
      <span className="text-sm">
        <span className="line-through text-muted-foreground mr-1">
          {formatCurrency(original, currency)}
        </span>
        <span className="font-bold">{formatCurrency(price, currency)}</span>
      </span>
    );
  }
  return <span className="text-sm">{formatCurrency(price, currency)}</span>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatInt(n: number): string {
  if (n >= 999999) return '∞';
  return n.toLocaleString('en-US');
}

function planToForm(plan: Plan): PlanFormState {
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description ?? '',
    monthlyPrice: String(plan.monthlyPrice),
    yearlyPrice: String(plan.yearlyPrice),
    originalMonthlyPrice: String(plan.originalMonthlyPrice),
    originalYearlyPrice: String(plan.originalYearlyPrice),
    discountBadge: plan.discountBadge ?? '',
    currency: plan.currency,
    maxUsers: String(plan.maxUsers),
    maxJobs: String(plan.maxJobs),
    maxWorkflows: String(plan.maxWorkflows),
    aiQuota: String(plan.aiQuota),
    whatsappQuota: String(plan.whatsappQuota),
    emailQuota: String(plan.emailQuota),
    smsQuota: String(plan.smsQuota),
    storageQuotaMb: String(plan.storageQuotaMb),
    featuresJson: prettyJson(plan.featuresJson),
    limitsJson: prettyJson(plan.limitsJson),
    isAddon: plan.isAddon,
    parentPlanCode: plan.parentPlanCode ?? '',
    marketplaceAccess: (plan.marketplaceAccess as MarketplaceAccess) || 'none',
    popular: plan.popular,
    isActive: plan.isActive,
    sortOrder: String(plan.sortOrder),
  };
}

function formToPayload(form: PlanFormState): Record<string, unknown> {
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    monthlyPrice: Number(form.monthlyPrice) || 0,
    yearlyPrice: Number(form.yearlyPrice) || 0,
    originalMonthlyPrice: Number(form.originalMonthlyPrice) || 0,
    originalYearlyPrice: Number(form.originalYearlyPrice) || 0,
    discountBadge: form.discountBadge.trim() || null,
    currency: form.currency.trim() || 'USD',
    maxUsers: parseIntOrZero(form.maxUsers),
    maxJobs: parseIntOrZero(form.maxJobs),
    maxWorkflows: parseIntOrZero(form.maxWorkflows),
    aiQuota: parseIntOrZero(form.aiQuota),
    whatsappQuota: parseIntOrZero(form.whatsappQuota),
    emailQuota: parseIntOrZero(form.emailQuota),
    smsQuota: parseIntOrZero(form.smsQuota),
    storageQuotaMb: parseIntOrZero(form.storageQuotaMb),
    featuresJson: form.featuresJson,
    limitsJson: form.limitsJson,
    isAddon: form.isAddon,
    parentPlanCode: form.parentPlanCode.trim() || null,
    marketplaceAccess: form.marketplaceAccess,
    popular: form.popular,
    isActive: form.isActive,
    sortOrder: parseIntOrZero(form.sortOrder),
  };
}

function parseIntOrZero(s: string): number {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Pretty-print JSON without throwing on invalid input. */
function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
