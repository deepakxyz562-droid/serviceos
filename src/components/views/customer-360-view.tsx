'use client';

/**
 * Customer360View — top-level Customer 360° page.
 *
 * Phase 6B2 refactor: the 8 inline tab sections, the 4 inline dialogs
 * (booking create, invoice create, note edit, note delete), the inline
 * sub-components (KpiCard, HealthScoreGauge, StarRating, TimelineGroup,
 * ChatBubble), the inline skeletons, the customer-list branch, and the
 * left profile panel have all been extracted to `src/features/customers/`.
 *
 * This file owns: state (selected customer + search/sort/view-layout +
 * active tab + dialog form state), the 5 write handlers (create booking,
 * create invoice, convert quote → job, add/edit/delete note), the 360°
 * + bookings React Query subscriptions, the derived state (filtered
 * customers, stats, health score, grouped timeline, customer tags,
 * last-active time, filtered jobs), and the 360° layout shell (top bar
 * + profile panel + KPI row + Tabs shell with 8 TabsContent slots + 4
 * form dialogs + V1.5 CommunicationComposer).
 *
 * The customer-list branch (no selection) is delegated to the extracted
 * `CustomerListView` component.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Activity, Clock, Wrench, FileText, Receipt, DollarSign,
  MessageCircle, StickyNote, ChevronRight, Calendar, CheckCircle2,
  Star, AlertCircle,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
import {
  useCustomers,
  useCustomer360,
  useBookings,
} from '@/hooks/queries/use-supabase-queries';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { CommunicationComposer } from '@/components/communication/composer';

import { CustomerListView } from '@/features/customers/components/customer-list-view';
import { CustomerProfilePanel } from '@/features/customers/components/customer-profile-panel';
import { KpiCard } from '@/features/customers/components/kpi-card';
import { BookingCreateDialog } from '@/features/customers/components/booking-create-dialog';
import { InvoiceCreateDialog } from '@/features/customers/components/invoice-create-dialog';
import { NoteEditDialog, NoteDeleteDialog } from '@/features/customers/components/note-dialogs';
import { useCustomer360Actions } from '@/features/customers/hooks/use-customer-360-actions';
import { OverviewTab } from '@/features/customers/components/tabs/overview-tab';
import { TimelineTab } from '@/features/customers/components/tabs/timeline-tab';
import { CommunicationTab } from '@/features/customers/components/tabs/communication-tab';
import { NotesTab } from '@/features/customers/components/tabs/notes-tab';
import { JobsTab } from '@/features/customers/components/tabs/jobs-tab';
import { InvoicesTab } from '@/features/customers/components/tabs/invoices-tab';
import { QuotesTab } from '@/features/customers/components/tabs/quotes-tab';
import { PaymentsTab } from '@/features/customers/components/tabs/payments-tab';
import {
  computeHealthScore,
  groupTimelineEvents,
  parseTags,
  timeAgo,
} from '@/features/customers/utils/customer-helpers';
import type {
  Customer360Tab,
  CustomerStats,
  InvoiceLineItem,
  NoteEditState,
  SortOption,
  ViewLayout,
} from '@/features/customers/types';

export function Customer360View() {
  const { auth } = useAppStore();
  const { format } = useCompanyCurrency();
  const tenantId = auth?.tenant?.id;

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Customer360Tab>('overview');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [viewLayout, setViewLayout] = useState<ViewLayout>('grid');

  // QueryClient for invalidating queries after mutations (used by composer onSent).
  const queryClient = useQueryClient();

  // Booking creation dialog state
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingTitle, setBookingTitle] = useState('');
  const [bookingScheduledAt, setBookingScheduledAt] = useState('');
  const [bookingAddress, setBookingAddress] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');

  // Invoice creation dialog state
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceLineItem[]>([
    { description: '', quantity: 1, rate: 0 },
  ]);
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Jobs tab status filter
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('all');

  // Notes tab state
  const [noteText, setNoteText] = useState('');
  const [editingNote, setEditingNote] = useState<NoteEditState | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // V1.5: Communication composer state
  const [composerOpen, setComposerOpen] = useState(false);

  // Fetch customer list
  const { data: customers = [], isLoading: customersLoading } = useCustomers(tenantId);

  // Fetch 360 data for selected customer
  const { data: customer360, isLoading: customer360Loading } = useCustomer360(selectedCustomerId || '');

  // Fetch bookings for selected customer
  const { data: bookingsData } = useBookings(selectedCustomerId || undefined);

  // Filtered + sorted customer list
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    let filtered = customers;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = customers.filter(
        (c: any) =>
          c.name?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
      );
    }
    return [...filtered].sort((a: any, b: any) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'recent') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      return ((b.totalRevenue || 0) as number) - ((a.totalRevenue || 0) as number);
    });
  }, [customers, searchQuery, sortBy]);

  // Extract data
  const customer = customer360?.customer;
  const jobs: any[] = customer360?.jobs || [];
  const invoices: any[] = customer360?.invoices || [];
  const conversations: any[] = customer360?.conversations || [];
  const quotes: any[] = customer360?.quotes || [];
  const timelineEvents: any[] = customer360?.timeline || [];
  const bookings: any[] = bookingsData?.bookings || (Array.isArray(bookingsData) ? bookingsData : []);

  // Computed stats
  const stats = useMemo<CustomerStats>(() => {
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const paidInvoices = invoices.filter(i => i.status === 'paid');
    const pendingInvoices = invoices.filter(
      i => i.status === 'pending' || i.status === 'overdue'
    );
    const totalRevenue = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const outstandingBalance = pendingInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const avgRating =
      completedJobs.length > 0
        ? completedJobs.filter(j => j.customerRating).reduce((s, j) => s + (j.customerRating || 0), 0) /
          Math.max(completedJobs.filter(j => j.customerRating).length, 1)
        : 0;

    return {
      totalBookings: bookings.length,
      totalRevenue,
      completedJobs: completedJobs.length,
      avgRating: Math.round(avgRating * 10) / 10,
      outstandingBalance,
      totalJobs: jobs.length,
    };
  }, [jobs, invoices, bookings]);

  // Health score
  const healthScore = useMemo(() => computeHealthScore(stats), [stats]);

  // Grouped timeline (Today / Yesterday / This Week / Earlier)
  const groupedTimeline = useMemo(
    () => groupTimelineEvents(timelineEvents),
    [timelineEvents]
  );

  // Parse tags from customer data
  const customerTags = useMemo(() => parseTags((customer as any)?.tags), [customer]);

  // Find last activity date from timeline
  const lastActiveTime = useMemo(() => {
    if (timelineEvents.length === 0) return '';
    const sorted = [...timelineEvents].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    return sorted[0]?.createdAt ? timeAgo(sorted[0].createdAt) : '';
  }, [timelineEvents]);

  // Filtered jobs based on the Jobs tab status filter
  const filteredJobs = useMemo(
    () => (jobStatusFilter === 'all' ? jobs : jobs.filter(j => j.status === jobStatusFilter)),
    [jobs, jobStatusFilter]
  );

  // ─── Write-action handlers (createBooking / createInvoice / convertQuoteToJob
  // / addNote / editNote / deleteNote) + their in-flight flags live in the
  // `useCustomer360Actions` hook so the parent doesn't have to wire 4 extra
  // useState + 4 finally blocks. The parent still owns the form-field state
  // because the dialogs are controlled and need the values to render.
  const resetBookingForm = useCallback(() => {
    setBookingDialogOpen(false);
    setBookingTitle('');
    setBookingScheduledAt('');
    setBookingAddress('');
    setBookingNotes('');
  }, []);
  const resetInvoiceForm = useCallback(() => {
    setInvoiceDialogOpen(false);
    setInvoiceItems([{ description: '', quantity: 1, rate: 0 }]);
    setInvoiceDueDate('');
    setInvoiceNotes('');
  }, []);
  const resetNoteText = useCallback(() => setNoteText(''), []);

  const {
    creatingBooking,
    creatingInvoice,
    addingNote,
    convertingQuoteId,
    createBooking,
    createInvoice,
    convertQuoteToJob,
    addNote,
    editNote,
    deleteNote,
  } = useCustomer360Actions({
    customerId: selectedCustomerId,
    customer,
    resetBookingForm,
    resetInvoiceForm,
    resetNoteText,
  });

  // Wrap the hook handlers with the parent-side dialog close so the dialog
  // dismisses immediately after the API call returns success. The hook owns
  // the in-flight flag; the parent owns the dialog open/close state.
  const handleCreateBooking = useCallback(async () => {
    await createBooking({
      title: bookingTitle,
      scheduledAt: bookingScheduledAt,
      address: bookingAddress,
      notes: bookingNotes,
    });
  }, [createBooking, bookingTitle, bookingScheduledAt, bookingAddress, bookingNotes]);

  const handleCreateInvoice = useCallback(async () => {
    await createInvoice({
      items: invoiceItems,
      dueDate: invoiceDueDate,
      notes: invoiceNotes,
    });
  }, [createInvoice, invoiceItems, invoiceDueDate, invoiceNotes]);

  const handleAddNote = useCallback(async () => {
    await addNote(noteText);
  }, [addNote, noteText]);

  const handleEditNote = useCallback(async () => {
    if (!editingNote) return;
    await editNote(editingNote);
    setEditingNote(null);
  }, [editingNote, editNote]);

  const handleDeleteNote = useCallback(async () => {
    if (!deletingNoteId) return;
    await deleteNote(deletingNoteId);
    setDeletingNoteId(null);
  }, [deletingNoteId, deleteNote]);

  // ─── No customer selected — show list ─────────────────────────────────────
  if (!selectedCustomerId) {
    return (
      <CustomerListView
        customersLoading={customersLoading}
        filteredCustomers={filteredCustomers}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewLayout={viewLayout}
        setViewLayout={setViewLayout}
        onSelectCustomer={setSelectedCustomerId}
      />
    );
  }

  // ─── Customer Selected — show 360 view ─────────────────────────────────────
  const c = customer;
  const tabTriggerClass = "data-[state=active]:bg-accent data-[state=active]:text-emerald-400 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-xs gap-1.5 transition-all duration-200";
  const tabCountBadgeClass = "size-4 rounded-full p-0 text-[9px] bg-muted text-muted-foreground flex items-center justify-center";

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top bar with back */}
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground hover:bg-accent gap-1.5 transition-all duration-200"
          onClick={() => setSelectedCustomerId(null)}
        >
          <ChevronRight className="size-4 rotate-180" />
          Back
        </Button>
        <div className="flex-1" />
        <h1 className="text-sm font-semibold text-muted-foreground">
          Customer 360&deg;
        </h1>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <CustomerProfilePanel
          customer={c}
          customerTags={customerTags}
          customer360Loading={customer360Loading}
          lastActiveTime={lastActiveTime}
          healthScore={healthScore}
          stats={stats}
          format={format}
          onOpenComposer={() => setComposerOpen(true)}
          onOpenBookingDialog={() => setBookingDialogOpen(true)}
          onOpenInvoiceDialog={() => setInvoiceDialogOpen(true)}
        />

        {/* ─── Main Content Area ─────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* KPI Cards Row */}
          <div className="p-4 border-b border-border shrink-0">
            {customer360Loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border p-4 space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-7 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <KpiCard label="Total Bookings" value={stats.totalBookings} icon={Calendar} accent="text-sky-400" borderColor="border-l-sky-500" />
                <KpiCard label="Total Revenue" value={format(stats.totalRevenue)} icon={DollarSign} accent="text-emerald-400" borderColor="border-l-emerald-500" />
                <KpiCard label="Completed Jobs" value={stats.completedJobs} icon={CheckCircle2} accent="text-emerald-400" borderColor="border-l-emerald-500" />
                <KpiCard label="Avg Rating" value={stats.avgRating > 0 ? `${stats.avgRating} / 5` : '\u2014'} icon={Star} accent="text-amber-400" borderColor="border-l-amber-500" />
                <KpiCard label="Outstanding" value={format(stats.outstandingBalance)} icon={AlertCircle} accent={stats.outstandingBalance > 0 ? 'text-red-400' : 'text-muted-foreground'} borderColor="border-l-red-500" />
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex-1 min-h-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Customer360Tab)} className="h-full flex flex-col">
              <div className="border-b border-border px-4 shrink-0">
                <TabsList className="bg-transparent h-11 gap-0.5 p-0 overflow-x-auto">
                  <TabsTrigger value="overview" className={tabTriggerClass}>
                    <Activity className="size-3.5" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className={tabTriggerClass}>
                    <Clock className="size-3.5" /> Timeline
                  </TabsTrigger>
                  <TabsTrigger value="jobs" className={tabTriggerClass}>
                    <Wrench className="size-3.5" /> Jobs
                    {jobs.length > 0 && <Badge className={tabCountBadgeClass}>{jobs.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="quotes" className={tabTriggerClass}>
                    <FileText className="size-3.5" /> Quotes
                    {quotes.length > 0 && <Badge className={tabCountBadgeClass}>{quotes.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="invoices" className={tabTriggerClass}>
                    <Receipt className="size-3.5" /> Invoices
                    {invoices.length > 0 && <Badge className={tabCountBadgeClass}>{invoices.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="payments" className={tabTriggerClass}>
                    <DollarSign className="size-3.5" /> Payments
                    {invoices.filter((i: any) => i.status === 'paid').length > 0 && (
                      <Badge className={tabCountBadgeClass}>
                        {invoices.filter((i: any) => i.status === 'paid').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="communication" className={tabTriggerClass}>
                    <MessageCircle className="size-3.5" /> Communication
                    {conversations.length > 0 && (
                      <Badge className="size-4 rounded-full p-0 text-[9px] bg-emerald-600 text-foreground flex items-center justify-center">
                        {conversations.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="notes" className={tabTriggerClass}>
                    <StickyNote className="size-3.5" /> Notes
                    {timelineEvents.filter((e: any) => e.entryType === 'note').length > 0 && (
                      <Badge className={tabCountBadgeClass}>
                        {timelineEvents.filter((e: any) => e.entryType === 'note').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 min-h-0">
                <TabsContent value="overview" className="h-full m-0">
                  <OverviewTab
                    customer360Loading={customer360Loading}
                    timelineEvents={timelineEvents}
                    jobs={jobs}
                    invoices={invoices}
                    conversations={conversations}
                    groupedTimeline={groupedTimeline}
                    format={format}
                  />
                </TabsContent>

                <TabsContent value="timeline" className="h-full m-0">
                  <TimelineTab customerId={customer?.id} />
                </TabsContent>

                <TabsContent value="communication" className="h-full m-0">
                  <CommunicationTab
                    conversations={conversations}
                    customer360Loading={customer360Loading}
                  />
                </TabsContent>

                <TabsContent value="notes" className="h-full m-0">
                  <NotesTab
                    customer360Loading={customer360Loading}
                    timelineEvents={timelineEvents}
                    noteText={noteText}
                    setNoteText={setNoteText}
                    addingNote={addingNote}
                    onAddNote={handleAddNote}
                    onEditNote={setEditingNote}
                    onRequestDeleteNote={setDeletingNoteId}
                  />
                </TabsContent>

                <TabsContent value="jobs" className="h-full m-0">
                  <JobsTab
                    jobs={jobs}
                    filteredJobs={filteredJobs}
                    jobStatusFilter={jobStatusFilter}
                    setJobStatusFilter={setJobStatusFilter}
                    customer360Loading={customer360Loading}
                  />
                </TabsContent>

                <TabsContent value="invoices" className="h-full m-0">
                  <InvoicesTab
                    invoices={invoices}
                    customer360Loading={customer360Loading}
                    format={format}
                  />
                </TabsContent>

                <TabsContent value="quotes" className="h-full m-0">
                  <QuotesTab
                    quotes={quotes}
                    customer360Loading={customer360Loading}
                    convertingQuoteId={convertingQuoteId}
                    onConvertQuoteToJob={convertQuoteToJob}
                    format={format}
                  />
                </TabsContent>

                <TabsContent value="payments" className="h-full m-0">
                  <PaymentsTab
                    invoices={invoices}
                    customer360Loading={customer360Loading}
                    format={format}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* ─── Create Booking Dialog ─────────────────────────────────────────── */}
      <BookingCreateDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        customerName={c?.name}
        bookingTitle={bookingTitle}
        setBookingTitle={setBookingTitle}
        bookingScheduledAt={bookingScheduledAt}
        setBookingScheduledAt={setBookingScheduledAt}
        bookingAddress={bookingAddress}
        setBookingAddress={setBookingAddress}
        bookingNotes={bookingNotes}
        setBookingNotes={setBookingNotes}
        creating={creatingBooking}
        onCreate={handleCreateBooking}
      />

      {/* ─── Create Invoice Dialog ─────────────────────────────────────────── */}
      <InvoiceCreateDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        customerName={c?.name}
        invoiceItems={invoiceItems}
        setInvoiceItems={setInvoiceItems}
        invoiceDueDate={invoiceDueDate}
        setInvoiceDueDate={setInvoiceDueDate}
        invoiceNotes={invoiceNotes}
        setInvoiceNotes={setInvoiceNotes}
        creating={creatingInvoice}
        onCreate={handleCreateInvoice}
        format={format}
      />

      {/* ─── Edit Note Dialog ─────────────────────────────────────────── */}
      <NoteEditDialog
        open={!!editingNote}
        editingNote={editingNote}
        onChange={setEditingNote}
        onCancel={() => setEditingNote(null)}
        onSave={handleEditNote}
      />

      {/* ─── Delete Note Confirmation ─────────────────────────────────── */}
      <NoteDeleteDialog
        open={!!deletingNoteId}
        onCancel={() => setDeletingNoteId(null)}
        onConfirm={handleDeleteNote}
      />

      {/* ─── V1.5: Communication Composer ────────────────────────────── */}
      <CommunicationComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        customerId={c?.id}
        customerName={c?.name}
        customerEmail={c?.email}
        customerPhone={c?.phone}
        customerWhatsappId={c?.whatsappId}
        relatedEntityType="customer"
        relatedEntityId={c?.id}
        relatedEntityName={c?.name}
        onSent={() => {
          queryClient.invalidateQueries({ queryKey: ['customer360', c?.id] });
        }}
      />
    </div>
  );
}
