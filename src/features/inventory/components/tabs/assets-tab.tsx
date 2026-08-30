'use client';

/**
 * AssetsTab — serialized equipment assets + employee assignment flow.
 *
 * Extracted from src/components/views/inventory-view.tsx (Phase 6B1).
 *
 * Owns its own "Assign Asset to Employee" dialog (state + submission logic).
 * The parent owns the assets list, the employees list (loaded only when this
 * tab is opened), the loading/error state, the available/assigned sub-tab,
 * and the "Return Asset" handler (which also re-fetches the list).
 *
 * The refresh button and retry button call the parent's `onRefresh` callback,
 * which re-fetches assets. The "Return" button calls `onReturnAsset(asset)`,
 * which the parent handles with the `/api/inventory/assets/[id]/return` POST
 * and a toast.
 */

import { useState } from 'react';
import {
  Package, ClipboardCheck, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { authFetch } from '@/lib/client-auth';
import type { AssetSubTab, InventoryAssetRow } from '../../types';

export function AssetsTab({
  assets,
  assetsLoading,
  assetsError,
  assetsSubTab,
  setAssetsSubTab,
  onRefresh,
  onReturnAsset,
  employees,
  employeesLoading,
  onAssigned,
}: {
  assets: InventoryAssetRow[];
  assetsLoading: boolean;
  assetsError: string | null;
  assetsSubTab: AssetSubTab;
  setAssetsSubTab: (v: AssetSubTab) => void;
  onRefresh: () => void;
  onReturnAsset: (asset: InventoryAssetRow) => void;
  employees: { id: string; name: string }[];
  employeesLoading: boolean;
  onAssigned: () => void;
}) {
  // ── Assign-asset dialog state (owned by this tab) ──────────────────────
  const [assignDialogAsset, setAssignDialogAsset] = useState<InventoryAssetRow | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const openAssignDialog = (asset: InventoryAssetRow) => {
    setAssignDialogAsset(asset);
    setAssignEmployeeId('');
    setAssignNotes('');
  };

  const handleAssignAsset = async () => {
    if (!assignDialogAsset || !assignEmployeeId) return;
    setAssignSubmitting(true);
    try {
      const res = await authFetch(`/api/inventory/assets/${assignDialogAsset.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: assignEmployeeId, notes: assignNotes || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      toast.success(`Asset assigned to ${employees.find((e) => e.id === assignEmployeeId)?.name || 'employee'}`);
      setAssignDialogAsset(null);
      setAssignEmployeeId('');
      setAssignNotes('');
      onAssigned();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign asset');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const availableCount = assets.filter((a) => !a.assignedEmployeeId).length;
  const assignedCount = assets.filter((a) => a.assignedEmployeeId).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Equipment Assets</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track serialized equipment and assign to employees.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={assetsLoading}>
          <RotateCcw className="size-4 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Available / Assigned sub-tabs */}
      <Tabs value={assetsSubTab} onValueChange={(v) => setAssetsSubTab(v as AssetSubTab)}>
        <TabsList>
          <TabsTrigger value="available">
            Available ({availableCount})
          </TabsTrigger>
          <TabsTrigger value="assigned">
            Assigned ({assignedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {assetsLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : assetsError ? (
                <div className="p-10 text-center">
                  <p className="text-sm text-red-600 mb-3">{assetsError}</p>
                  <Button variant="outline" size="sm" onClick={onRefresh}>
                    <RotateCcw className="size-4 mr-1.5" /> Retry
                  </Button>
                </div>
              ) : availableCount === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-muted">
                    <Package className="size-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold">No available assets</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    All assets are currently assigned, or no assets have been added.
                  </p>
                </div>
              ) : (
                <div className="max-h-[calc(100vh-28rem)] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Serial #</TableHead>
                        <TableHead>Asset Tag</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assets.filter((a) => !a.assignedEmployeeId).map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell className="text-muted-foreground">{asset.serialNumber || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{asset.assetTag || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={asset.condition === 'good' ? 'default' : 'secondary'}>
                              {asset.condition || 'unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{asset.location || '—'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => openAssignDialog(asset)}
                            >
                              Assign to Employee
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assigned" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {assetsLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : assignedCount === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-muted">
                    <ClipboardCheck className="size-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold">No assigned assets</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Assign an asset from the Available tab to see it here.
                  </p>
                </div>
              ) : (
                <div className="max-h-[calc(100vh-28rem)] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Serial #</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Assigned At</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assets.filter((a) => a.assignedEmployeeId).map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell className="text-muted-foreground">{asset.serialNumber || '—'}</TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                              {asset.assignedEmployeeName || 'Employee'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {asset.assignedAt ? new Date(asset.assignedAt).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onReturnAsset(asset)}
                            >
                              Return
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Assign Asset to Employee Dialog (owned by this tab) ──────────── */}
      <Dialog
        open={!!assignDialogAsset}
        onOpenChange={(open) => { if (!open) setAssignDialogAsset(null); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Asset to Employee</DialogTitle>
            <DialogDescription>
              Assign "{assignDialogAsset?.name}" to an employee. The asset will be marked as assigned until returned.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {employeesLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="text-sm text-muted-foreground">Loading employees...</div>
              </div>
            ) : employees.length === 0 ? (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                No active employees found. Add employees first to assign assets.
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="assign-employee">Employee</Label>
                  <Select value={assignEmployeeId} onValueChange={setAssignEmployeeId}>
                    <SelectTrigger id="assign-employee">
                      <SelectValue placeholder="Select an employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assign-notes">Notes (optional)</Label>
                  <Textarea
                    id="assign-notes"
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                    placeholder="Assignment notes..."
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogAsset(null)}>Cancel</Button>
            <Button
              onClick={handleAssignAsset}
              disabled={assignSubmitting || !assignEmployeeId || employees.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {assignSubmitting ? 'Assigning...' : 'Assign Asset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
