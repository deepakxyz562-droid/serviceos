'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useCrmCustomers,
  useDeleteCustomer,
  useEnableCustomerPortal,
  useResendCustomerPortal,
  useDisableCustomerPortal,
  useAddCustomerNote,
} from '@/hooks/use-crm-data';
import {
  Users, Search, Plus, Phone, Mail, MapPin,
  MoreHorizontal, Pencil, Trash2, Eye, MessageCircle,
  RefreshCw, TrendingUp, ArrowUpDown,
  Send, Copy, Check, UserPlus, RotateCw, Ban,
  Upload, Download, FolderTree, Tag as TagIcon,
  Filter, BarChart3,
  Building2, Home, Crown, ShieldCheck,
  LayoutGrid, List,
  MessageSquare, Clock, DollarSign, Star,
  Briefcase, CreditCard, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { CustomerFormSheet } from '@/components/customer/customer-form-sheet';
import { authFetch } from '@/lib/api';
import {
  formatDate,
  formatDateTime,
  initials,
  formatMoney,
  invoiceStatusConfig,
  INVOICE_STATUS_ORDER,
  quoteStatusConfig,
} from '@/features/customers/utils/crm-helpers';
import type {
  CrmCustomer as Customer,
  TimelineEntry,
  JobRef,
  AssetRef,
  QuoteRef,
  InvoiceRef,
} from '@/features/customers/types/crm-detail-types';
import { CustomerDetailPage } from '@/features/customers/components/customer-detail-page';

// ─── Types ──────────────────────────────────────────────────────────────────
//
// Customer / TimelineEntry / JobRef / AssetRef / QuoteRef / InvoiceRef types
// now live in `@/features/customers/types/crm-detail-types` (imported above).
//
// The invoiceStatusConfig / quoteStatusConfig / INVOICE_STATUS_ORDER constants
// and the formatDate / formatDateTime / initials / formatMoney helpers now
// live in `@/features/customers/utils/crm-helpers` (imported above).

// ─── Static data for Groups / Tags / Smart Lists ────────────────────────────

const GROUPS = [
  { name: 'Residential', icon: Home, color: 'bg-blue-100 text-blue-700 border-blue-200', count: 0 },
  { name: 'Commercial', icon: Building2, color: 'bg-purple-100 text-purple-700 border-purple-200', count: 0 },
  { name: 'Corporate', icon: Briefcase, color: 'bg-slate-100 text-slate-700 border-slate-200', count: 0 },
  { name: 'VIP', icon: Crown, color: 'bg-amber-100 text-amber-700 border-amber-200', count: 0 },
  { name: 'AMC', icon: ShieldCheck, color: 'bg-emerald-100 text-emerald-700 border-emerald-200', count: 0 },
];

const TAGS = [
  { name: 'AC', color: 'bg-sky-100 text-sky-700' },
  { name: 'Solar', color: 'bg-yellow-100 text-yellow-700' },
  { name: 'Plumbing', color: 'bg-blue-100 text-blue-700' },
  { name: 'High Value', color: 'bg-amber-100 text-amber-700' },
  { name: 'Warranty', color: 'bg-emerald-100 text-emerald-700' },
  { name: 'Follow Up', color: 'bg-rose-100 text-rose-700' },
];

const SMART_LISTS = [
  { name: 'Inactive Customers', description: 'No jobs in the last 6 months', icon: Clock, color: 'text-orange-500' },
  { name: 'Pending Payment', description: 'Customers with unpaid invoices', icon: CreditCard, color: 'text-red-500' },
  { name: 'No Jobs in 6 Months', description: 'Customers who haven\'t booked recently', icon: Calendar, color: 'text-amber-500' },
  { name: 'Repeat Customers', description: 'Customers with 3+ jobs', icon: RefreshCw, color: 'text-emerald-500' },
  { name: 'High Revenue Customers', description: 'Lifetime value above ₹50,000', icon: TrendingUp, color: 'text-purple-500' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function CrmView() {
  const { setActiveView, pendingCreate, setPendingCreate, setPendingOpenEntity } = useAppStore();

  // ─── View Mode: 'list' | 'detail' ──────────────────────────────────────
  const [formMode, setFormMode] = useState<'list' | 'detail'>('list');
  const [listTab, setListTab] = useState('all');
  const [detailTab, setDetailTab] = useState('overview');

  // ─── Customers State ────────────────────────────────────────────────────
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');
  const [showAddCustomer, setShowAddCustomer] = useState(pendingCreate === 'customer');
  // ISSUE-3: the inline customer form state (name/phone/email/address) and
  // handleSaveCustomer have moved to the dedicated <CustomerFormSheet />
  // component. `editingCustomer` is kept for future edit support but is no
  // longer read by an inline Dialog.
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Consume the cross-view "New Customer" signal — when the sidebar's "+ Create"
  // dropdown or a dashboard quick action sets pendingCreate to 'customer',
  // we open the add-customer sheet, then clear the signal.
  useEffect(() => {
    if (pendingCreate === 'customer') {
      setEditingCustomer(null);
      setShowAddCustomer(true);
      setPendingCreate(null);
    }
  }, [pendingCreate]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const pendingOpenEntity = useAppStore((s) => s.pendingOpenEntity);

  // Consume cross-view "open customer detail" signal
  useEffect(() => {
    if (!pendingOpenEntity || pendingOpenEntity.kind !== 'customer') return;
    const targetId = pendingOpenEntity.id;
    setPendingOpenEntity(null);
    authFetch(`/api/customers/${targetId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const cust = data?.customer || data;
        if (cust?.id) {
          setSelectedCustomer(cust);
          setFormMode('detail');
        }
      })
      .catch((err) => console.error('[crm-view] pendingOpenEntity customer fetch failed:', err));
  }, [pendingOpenEntity, setPendingOpenEntity]);

  const [customerSort, setCustomerSort] = useState<'name' | 'createdAt'>('name');
  const [customerSortDir, setCustomerSortDir] = useState<'asc' | 'desc'>('asc');

  // ─── Customer Portal Invitation State ──────────────────────────────────
  const [inviteCustomer, setInviteCustomer] = useState<Customer | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  // ─── Detail mode data ──────────────────────────────────────────────────
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [jobs, setJobs] = useState<JobRef[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [assets, setAssets] = useState<AssetRef[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  // ─── Quotes + Invoices (Customer 360 fetch) ───────────────────────────
  // Fetched from /api/customers/[id] (returns the full profile incl. nested
  // quotes[] + invoices[]). Previously these tabs were hardcoded "No quotes
  // yet" / "No invoices yet" placeholders — the data was never loaded.
  const [quotes, setQuotes] = useState<QuoteRef[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRef[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);

  // ─── Fetch Customers (React Query) ──────────────────────────────────────
  // C-1: server-side search + pagination. Previously fetched ALL customers
  // and filtered client-side — at 10K rows this was 221ms cold + full payload
  // transfer. Now fetches with server-side ILIKE search via useCrmCustomers.
  const { data: customersData, isLoading: customersLoading, error: rqError, refetch: fetchCustomers } = useCrmCustomers({
    search: debouncedCustomerSearch || undefined,
  });
  const customers: Customer[] = customersData ?? [];
  void rqError;

  // ── Mutations (dependency-aware, auto-invalidate via getCustomerInvalidations) ──
  // delete → customers.all + dashboard.all + customers.detail(id)
  // portal → customers.all + customers.detail(id) (NO dashboard)
  // note   → customers.detail(id) ONLY (+ manual timeline refetch below)
  const deleteCustomer = useDeleteCustomer();
  const enableCustomerPortal = useEnableCustomerPortal();
  const resendCustomerPortal = useResendCustomerPortal();
  const disableCustomerPortal = useDisableCustomerPortal();
  const addCustomerNote = useAddCustomerNote();

  // Debounce search — 350ms matches the contacts-view pattern.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCustomerSearch(customerSearch), 350);
    return () => clearTimeout(t);
  }, [customerSearch]);

  // ─── Customer CRUD ──────────────────────────────────────────────────────
  // ISSUE-3: customer create/edit is now handled by <CustomerFormSheet />.
  // The sheet POSTs to /api/customers and calls onSaved() (which re-runs
  // fetchCustomers) on success. Deletion + portal invitations still live here.
  const handleDeleteCustomer = async (id: string) => {
    try {
      await deleteCustomer.mutateAsync({ id });
      toast.success('Customer deleted');
      // No fetchCustomers() needed — useDeleteCustomer auto-invalidates
      // qk.customers.all + qk.dashboard.all + qk.customers.detail(id).
      if (selectedCustomer?.id === id) {
        setFormMode('list');
        setSelectedCustomer(null);
      }
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete customer');
    }
  };

  // ─── Customer Portal Invitation Handlers ────────────────────────────────
  // NOTE: XTransformPort is auto-appended by authFetch() — no manual suffix needed.

  const handleSendInvite = async (customer: Customer) => {
    setInviteCustomer(customer);
    setInviteUrl(null);
    setInviteCopied(false);
    setInviteLoading(true);
    try {
      // useCrmMutation returns the parsed JSON response as `data`.
      // The portal API returns { success, activationUrl } on success.
      const data: any = customer.invitationStatus === 'pending'
        ? await resendCustomerPortal.mutateAsync({ id: customer.id })
        : await enableCustomerPortal.mutateAsync({ id: customer.id });
      if (data?.success && data?.activationUrl) {
        setInviteUrl(data.activationUrl);
        toast.success(`Invitation link generated for ${customer.name}`);
        // No fetchCustomers() needed — portal mutations auto-invalidate
        // qk.customers.all + qk.customers.detail(id) (NO dashboard).
      } else {
        toast.error(data?.error || 'Failed to generate invitation link');
      }
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Network error');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDisablePortal = async (customer: Customer) => {
    try {
      await disableCustomerPortal.mutateAsync({ id: customer.id });
      toast.success(`Portal access disabled for ${customer.name}`);
      // No fetchCustomers() needed — useDisableCustomerPortal auto-invalidates.
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Failed to disable portal access');
    }
  };

  const copyInviteUrl = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      toast.success('Invitation link copied to clipboard');
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const openEditCustomer = (customer: Customer) => {
    // ISSUE-3: edit support for the new multi-section CustomerFormSheet is
    // not wired up yet — for now we just open the sheet in create mode
    // and toast that edit is coming. The full customer object is preserved
    // in `editingCustomer` for when edit support is added.
    setEditingCustomer(customer);
    setShowAddCustomer(true);
  };

  // ─── Open customer detail (full page) ───────────────────────────────────
  const openCustomerDetail = useCallback(async (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailTab('overview');
    setFormMode('detail');
    setTimeline([]);
    setJobs([]);
    setAssets([]);
    setQuotes([]);
    setInvoices([]);
    setNotes('');

    // C-0 perf: fire all independent detail requests in parallel.
    // Previously these ran sequentially (timeline → jobs → assets), so the
    // detail panel waited for the sum of three round-trips. All four depend
    // only on `customer.id` (already known) and none consumes another's
    // result, so they are safe to parallelize.
    //
    // Promise.allSettled is used (not Promise.all) so a failure in one
    // section (e.g. assets 500) still populates the others — each section
    // owns its own error handling and only clears its own state on failure.
    // Loading flags are set up-front and cleared in a single finally block
    // so an unexpected exception cannot leave any loading state stuck.
    setTimelineLoading(true);
    setJobsLoading(true);
    setAssetsLoading(true);
    setQuotesLoading(true);
    setInvoicesLoading(true);

    try {
      const [timelineRes, jobsRes, assetsRes, customerRes] = await Promise.allSettled([
        authFetch(`/api/customers/${customer.id}/timeline`).then((r) =>
          r.ok ? r.json() : Promise.reject(new Error(`timeline ${r.status}`)),
        ),
        authFetch(`/api/jobs?customerId=${customer.id}`).then((r) =>
          r.ok ? r.json() : Promise.reject(new Error(`jobs ${r.status}`)),
        ),
        authFetch(`/api/customers/${customer.id}/assets`).then((r) =>
          r.ok ? r.json() : Promise.reject(new Error(`assets ${r.status}`)),
        ),
        // Customer 360 profile — returns { quotes: [...], invoices: [...], ... }
        // Single source of truth for the Quotes + Invoices + Payments tabs.
        authFetch(`/api/customers/${customer.id}`).then((r) =>
          r.ok ? r.json() : Promise.reject(new Error(`customer ${r.status}`)),
        ),
      ]);

      // Timeline
      if (timelineRes.status === 'fulfilled') {
        const data = timelineRes.value;
        setTimeline(Array.isArray(data?.entries) ? data.entries : []);
      } else {
        setTimeline([]);
      }

      // Jobs
      if (jobsRes.status === 'fulfilled') {
        const data = jobsRes.value;
        setJobs(Array.isArray(data) ? data : data?.jobs || []);
      } else {
        setJobs([]);
      }

      // Assets
      if (assetsRes.status === 'fulfilled') {
        const data = assetsRes.value;
        setAssets(Array.isArray(data?.assets) ? data.assets : []);
      } else {
        setAssets([]);
      }

      // Quotes + Invoices (from the customer profile fetch)
      if (customerRes.status === 'fulfilled') {
        const data = customerRes.value || {};
        setQuotes(Array.isArray(data.quotes) ? data.quotes : []);
        setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
      } else {
        setQuotes([]);
        setInvoices([]);
      }
    } finally {
      // Single finally guarantees every loading flag is cleared even if the
      // Promise.allSettled itself threw (it shouldn't, but defensive).
      setTimelineLoading(false);
      setJobsLoading(false);
      setAssetsLoading(false);
      setQuotesLoading(false);
      setInvoicesLoading(false);
    }
  }, []);

  const closeCustomerDetail = () => {
    setFormMode('list');
    setSelectedCustomer(null);
  };

  // ─── Save note ──────────────────────────────────────────────────────────
  const handleSaveNote = async () => {
    if (!selectedCustomer || !notes.trim()) return;
    setNotesLoading(true);
    try {
      await addCustomerNote.mutateAsync({
        id: selectedCustomer.id,
        entryType: 'note',
        title: 'Note added',
        description: notes,
      });
      toast.success('Note saved');
      setNotes('');
      // ─── Dual responsibility (per Phase 1.9 audit) ───────────────────────
      // 1. React Query invalidation: useAddCustomerNote auto-invalidates
      //    qk.customers.detail(id) — catches timeline IF it were an RQ query.
      // 2. Manual timeline refetch: crm-view's timeline is LOCAL state (not
      //    React Query), so the invalidation alone won't refresh it. This
      //    manual refetch MUST stay until the timeline is migrated to RQ.
      const tRes = await authFetch(`/api/customers/${selectedCustomer.id}/timeline`);
      if (tRes.ok) {
        const data = await tRes.json();
        setTimeline(Array.isArray(data?.entries) ? data.entries : []);
      }
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Failed to save note');
    } finally {
      setNotesLoading(false);
    }
  };

  // ─── Import / Export ────────────────────────────────────────────────────
  const handleExport = () => {
    if (customers.length === 0) {
      toast.error('No customers to export');
      return;
    }
    const headers = ['Name', 'Phone', 'Email', 'Address', 'WhatsApp ID', 'Created At', 'Portal Status'];
    const rows = customers.map(c => [
      `"${c.name}"`,
      `"${c.phone}"`,
      `"${c.email || ''}"`,
      `"${c.address || ''}"`,
      `"${c.whatsappId || ''}"`,
      `"${formatDate(c.createdAt)}"`,
      `"${c.invitationStatus || 'none'}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${customers.length} customers`);
  };

  const handleImport = () => {
    toast.info('Import: Upload a CSV file with Name, Phone, Email, Address columns');
  };

  // ─── Filtered / Sorted Lists ────────────────────────────────────────────
  // C-1: search is now server-side — no client-side filter needed here.
  // Sort is still client-side (fine for 100 rows on a page).
  const filteredCustomers = customers
    .sort((a, b) => {
      const dir = customerSortDir === 'asc' ? 1 : -1;
      if (customerSort === 'name') return a.name.localeCompare(b.name) * dir;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    });

  // ─── Stats ──────────────────────────────────────────────────────────────
  const customerStats = {
    // C-1: total previously used the server-side pagination.total. The
    // useCrmCustomers hook returns just the array (limit=50), so we fall back
    // to the page count. Acceptable for the stat tile — full count requires
    // enhancing the hook to expose pagination, which is out of scope here.
    total: customers.length,
    withEmail: customers.filter(c => c.email).length,
    withWhatsApp: customers.filter(c => c.whatsappId).length,
    recent: customers.filter(c => {
      const created = new Date(c.createdAt);
      const now = new Date();
      return now.getTime() - created.getTime() < 7 * 24 * 60 * 60 * 1000;
    }).length,
    newThisMonth: customers.filter(c => {
      const created = new Date(c.createdAt);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length,
  };

  // ─── Sort handler ───────────────────────────────────────────────────────
  const handleSort = (field: 'name' | 'createdAt') => {
    if (customerSort === field) {
      setCustomerSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setCustomerSort(field);
      setCustomerSortDir('asc');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── Cross-view "open entity detail" deep-link ───────────────────────────
  // When the user clicks a Job/Quote/Invoice row inside the Customer 360 detail
  // panel, we stash the entity id here, switch to the matching list view, and
  // the target view's mount-effect consumes the signal (fetches the entity by
  // id if it's not already in the local list, opens its detail panel, then
  // clears the signal so a refresh doesn't re-open it).
  const openJobFromCustomer360 = (jobId: string) => {
    setPendingOpenEntity({ kind: 'job', id: jobId, fromCustomerId: selectedCustomer?.id });
    setActiveView('jobs');
  };
  const openQuoteFromCustomer360 = (quoteId: string) => {
    setPendingOpenEntity({ kind: 'quote', id: quoteId, fromCustomerId: selectedCustomer?.id });
    setActiveView('quotes');
  };
  const openInvoiceFromCustomer360 = (invoiceId: string) => {
    setPendingOpenEntity({ kind: 'invoice', id: invoiceId, fromCustomerId: selectedCustomer?.id });
    setActiveView('invoices');
  };

  // ─── DETAIL MODE: Customer Profile (360 View) ────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (formMode === 'detail' && selectedCustomer) {
    return (
      <CustomerDetailPage
        customer={selectedCustomer}
        detailTab={detailTab}
        onDetailTabChange={setDetailTab}
        onBack={closeCustomerDetail}
        onEdit={openEditCustomer}
        onDelete={handleDeleteCustomer}
        onSendMessage={() => setActiveView('omnichannel')}
        onSendInvite={handleSendInvite}
        onDisablePortal={handleDisablePortal}
        timeline={timeline}
        timelineLoading={timelineLoading}
        jobs={jobs}
        jobsLoading={jobsLoading}
        onOpenJob={openJobFromCustomer360}
        assets={assets}
        quotes={quotes}
        quotesLoading={quotesLoading}
        onOpenQuote={openQuoteFromCustomer360}
        invoices={invoices}
        invoicesLoading={invoicesLoading}
        onOpenInvoice={openInvoiceFromCustomer360}
        notes={notes}
        onNotesChange={setNotes}
        notesLoading={notesLoading}
        onSaveNote={handleSaveNote}
        showAddCustomer={showAddCustomer}
        onShowAddCustomerChange={(open) => {
          setShowAddCustomer(open);
          if (!open) setEditingCustomer(null);
        }}
        editingCustomer={editingCustomer}
        onCustomerSaved={() => {
          // No fetchCustomers() needed — CustomerFormSheet now auto-invalidates
          // qk.customers.all via getCustomerInvalidations (Phase 2 migration).
          // Keep openCustomerDetail for the manual detail panel refresh.
          if (selectedCustomer && editingCustomer?.id === selectedCustomer.id) {
            openCustomerDetail(selectedCustomer);
          }
        }}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── LIST MODE: Customers Page ───────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 w-full">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
          <Users className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Customers</h2>
          <p className="text-sm text-muted-foreground">Manage your customer relationships</p>
        </div>
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs value={listTab} onValueChange={setListTab}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="all" className="gap-1.5">
              <Users className="size-3.5" /> All Customers
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-1.5">
              <FolderTree className="size-3.5" /> Groups
            </TabsTrigger>
            <TabsTrigger value="tags" className="gap-1.5">
              <TagIcon className="size-3.5" /> Tags
            </TabsTrigger>
            <TabsTrigger value="smartLists" className="gap-1.5">
              <Filter className="size-3.5" /> Smart Lists
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart3 className="size-3.5" /> Analytics
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* ═══════════════════ ALL CUSTOMERS TAB ═══════════════════════════ */}
        <TabsContent value="all" className="space-y-4">
          {/* Search + Actions + View Switcher */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, phone, email..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="h-10 text-xs" onClick={handleImport}>
                <Upload className="size-3.5 mr-1" /> Import
              </Button>
              <Button variant="outline" size="sm" className="h-10 text-xs" onClick={handleExport}>
                <Download className="size-3.5 mr-1" /> Export
              </Button>

              {/* View Switcher Toggle: Cards vs Table */}
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setViewLayout('grid')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                    viewLayout === 'grid' ? 'bg-background text-emerald-700 shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Grid Cards View"
                >
                  <LayoutGrid className="size-3.5" /> Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewLayout('table')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                    viewLayout === 'table' ? 'bg-background text-emerald-700 shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Table View"
                >
                  <List className="size-3.5" /> Table
                </button>
              </div>

              <Button
                className="bg-emerald-600 hover:bg-emerald-700 h-10 font-semibold text-xs"
                onClick={() => {
                  setEditingCustomer(null);
                  setShowAddCustomer(true);
                }}
              >
                <Plus className="size-4 mr-1" /> New Customer
              </Button>
            </div>
          </div>

          {/* Customer Content */}
          {customersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-muted animate-pulse" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-36 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="size-12 mb-3 opacity-20" />
              <p className="font-semibold text-base">No customers found</p>
              <p className="text-xs mt-1">Add your first customer to get started</p>
            </div>
          ) : viewLayout === 'grid' ? (
            /* ─── Grid Cards View ────────────────────────────────────────────── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map(customer => (
                <Card
                  key={customer.id}
                  className="group relative p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-card hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between"
                  onClick={() => openCustomerDetail(customer)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-11 border-2 border-emerald-100 dark:border-emerald-950 shrink-0">
                        <AvatarFallback className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                          {initials(customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 transition-colors">
                          {customer.name}
                        </h4>
                        <div className="flex items-center justify-between gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="truncate">{customer.phone}</span>
                          {customer.phone && (
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <a
                                href={`tel:${customer.phone}`}
                                className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                                title="Call customer"
                              >
                                <Phone className="size-3.5" />
                              </a>
                              <a
                                href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                                title="WhatsApp customer"
                              >
                                <MessageSquare className="size-3.5" />
                              </a>
                            </div>
                          )}
                        </div>
                        {customer.email && (
                          <p className="text-xs text-slate-400 truncate">{customer.email}</p>
                        )}
                      </div>
                    </div>

                    {customer.address && (
                      <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1 pt-1">
                        <MapPin className="size-3.5 shrink-0 text-slate-400 mt-0.5" />
                        <span className="truncate">{customer.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] text-slate-400">Since {formatDate(customer.createdAt)}</span>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-7 text-xs px-2.5 shadow-xs"
                      onClick={() => openCustomerDetail(customer)}
                    >
                      Profile 360°
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* ─── Table View ───────────────────────────────────────────────── */
            <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[220px]">
                        <button className="flex items-center gap-1 font-bold hover:text-foreground" onClick={() => handleSort('name')}>
                          Name <ArrowUpDown className="size-3" />
                        </button>
                      </TableHead>
                      <TableHead className="font-bold">Phone</TableHead>
                      <TableHead className="font-bold">Email</TableHead>
                      <TableHead className="hidden md:table-cell font-bold">Address</TableHead>
                      <TableHead className="hidden md:table-cell font-bold">Portal</TableHead>
                      <TableHead className="hidden md:table-cell font-bold">
                        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort('createdAt')}>
                          Added <ArrowUpDown className="size-3" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right font-bold w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map(customer => (
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
                        onClick={() => openCustomerDetail(customer)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 border border-emerald-100 dark:border-emerald-950 shrink-0">
                              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">
                                {initials(customer.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{customer.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <span>{customer.phone}</span>
                            {customer.phone && (
                              <div className="flex items-center gap-0.5 ml-auto" onClick={(e) => e.stopPropagation()}>
                                <a
                                  href={`tel:${customer.phone}`}
                                  className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                  title="Call"
                                >
                                  <Phone className="size-3" />
                                </a>
                                <a
                                  href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                  title="WhatsApp"
                                >
                                  <MessageSquare className="size-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 truncate max-w-[160px]">
                          {customer.email || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[180px] truncate hidden md:table-cell">
                          {customer.address || '—'}
                        </TableCell>
                        <TableCell className="text-xs hidden md:table-cell">
                          {customer.invitationStatus === 'accepted' ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] font-semibold">
                              <Check className="size-2.5 mr-1" /> Active
                            </Badge>
                          ) : customer.invitationStatus === 'pending' ? (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] font-semibold">
                              <Clock className="size-2.5 mr-1" /> Pending
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground font-medium">
                              Not invited
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-400 hidden md:table-cell">
                          {formatDate(customer.createdAt)}
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              className="h-7 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                              onClick={() => openCustomerDetail(customer)}
                            >
                              Profile 360°
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openCustomerDetail(customer)}>
                                  <Eye className="size-3.5 mr-2" /> View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditCustomer(customer)}>
                                  <Pencil className="size-3.5 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => handleDeleteCustomer(customer.id)}>
                                  <Trash2 className="size-3.5 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════ GROUPS TAB ═══════════════════════════════════ */}
        <TabsContent value="groups" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {GROUPS.map(group => {
              const Icon = group.icon;
              return (
                <Card key={group.name} className="p-5 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`size-12 rounded-lg flex items-center justify-center border ${group.color}`}>
                      <Icon className="size-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{group.name}</h3>
                      <p className="text-sm text-muted-foreground">Customer group</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ═══════════════════ TAGS TAB ═════════════════════════════════════ */}
        <TabsContent value="tags" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-1">Customer Tags</h3>
            <p className="text-sm text-muted-foreground mb-4">Tags help you categorize and filter customers</p>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <div key={tag.name} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${tag.color}`}>
                  <TagIcon className="size-3.5" />
                  {tag.name}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ═══════════════════ SMART LISTS TAB ══════════════════════════════ */}
        <TabsContent value="smartLists" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {SMART_LISTS.map(list => {
              const Icon = list.icon;
              return (
                <Card key={list.name} className="p-5 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className={`size-5 ${list.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{list.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{list.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ═══════════════════ ANALYTICS TAB ════════════════════════════════ */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="size-4 text-emerald-500" />
                <p className="text-xs text-muted-foreground">Total Customers</p>
              </div>
              <p className="text-2xl font-bold">{customerStats.total}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="size-4 text-amber-500" />
                <p className="text-xs text-muted-foreground">New This Month</p>
              </div>
              <p className="text-2xl font-bold text-amber-600">{customerStats.newThisMonth}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="size-4 text-emerald-500" />
                <p className="text-xs text-muted-foreground">Repeat Customers</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">--</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="size-4 text-purple-500" />
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
              <p className="text-2xl font-bold text-purple-600">--</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Star className="size-4 text-sky-500" />
                <p className="text-xs text-muted-foreground">Lifetime Value</p>
              </div>
              <p className="text-2xl font-bold text-sky-600">--</p>
            </Card>
          </div>
          <Card className="p-6">
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <BarChart3 className="size-12 mb-3 opacity-20" />
              <p className="font-medium">Detailed Analytics</p>
              <p className="text-sm">Revenue trends, customer growth, and lifetime value charts will appear here</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Add/Edit Customer Sheet (ISSUE-3 — replaces the inline 4-field Dialog) ── */}
      <CustomerFormSheet
        open={showAddCustomer}
        onOpenChange={(open) => {
          setShowAddCustomer(open);
          if (!open) setEditingCustomer(null);
        }}
        initialCustomer={editingCustomer}
        onSaved={() => {
          // No fetchCustomers() needed — CustomerFormSheet now auto-invalidates
          // qk.customers.all via getCustomerInvalidations (Phase 2 migration).
        }}
      />

      {/* ─── Customer Portal Invitation Dialog ────────────────────────────── */}
      <Dialog
        open={!!inviteCustomer}
        onOpenChange={(open) => {
          if (!open) {
            setInviteCustomer(null);
            setInviteUrl(null);
            setInviteCopied(false);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="size-5 text-emerald-600" />
              Send Portal Invitation
            </DialogTitle>
            <DialogDescription>
              Generate a secure activation link for{' '}
              <span className="font-medium text-foreground">
                {inviteCustomer?.name}
              </span>
              . The customer uses this link to set their password and
              access the customer portal.
            </DialogDescription>
          </DialogHeader>

          {inviteCustomer?.email ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Mail className="size-4" />
              <span>{inviteCustomer.email}</span>
            </div>
          ) : (
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-200">
              This customer has no email address. You can still generate a
              link, but you&apos;ll need to share it with them manually
              (e.g. via WhatsApp).
            </div>
          )}

          {inviteLoading ? (
            <div className="flex items-center justify-center py-6">
              <RefreshCw className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : inviteUrl ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/40 p-3">
                <div className="text-xs font-medium text-muted-foreground mb-1.5">
                  Activation Link
                </div>
                <div className="flex items-start gap-2">
                  <code className="flex-1 text-xs break-all leading-relaxed">
                    {inviteUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0"
                    onClick={copyInviteUrl}
                  >
                    {inviteCopied ? (
                      <><Check className="size-3.5 mr-1" /> Copied</>
                    ) : (
                      <><Copy className="size-3.5 mr-1" /> Copy</>
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                The link expires in 7 days. The customer must set a password
                on first visit.
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30 p-3 text-sm text-red-800 dark:text-red-200">
              Could not generate the activation link. Please try again.
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setInviteCustomer(null);
                setInviteUrl(null);
                setInviteCopied(false);
              }}
            >
              Close
            </Button>
            {inviteUrl && (
              <Button onClick={copyInviteUrl} className="bg-emerald-600 hover:bg-emerald-700">
                {inviteCopied ? (
                  <><Check className="size-4 mr-1" /> Copied</>
                ) : (
                  <><Copy className="size-4 mr-1" /> Copy Link</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
