'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Plan Features — superadmin matrix UI.
//
// Rows: features (grouped by category: CRM, Communication, Automation, Finance, Admin)
// Columns: plan tiers (trial, starter, growth, business, enterprise)
// Cells: Switch toggles (auto-save on flip).
//
// - Fetches `/api/superadmin/plan-features` on mount (TanStack Query).
// - "Reset to defaults" button calls POST /api/superadmin/plan-features with
//   { action: 'seed' } and refetches.
// - Each toggle PUTs `/api/superadmin/plan-features` with the new cell state.
// - Toast on save success/error.
// - Horizontally scrollable on mobile (overflow-x-auto).
// - Legend: Trial = free 14-day, Starter = £5/mo, Growth = £29/mo, Business = £79/mo, Enterprise = Contact us.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Lock,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionHeader } from '@/components/views/superadmin/_shared';
import { authFetch } from '@/lib/api';
import {
  PLAN_TIERS,
  PLAN_TIER_LEGEND,
  type PlanTier,
  type PlanFeatureCategory,
  type PlanFeatureDef,
} from '@/lib/plan-features';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlanFeaturesResponse {
  tiers: PlanTier[];
  features: PlanFeatureDef[];
  matrix: Record<string, Record<string, boolean>>;
}

interface UpdateCellBody {
  planCode: string;
  featureKey: string;
  enabled: boolean;
}

// ─── Category metadata ───────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<PlanFeatureCategory, string> = {
  crm: 'CRM & Core',
  communication: 'Communication',
  automation: 'Automation & Marketing',
  finance: 'Finance',
  admin: 'Admin & Platform',
};

const CATEGORY_ORDER: PlanFeatureCategory[] = [
  'crm',
  'communication',
  'automation',
  'finance',
  'admin',
];

const CATEGORY_DESCRIPTIONS: Record<PlanFeatureCategory, string> = {
  crm: 'Core CRM modules available on every plan tier (including trial).',
  communication: 'Voice, SMS, and messaging add-ons. Trial/Starter are locked by default.',
  automation: 'Marketing campaigns, broadcasts, and journey automation.',
  finance: 'Quotes and invoices — part of the core CRM surface.',
  admin: 'Platform-level admin features (white-label, API access). Business/Enterprise only.',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function PlanFeaturesSection() {
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState<Record<string, Record<string, boolean>> | null>(null);

  const queryKey = useMemo(() => ['superadmin', 'plan-features'] as const, []);

  const { data, isLoading, isError, refetch } = useQuery<PlanFeaturesResponse>({
    queryKey,
    queryFn: async () => {
      const res = await authFetch('/api/superadmin/plan-features');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load plan features');
      }
      return res.json() as Promise<PlanFeaturesResponse>;
    },
    staleTime: 30_000,
  });

  // Single-cell update mutation. Optimistic update + server PUT + invalidate.
  const updateCellMutation = useMutation({
    mutationFn: async (body: UpdateCellBody) => {
      const res = await authFetch('/api/superadmin/plan-features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update cell');
      }
      return res.json();
    },
    onMutate: async (body) => {
      // Optimistic update: flip the cell immediately so the Switch feels instant.
      await queryClient.cancelQueries({ queryKey });
      const previous = data?.matrix;
      if (previous) {
        setOptimistic((prev) => {
          const next = prev ?? structuredCloneSafe(previous);
          if (!next[body.planCode]) next[body.planCode] = {};
          next[body.planCode][body.featureKey] = body.enabled;
          return next;
        });
      }
      return { previous };
    },
    onError: (err, _body, context) => {
      // Roll back on error.
      setOptimistic(context?.previous ? structuredCloneSafe(context.previous) : null);
      toast.error('Update failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    },
    onSuccess: (_data, body) => {
      toast.success('Saved', {
        description: `${body.featureKey} on ${body.planCode}: ${body.enabled ? 'enabled' : 'disabled'}`,
      });
    },
    onSettled: () => {
      // Refetch to confirm server state + clear the optimistic overlay.
      void queryClient.invalidateQueries({ queryKey });
      setOptimistic(null);
    },
  });

  // Reset-to-defaults mutation. POST { action: 'seed' } → refetch.
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch('/api/superadmin/plan-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to reset');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Reset to defaults', {
        description: `Updated ${data.reset ?? 0} cells`,
      });
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      toast.error('Reset failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    },
  });

  // Effective matrix = optimistic overlay ?? server data.
  const matrix = optimistic ?? data?.matrix ?? {};
  const features = data?.features ?? [];

  // Group features by category, in canonical order.
  const grouped = useMemo(() => {
    const map: Record<PlanFeatureCategory, PlanFeatureDef[]> = {
      crm: [],
      communication: [],
      automation: [],
      finance: [],
      admin: [],
    };
    for (const f of features) {
      map[f.category].push(f);
    }
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: map[cat],
    })).filter((g) => g.items.length > 0);
  }, [features]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Plan Feature Matrix"
        description="Control which features each plan tier can access. Toggles auto-save; trial users see locked items as an Upgrade CTA."
        icon={Lock}
        actions={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={resetMutation.isPending || isLoading}
              >
                {resetMutation.isPending ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="size-4 mr-2" />
                )}
                Reset to defaults
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset matrix to defaults?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will overwrite every cell with the canonical default values
                  (trial/starter locked out of communication add-ons, growth gets the
                  full marketing suite, etc.). Any manual overrides will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => resetMutation.mutate()}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />

      {/* Legend */}
      <Card className="card-shadow">
        <CardContent className="p-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="font-medium text-muted-foreground mr-1">Plan pricing:</span>
          {PLAN_TIERS.map((tier) => (
            <span key={tier} className="inline-flex items-center gap-1.5">
              <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0">
                {tier}
              </Badge>
              <span className="text-muted-foreground">{PLAN_TIER_LEGEND[tier]}</span>
            </span>
          ))}
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      {isLoading && (
        <Card className="card-shadow">
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-8 w-48" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <Card className="border-red-500/30">
          <CardContent className="p-6 flex flex-col items-center text-center gap-3">
            <AlertCircle className="size-8 text-red-500" />
            <p className="text-sm font-medium">Failed to load plan features</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RotateCcw className="size-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Matrix table — grouped by category, horizontally scrollable on mobile */}
      {!isLoading && !isError && (
        <div className="space-y-6">
          {grouped.map(({ category, items }) => (
            <Card key={category} className="card-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{CATEGORY_LABELS[category]}</CardTitle>
                <CardDescription className="text-xs">
                  {CATEGORY_DESCRIPTIONS[category]}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 z-10 bg-card min-w-[260px]">
                          Feature
                        </TableHead>
                        {PLAN_TIERS.map((tier) => (
                          <TableHead key={tier} className="text-center min-w-[110px] capitalize">
                            {tier}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((feature) => (
                        <TableRow key={feature.key}>
                          <TableCell className="sticky left-0 z-10 bg-card">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">
                                {feature.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground line-clamp-1">
                                {feature.description}
                              </span>
                              <code className="text-[10px] text-muted-foreground/70 mt-0.5">
                                {feature.key}
                              </code>
                            </div>
                          </TableCell>
                          {PLAN_TIERS.map((tier) => {
                            const enabled = !!matrix[tier]?.[feature.key];
                            const isPending =
                              updateCellMutation.isPending &&
                              updateCellMutation.variables?.planCode === tier &&
                              updateCellMutation.variables?.featureKey === feature.key;
                            return (
                              <TableCell key={tier} className="text-center">
                                <div className="flex items-center justify-center">
                                  <Switch
                                    checked={enabled}
                                    disabled={isPending}
                                    onCheckedChange={(checked) => {
                                      updateCellMutation.mutate({
                                        planCode: tier,
                                        featureKey: feature.key,
                                        enabled: checked,
                                      });
                                    }}
                                    aria-label={`${feature.label} on ${tier} plan`}
                                  />
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Saved indicator */}
          <div className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span>Changes auto-save</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Deep-clone a matrix object without depending on `structuredClone` polyfills. */
function structuredCloneSafe<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}
