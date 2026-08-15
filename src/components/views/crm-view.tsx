'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Plus, Phone, Mail, MapPin,
  MoreHorizontal, Pencil, Trash2, Eye, MessageCircle,
  RefreshCw, TrendingUp, ArrowUpDown,
  Send, Copy, Check, UserPlus, RotateCw, Ban,
  ArrowLeft, Upload, Download, FolderTree, Tag as TagIcon,
  Filter, BarChart3, FileText, Receipt, CreditCard,
  FolderOpen, Wrench, MessageSquare,
  Calendar, Briefcase, Clock, DollarSign, Star,
  Building2, Home, Crown, ShieldCheck,
  LayoutGrid, List, ArrowRight,
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

// ─── Types ──────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  whatsappId?: string;
  createdAt: string;
  updatedAt: string;
  portalEnabled?: boolean;
  invitationStatus?: string;
  activatedAt?: string | null;
}

interface TimelineEntry {
  id: string;
  entryType: string;
  title: string;
  description?: string;
  eventDate: string;
  actorName?: string;
  metadataJson?: string;
}

interface JobRef {
  id: string;
  title: string;
  status: string;
  scheduledDate?: string;
  totalAmount?: number;
}

interface AssetRef {
  id: string;
  name: string;
  assetType: string;
  brand?: string;
  model?: string;
  status: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '--';
  }
}

function formatDateTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return '--';
  }
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

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
  const { setActiveView, pendingCreate, setPendingCreate } = useAppStore();

  // ─── View Mode: 'list' | 'detail' ──────────────────────────────────────
  const [formMode, setFormMode] = useState<'list' | 'detail'>('list');
  const [listTab, setListTab] = useState('all');
  const [detailTab, setDetailTab] = useState('overview');

  // ─── Customers State ────────────────────────────────────────────────────
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');
  // C-1: server-side pagination total (null during search). Used for the
  // "Total" stat so it shows the real count, not just the fetched page.
  const [customersTotal, setCustomersTotal] = useState<number | null>(null);
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
  const [notes, setNotes] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);

  // ─── Fetch Customers ────────────────────────────────────────────────────
  // C-1: server-side search + pagination. Previously fetched ALL customers
  // and filtered client-side — at 10K rows this was 221ms cold + full payload
  // transfer. Now fetches page 1 (100 rows) with server-side ILIKE search.
  const fetchCustomers = useCallback(async (search: string) => {
    setCustomersLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '100' });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/customers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers ?? (Array.isArray(data) ? data : []));
        setCustomersTotal(data.pagination?.total ?? null);
      }
    } catch {
      setCustomers([]);
      setCustomersTotal(null);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  // Debounce search — 350ms matches the contacts-view pattern.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCustomerSearch(customerSearch), 350);
    return () => clearTimeout(t);
  }, [customerSearch]);

  useEffect(() => {
    fetchCustomers(debouncedCustomerSearch);
  }, [fetchCustomers, debouncedCustomerSearch]);

  // ─── Customer CRUD ──────────────────────────────────────────────────────
  // ISSUE-3: customer create/edit is now handled by <CustomerFormSheet />.
  // The sheet POSTs to /api/customers and calls onSaved() (which re-runs
  // fetchCustomers) on success. Deletion + portal invitations still live here.
  const handleDeleteCustomer = async (id: string) => {
    try {
      const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Customer deleted');
        fetchCustomers(debouncedCustomerSearch);
        if (selectedCustomer?.id === id) {
          setFormMode('list');
          setSelectedCustomer(null);
        }
      } else {
        toast.error('Failed to delete customer');
      }
    } catch {
      toast.error('Network error');
    }
  };

  // ─── Customer Portal Invitation Handlers ────────────────────────────────
  const API_SUFFIX = '?XTransformPort=3000';

  const handleSendInvite = async (customer: Customer) => {
    setInviteCustomer(customer);
    setInviteUrl(null);
    setInviteCopied(false);
    setInviteLoading(true);
    try {
      const endpoint =
        customer.invitationStatus === 'pending'
          ? `/api/customers/${customer.id}/portal/resend${API_SUFFIX}`
          : `/api/customers/${customer.id}/portal/enable${API_SUFFIX}`;
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.activationUrl) {
        setInviteUrl(data.activationUrl);
        toast.success(`Invitation link generated for ${customer.name}`);
        fetchCustomers(debouncedCustomerSearch);
      } else {
        toast.error(data.error || 'Failed to generate invitation link');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDisablePortal = async (customer: Customer) => {
    try {
      const res = await fetch(
        `/api/customers/${customer.id}/portal/disable${API_SUFFIX}`,
        { method: 'POST' }
      );
      if (res.ok) {
        toast.success(`Portal access disabled for ${customer.name}`);
        fetchCustomers(debouncedCustomerSearch);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to disable portal access');
      }
    } catch {
      toast.error('Network error');
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
    setNotes('');

    // C-0 perf: fire all three independent detail requests in parallel.
    // Previously these ran sequentially (timeline → jobs → assets), so the
    // detail panel waited for the sum of three round-trips. All three depend
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

    try {
      const [timelineRes, jobsRes, assetsRes] = await Promise.allSettled([
        fetch(`/api/customers/${customer.id}/timeline`).then((r) =>
          r.ok ? r.json() : Promise.reject(new Error(`timeline ${r.status}`)),
        ),
        fetch(`/api/jobs?customerId=${customer.id}`).then((r) =>
          r.ok ? r.json() : Promise.reject(new Error(`jobs ${r.status}`)),
        ),
        fetch(`/api/customers/${customer.id}/assets`).then((r) =>
          r.ok ? r.json() : Promise.reject(new Error(`assets ${r.status}`)),
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
    } finally {
      // Single finally guarantees every loading flag is cleared even if the
      // Promise.allSettled itself threw (it shouldn't, but defensive).
      setTimelineLoading(false);
      setJobsLoading(false);
      setAssetsLoading(false);
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
      const res = await fetch(`/api/customers/${selectedCustomer.id}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryType: 'note',
          title: 'Note added',
          description: notes,
        }),
      });
      if (res.ok) {
        toast.success('Note saved');
        setNotes('');
        // Refresh timeline
        const tRes = await fetch(`/api/customers/${selectedCustomer.id}/timeline`);
        if (tRes.ok) {
          const data = await tRes.json();
          setTimeline(Array.isArray(data?.entries) ? data.entries : []);
        }
      } else {
        toast.error('Failed to save note');
      }
    } catch {
      toast.error('Network error');
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
    // C-1: total uses the server-side count (pagination.total) when available;
    // the other stats are approximations on the fetched page (100 rows).
    total: customersTotal ?? customers.length,
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
  // ─── DETAIL MODE: Customer Profile (360 View) ────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (formMode === 'detail' && selectedCustomer) {
    const c = selectedCustomer;
    return (
      <div className="space-y-4 w-full">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={closeCustomerDetail} className="gap-1.5">
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
                    <MessageCircle className="size-4 shrink-0 text-emerald-500" /> {c.whatsappId}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Calendar className="size-4 shrink-0" /> Added {formatDate(c.createdAt)}
                </span>
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => openEditCustomer(c)}>
                <Pencil className="size-3.5 mr-1" /> Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setActiveView('omnichannel')}>
                    <MessageSquare className="size-3.5 mr-2" /> Send Message
                  </DropdownMenuItem>
                  {c.invitationStatus === 'accepted' ? (
                    <DropdownMenuItem variant="destructive" onClick={() => handleDisablePortal(c)}>
                      <Ban className="size-3.5 mr-2" /> Disable Portal
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleSendInvite(c)}>
                      <UserPlus className="size-3.5 mr-2" /> Send Portal Invite
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem variant="destructive" onClick={() => handleDeleteCustomer(c.id)}>
                    <Trash2 className="size-3.5 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Card>

        {/* Profile Tabs */}
        <Tabs value={detailTab} onValueChange={setDetailTab}>
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-max">
              <TabsTrigger value="overview" className="gap-1.5">Overview</TabsTrigger>
              <TabsTrigger value="timeline" className="gap-1.5">Timeline</TabsTrigger>
              <TabsTrigger value="jobs" className="gap-1.5">Jobs</TabsTrigger>
              <TabsTrigger value="quotes" className="gap-1.5">Quotes</TabsTrigger>
              <TabsTrigger value="invoices" className="gap-1.5">Invoices</TabsTrigger>
              <TabsTrigger value="payments" className="gap-1.5">Payments</TabsTrigger>
              <TabsTrigger value="documents" className="gap-1.5">Documents</TabsTrigger>
              <TabsTrigger value="assets" className="gap-1.5">Assets</TabsTrigger>
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
                          <TableRow key={job.id}>
                            <TableCell className="font-medium text-sm">{job.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">{job.status}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {job.scheduledDate ? formatDate(job.scheduledDate) : '--'}
                            </TableCell>
                            <TableCell className="text-sm text-right">
                              {job.totalAmount ? `₹${job.totalAmount.toLocaleString('en-IN')}` : '--'}
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
          <TabsContent value="quotes">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Receipt className="size-10 mb-2 opacity-20" />
                <p>No quotes yet</p>
                <p className="text-xs">Quotes created for this customer will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileText className="size-10 mb-2 opacity-20" />
                <p>No invoices yet</p>
                <p className="text-xs">Invoices for this customer will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CreditCard className="size-10 mb-2 opacity-20" />
                <p>No payments recorded</p>
                <p className="text-xs">Payment history will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FolderOpen className="size-10 mb-2 opacity-20" />
                <p>No documents</p>
                <p className="text-xs">Upload documents to keep them linked to this customer</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Equipment & Assets</CardTitle>
                <CardDescription>Customer assets and service history</CardDescription>
              </CardHeader>
              <CardContent>
                {assetsLoading ? (
                  <div className="space-y-2">{[1, 2].map(i => <div key={i} className="animate-pulse h-16 bg-muted rounded" />)}</div>
                ) : assets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Wrench className="size-10 mb-2 opacity-20" />
                    <p>No assets tracked</p>
                    <p className="text-xs">Add equipment to track service history and warranties</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assets.map(asset => (
                      <div key={asset.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <div className="size-10 shrink-0 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                          <Wrench className="size-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{asset.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {asset.assetType}{asset.brand ? ` · ${asset.brand}` : ''}{asset.model ? ` · ${asset.model}` : ''}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">{asset.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
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
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleSaveNote}
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
          onOpenChange={setShowAddCustomer}
          onSaved={() => fetchCustomers(debouncedCustomerSearch)}
        />
      </div>
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
        onOpenChange={setShowAddCustomer}
        onSaved={() => fetchCustomers(debouncedCustomerSearch)}
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
