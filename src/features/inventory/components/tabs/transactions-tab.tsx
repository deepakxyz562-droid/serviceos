'use client';

/**
 * TransactionsTab — stock-movement audit log + date/type filters.
 *
 * Extracted from src/components/views/inventory-view.tsx (Phase 6B1).
 *
 * Pure presentational component. All filter state (type, start-date, end-date)
 * and the transactions list + loading state are owned by the parent. The
 * "clear filters" button calls the parent's setters to reset all 3 fields.
 *
 * Currency formatting uses the parent-supplied `format` (from useCompanyCurrency)
 * + `currency` (company currency code) — unit cost and total cost are stored
 * in the company currency on the server.
 */

import {
  Filter, X, ClipboardCheck, TrendingUp, TrendingDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatDateTime } from '@/lib/format-utils';
import { TX_TYPES, TX_TYPE_STYLES } from '../../utils/inventory-helpers';
import type { CurrencyFormatFn, StockTransaction } from '../../types';

export function TransactionsTab({
  transactions,
  transactionsLoading,
  txTypeFilter,
  setTxTypeFilter,
  txStartDate,
  setTxStartDate,
  txEndDate,
  setTxEndDate,
  format,
  currency,
}: {
  transactions: StockTransaction[];
  transactionsLoading: boolean;
  txTypeFilter: string;
  setTxTypeFilter: (v: string) => void;
  txStartDate: string;
  setTxStartDate: (v: string) => void;
  txEndDate: string;
  setTxEndDate: (v: string) => void;
  format: CurrencyFormatFn;
  currency: string;
}) {
  const hasFilters = txTypeFilter !== 'all' || txStartDate || txEndDate;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="size-4 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {TX_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 flex-1">
              <Label htmlFor="tx-start" className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
              <Input
                id="tx-start"
                type="date"
                value={txStartDate}
                onChange={(e) => setTxStartDate(e.target.value)}
                className="flex-1"
              />
              <Label htmlFor="tx-end" className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
              <Input
                id="tx-end"
                type="date"
                value={txEndDate}
                onChange={(e) => setTxEndDate(e.target.value)}
                className="flex-1"
              />
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setTxTypeFilter('all'); setTxStartDate(''); setTxEndDate(''); }}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {transactionsLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-10 sm:p-16 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-muted">
                <ClipboardCheck className="size-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold">No stock transactions</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Audit trail of purchases, sales, transfers, and adjustments will appear here.
              </p>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-28rem)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-40">Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-28">Type</TableHead>
                    <TableHead className="w-20">Direction</TableHead>
                    <TableHead className="text-right w-24">Qty</TableHead>
                    <TableHead className="text-right w-28">Unit Cost</TableHead>
                    <TableHead className="text-right w-28">Total</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="w-36">Performed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium truncate max-w-[14rem]">
                            {tx.item?.name || '—'}
                          </span>
                          {tx.item?.sku && (
                            <span className="font-mono text-[10px] text-muted-foreground">{tx.item.sku}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize ${TX_TYPE_STYLES[tx.type] || ''}`}>
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tx.direction === 'in' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                            <TrendingUp className="size-3.5" /> In
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-700 dark:text-red-300">
                            <TrendingDown className="size-3.5" /> Out
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{tx.quantity}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                        {format(tx.unitCost, currency)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums whitespace-nowrap font-medium">
                        {format(tx.totalCost, currency)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[12rem]">
                        {tx.reference || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[10rem]">
                        {tx.performedByName || '—'}
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
