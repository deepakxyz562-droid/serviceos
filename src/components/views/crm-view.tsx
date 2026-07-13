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
} from 'lucide-react';
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
  const [showAddCustomer, setShowAddCustomer] = useState(pendingCreate === 'customer');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '', address: '' });

  // Consume the cross-view "New Customer" signal — when the sidebar's "+ Create"
  // dropdown or a dashboard quick action sets pendingCreate to 'customer',
  // we reset the form + open the add-customer dialog, then clear the signal
  // (mirrors the existing "New Customer" button onClick).
  useEffect(() => {
    if (pendingCreate === 'customer') {
      setEditingCustomer(null);
      setCustomerForm({ name: '', phone: '', email: '', address: '' });
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
  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : data.customers || []);
      }
    } catch {
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ─── Customer CRUD ──────────────────────────────────────────────────────
  const handleSaveCustomer = async () => {
    if (!customerForm.name || !customerForm.phone) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      const isEditing = !!editingCustomer;
      const url = isEditing ? `/api/customers?id=${editingCustomer.id}` : '/api/customers';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm),
      });
      if (res.ok) {
        toast.success(`Customer ${isEditing ? 'updated' : 'created'} successfully`);
        setShowAddCustomer(false);
        setEditingCustomer(null);
        setCustomerForm({ name: '', phone: '', email: '', address: '' });
        fetchCustomers();
      } else {
        toast.error(`Failed to ${isEditing ? 'update' : 'create'} customer`);
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Customer deleted');
        fetchCustomers();
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
        fetchCustomers();
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
        fetchCustomers();
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
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
    });
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

    // Fetch timeline
    setTimelineLoading(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setTimeline(Array.isArray(data?.entries) ? data.entries : []);
      }
    } catch { /* ignore */ }
    finally { setTimelineLoading(false); }

    // Fetch jobs
    setJobsLoading(true);
    try {
      const res = await fetch(`/api/jobs?customerId=${customer.id}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : data?.jobs || []);
      }
    } catch { /* ignore */ }
    finally { setJobsLoading(false); }

    // Fetch assets
    setAssetsLoading(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/assets`);
      if (res.ok) {
        const data = await res.json();
        setAssets(Array.isArray(data?.assets) ? data.assets : []);
      }
    } catch { /* ignore */ }
    finally { setAssetsLoading(false); }
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
  const filteredCustomers = customers
    .filter(c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch) ||
      (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase()))
    )
    .sort((a, b) => {
      const dir = customerSortDir === 'asc' ? 1 : -1;
      if (customerSort === 'name') return a.name.localeCompare(b.name) * dir;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    });

  // ─── Stats ──────────────────────────────────────────────────────────────
  const customerStats = {
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

        {/* Add/Edit Customer Dialog (shared) */}
        <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
              <DialogDescription>
                {editingCustomer ? 'Update customer information' : 'Add a new customer to your CRM'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input placeholder="Full name" value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input placeholder="+1 555 123 4567" value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input placeholder="email@example.com" type="email" value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea placeholder="Full address" value={customerForm.address} onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddCustomer(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveCustomer} disabled={!customerForm.name || !customerForm.phone}>
                {editingCustomer ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
          {/* Search + Actions (Shopify/Notion style) */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, phone, email..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={handleImport}>
                <Upload className="size-3.5 mr-1" /> Import
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="size-3.5 mr-1" /> Export
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  setEditingCustomer(null);
                  setCustomerForm({ name: '', phone: '', email: '', address: '' });
                  setShowAddCustomer(true);
                }}
              >
                <Plus className="size-4 mr-1" /> New Customer
              </Button>
            </div>
          </div>

          {/* Customer Table */}
          {customersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse h-12 bg-muted rounded" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="size-12 mb-3 opacity-20" />
              <p>No customers found</p>
              <p className="text-xs">Add your first customer to get started</p>
            </div>
          ) : (
            <Card>
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">
                        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort('name')}>
                          Name <ArrowUpDown className="size-3" />
                        </button>
                      </TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="hidden md:table-cell">Address</TableHead>
                      <TableHead className="hidden md:table-cell">Portal</TableHead>
                      <TableHead className="hidden md:table-cell">
                        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort('createdAt')}>
                          Added <ArrowUpDown className="size-3" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map(customer => (
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer"
                        onClick={() => openCustomerDetail(customer)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-medium">
                                {initials(customer.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{customer.name}</p>
                              {customer.whatsappId && (
                                <Badge variant="outline" className="text-[9px] h-4 bg-emerald-50 text-emerald-600 border-emerald-200 mt-0.5">
                                  WhatsApp
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="flex items-center gap-1.5">
                            <Phone className="size-3 text-muted-foreground" /> {customer.phone}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {customer.email ? (
                            <span className="flex items-center gap-1.5">
                              <Mail className="size-3" /> {customer.email}
                            </span>
                          ) : '--'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate hidden md:table-cell">
                          {customer.address ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3 shrink-0" /> {customer.address}
                            </span>
                          ) : '--'}
                        </TableCell>
                        <TableCell className="text-xs hidden md:table-cell">
                          {customer.invitationStatus === 'accepted' ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                              <Check className="size-2.5 mr-1" /> Active
                            </Badge>
                          ) : customer.invitationStatus === 'pending' ? (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px]">
                              <Clock className="size-2.5 mr-1" /> Pending
                            </Badge>
                          ) : customer.invitationStatus === 'disabled' ? (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px]">
                              <Ban className="size-2.5 mr-1" /> Disabled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              <UserPlus className="size-2.5 mr-1" /> Not invited
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                          {formatDate(customer.createdAt)}
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
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
                              {customer.invitationStatus === 'accepted' ? (
                                <DropdownMenuItem variant="destructive" onClick={() => handleDisablePortal(customer)}>
                                  <Ban className="size-3.5 mr-2" /> Disable Portal
                                </DropdownMenuItem>
                              ) : customer.invitationStatus === 'pending' ? (
                                <DropdownMenuItem onClick={() => handleSendInvite(customer)}>
                                  <RotateCw className="size-3.5 mr-2" /> Resend Invitation
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleSendInvite(customer)}>
                                  <UserPlus className="size-3.5 mr-2" /> Send Invitation
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem variant="destructive" onClick={() => handleDeleteCustomer(customer.id)}>
                                <Trash2 className="size-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* ─── Add/Edit Customer Dialog ─────────────────────────────────────── */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
            <DialogDescription>
              {editingCustomer ? 'Update customer information' : 'Add a new customer to your CRM'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="Full name" value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input placeholder="+1 555 123 4567" value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input placeholder="email@example.com" type="email" value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea placeholder="Full address" value={customerForm.address} onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCustomer(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveCustomer} disabled={!customerForm.name || !customerForm.phone}>
              {editingCustomer ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
