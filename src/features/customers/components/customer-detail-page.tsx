'use client';

/**
 * CustomerDetailPage — Phase 6D extraction from crm-view.tsx.
 *
 * Replaces the inline `if (formMode === 'detail' && selectedCustomer)` block
 * that lived inside the parent CrmView component. This is the full-page
 * customer profile view (a.k.a. "Customer 360") that opens when a customer
 * row is clicked.
 *
 * Renders:
 *   1. Back button → returns to the customer list.
 *   2. Customer header card — avatar + name + portal-status badge + contact
 *      info (phone/email/address/whatsapp/added-date) + action buttons
 *      (Edit + dropdown: Send Message / Send Portal Invite / Disable Portal /
 *       Delete).
 *   3. Profile Tabs:
 *      - Overview     — KPI cards (jobs/assets/timeline/since) + customer
 *                       information grid.
 *      - Timeline     — scrollable activity feed.
 *      - Jobs         — table of jobs for this customer.
 *      - Quotes       — summary + clickable quote rows.
 *      - Invoices     — summary + status-grouped invoice rows.
 *      - Payments     — derived from paid invoices.
 *      - Communication — placeholder.
 *      - Notes        — note textarea + saved-notes list.
 *   4. <CustomerFormSheet /> — for editing the customer from the detail page.
 *
 * Pure presentational — all state and handlers live in the parent CrmView and
 * are threaded through as props. Same JSX, same handler wiring — moved to its
 * own file so crm-view.tsx shrinks by ~570 lines.
 *
 * Extracted from src/components/views/crm-view.tsx (Phase 6D refactor).
 */

import {
  ArrowLeft, Phone, Mail, MapPin, Pencil, Trash2, MoreHorizontal,
  Check, Clock, UserPlus, Ban, MessageSquare, RefreshCw, Plus,
  Briefcase, Wrench, FileText, Receipt, CreditCard, Calendar,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CustomerFormSheet } from '@/components/customer/customer-form-sheet';
import {
  formatDate,
  formatDateTime,
  initials,
  formatMoney,
  invoiceStatusConfig,
  quoteStatusConfig,
  INVOICE_STATUS_ORDER,
} from '@/features/customers/utils/crm-helpers';
import type {
  CrmCustomer,
  TimelineEntry,
  JobRef,
  AssetRef,
  QuoteRef,
  InvoiceRef,
} from '@/features/customers/types/crm-detail-types';

// ─── Props contract ──────────────────────────────────────────────────────────

export interface CustomerDetailPageProps {
  /** The customer being viewed (parent has already checked this is non-null). */
  customer: CrmCustomer;
  /** Currently-active profile tab. */
  detailTab: string;
  /** Switch profile tab. */
  onDetailTabChange: (tab: string) => void;
  /** Return to the customer list. */
  onBack: () => void;
  /** Edit-customer handler (opens CustomerFormSheet). */
  onEdit: (c: CrmCustomer) => void;
  /** Delete-customer handler. */
  onDelete: (id: string) => void;
  /** Navigate to the omnichannel view (for "Send Message"). */
  onSendMessage: () => void;
  /** Send portal invite handler. */
  onSendInvite: (c: CrmCustomer) => void;
  /** Disable portal handler. */
  onDisablePortal: (c: CrmCustomer) => void;

  // ── Timeline ─────────────────────────────────────────────────────────────
  timeline: TimelineEntry[];
  timelineLoading: boolean;

  // ── Jobs ──────────────────────────────────────────────────────────────────
  jobs: JobRef[];
  jobsLoading: boolean;
  onOpenJob: (id: string) => void;

  // ── Assets (used by Overview tab only) ───────────────────────────────────
  assets: AssetRef[];

  // ── Quotes ────────────────────────────────────────────────────────────────
  quotes: QuoteRef[];
  quotesLoading: boolean;
  onOpenQuote: (id: string) => void;

  // ── Invoices + Payments (payments derived from invoices) ─────────────────
  invoices: InvoiceRef[];
  invoicesLoading: boolean;
  onOpenInvoice: (id: string) => void;

  // ── Notes ──────────────────────────────────────────────────────────────────
  notes: string;
  onNotesChange: (notes: string) => void;
  notesLoading: boolean;
  onSaveNote: () => void;

  // ── Customer form sheet (parent owns open + edit state) ───────────────────
  showAddCustomer: boolean;
  onShowAddCustomerChange: (open: boolean) => void;
  editingCustomer: CrmCustomer | null;
  onCustomerSaved: () => void;
}

/**
 * Full-page customer profile (Customer 360°). Pure presentational — see props
 * above. The parent CrmView owns all state and handlers.
 */
export function CustomerDetailPage({
  customer: c,
  detailTab,
  onDetailTabChange,
  onBack,
  onEdit,
  onDelete,
  onSendMessage,
  onSendInvite,
  onDisablePortal,
  timeline,
  timelineLoading,
  jobs,
  jobsLoading,
  onOpenJob,
  assets,
  quotes,
  quotesLoading,
  onOpenQuote,
  invoices,
  invoicesLoading,
  onOpenInvoice,
  notes,
  onNotesChange,
  notesLoading,
  onSaveNote,
  showAddCustomer,
  onShowAddCustomerChange,
  editingCustomer,
  onCustomerSaved,
}: CustomerDetailPageProps) {
  return (
    <div className="space-y-4 w-full">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
        <ArrowLeft className="size-4" /> Back to Customers
      </Button>

      {/* Customer Header */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <Avatar className="size-16 shrink-0">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-medium">
              {initials(c.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{c.name}</h1>
              {c.invitationStatus === 'accepted' ? (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">
                  <Check className="size-3 mr-1" /> Active
                </Badge>
              ) : c.invitationStatus === 'pending' ? (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">
                  <Clock className="size-3 mr-1" /> Pending
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">Lead</Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Phone className="size-4 shrink-0" /> {c.phone}
              </span>
              {c.email && (
                <span className="flex items-center gap-2 truncate">
                  <Mail className="size-4 shrink-0" /> {c.email}
                </span>
              )}
              {c.address && (
                <span className="flex items-center gap-2 truncate">
                  <MapPin className="size-4 shrink-0" /> {c.address}
                </span>
              )}
              {c.whatsappId && (
                <span className="flex items-center gap-2">
                  <MessageSquare className="size-4 shrink-0 text-emerald-500" /> {c.whatsappId}
                </span>
              )}
              <span className="flex items-center gap-2">
                <Calendar className="size-4 shrink-0" /> Added {formatDate(c.createdAt)}
              </span>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => onEdit(c)}>
              <Pencil className="size-3.5 mr-1" /> Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onSendMessage}>
                  <MessageSquare className="size-3.5 mr-2" /> Send Message
                </DropdownMenuItem>
                {c.invitationStatus === 'accepted' ? (
                  <DropdownMenuItem variant="destructive" onClick={() => onDisablePortal(c)}>
                    <Ban className="size-3.5 mr-2" /> Disable Portal
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onSendInvite(c)}>
                    <UserPlus className="size-3.5 mr-2" /> Send Portal Invite
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(c.id)}>
                  <Trash2 className="size-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      {/* Profile Tabs */}
      <Tabs value={detailTab} onValueChange={onDetailTabChange}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="overview" className="gap-1.5">Overview</TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5">Timeline</TabsTrigger>
            <TabsTrigger value="jobs" className="gap-1.5">Jobs</TabsTrigger>
            <TabsTrigger value="quotes" className="gap-1.5">Quotes</TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1.5">Invoices</TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5">Payments</TabsTrigger>
            <TabsTrigger value="communication" className="gap-1.5">Communication</TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5">Notes</TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="size-4 text-emerald-500" />
                <p className="text-xs text-muted-foreground">Total Jobs</p>
              </div>
              <p className="text-2xl font-bold">{jobs.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wrench className="size-4 text-sky-500" />
                <p className="text-xs text-muted-foreground">Assets</p>
              </div>
              <p className="text-2xl font-bold">{assets.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="size-4 text-purple-500" />
                <p className="text-xs text-muted-foreground">Timeline Events</p>
              </div>
              <p className="text-2xl font-bold">{timeline.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="size-4 text-amber-500" />
                <p className="text-xs text-muted-foreground">Customer Since</p>
              </div>
              <p className="text-sm font-bold pt-1">{formatDate(c.createdAt)}</p>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                  <p className="font-medium">{c.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p className="font-medium">{c.email || '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Address</p>
                  <p className="font-medium">{c.address || '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">WhatsApp ID</p>
                  <p className="font-medium">{c.whatsappId || '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Portal Status</p>
                  <p className="font-medium capitalize">{c.invitationStatus || 'none'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Last Updated</p>
                  <p className="font-medium">{formatDateTime(c.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity Timeline</CardTitle>
              <CardDescription>All interactions and events for this customer</CardDescription>
            </CardHeader>
            <CardContent>
              {timelineLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-12 bg-muted rounded" />)}
                </div>
              ) : timeline.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="size-10 mb-2 opacity-20" />
                  <p>No activity yet</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-3">
                    {timeline.map((entry) => (
                      <div key={entry.id} className="flex gap-3 pb-3 border-b last:border-0">
                        <div className="size-8 shrink-0 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-medium">
                          {(entry.actorName || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{entry.title}</p>
                            <Badge variant="outline" className="text-[10px] capitalize">{entry.entryType}</Badge>
                          </div>
                          {entry.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">{entry.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDateTime(entry.eventDate)}
                            {entry.actorName && ` · ${entry.actorName}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="animate-pulse h-10 bg-muted rounded" />)}</div>
              ) : jobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Briefcase className="size-10 mb-2 opacity-20" />
                  <p>No jobs yet</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map(job => (
                        <TableRow
                          key={job.id}
                          onClick={() => onOpenJob(job.id)}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <TableCell className="font-medium text-sm">{job.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">{job.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {job.scheduledDate ? formatDate(job.scheduledDate) : '--'}
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            <span className="inline-flex items-center gap-1.5">
                              {job.totalAmount ? `₹${job.totalAmount.toLocaleString('en-IN')}` : '--'}
                              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotes Tab */}
        <TabsContent value="quotes" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quotes</CardTitle>
              <CardDescription>Quotes created for this customer</CardDescription>
            </CardHeader>
            <CardContent>
              {quotesLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="animate-pulse h-16 bg-muted rounded" />)}</div>
              ) : quotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Receipt className="size-10 mb-2 opacity-20" />
                  <p>No quotes yet</p>
                  <p className="text-xs">Quotes created for this customer will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold">{quotes.length}</p>
                      <p className="text-[10px] text-muted-foreground">Total Quotes</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold text-emerald-600">{quotes.filter(q => q.status === 'accepted').length}</p>
                      <p className="text-[10px] text-muted-foreground">Accepted</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold">{formatMoney(quotes.reduce((s, q) => s + (q.total || 0), 0))}</p>
                      <p className="text-[10px] text-muted-foreground">Total Value</p>
                    </div>
                  </div>
                  {/* Quote rows */}
                  <div className="max-h-[500px] overflow-auto space-y-2">
                    {quotes.map(quote => {
                      const cfg = quoteStatusConfig[quote.status] || { label: quote.status, color: 'text-muted-foreground', bg: 'bg-muted border-border' };
                      const items = (() => { try { return JSON.parse(quote.itemsJson || '[]'); } catch { return []; } })();
                      return (
                        <div
                          key={quote.id}
                          onClick={() => onOpenQuote(quote.id)}
                          className="rounded-lg border p-3 hover:shadow-sm hover:bg-muted/40 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="size-8 shrink-0 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                <Receipt className="size-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{quote.title || 'Untitled Quote'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(quote.createdAt)}
                                  {items.length > 0 && ` · ${items.length} item${items.length === 1 ? '' : 's'}`}
                                  {quote.validUntil && ` · valid until ${formatDate(quote.validUntil)}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className={cn('text-xs', cfg.color, cfg.bg)}>{cfg.label}</Badge>
                              <span className="text-sm font-semibold">{formatMoney(quote.total, quote.currency)}</span>
                              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab — dynamic status grouping */}
        <TabsContent value="invoices" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoices</CardTitle>
              <CardDescription>Invoices issued to this customer</CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="animate-pulse h-16 bg-muted rounded" />)}</div>
              ) : invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="size-10 mb-2 opacity-20" />
                  <p>No invoices yet</p>
                  <p className="text-xs">Invoices for this customer will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold">{invoices.length}</p>
                      <p className="text-[10px] text-muted-foreground">Total Invoices</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold text-emerald-600">{formatMoney(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0))}</p>
                      <p className="text-[10px] text-muted-foreground">Paid</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold text-amber-600">{formatMoney(invoices.filter(i => ['sent', 'pending_approval', 'pending', 'overdue'].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0))}</p>
                      <p className="text-[10px] text-muted-foreground">Outstanding</p>
                    </div>
                  </div>
                  {/* Group by status — canonical order, no invoice dropped */}
                  {(() => {
                    const groups = new Map<string, InvoiceRef[]>();
                    for (const inv of invoices) {
                      const arr = groups.get(inv.status) || [];
                      arr.push(inv);
                      groups.set(inv.status, arr);
                    }
                    const orderedStatuses = [
                      ...INVOICE_STATUS_ORDER.filter(s => groups.has(s)),
                      ...Array.from(groups.keys()).filter(s => !INVOICE_STATUS_ORDER.includes(s)),
                    ];
                    return orderedStatuses.map(status => {
                      const cfg = invoiceStatusConfig[status] || { label: status.charAt(0).toUpperCase() + status.slice(1), color: 'text-muted-foreground', bg: 'bg-muted border-border' };
                      const rows = groups.get(status)!;
                      return (
                        <div key={status} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className={cn('text-xs', cfg.color, cfg.bg)}>{cfg.label}</Badge>
                            <span className="text-xs text-muted-foreground">{rows.length} invoice{rows.length === 1 ? '' : 's'}</span>
                          </div>
                          <div className="space-y-2">
                            {rows.map(inv => (
                              <div
                                key={inv.id}
                                onClick={() => onOpenInvoice(inv.id)}
                                className="rounded-lg border p-3 hover:shadow-sm hover:bg-muted/40 transition-colors cursor-pointer"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="size-8 shrink-0 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center">
                                      <FileText className="size-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">{inv.number}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatDate(inv.createdAt)}
                                        {inv.invoiceType && inv.invoiceType !== 'standard' && ` · ${inv.invoiceType}`}
                                        {inv.dueDate && ` · due ${formatDate(inv.dueDate)}`}
                                        {inv.status === 'paid' && inv.paidAt && ` · paid ${formatDate(inv.paidAt)}`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-sm font-semibold">{formatMoney(inv.total, inv.currency)}</span>
                                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab — derived from paid invoices */}
        <TabsContent value="payments" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payments</CardTitle>
              <CardDescription>Payment history (derived from paid invoices)</CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="space-y-2">{[1, 2].map(i => <div key={i} className="animate-pulse h-16 bg-muted rounded" />)}</div>
              ) : (() => {
                const paidInvoices = invoices.filter(i => i.status === 'paid');
                if (paidInvoices.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <CreditCard className="size-10 mb-2 opacity-20" />
                      <p>No payments recorded</p>
                      <p className="text-xs">Payment history will appear here</p>
                    </div>
                  );
                }
                const totalPaid = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
                return (
                  <div className="space-y-3">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold text-emerald-600">{formatMoney(totalPaid, paidInvoices[0]?.currency)}</p>
                      <p className="text-[10px] text-muted-foreground">Total Paid ({paidInvoices.length} invoice{paidInvoices.length === 1 ? '' : 's'})</p>
                    </div>
                    <div className="max-h-[500px] overflow-auto space-y-2">
                      {paidInvoices.map(inv => (
                        <div key={inv.id} className="rounded-lg border p-3 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="size-8 shrink-0 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                <CreditCard className="size-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{inv.number}</p>
                                <p className="text-xs text-muted-foreground">
                                  {inv.paidAt ? `Paid on ${formatDate(inv.paidAt)}` : formatDate(inv.createdAt)}
                                </p>
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-emerald-700 shrink-0">{formatMoney(inv.total, inv.currency)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <MessageSquare className="size-10 mb-2 opacity-20" />
              <p>No conversations yet</p>
              <p className="text-xs">Messages, calls, and emails will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
              <CardDescription>Internal notes about this customer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note about this customer..."
                  value={notes}
                  onChange={e => onNotesChange(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={onSaveNote}
                    disabled={!notes.trim() || notesLoading}
                  >
                    {notesLoading ? <RefreshCw className="size-3.5 mr-1 animate-spin" /> : <Plus className="size-3.5 mr-1" />}
                    Add Note
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                {timeline.filter(t => t.entryType === 'note').length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No notes yet</p>
                ) : (
                  timeline.filter(t => t.entryType === 'note').map(note => (
                    <div key={note.id} className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm">{note.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDateTime(note.eventDate)}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Customer Sheet (ISSUE-3 — replaces the inline 4-field Dialog) */}
      <CustomerFormSheet
        open={showAddCustomer}
        onOpenChange={onShowAddCustomerChange}
        initialCustomer={editingCustomer}
        onSaved={onCustomerSaved}
      />
    </div>
  );
}

export default CustomerDetailPage;
