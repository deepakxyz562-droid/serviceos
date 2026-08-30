'use client';

/**
 * Assign Equipment dialog.
 *
 * Fetches the pool of available assets (status='available', assignedEmployeeId=null)
 * from /api/inventory/assets with a 300ms-debounced search input. The user picks
 * one asset (radio-style click-to-select), optionally enters notes, and submits
 * — which POSTs to /api/inventory/assets/[id]/assign with { employeeId, notes }.
 *
 * On success: closes the dialog, invalidates the employee-equipment query so the
 * assigned list refreshes, and shows a success toast. The dialog itself
 * re-fetches the available pool every time it opens (because the query key
 * includes the debounced search, which resets to '' on open).
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, CheckCircle2, QrCode, Package, PackagePlus, Loader2, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { authFetch } from '@/lib/client-auth';
import type { AvailableAssetsResponse, PayrollError } from '../types';
import { apiUrl, assetConditionBadgeClass } from '../utils/employee-helpers';

export function AssignEquipmentDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  onSuccess: () => void;
}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset dialog state whenever it closes so the next open starts fresh
  // (no stale search query / selected asset / notes carried across sessions).
  useEffect(() => {
    if (!open) {
      setSearch('');
      setDebouncedSearch('');
      setSelectedAssetId(null);
      setNotes('');
    }
  }, [open]);

  // Debounce search input by 300ms before triggering a refetch.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch available assets. Disabled when the dialog is closed so we don't
  // fire a request on initial page load (the Equipment tab may be visible but
  // the user hasn't opened the assign dialog yet).
  const { data, isLoading: loadingAssets } = useQuery<AvailableAssetsResponse>({
    queryKey: ['inventory-assets-available', debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'available', limit: '50' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await authFetch(apiUrl(`/api/inventory/assets?${params.toString()}`));
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as PayrollError;
        throw new Error(body.error || `Failed to load assets (HTTP ${res.status})`);
      }
      return res.json();
    },
    enabled: open,
  });

  const assets = data?.assets ?? [];

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) {
      toast.error('Select an asset to assign');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch(apiUrl(`/api/inventory/assets/${selectedAssetId}/assign`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, notes: notes.trim() || null }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as PayrollError;
        throw new Error(body.error || `Assign failed (HTTP ${res.status})`);
      }
      toast.success(`Asset assigned to ${employeeName}`);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Assign failed');
    } finally {
      setSubmitting(false);
    }
  };

  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickAssetName, setQuickAssetName] = useState('');
  const [quickSerial, setQuickSerial] = useState('');
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  const handleQuickCreateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAssetName.trim()) {
      toast.error('Asset name is required');
      return;
    }
    setQuickSubmitting(true);
    try {
      // 1. Create asset
      const createRes = await authFetch(apiUrl('/api/inventory/assets'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickAssetName.trim(),
          serialNumber: quickSerial.trim() || undefined,
          status: 'available',
          condition: 'good',
        }),
      });
      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create asset');
      }
      const { asset } = await createRes.json();

      // 2. Assign asset to employee
      const assignRes = await authFetch(apiUrl(`/api/inventory/assets/${asset.id}/assign`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, notes: notes.trim() || undefined }),
      });
      if (!assignRes.ok) {
        const body = await assignRes.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to assign asset');
      }

      toast.success(`Asset "${quickAssetName}" created and assigned to ${employeeName}`);
      onSuccess();
      setShowQuickCreate(false);
      setQuickAssetName('');
      setQuickSerial('');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Quick assign failed');
    } finally {
      setQuickSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="size-4 text-emerald-600" /> Assign Equipment to {employeeName}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select an available asset or create a new trackable asset to assign to this employee.
          </DialogDescription>
        </DialogHeader>

        {showQuickCreate ? (
          <form onSubmit={handleQuickCreateAndAssign} className="space-y-4 py-2">
            <div className="rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-1">
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Quick Create & Assign Equipment
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                This will instantly register a new equipment asset and assign custody to {employeeName}.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quick-asset-name" className="text-xs font-medium">
                Equipment / Asset Name *
              </Label>
              <Input
                id="quick-asset-name"
                value={quickAssetName}
                onChange={(e) => setQuickAssetName(e.target.value)}
                placeholder="e.g. HVAC Vacuum Pump #3, Fluke Multimeter"
                className="h-9"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quick-asset-serial" className="text-xs font-medium">
                Serial Number or Tag (Optional)
              </Label>
              <Input
                id="quick-asset-serial"
                value={quickSerial}
                onChange={(e) => setQuickSerial(e.target.value)}
                placeholder="e.g. SN-883921"
                className="h-9"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowQuickCreate(false)}
                disabled={quickSubmitting}
              >
                Back to Available Assets
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={quickSubmitting || !quickAssetName.trim()}
              >
                {quickSubmitting ? 'Assigning…' : 'Create & Assign'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAssign} className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="asset-search" className="text-xs font-medium">
                Search available assets
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 px-2"
                onClick={() => {
                  setQuickAssetName(search);
                  setShowQuickCreate(true);
                }}
              >
                <Plus className="size-3 mr-1" /> Quick Create Asset
              </Button>
            </div>
            <div className="relative">
              <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                id="asset-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, serial number, or asset tag…"
                className="pl-8 h-9"
                disabled={submitting}
                autoFocus
              />
            </div>

            <div className="border rounded-md max-h-72 overflow-y-auto">
              {loadingAssets ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : assets.length === 0 ? (
                <div className="p-6 text-center space-y-2.5">
                  <p className="text-xs text-muted-foreground">
                    No available assets{debouncedSearch ? ` matching “${debouncedSearch}”.` : '.'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Create a trackable equipment asset to assign to {employeeName}.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    onClick={() => {
                      setQuickAssetName(search);
                      setShowQuickCreate(true);
                    }}
                  >
                    <PackagePlus className="size-3.5" /> Quick Create & Assign Asset
                  </Button>
                </div>
              ) : (
              assets.map((asset) => {
                const selected = selectedAssetId === asset.id;
                return (
                  <button
                    type="button"
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={cn(
                      'w-full text-left p-3 border-b last:border-b-0 hover:bg-accent transition-colors flex items-start gap-2',
                      selected && 'bg-emerald-50/60 dark:bg-emerald-950/20',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 size-4 rounded-full border flex items-center justify-center shrink-0',
                        selected ? 'border-emerald-600 bg-emerald-600' : 'border-border',
                      )}
                    >
                      {selected && <CheckCircle2 className="size-3 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-foreground truncate">{asset.name}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2 flex-wrap">
                        {asset.serialNumber && (
                          <span className="flex items-center gap-1">
                            <QrCode className="size-2.5" /> {asset.serialNumber}
                          </span>
                        )}
                        {asset.assetTag && (
                          <span className="flex items-center gap-1">
                            <Package className="size-2.5" /> {asset.assetTag}
                          </span>
                        )}
                        {!asset.serialNumber && !asset.assetTag && <span>No serial / tag</span>}
                      </div>
                      {asset.inventoryItem && (
                        <Badge variant="outline" className="mt-1 text-[10px] bg-muted/40">
                          {asset.inventoryItem.name}
                        </Badge>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] capitalize', assetConditionBadgeClass(asset.condition))}
                    >
                      {asset.condition}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assign-notes" className="text-xs font-medium">
              Notes (optional)
            </Label>
            <Textarea
              id="assign-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. kit issued for Project X, condition verified at handover"
              rows={2}
              disabled={submitting}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !selectedAssetId}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 mr-1 animate-spin" /> Assigning…
                </>
              ) : (
                <>
                  <PackagePlus className="size-3.5 mr-1" /> Assign
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
