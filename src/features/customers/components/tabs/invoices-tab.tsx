'use client';

/**
 * InvoicesTab — invoices grouped by status, with a fallback "Other" bucket.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 *
 * The grouping uses `invoiceStatusConfig` (from customer-helpers) as the
 * single source of truth for labels / colors / icons. The canonical order
 * is paid → sent → pending_approval → pending → overdue → draft →
 * cancelled; any unrecognized status renders under an "Other" fallback so
 * no invoice is ever hidden.
 *
 * Pure presentational component. The parent owns the `invoices` array +
 * `customer360Loading` flag + the `format` currency formatter.
 */

import { Receipt, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  formatDate,
  invoiceStatusConfig,
} from '../../utils/customer-helpers';
import type { CurrencyFormatFn, InvoiceStatusConfig } from '../../types';

interface InvoicesTabProps {
  invoices: any[];
  customer360Loading: boolean;
  format: CurrencyFormatFn;
}

const STATUS_ORDER = ['paid', 'sent', 'pending_approval', 'pending', 'overdue', 'draft', 'cancelled'] as const;
const FALLBACK_CFG: InvoiceStatusConfig = {
  label: 'Other',
  color: 'text-muted-foreground',
  bg: 'bg-muted border-border',
  icon: FileText,
};

export function InvoicesTab({
  invoices,
  customer360Loading,
  format,
}: InvoicesTabProps) {
  return (
    <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
      <div className="p-5 space-y-6">
        {customer360Loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="size-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold text-foreground">No invoices</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Invoices for this customer will appear here
            </p>
          </div>
        ) : (
          (() => {
            // Group invoices by status.
            const groups = new Map<string, any[]>();
            for (const inv of invoices) {
              const status = inv.status || 'draft';
              if (!groups.has(status)) groups.set(status, []);
              groups.get(status)!.push(inv);
            }

            // Canonical groups (in display order) + any unrecognized statuses.
            const canonical = STATUS_ORDER.filter(s => groups.has(s));
            const others = [...groups.keys()].filter(s => !(STATUS_ORDER as readonly string[]).includes(s));

            return (
              <div className="space-y-6">
                {canonical.map(status => {
                  const cfg = invoiceStatusConfig[status] || FALLBACK_CFG;
                  const StatusIcon = cfg.icon || FileText;
                  const groupInvoices = groups.get(status)!;
                  return (
                    <div key={status} className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <StatusIcon className={cn('size-3.5', cfg.color)} /> {cfg.label}
                        <span className="text-muted-foreground/60 normal-case font-normal">({groupInvoices.length})</span>
                      </h4>
                      {groupInvoices.map((inv: any) => {
                        const invCfg = invoiceStatusConfig[inv.status] || FALLBACK_CFG;
                        const InvIcon = invCfg.icon || FileText;
                        return (
                          <div
                            key={inv.id}
                            className={cn(
                              'flex items-center justify-between p-3 bg-card rounded-xl border border-border hover:shadow-sm transition-all duration-200',
                              status === 'overdue' && 'border-destructive/30 bg-destructive/5',
                              status === 'draft' && 'opacity-70',
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn('size-8 rounded-full flex items-center justify-center shrink-0', invCfg.bg)}>
                                <InvIcon className={cn('size-3.5', invCfg.color)} />
                              </div>
                              <div className="min-w-0">
                                <p className={cn('text-sm font-medium', status === 'draft' ? 'text-muted-foreground' : 'text-foreground')}>
                                  {inv.number || inv.invoiceNumber || 'Invoice'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(inv.createdAt)}
                                  {inv.paidAt && status === 'paid' ? ` \u00B7 Paid ${formatDate(inv.paidAt)}` : ''}
                                  {inv.dueDate && status !== 'paid' ? ` \u00B7 Due ${formatDate(inv.dueDate)}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={cn('text-sm font-bold', invCfg.color)}>
                                {format(inv.total)}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn('text-[10px] rounded-md', invCfg.bg, invCfg.color)}
                              >
                                {invCfg.label}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Fallback: any invoices with unrecognized statuses */}
                {others.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <FileText className="size-3.5 text-muted-foreground" /> Other
                      <span className="text-muted-foreground/60 normal-case font-normal">
                        ({others.reduce((n, s) => n + groups.get(s)!.length, 0)})
                      </span>
                    </h4>
                    {others.flatMap(status =>
                      groups.get(status)!.map((inv: any) => {
                        const invCfg = FALLBACK_CFG;
                        const InvIcon = invCfg.icon;
                        return (
                          <div
                            key={inv.id}
                            className="flex items-center justify-between p-3 bg-card rounded-xl border border-border hover:shadow-sm transition-all duration-200"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn('size-8 rounded-full flex items-center justify-center shrink-0', invCfg.bg)}>
                                <InvIcon className={cn('size-3.5', invCfg.color)} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {inv.number || inv.invoiceNumber || 'Invoice'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(inv.createdAt)}
                                  {inv.dueDate ? ` \u00B7 Due ${formatDate(inv.dueDate)}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={cn('text-sm font-bold', invCfg.color)}>
                                {format(inv.total)}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn('text-[10px] rounded-md', invCfg.bg, invCfg.color)}
                              >
                                {inv.status || 'unknown'}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>
    </ScrollArea>
  );
}
