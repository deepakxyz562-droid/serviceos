'use client';

/**
 * QuoteDetailPage — Phase 5B extraction from quotes-view.tsx.
 *
 * Replaces the inline `renderQuoteDetailPage()` closure that used to live
 * inside the parent QuotesView component. The detail page is the
 * Jobber-style full-page view that opens when a quote row is clicked
 * (formMode === 'detail'). It renders:
 *
 *   1. Sticky page header (Back + title + Create-Similar / Edit /
 *      Send-Email / More-actions dropdown)
 *   2. Two-column layout:
 *      Left column:
 *        - Client card (name, property address, phone, email, with a small
 *          More-actions dropdown for Edit Quote / Send Email)
 *        - Quote details card (Quote #, Created, Status, Valid until,
 *          Email sent, Currency)
 *        - Product / Service card (line items table + add-ons rows +
 *          totals block: Subtotal / Discount / Tax / Total)
 *        - Contract / Disclaimer card (quote.description or fallback
 *          boilerplate)
 *      Right column (sidebar):
 *        - Actions card (Send Email / Email Preview / Edit quote /
 *          Print / PDF)
 *        - Notes card (system "Linked note" + optional "Quote sent via
 *          Email" system note)
 *
 * The component is a pure presentational extraction: ALL state lives in the
 * parent QuotesView and is threaded through as props. Same JSX, same handler
 * wiring, same prop dependencies — moved to its own file so quotes-view.tsx
 * shrinks by ~350 lines.
 *
 * Extracted from src/components/views/quotes-view.tsx (Phase 5B refactor).
 */

import type { ReactNode } from 'react';
import {
  Receipt, Pencil, Edit3, MoreHorizontal, Mail, Copy, Eye,
  Trash2, Printer, User, FileText, Briefcase, Phone, MapPin,
  ScrollText, StickyNote, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FormSectionCard } from '@/components/shared/form-section-card';
import { cn } from '@/lib/utils';
import {
  STATUS_CONFIG,
  formatShortDate,
} from '@/features/quotes/utils/quote-helpers';
import { renderStatusBadge } from '@/features/quotes/components/quote-shared';
import type { Customer, Quote } from '@/features/quotes/types';

// ── Props contract ──────────────────────────────────────────────────────────
// Mirrors the closure variables the original `renderQuoteDetailPage()`
// reached into from the parent QuotesView. Each prop below corresponds 1:1
// to a parent state slot or handler; the wiring at the call site just spreads
// them in.
export interface QuoteDetailPageProps {
  /** The quote being viewed (null → render nothing). */
  quote: Quote | null;
  /** All loaded customers — used to look up the linked customer's property
   *  address + contact details. */
  customers: Customer[];
  /** Back to list (switches parent formMode back to 'list'). */
  onBack: () => void;
  /** Open the edit form (switches parent formMode to 'create'). */
  onEdit: (quote: Quote) => void;
  /** Open the New Quote form pre-filled with this quote's data. */
  onCreateSimilar: (quote: Quote) => void;
  /** Send the quote via email (POST /api/quotes/[id]/send-email). */
  onSendEmail: (quote: Quote) => void | Promise<void>;
  /** Open the Email Preview dialog for this quote. */
  onPreviewEmail: (quote: Quote) => void;
  /** Duplicate the quote (POST /api/quotes with this quote's data). */
  onDuplicate: (quote: Quote) => void | Promise<void>;
  /** Delete the quote (DELETE /api/quotes/[id]). */
  onDelete: (quoteId: string) => void | Promise<void>;
  /** Company base currency code (e.g. 'USD'). Used for the Currency row
   *  when quote.currency is missing. */
  currency: string;
  /** Currency formatter from useCompanyCurrency hook (e.g. $1,234.50). */
  format: (n: number, sourceCurrency?: string) => string;
}

/**
 * Full-page quote detail view. Pure presentational — see props above.
 */
export function QuoteDetailPage({
  quote,
  customers,
  onBack,
  onEdit,
  onCreateSimilar,
  onSendEmail,
  onPreviewEmail,
  onDuplicate,
  onDelete,
  currency,
  format,
}: QuoteDetailPageProps) {
  if (!quote) return null;

  const customer = customers.find((c) => c.id === quote.customerId);

  const detailRows: { label: string; value: ReactNode }[] = [
    { label: 'Quote #', value: <span className="font-mono">#{quote.id.slice(-6).toUpperCase()}</span> },
    { label: 'Created', value: <span>{formatShortDate(quote.createdAt)}</span> },
    {
      label: 'Status',
      value: (
        <span className="inline-flex items-center gap-1.5">
          <span className={cn('size-2 rounded-full', {
            'bg-gray-400': quote.status === 'draft',
            'bg-blue-500': quote.status === 'sent',
            'bg-emerald-500': quote.status === 'accepted',
            'bg-red-500': quote.status === 'rejected',
            'bg-amber-500': quote.status === 'expired',
          })} />
          <span className="capitalize">{STATUS_CONFIG[quote.status].label}</span>
        </span>
      ),
    },
    { label: 'Valid until', value: <span>{formatShortDate(quote.validUntil)}</span> },
    {
      label: 'Email sent',
      value: quote.emailSent || quote.whatsappSent
        ? <span className="text-emerald-700 font-medium">Yes</span>
        : <span className="text-muted-foreground">No</span>,
    },
    { label: 'Currency', value: <span>{quote.currency || currency}</span> },
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
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              <span className="hidden sm:inline">Back</span>
            </button>
            <Separator orientation="vertical" className="h-8 bg-border/60 hidden sm:block" />
            <div className="flex items-center justify-center size-9 rounded-lg shrink-0 shadow-sm bg-emerald-600">
              <Receipt className="size-5 text-white" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {renderStatusBadge(quote.status)}
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight truncate">{quote.title}</h2>
                <button title="Edit quote" onClick={() => onEdit(quote)} className="text-muted-foreground hover:text-emerald-600 transition-colors shrink-0">
                  <Pencil className="size-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">Quote for {quote.customerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => onCreateSimilar(quote)}
              title="Create similar quote"
              className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Copy className="size-4 mr-1.5" /> Create Similar Quote
            </button>
            <button
              type="button"
              onClick={() => onEdit(quote)}
              className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors"
            >
              <Edit3 className="size-4 mr-1.5" /> Edit
            </button>
            <button
              type="button"
              onClick={() => onSendEmail(quote)}
              title="Send via Email"
              className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Mail className="size-4 mr-1.5" />
              <span>Send Email</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button title="More actions" className="inline-flex items-center justify-center size-9 rounded-lg text-foreground border border-border bg-background hover:bg-muted transition-colors">
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onPreviewEmail(quote)}>
                  <Eye className="size-3.5 mr-2" /> Email Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(quote)}>
                  <Copy className="size-3.5 mr-2" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('PDF download coming soon')}>
                  <Printer className="size-3.5 mr-2" /> Print / PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(quote.id)}>
                  <Trash2 className="size-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ─── Two-column layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── Left column: main quote details ── */}
        <div className="space-y-6 min-w-0">
          {/* Client card */}
          <FormSectionCard icon={User} title="Client">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                  <p className="text-base font-semibold text-foreground truncate">{quote.customerName || 'No client linked'}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button title="Client actions" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                      <MoreHorizontal className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(quote)}>
                      <Edit3 className="size-3.5 mr-2" /> Edit Quote
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSendEmail(quote)}>
                      <Mail className="size-3.5 mr-2" /> Send Email
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Property Address</p>
                <div className="flex items-start gap-2 text-sm text-foreground mt-0.5">
                  <MapPin className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <span>{customer?.address || '—'}</span>
                </div>
              </div>
              {quote.customerPhone && (
                <a href={`tel:${quote.customerPhone}`} className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
                  <Phone className="size-4" /> {quote.customerPhone}
                </a>
              )}
              {customer?.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
                  <Mail className="size-4" /> {customer.email}
                </a>
              )}
              {!quote.customerPhone && !customer?.email && !customer?.address && (
                <p className="text-sm text-muted-foreground italic">No contact details on file.</p>
              )}
            </div>
          </FormSectionCard>

          {/* Quote details card */}
          <FormSectionCard icon={FileText} title="Quote details">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {detailRows.map((row, i) => (
                <div key={i} className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0">
                  <dt className="text-sm text-muted-foreground shrink-0">{row.label}</dt>
                  <dd className="text-sm font-medium text-foreground text-right min-w-0 break-words">{row.value}</dd>
                </div>
              ))}
            </dl>
          </FormSectionCard>

          {/* Product / Service card */}
          <FormSectionCard
            icon={Briefcase}
            title="Product / Service"
            action={
              <button onClick={() => onEdit(quote)} className="text-muted-foreground hover:text-emerald-600 transition-colors" title="Edit services">
                <Pencil className="size-4" />
              </button>
            }
          >
            {quote.services.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No line items added to this quote.</p>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                        <th className="px-2 py-2 font-medium">Line Item</th>
                        <th className="px-2 py-2 font-medium text-center">Quantity</th>
                        <th className="px-2 py-2 font-medium text-right">Unit Price</th>
                        <th className="px-2 py-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.services.map((s) => (
                        <tr key={s.id} className="border-b border-border/40 last:border-0">
                          <td className="px-2 py-2.5 font-medium text-foreground">{s.name || 'Custom item'}</td>
                          <td className="px-2 py-2.5 text-center text-muted-foreground">{s.quantity || 1}</td>
                          <td className="px-2 py-2.5 text-right text-muted-foreground">{format(s.price)}</td>
                          <td className="px-2 py-2.5 text-right font-semibold text-foreground">{format(s.price * s.quantity)}</td>
                        </tr>
                      ))}
                      {quote.addOns.map((a) => (
                        <tr key={a.id} className="border-b border-border/40 last:border-0 bg-muted/20">
                          <td className="px-2 py-2.5 font-medium text-foreground">
                            {a.name || 'Add-on'}
                            <span className="block text-xs text-muted-foreground font-normal">Add-on</span>
                          </td>
                          <td className="px-2 py-2.5 text-center text-muted-foreground">1</td>
                          <td className="px-2 py-2.5 text-right text-muted-foreground">{format(a.price)}</td>
                          <td className="px-2 py-2.5 text-right font-semibold text-foreground">{format(a.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end">
                  <div className="w-full max-w-xs space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{format(quote.subtotal)}</span>
                    </div>
                    {quote.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Discount {quote.discountType === 'percentage' ? `(${quote.discountValue}%)` : ''}
                        </span>
                        <span className="font-medium text-red-600">-{format(quote.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({quote.taxRate}%)</span>
                      <span className="font-medium">+{format(quote.tax)}</span>
                    </div>
                    <Separator className="my-1 bg-border/60" />
                    <div className="flex justify-between text-base font-bold">
                      <span>Total</span>
                      <span className="text-emerald-700">{format(quote.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </FormSectionCard>

          {/* Contract / Disclaimer card */}
          <FormSectionCard
            icon={ScrollText}
            title="Contract / Disclaimer"
            action={
              <button onClick={() => onEdit(quote)} className="text-muted-foreground hover:text-emerald-600 transition-colors" title="Edit terms">
                <Pencil className="size-4" />
              </button>
            }
          >
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {quote.description || 'This quote is valid for the next 30 days, after which values may be subject to change. Please review the line items above and let us know if you have any questions or would like to make adjustments.'}
            </p>
          </FormSectionCard>
        </div>

        {/* ── Right column: sidebar ── */}
        <div className="space-y-6 xl:sticky xl:top-4">
          {/* Quick actions */}
          <FormSectionCard icon={Briefcase} title="Actions">
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => onSendEmail(quote)}
                className="inline-flex items-center justify-start gap-2 h-9 px-3 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Mail className="size-4" /> Send Email
              </button>
              <button
                onClick={() => { onPreviewEmail(quote); }}
                className="inline-flex items-center justify-start gap-2 h-9 px-3 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors"
              >
                <Eye className="size-4" /> Email Preview
              </button>
              <button
                onClick={() => onEdit(quote)}
                className="inline-flex items-center justify-start gap-2 h-9 px-3 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors"
              >
                <Edit3 className="size-4" /> Edit quote
              </button>
              <button
                onClick={() => toast.info('PDF download coming soon')}
                className="inline-flex items-center justify-start gap-2 h-9 px-3 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors"
              >
                <Printer className="size-4" /> Print / PDF
              </button>
            </div>
          </FormSectionCard>

          {/* Notes */}
          <FormSectionCard
            icon={StickyNote}
            title="Notes"
            action={
              <button
                onClick={() => toast.info('Notes editor coming soon')}
                className="inline-flex items-center justify-center size-7 rounded-md text-emerald-700 border border-emerald-600/40 bg-emerald-500/5 hover:bg-emerald-500/15 transition-colors"
                title="Add note"
              >
                <Plus className="size-4" />
              </button>
            }
          >
            <div className="space-y-2">
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-medium text-foreground">Fieseros</p>
                  <p className="text-[11px] text-muted-foreground">{formatShortDate(quote.createdAt)}</p>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {quote.description || 'Quote created.'}
                </p>
                <div className="mt-2">
                  <Badge variant="outline" className="text-[10px] h-5 bg-muted/40 text-muted-foreground border-border/60">
                    Linked note
                  </Badge>
                </div>
              </div>
              {(quote.emailSent || quote.whatsappSent) && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-medium text-emerald-800">System</p>
                    <p className="text-[11px] text-emerald-700">{formatShortDate(quote.createdAt)}</p>
                  </div>
                  <p className="text-sm text-emerald-900">Quote sent via Email</p>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-[10px] h-5 bg-emerald-100 text-emerald-700 border-emerald-200">
                      <Mail className="size-3 mr-1" /> Sent
                    </Badge>
                  </div>
                </div>
              )}
              {!quote.emailSent && !quote.whatsappSent && !quote.description && (
                <p className="text-sm text-muted-foreground italic">No notes yet.</p>
              )}
            </div>
          </FormSectionCard>
        </div>
      </div>
    </div>
  );
}
