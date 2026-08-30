'use client';

/**
 * AlertsTab — low-stock alert queue + acknowledge/resolve actions.
 *
 * Extracted from src/components/views/inventory-view.tsx (Phase 6B1).
 *
 * Pure presentational component. The alerts list + loading state are owned by
 * the parent. The status filter (active / acknowledged / resolved) is also
 * owned by the parent. Action buttons (Acknowledge / Resolve) call back to
 * the parent's `onAlertAction(alert, action)` which PATCHes
 * `/api/inventory/alerts` and re-fetches on success.
 *
 * The "PO" button is a non-functional affordance — it shows a toast telling
 * the user to open the Purchase Orders view (matches the original behavior).
 */

import {
  Filter, Check, Eye, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ALERT_STATUSES, ALERT_STATUS_STYLES,
} from '../../utils/inventory-helpers';
import type { LowStockAlert } from '../../types';

export function AlertsTab({
  alerts,
  alertsLoading,
  alertStatusFilter,
  setAlertStatusFilter,
  onAlertAction,
}: {
  alerts: LowStockAlert[];
  alertsLoading: boolean;
  alertStatusFilter: string;
  setAlertStatusFilter: (v: string) => void;
  onAlertAction: (alert: LowStockAlert, action: 'acknowledge' | 'resolve') => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <Select value={alertStatusFilter} onValueChange={setAlertStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="size-4 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Status filter" />
            </SelectTrigger>
            <SelectContent>
              {ALERT_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {alertsLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-10 sm:p-16 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                <Check className="size-7 text-emerald-600 dark:text-emerald-300" />
              </div>
              <h3 className="text-base font-semibold">No {alertStatusFilter} alerts</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {alertStatusFilter === 'active'
                  ? 'All stock levels are healthy. Alerts trigger automatically when stock hits reorder level.'
                  : 'No alerts match this status filter.'}
              </p>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-24rem)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right w-28">Current</TableHead>
                    <TableHead className="text-right w-28">Reorder At</TableHead>
                    <TableHead className="text-right w-28">Reorder Qty</TableHead>
                    <TableHead className="w-32">Supplier</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="text-right w-40">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium truncate max-w-[14rem]">
                            {a.item?.name || 'Unknown item'}
                          </span>
                          {a.item?.sku && (
                            <span className="font-mono text-[10px] text-muted-foreground">{a.item.sku}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-red-700 dark:text-red-300 font-medium">
                        {a.currentStock}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {a.reorderLevel}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {a.item?.reorderQty ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[10rem]">
                        {a.item?.supplier?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize ${ALERT_STATUS_STYLES[a.status]}`}>
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {a.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => onAlertAction(a, 'acknowledge')}
                            >
                              <Eye className="size-3 mr-1" /> Ack
                            </Button>
                          )}
                          {(a.status === 'active' || a.status === 'acknowledged') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                              onClick={() => onAlertAction(a, 'resolve')}
                            >
                              <Check className="size-3 mr-1" /> Resolve
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            title="Create a purchase order"
                            onClick={() => {
                              // Switch to PO view via app store (if wired up)
                              toast.info('Open Purchase Orders to create a PO for this item.');
                            }}
                          >
                            <Plus className="size-3 mr-1" /> PO
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
