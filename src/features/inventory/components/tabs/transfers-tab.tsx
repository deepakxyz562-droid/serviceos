'use client';

/**
 * TransfersTab — stock transfer history, human-friendly source/destination labels,
 * and 1-click goods receipt action.
 */

import { useState } from 'react';
import { Plus, Truck, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/format-utils';
import { authFetch, apiUrl } from '@/lib/api';
import {
  TRANSFER_STATUS_STYLES,
  safeParseItems,
} from '../../utils/inventory-helpers';
import type { StockTransfer } from '../../types';

export function TransfersTab({
  transfers,
  transfersLoading,
  hasItems,
  onNewTransfer,
  onTransferUpdated,
}: {
  transfers: StockTransfer[];
  transfersLoading: boolean;
  hasItems: boolean;
  onNewTransfer: () => void;
  onTransferUpdated?: () => void;
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleReceive = async (transfer: StockTransfer) => {
    setUpdatingId(transfer.id);
    try {
      const res = await authFetch(apiUrl(`/api/inventory/transfers/${transfer.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'received' }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to update transfer status');
      }

      toast.success('Stock transfer received & inventory updated');
      onTransferUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to receive transfer');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold">Stock Movements & Transfer Orders</h3>
          <p className="text-xs text-muted-foreground">
            Move items between Main Shop, branch warehouses, and field technician vans.
          </p>
        </div>
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
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Create a transfer order to restock technician vans or move items between warehouses.
              </p>
              <Button
                onClick={onNewTransfer}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={!hasItems}
              >
                <Plus className="size-4 mr-1.5" /> New Transfer
              </Button>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-24rem)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>From ➔ To</TableHead>
                    <TableHead className="w-40">Items Transferred</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-32 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((t) => {
                    const parsedItems = safeParseItems(t.itemsJson);

                    const fromLabel =
                      t.fromLocationName ||
                      (t.fromWarehouseId
                        ? `Warehouse ${t.fromWarehouseId.slice(0, 8)}`
                        : t.fromEmployeeId
                        ? `Technician ${t.fromEmployeeId.slice(0, 8)}`
                        : 'Main Shop');

                    const toLabel =
                      t.toLocationName ||
                      (t.toWarehouseId
                        ? `Warehouse ${t.toWarehouseId.slice(0, 8)}`
                        : t.toEmployeeId
                        ? `Technician ${t.toEmployeeId.slice(0, 8)}`
                        : 'Destination');

                    const isPending = t.status === 'pending' || t.status === 'in_transit';

                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <span className="truncate max-w-[11rem]" title={fromLabel}>
                              {fromLabel}
                            </span>
                            <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[11rem] text-emerald-700 dark:text-emerald-400" title={toLabel}>
                              {toLabel}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>
                            <span className="font-semibold">
                              {parsedItems.reduce((sum, item) => sum + (item.quantity || 0), 0)} units
                            </span>{' '}
                            <span className="text-xs text-muted-foreground">
                              ({parsedItems.length} {parsedItems.length === 1 ? 'SKU' : 'SKUs'})
                            </span>
                          </div>
                          {parsedItems.length > 0 && (
                            <div className="text-xs text-muted-foreground truncate max-w-[12rem]">
                              {parsedItems.map((pi) => `${pi.name || 'Item'} (${pi.quantity})`).join(', ')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={TRANSFER_STATUS_STYLES[t.status]}>
                            {t.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(t.transferDate)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[14rem]">
                          {t.notes || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {isPending ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs font-medium border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                              disabled={updatingId === t.id}
                              onClick={() => handleReceive(t)}
                            >
                              <CheckCircle className="size-3.5 mr-1 text-emerald-600" />
                              {updatingId === t.id ? 'Receiving...' : 'Receive'}
                            </Button>
                          ) : t.status === 'received' ? (
                            <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-1">
                              <CheckCircle className="size-3.5" /> Received
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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
