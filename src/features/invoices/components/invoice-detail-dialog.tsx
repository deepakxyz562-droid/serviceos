'use client';

/**
 * InvoiceDetailDialog — Phase 5A extraction from invoices-view.tsx.
 *
 * Replaces the inline legacy "Invoice Detail" modal Dialog that used to live
 * inside the parent InvoicesView component's render. This is the small
 * max-w-lg modal retained for backward-compat with code paths that still call
 * `openDetailDialog()` — the primary "click row / View Details" entry points
 * now route through the full-page `InvoiceDetailPage` instead. The legacy
 * dialog renders:
 *
 *   - Dialog header (Receipt icon + invoice number + invoiceType badge)
 *   - Status & date row (status badge + created/due/paid labels)
 *   - Linked Job / Assigned Employee / Customer contact info panels
 *   - Currency info panel (only when invoice currency ≠ company currency)
 *   - Line items table (Description / Qty / Rate / Amount)
 *   - Totals block (Subtotal / Tax / Discount / Total)
 *   - Notes block (only when notes are present)
 *   - Dialog footer: Edit / Send / Approve & Send / Mark as Paid / Remind
 *     action buttons + PDF / Print secondary buttons
 *
 * The component is pure presentational — all state lives in the parent
 * InvoicesView and is threaded through as props.
 *
 * Extracted from src/components/views/invoices-view.tsx (Phase 5A refactor).
 */

import {
  Receipt, Pencil, Send, ShieldCheck, CheckCircle2, Bell, Loader2,
  Mail, MessageCircle, Download, Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatShortDate } from '@/features/invoices/utils/invoice-helpers';
import { renderStatusBadge } from '@/features/invoices/components/invoice-shared';
import type { Invoice, InvoiceAction } from '@/features/invoices/types';

// ── Props contract ──────────────────────────────────────────────────────────
// Mirrors the closure variables the original inline legacy Dialog reached
// into from the parent InvoicesView. Each prop below corresponds 1:1 to a
// parent state slot or handler; the wiring at the call site just spreads them
// in.
export interface InvoiceDetailDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Open-change handler (called with `false` on close). */
  onOpenChange: (open: boolean) => void;
  /** Invoice being viewed (null → dialog body is hidden, but the dialog
   *  shell is still mounted so the open/close transition works). */
  invoice: Invoice | null;
  /** Open the edit form (switches parent formMode to 'create'). */
  onEdit: (invoice: Invoice) => void;
  /** Fire an invoice lifecycle action (send / approve / mark_paid / reminder). */
  onInvoiceAction: (
    invoiceId: string,
    action: InvoiceAction
  ) => Promise<void> | void;
  /** Per-action loading flags (keyed by `${invoiceId}-${action}`). */
  actionLoading: Record<string, boolean>;
  /** Company currency code (e.g. "USD"). Used to decide whether to show the
   *  "Invoice currency ≠ Displayed in" notice. */
  currency: string;
  /** Currency formatter from useCompanyCurrency hook (e.g. $1,234.50). */
  format: (n: number, sourceCurrency?: string) => string;
}

/**
 * Legacy invoice detail modal dialog. Pure presentational — see props above.
 *
 * Returns the Dialog shell even when `invoice` is null so the close transition
 * animates correctly; the body is gated on `invoice` being truthy.
 */
export function InvoiceDetailDialog({
  open,
  onOpenChange,
  invoice,
  onEdit,
  onInvoiceAction,
  actionLoading,
  currency,
  format,
}: InvoiceDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        {invoice && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <Receipt className="size-5 text-emerald-600" />
                {invoice.number}
                {invoice.invoiceType && invoice.invoiceType !== 'standard' && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-5 px-2 ${
                      invoice.invoiceType === 'job_completion'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : invoice.invoiceType === 'deposit'
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {invoice.invoiceType === 'job_completion'
                      ? 'Auto · Job Completion'
                      : invoice.invoiceType === 'deposit'
                      ? 'Deposit'
                      : 'Recurring'}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Invoice for {invoice.customer}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[65vh] pr-1">
              <div className="space-y-5 pr-3">
                {/* Status & Date */}
                <div className="flex items-center justify-between">
                  {renderStatusBadge(invoice.status)}
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Created: {formatShortDate(invoice.createdAt)}</p>
                    <p>Due: {formatShortDate(invoice.dueDate)}</p>
                    {invoice.paidAt && (
                      <p className="text-emerald-600">
                        Paid: {formatShortDate(invoice.paidAt)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Linked Job */}
                {invoice.jobTitle && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <span className="text-muted-foreground">Linked Job: </span>
                    <span className="font-medium">{invoice.jobTitle}</span>
                  </div>
                )}

                {/* Assigned Employee */}
                {invoice.employeeName && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <span className="text-muted-foreground">
                      Assigned to:{' '}
                    </span>
                    <span className="font-medium">{invoice.employeeName}</span>
                  </div>
                )}

                {/* Customer contact */}
                {(invoice.customerEmail || invoice.customerPhone) && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                    {invoice.customerEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="size-3.5 text-muted-foreground" />
                        <span>{invoice.customerEmail}</span>
                      </div>
                    )}
                    {invoice.customerPhone && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="size-3.5 text-muted-foreground" />
                        <span>{invoice.customerPhone}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Currency Info */}
                {invoice.currency && invoice.currency !== currency && (
                  <div className="rounded-lg border bg-amber-50 border-amber-200 p-3 text-sm">
                    <div className="flex items-center gap-2 font-medium text-amber-800">
                      <Receipt className="size-4" />
                      Currency Info
                    </div>
                    <p className="mt-1 text-amber-700">
                      Invoice currency: {invoice.currency} · Displayed in:{' '}
                      {currency}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Line Items */}
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold mb-2">Line Items</h4>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Description</TableHead>
                          <TableHead className="text-xs text-right">Qty</TableHead>
                          <TableHead className="text-xs text-right">
                            Rate
                          </TableHead>
                          <TableHead className="text-xs text-right">
                            Amount
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.lineItems.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-sm py-3 text-center text-muted-foreground"
                            >
                              No line items
                            </TableCell>
                          </TableRow>
                        ) : (
                          invoice.lineItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-sm py-2">
                                {item.description}
                              </TableCell>
                              <TableCell className="text-sm py-2 text-right">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="text-sm py-2 text-right">
                                {format(item.rate)}
                              </TableCell>
                              <TableCell className="text-sm py-2 text-right font-medium">
                                {format(item.quantity * item.rate)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-full max-w-xs space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{format(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Tax ({Math.round(invoice.taxPercent)}%)
                      </span>
                      <span>{format(invoice.taxAmount)}</span>
                    </div>
                    {invoice.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount</span>
                        <span>-{format(invoice.discount)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-base font-bold">
                      <span>Total</span>
                      <span className="text-emerald-700">
                        {format(invoice.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Notes</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {invoice.notes}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <div className="flex gap-2 flex-wrap flex-1">
                <Button variant="outline" onClick={() => onEdit(invoice)}>
                  <Pencil className="size-4 mr-1.5" /> Edit
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={
                    invoice.status === 'paid' ||
                    !!actionLoading[`${invoice.id}-send`]
                  }
                  onClick={() => onInvoiceAction(invoice.id, 'send')}
                >
                  {actionLoading[`${invoice.id}-send`] ? (
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                  ) : (
                    <Send className="size-4 mr-1.5" />
                  )}
                  Send
                </Button>
                {invoice.status === 'pending_approval' && (
                  <Button
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    disabled={!!actionLoading[`${invoice.id}-approve`]}
                    onClick={() => onInvoiceAction(invoice.id, 'approve')}
                  >
                    {actionLoading[`${invoice.id}-approve`] ? (
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="size-4 mr-1.5" />
                    )}
                    Approve &amp; Send
                  </Button>
                )}
                {invoice.status !== 'paid' && (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!!actionLoading[`${invoice.id}-mark_paid`]}
                    onClick={() => onInvoiceAction(invoice.id, 'mark_paid')}
                  >
                    {actionLoading[`${invoice.id}-mark_paid`] ? (
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4 mr-1.5" />
                    )}
                    Mark as Paid
                  </Button>
                )}
                <Button
                  variant="outline"
                  disabled={!!actionLoading[`${invoice.id}-reminder`]}
                  onClick={() => onInvoiceAction(invoice.id, 'reminder')}
                >
                  {actionLoading[`${invoice.id}-reminder`] ? (
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                  ) : (
                    <Bell className="size-4 mr-1.5" />
                  )}
                  Remind
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      `/api/invoices/${invoice.id}/print`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                >
                  <Download className="size-4 mr-1.5" /> PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      `/api/invoices/${invoice.id}/print`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                >
                  <Printer className="size-4 mr-1.5" /> Print
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
