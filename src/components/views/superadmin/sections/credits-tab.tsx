'use client';

// ─────────────────────────────────────────────────────────────────────────────
// CreditsTab — WhatsApp + Email credit overview + per-tenant credit editor.
//
// Extracted from `superadmin-view.tsx` so it's a stable module-level component
// — no more unmount/remount on parent re-render. All data + handlers arrive
// via props. The `fetchAllCredits` callback is passed in because the parent
// owns the `creditsData` state (and the gating that prevents refetching on
// every render).
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
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Search, Loader2, RefreshCw, Edit3, Wallet, Clock, BarChart3,
  AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react';

import {
  KpiCard, TableSkeleton, EmptyState, getPlanBadgeClasses,
} from '@/components/views/superadmin/_shared';
import type { CreditInfo } from '@/components/views/superadmin/types';

export interface CreditsTabProps {
  creditsData: CreditInfo[];
  creditsLoading: boolean;
  /** Re-pull credits for all tenants. */
  fetchAllCredits: () => void;
}

export function CreditsTab({ creditsData, creditsLoading, fetchAllCredits }: CreditsTabProps) {
  const [search, setSearch] = useState('');
  const [editDialog, setEditDialog] = useState<CreditInfo | null>(null);
  const [editForm, setEditForm] = useState({
    trialWhatsappCredits: 10,
    platformWhatsappEnabled: true,
    ownWhatsappConnected: false,
    ownEmailProviderConnected: false,
  });
  const [saving, setSaving] = useState(false);

  const filteredCredits = useMemo(() => {
    if (!search) return creditsData;
    const q = search.toLowerCase();
    return creditsData.filter((c) => c.tenantName.toLowerCase().includes(q));
  }, [creditsData, search]);

  const trialTenants = creditsData.filter((c) => c.plan === 'trial');
  const avgCreditsUsed = trialTenants.length > 0
    ? (trialTenants.reduce((s, c) => s + c.trialWhatsappUsed, 0) / trialTenants.length).toFixed(1)
    : '0';
  const exhaustedTenants = trialTenants.filter((c) => c.trialWhatsappUsed >= c.trialWhatsappCredits);

  const handleEdit = (credit: CreditInfo) => {
    setEditDialog(credit);
    setEditForm({
      trialWhatsappCredits: credit.trialWhatsappCredits,
      platformWhatsappEnabled: credit.platformWhatsappEnabled,
      ownWhatsappConnected: credit.ownWhatsappConnected,
      ownEmailProviderConnected: credit.ownEmailProviderConnected,
    });
  };

  const handleSave = async () => {
    if (!editDialog) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: editDialog.tenantId, ...editForm }),
      });
      if (res.ok) {
        toast.success('Credit settings updated successfully');
        setEditDialog(null);
        fetchAllCredits();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update credit settings');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Credit Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Trial Tenants" value={trialTenants.length} icon={Clock} color="amber" />
        <KpiCard label="Avg Credits Used" value={avgCreditsUsed} icon={BarChart3} color="sky" />
        <KpiCard label="Exhausted Credits" value={exhaustedTenants.length} icon={AlertTriangle} color="red" />
      </div>

      {/* Search + Refresh */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search tenants..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchAllCredits()} disabled={creditsLoading} className="shrink-0">
          {creditsLoading ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="size-3.5 mr-1.5" />}
          Refresh
        </Button>
      </div>

      {/* Table */}
      {creditsLoading && creditsData.length === 0 ? <TableSkeleton /> : filteredCredits.length === 0 ? (
        <EmptyState icon={Wallet} title="No credit data found" subtitle="Credit data loads after tenants are fetched." />
      ) : (
        <Card className="card-shadow">
          <ScrollArea className="max-h-[calc(100vh-380px)]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Tenant</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-center">WhatsApp Credits</TableHead>
                  <TableHead className="text-center">Platform WA</TableHead>
                  <TableHead className="text-center">Own WA</TableHead>
                  <TableHead className="text-center">Email Provider</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCredits.map((credit) => {
                  const isPaidWithOwnWhatsApp = credit.plan !== 'trial' && credit.ownWhatsappConnected;
                  return (
                    <TableRow key={credit.tenantId}>
                      <TableCell className="font-medium text-foreground">{credit.tenantName}</TableCell>
                      <TableCell><Badge variant="outline" className={cn('capitalize text-[10px]', getPlanBadgeClasses(credit.plan))}>{credit.plan}</Badge></TableCell>
                      <TableCell className="text-center">
                        {isPaidWithOwnWhatsApp ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">Unlimited</Badge>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Progress value={credit.trialWhatsappCredits > 0 ? (credit.trialWhatsappUsed / credit.trialWhatsappCredits) * 100 : 0} className="h-1.5 w-16" />
                            <span className={cn('text-xs', credit.trialWhatsappUsed >= credit.trialWhatsappCredits ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground')}>
                              {credit.trialWhatsappUsed}/{credit.trialWhatsappCredits}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {credit.platformWhatsappEnabled ? <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 inline-block" /> : <XCircle className="size-4 text-red-600 dark:text-red-400 inline-block" />}
                      </TableCell>
                      <TableCell className="text-center">
                        {credit.ownWhatsappConnected ? <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 inline-block" /> : <XCircle className="size-4 text-muted-foreground inline-block" />}
                      </TableCell>
                      <TableCell className="text-center">
                        {credit.ownEmailProviderConnected ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">Own</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Platform</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(credit)} title="Edit Credits">
                          <Edit3 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Edit Credits Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(open) => { if (!open) setEditDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wallet className="size-5 text-primary" /> Edit Credit Settings</DialogTitle>
            <DialogDescription>Manage credits for {editDialog?.tenantName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Trial WhatsApp Credits</Label>
              <Input type="number" min={0} value={editForm.trialWhatsappCredits} onChange={(e) => setEditForm((p) => ({ ...p, trialWhatsappCredits: parseInt(e.target.value) || 0 }))} />
              <p className="text-[11px] text-muted-foreground">Current usage: {editDialog?.trialWhatsappUsed ?? 0} credits used</p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Platform WhatsApp</Label>
                <p className="text-[11px] text-muted-foreground">Enable platform-provided WhatsApp</p>
              </div>
              <Switch checked={editForm.platformWhatsappEnabled} onCheckedChange={(checked) => setEditForm((p) => ({ ...p, platformWhatsappEnabled: checked }))} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Own WhatsApp Connected</Label>
                <p className="text-[11px] text-muted-foreground">Tenant has connected their own WhatsApp</p>
              </div>
              <Switch checked={editForm.ownWhatsappConnected} onCheckedChange={(checked) => setEditForm((p) => ({ ...p, ownWhatsappConnected: checked }))} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Own Email Provider</Label>
                <p className="text-[11px] text-muted-foreground">Tenant has connected their own email provider</p>
              </div>
              <Switch checked={editForm.ownEmailProviderConnected} onCheckedChange={(checked) => setEditForm((p) => ({ ...p, ownEmailProviderConnected: checked }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="size-4 mr-1.5" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
