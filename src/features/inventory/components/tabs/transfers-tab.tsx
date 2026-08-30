'use client';

/**
 * TransfersTab — stock transfer history + "New Transfer" button.
 *
 * Extracted from src/components/views/inventory-view.tsx (Phase 6B1).
 *
 * Pure presentational component. The transfers list + loading state are owned
 * by the parent. The "New Transfer" button is disabled when there are no
 * active items (parent passes `hasItems` boolean). The button click calls
 * `onNewTransfer` to open the TransferFormDialog (owned by the parent).
 *
 * The "From → To" cell renders warehouse-or-employee UUIDs truncated to 8
 * chars (matches the original inventory-view.tsx format).
 */

import { Plus, Truck, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/format-utils';
import {
  TRANSFER_STATUS_STYLES, safeParseItems,
} from '../../utils/inventory-helpers';
import type { StockTransfer } from '../../types';

export function TransfersTab({
  transfers,
  transfersLoading,
  hasItems,
  onNewTransfer,
}: {
  transfers: StockTransfer[];
  transfersLoading: boolean;
  hasItems: boolean;
  onNewTransfer: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={onNewTransfer}
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={!hasItems}
        >
          <Plus className="size-4 mr-1.5" /> New Transfer
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {transfersLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transfers.length === 0 ? (
            <div className="p-10 sm:p-16 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-muted">
                <Truck className="size-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold">No stock transfers yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Move stock between warehouses or employees.
              </p>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-24rem)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>From → To</TableHead>
                    <TableHead className="w-32">Items</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-32">Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((t) => {
                    const parsedItems = safeParseItems(t.itemsJson);
                    const fromLabel = t.fromWarehouseId
                      ? `Warehouse ${t.fromWarehouseId.slice(0, 8)}`
                      : t.fromEmployeeId
                        ? `Employee ${t.fromEmployeeId.slice(0, 8)}`
                        : '—';
                    const toLabel = t.toWarehouseId
                      ? `Warehouse ${t.toWarehouseId.slice(0, 8)}`
                      : t.toEmployeeId
                        ? `Employee ${t.toEmployeeId.slice(0, 8)}`
                        : '—';
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="truncate max-w-[10rem]">{fromLabel}</span>
                            <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[10rem]">{toLabel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {parsedItems.length} {parsedItems.length === 1 ? 'line' : 'lines'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={TRANSFER_STATUS_STYLES[t.status]}>
                            {t.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(t.transferDate)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[16rem]">
                          {t.notes || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
