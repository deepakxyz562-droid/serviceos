'use client';

/**
 * PaymentsTab — paid-invoices summary + payments list.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 *
 * "Payments" here means paid invoices — there is no separate `payments`
 * slice in the 360° API. The tab computes `totalPaid` + `avgPayment` from
 * the paid subset of `invoices` and renders one row per paid invoice.
 *
 * Pure presentational component. The parent owns the `invoices` array +
 * `customer360Loading` flag + the `format` currency formatter.
 */

import { DollarSign, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDate } from '../../utils/customer-helpers';
import type { CurrencyFormatFn } from '../../types';

interface PaymentsTabProps {
  invoices: any[];
  customer360Loading: boolean;
  format: CurrencyFormatFn;
}

export function PaymentsTab({
  invoices,
  customer360Loading,
  format,
}: PaymentsTabProps) {
  const paidInvoices = invoices.filter((i: any) => i.status === 'paid');
  const totalPaid = paidInvoices.reduce((s: number, i: any) => s + (i.total || 0), 0);
  const avgPayment = paidInvoices.length > 0 ? totalPaid / paidInvoices.length : 0;

  return (
    <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
      <div className="p-5 space-y-4">
        {(() => {
          if (customer360Loading) {
            return Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ));
          }
          if (paidInvoices.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <DollarSign className="size-10 text-muted-foreground mb-3" />
                <h3 className="text-base font-semibold text-foreground">No payments recorded</h3>
                <p className="text-xs text-muted-foreground mt-1">Paid invoices will appear here</p>
              </div>
            );
          }
          return (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card rounded-xl p-3 text-center border-t-2 border-t-emerald-500 shadow-sm">
                  <p className="text-lg font-extrabold text-emerald-500">{format(totalPaid)}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Total Paid</p>
                </div>
                <div className="bg-card rounded-xl p-3 text-center border-t-2 border-t-emerald-500 shadow-sm">
                  <p className="text-lg font-extrabold text-foreground">{paidInvoices.length}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Payments</p>
                </div>
                <div className="bg-card rounded-xl p-3 text-center border-t-2 border-t-sky-500 shadow-sm">
                  <p className="text-lg font-extrabold text-foreground">{format(avgPayment)}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Avg Payment</p>
                </div>
              </div>
              <div className="space-y-2">
                {paidInvoices.map((inv: any) => (
                  <div key={inv.id} className="bg-card rounded-xl border border-border p-3 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="size-3.5 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-foreground">{inv.number || 'Invoice'}</span>
                          <p className="text-xs text-muted-foreground">
                            {inv.paidAt ? `Paid ${formatDate(inv.paidAt)}` : formatDate(inv.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-emerald-400">{format(inv.total)}</p>
                        <Badge variant="outline" className={cn('text-[10px] rounded-md bg-emerald-500/10 text-emerald-400 border-emerald-700')}>Paid</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>
    </ScrollArea>
  );
}
