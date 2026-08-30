'use client';

/**
 * InvoiceDetailPage — Phase 5A extraction from invoices-view.tsx.
 *
 * Replaces the inline `renderInvoiceDetailPage()` closure that used to live
 * inside the parent InvoicesView component. The detail page is the
 * Jobber-style full-page view that opens when an invoice row is clicked.
 * It renders:
 *
 *   1. Sticky page header (Back + title + Send / Approve / Mark-as-Paid /
 *      Re-open / Remind / Edit / More actions)
 *   2. Two-column layout:
 *      Left column:
 *        - Client card (name, billing/property address, phone, email)
 *        - Invoice details card (Invoice #, Invoice for, Status, Issued,
 *          Payment terms, Due date, Paid, Assigned to)
 *        - Product / Service card (line items table + totals block +
 *          invoice/account balance)
 *        - Contract / Disclaimer card (notes textarea fallback)
 *      Right column (sidebar):
 *        - Client view card (visibility toggles for quantities / unit prices
 *          / line-item totals / account balance / late stamp)
 *        - Notes card (linked note with employee avatar + add-note button)
 *
 * The component is a pure presentational extraction: ALL state lives in the
 * parent InvoicesView and is threaded through as props. Same JSX, same handler
 * wiring, same prop dependencies — moved to its own file so invoices-view.tsx
 * shrinks by ~480 lines.
 *
 * Extracted from src/components/views/invoices-view.tsx (Phase 5A refactor).
 */

import type { ReactNode } from 'react';
import {
  Receipt, Pencil, Send, ShieldCheck, CheckCircle2, RotateCcw,
  Bell, MoreHorizontal, Loader2, User, FileText, Briefcase,
  Phone, Mail, ScrollText, StickyNote, Eye, Plus,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { FormSectionCard } from '@/components/shared/form-section-card';
import { formatShortDate } from '@/features/invoices/utils/invoice-helpers';
import { renderStatusBadge } from '@/features/invoices/components/invoice-shared';
import type {
  Customer,
  Invoice,
  InvoiceAction,
} from '@/features/invoices/types';

// ── Props contract ──────────────────────────────────────────────────────────
// Mirrors the closure variables the original `renderInvoiceDetailPage()`
// reached into from the parent InvoicesView. Each prop below corresponds 1:1
// to a parent state slot or handler; the wiring at the call site just spreads
// them in.
export interface InvoiceDetailPageProps {
  /** The invoice being viewed (null → render nothing). */
  invoice: Invoice | null;
  /** All loaded customers — used to look up the linked customer's billing
   *  address + contact details. */
  customers: Customer[];
  /** Back to list. */
  onBack: () => void;
  /** Open the edit form (switches parent formMode to 'create'). */
  onEdit: (invoice: Invoice) => void;
  /** Fire an invoice lifecycle action (send / approve / mark_paid / reminder). */
  onInvoiceAction: (
    invoiceId: string,
    action: InvoiceAction
  ) => Promise<void> | void;
  /** Re-open a paid invoice (PUT /api/invoices/:id with status='sent'). */
  onReopen: (invoice: Invoice) => Promise<void> | void;
  /** Per-action loading flags (keyed by `${invoiceId}-${action}`). */
  actionLoading: Record<string, boolean>;
  /** Currency formatter from useCompanyCurrency hook (e.g. $1,234.50). */
  format: (n: number, sourceCurrency?: string) => string;
}

/**
 * Full-page invoice detail view. Pure presentational — see props above.
 */
export function InvoiceDetailPage({
  invoice,
  customers,
  onBack,
  onEdit,
  onInvoiceAction,
  onReopen,
  actionLoading,
  format,
}: InvoiceDetailPageProps) {
  if (!invoice) return null;
  const inv = invoice;
  const lineItems = inv.lineItems || [];
  const invoiceTitle = inv.jobTitle || inv.customer || 'Invoice';

  // Look up the customer record (for the billing address / property address)
  // in the customers state array. Falls back gracefully if not found.
  const linkedCustomer = inv.customerId
    ? customers.find((c) => c.id === inv.customerId) || null
    : null;
  const billingAddress = linkedCustomer?.address || '';
  const customerPhone = inv.customerPhone || linkedCustomer?.phone || '';
  const customerEmail = inv.customerEmail || linkedCustomer?.email || '';

  // Status-aware flag for the primary lifecycle action in the sticky header.
  const canSend =
    inv.status === 'draft' ||
    inv.status === 'pending_approval' ||
    inv.status === 'sent';
  const isPaid = inv.status === 'paid';

  // Payment / balance breakdown for the totals block.
  const invoiceBalance = isPaid ? 0 : inv.total;
  const accountBalance = invoiceBalance;

  const detailRows: { label: string; value: ReactNode }[] = [
    {
      label: 'Invoice #',
      value: <span className="font-mono">{inv.number || '—'}</span>,
    },
    {
      label: 'Invoice for',
      value: inv.jobTitle ? (
        <span className="text-emerald-700 hover:underline cursor-pointer">
          {inv.jobTitle}
        </span>
      ) : (
        <span>{inv.customer}</span>
      ),
    },
    { label: 'Status', value: renderStatusBadge(inv.status) },
    { label: 'Issued', value: <span>{formatShortDate(inv.createdAt)}</span> },
    { label: 'Payment terms', value: <span>Due upon receipt</span> },
    { label: 'Due date', value: <span>{formatShortDate(inv.dueDate)}</span> },
    {
      label: 'Paid',
      value: inv.paidAt ? (
        <span className="text-emerald-700">
          {formatShortDate(inv.paidAt)}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    },
    ...(inv.employeeName
      ? [{ label: 'Assigned to', value: <span>{inv.employeeName}</span> }]
      : []),
  ];

  return (
    <div className="w-full space-y-6">
      {/* ─── Sticky page header (Back + title + actions) ────────── */}
      <div className="form-page-header -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 mb-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </button>
            <Separator
              orientation="vertical"
              className="h-8 bg-border/60 hidden sm:block"
            />
            <div className="flex items-center justify-center size-9 rounded-lg shrink-0 shadow-sm bg-emerald-600">
              <Receipt className="size-5 text-white" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight truncate">
                  {invoiceTitle}
                </h2>
                <button
                  type="button"
                  title="Edit invoice"
                  onClick={() => onEdit(inv)}
                  className="text-muted-foreground hover:text-emerald-600 transition-colors shrink-0"
                >
                  <Pencil className="size-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {inv.number && <span className="font-mono">#{inv.number}</span>}
                {inv.number && inv.customer && ' · '}
                {inv.customer && <span>{inv.customer}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Status-aware primary lifecycle action */}
            {canSend && (
              <button
                type="button"
                onClick={() => onInvoiceAction(inv.id, 'send')}
                disabled={!!actionLoading[`${inv.id}-send`]}
                className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                {actionLoading[`${inv.id}-send`] ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <Send className="size-4 mr-1.5" />
                )}
                Send
              </button>
            )}
            {inv.status === 'pending_approval' && (
              <button
                type="button"
                onClick={() => onInvoiceAction(inv.id, 'approve')}
                disabled={!!actionLoading[`${inv.id}-approve`]}
                className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                {actionLoading[`${inv.id}-approve`] ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <ShieldCheck className="size-4 mr-1.5" />
                )}
                Approve &amp; Send
              </button>
            )}
            {!isPaid && (
              <button
                type="button"
                onClick={() => onInvoiceAction(inv.id, 'mark_paid')}
                disabled={!!actionLoading[`${inv.id}-mark_paid`]}
                className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                {actionLoading[`${inv.id}-mark_paid`] ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4 mr-1.5" />
                )}
                Mark as Paid
              </button>
            )}
            {isPaid && (
              <button
                type="button"
                onClick={() => onReopen(inv)}
                disabled={!!actionLoading[`${inv.id}-reopen`]}
                className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                {actionLoading[`${inv.id}-reopen`] ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <RotateCcw className="size-4 mr-1.5" />
                )}
                Re-open Invoice
              </button>
            )}
            <button
              type="button"
              onClick={() => onInvoiceAction(inv.id, 'reminder')}
              disabled={!!actionLoading[`${inv.id}-reminder`]}
              className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted disabled:opacity-60 transition-colors"
            >
              {actionLoading[`${inv.id}-reminder`] ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Bell className="size-4 mr-1.5" />
              )}
              Remind
            </button>
            <button
              type="button"
              onClick={() => onEdit(inv)}
              className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors"
            >
              <Pencil className="size-4 mr-1.5" /> Edit
            </button>
            <button
              type="button"
              title="More actions"
              className="inline-flex items-center justify-center size-9 rounded-lg text-foreground border border-border bg-background hover:bg-muted transition-colors"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Two-column layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── Left column: main invoice details ── */}
        <div className="space-y-6 min-w-0">
          {/* Client card */}
          <FormSectionCard icon={User} title="Client">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                <p className="text-base font-semibold text-foreground">
                  {inv.customer}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Billing Address</p>
                {billingAddress ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {billingAddress}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No billing address on file
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Property Address</p>
                <p className="text-sm text-muted-foreground italic">
                  (Same as billing address)
                </p>
              </div>
              {customerPhone && (
                <a
                  href={`tel:${customerPhone}`}
                  className="flex items-center gap-2 text-sm text-emerald-700 hover:underline"
                >
                  <Phone className="size-4" /> {customerPhone}
                </a>
              )}
              {customerEmail && (
                <a
                  href={`mailto:${customerEmail}`}
                  className="flex items-center gap-2 text-sm text-emerald-700 hover:underline"
                >
                  <Mail className="size-4" /> {customerEmail}
                </a>
              )}
              {!customerPhone && !customerEmail && !billingAddress && (
                <p className="text-sm text-muted-foreground italic">
                  No contact details on file.
                </p>
              )}
            </div>
          </FormSectionCard>

          {/* Invoice details card */}
          <FormSectionCard icon={FileText} title="Invoice details">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {detailRows.map((row, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0"
                >
                  <dt className="text-sm text-muted-foreground shrink-0">
                    {row.label}
                  </dt>
                  <dd className="text-sm font-medium text-foreground text-right min-w-0 break-words">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </FormSectionCard>

          {/* Product / Service (line items) */}
          <FormSectionCard
            icon={Briefcase}
            title="Product / Service"
            action={
              <button
                type="button"
                onClick={() => onEdit(inv)}
                className="text-muted-foreground hover:text-emerald-600 transition-colors"
              >
                <Pencil className="size-4" />
              </button>
            }
          >
            {lineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No line items on this invoice.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                      <th className="px-2 py-2 font-medium">Line Item</th>
                      <th className="px-2 py-2 font-medium text-center">
                        Quantity
                      </th>
                      <th className="px-2 py-2 font-medium text-right">
                        Unit Price
                      </th>
                      <th className="px-2 py-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr
                        key={item.id || i}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="px-2 py-2.5 font-medium text-foreground">
                          {item.description || 'Custom item'}
                        </td>
                        <td className="px-2 py-2.5 text-center text-muted-foreground">
                          {item.quantity}
                        </td>
                        <td className="px-2 py-2.5 text-right text-muted-foreground">
                          {format(item.rate)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-semibold text-foreground">
                          {format(item.quantity * item.rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Right-aligned totals block */}
            <div className="mt-4 flex justify-end">
              <div className="w-full max-w-xs space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">{format(inv.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Tax ({Math.round(inv.taxPercent)}%)
                  </span>
                  <span className="text-foreground">{format(inv.taxAmount)}</span>
                </div>
                {inv.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-foreground">
                      -{format(inv.discount)}
                    </span>
                  </div>
                )}
                <Separator className="my-1 bg-border/60" />
                <div className="flex justify-between text-base font-bold">
                  <span className="text-foreground">Total</span>
                  <span className="text-emerald-700">{format(inv.total)}</span>
                </div>
                {isPaid && inv.paidAt && (
                  <div className="flex justify-between text-sm text-emerald-700 pt-1">
                    <span>
                      Payment
                      <span className="text-muted-foreground font-normal">
                        {' '}· {formatShortDate(inv.paidAt)}
                      </span>
                    </span>
                    <span>-{format(inv.total)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-1 border-t border-border/40">
                  <span className="text-muted-foreground">
                    Invoice balance
                  </span>
                  <span className="text-foreground font-medium">
                    {format(invoiceBalance)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Account balance
                  </span>
                  <span className="text-foreground font-medium">
                    {format(accountBalance)}
                  </span>
                </div>
              </div>
            </div>
          </FormSectionCard>

          {/* Contract / Disclaimer */}
          <FormSectionCard
            icon={ScrollText}
            title="Contract / Disclaimer"
            action={
              <button
                type="button"
                onClick={() => onEdit(inv)}
                className="text-muted-foreground hover:text-emerald-600 transition-colors"
              >
                <Pencil className="size-4" />
              </button>
            }
          >
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {inv.notes ||
                'Thank you for your business. Please contact us with any questions regarding this invoice.'}
            </p>
          </FormSectionCard>
        </div>

        {/* ── Right column: sidebar ── */}
        <div className="space-y-6 xl:sticky xl:top-4">
          {/* Client view */}
          <FormSectionCard icon={Eye} title="Client view">
            <div className="space-y-3">
              {[
                'Quantities',
                'Unit prices',
                'Line item totals',
                'Account balance',
                'Late stamp (if overdue)',
              ].map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-sm text-foreground">{label}</span>
                  <Switch checked disabled aria-label={label} />
                </div>
              ))}
            </div>
          </FormSectionCard>

          {/* Notes */}
          <FormSectionCard
            icon={StickyNote}
            title="Notes"
            action={
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                <Plus className="size-3.5" /> Add note
              </button>
            }
          >
            {inv.notes ? (
              <div className="space-y-3">
                <div className="rounded-md bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="size-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-semibold shrink-0">
                        {(inv.employeeName || 'Fieseros')
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {inv.employeeName || 'Fieseros'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatShortDate(inv.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className="text-[9px] h-4 px-1.5 bg-muted/40"
                      >
                        Linked note
                      </Badge>
                      <button
                        type="button"
                        onClick={() => onEdit(inv)}
                        className="text-muted-foreground hover:text-emerald-600 transition-colors"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {inv.notes}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No notes yet.
              </p>
            )}
          </FormSectionCard>
        </div>
      </div>
    </div>
  );
}
