'use client';

/**
 * Equipment Tab — assigned assets + assignment history.
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 *
 * Wires the EquipmentTab to the Phase 3a/3b endpoints:
 *   • GET  /api/employees/[id]/equipment   → assigned assets + assignment history
 *   • GET  /api/inventory/assets?status=available&search=…  → available pool
 *   • POST /api/inventory/assets/[id]/assign  → assign an asset to this employee
 *   • POST /api/inventory/assets/[id]/return  → close the current assignment
 *
 * The Equipment tab is operational data, visible to every authenticated tenant
 * member (per the RBAC table in lib/auth/permissions.ts). However the assign /
 * return write actions are role-gated to owner/admin/manager/dispatcher/office —
 * both client-side (via usePermissions().hasRole) and server-side (each write
 * endpoint re-checks via hasRole(authUser, ASSET_WRITE_ROLES)). Hiding the
 * buttons here is just UX; the real gate is the API.
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Package, RotateCcw, PackagePlus, AlertCircle, Clock, QrCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/hooks/use-permissions';
import { authFetch } from '@/lib/client-auth';
import { formatDate } from '@/lib/format-utils';
import type {
  EquipmentResponse, InventoryAsset, PayrollError,
} from '../../types';
import {
  apiUrl, EQUIPMENT_WRITE_ROLES, assetStatusBadgeClass,
  assetConditionBadgeClass, assignmentStatusBadgeClass,
} from '../../utils/employee-helpers';
import { AssignEquipmentDialog } from '../assign-equipment-dialog';
import { ReturnAssetDialog } from '../return-asset-dialog';

export function EquipmentTab({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const perms = usePermissions();
  const queryClient = useQueryClient();
  // Gate the assign/return action buttons. The underlying endpoints re-check
  // this server-side — hiding here is just UX, not a security boundary.
  const canManage = perms.hasRole(EQUIPMENT_WRITE_ROLES);

  const [assignOpen, setAssignOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<InventoryAsset | null>(null);

  const queryKey = useMemo(() => ['employee-equipment', employeeId] as const, [employeeId]);

  const { data, isLoading, error, refetch, isFetching } = useQuery<EquipmentResponse>({
    queryKey,
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/employees/${employeeId}/equipment`));
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as PayrollError;
        throw new Error(body.error || `Failed to load equipment (HTTP ${res.status})`);
      }
      return res.json();
    },
  });

  const assigned = data?.assigned ?? [];
  const history = data?.history ?? [];

  // Invalidate the equipment query on assign/return success — this forces the
  // assigned list + history table to refresh from the server so the user sees
  // the new state immediately.
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="size-4 text-emerald-600" /> Equipment
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {assigned.length} assigned
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Assets currently held by {employeeName} and recent assignment history.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RotateCcw className={cn('size-3.5 mr-1', isFetching && 'animate-spin')} />
                Refresh
              </Button>
              {canManage && (
                <Button
                  size="sm"
                  className="h-8 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setAssignOpen(true)}
                >
                  <PackagePlus className="size-3.5 mr-1" /> Assign Equipment
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Currently Assigned */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="size-4 text-emerald-600" /> Currently Assigned
          </CardTitle>
          <CardDescription className="text-xs">
            Assets this employee is responsible for right now.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-4 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    Failed to load equipment
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(error as Error).message}
                  </p>
                </div>
              </div>
            </div>
          ) : assigned.length === 0 ? (
            <div className="p-8 text-center">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Package className="size-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold">No equipment assigned to this employee yet.</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {canManage
                  ? `${employeeName} does not currently hold any assets. Assign equipment to track custody.`
                  : `${employeeName} does not currently hold any assets.`}
              </p>
              {canManage && (
                <Button
                  size="sm"
                  className="mt-3 h-8 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setAssignOpen(true)}
                >
                  <PackagePlus className="size-3.5 mr-1" /> Assign Equipment
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Asset</TableHead>
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Condition</TableHead>
                    <TableHead className="text-xs">Assigned</TableHead>
                    {canManage && <TableHead className="text-xs text-right">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assigned.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">{asset.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <QrCode className="size-2.5" />
                          {asset.serialNumber || asset.assetTag || 'No serial / tag'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {asset.inventoryItem ? (
                          <Badge variant="outline" className="text-[10px] bg-muted/40">
                            {asset.inventoryItem.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] capitalize',
                            assetStatusBadgeClass(asset.status),
                          )}
                        >
                          {asset.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] capitalize',
                            assetConditionBadgeClass(asset.condition),
                          )}
                        >
                          {asset.condition}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {asset.assignedAt ? formatDate(asset.assignedAt) : '—'}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-xs text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px]"
                            onClick={() => setReturnTarget(asset)}
                          >
                            <RotateCcw className="size-3 mr-1" /> Return
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment History — hidden entirely when empty (per spec). */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="size-4 text-emerald-600" /> Assignment History
              <Badge variant="secondary" className="text-[10px] ml-1">
                {history.length}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Last {history.length} assignment record{history.length === 1 ? '' : 's'} (active + returned).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Asset</TableHead>
                    <TableHead className="text-xs">Assigned</TableHead>
                    <TableHead className="text-xs">Returned</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">
                          {h.asset?.name ?? (
                            <span className="text-muted-foreground">Unknown asset</span>
                          )}
                        </div>
                        {h.asset && (h.asset.serialNumber || h.asset.assetTag) && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <QrCode className="size-2.5" />
                            {h.asset.serialNumber || h.asset.assetTag}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(h.assignedAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {h.returnedAt ? (
                          formatDate(h.returnedAt)
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                          >
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] capitalize',
                            assignmentStatusBadgeClass(h.assignmentStatus),
                          )}
                        >
                          {h.assignmentStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Dialog */}
      <AssignEquipmentDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        employeeId={employeeId}
        employeeName={employeeName}
        onSuccess={invalidate}
      />

      {/* Return Dialog */}
      <ReturnAssetDialog
        open={returnTarget !== null}
        onOpenChange={(o) => {
          if (!o) setReturnTarget(null);
        }}
        asset={returnTarget}
        employeeName={employeeName}
        onSuccess={invalidate}
      />
    </div>
  );
}

