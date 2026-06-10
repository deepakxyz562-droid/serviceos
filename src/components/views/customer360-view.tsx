'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, Phone, Mail, MapPin, MessageCircle,
  Pencil, Trash2, Briefcase, FileText, Calendar, Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/client-auth';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ContactListItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  whatsappId: string | null;
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { jobs: number; invoices: number; leads: number };
}

interface ContactJob {
  id: string;
  title: string;
  status: string;
  scheduledAt: string | null;
}

interface ContactInvoice {
  id: string;
  number: string;
  total: number;
  status: string;
  dueDate: string | null;
}

interface ContactDetail extends ContactListItem {
  jobs: ContactJob[];
  invoices: ContactInvoice[];
}

interface ContactFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  whatsappId: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const EMPTY_FORM: ContactFormData = {
  name: '',
  phone: '',
  email: '',
  address: '',
  whatsappId: '',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function getStatusColor(status: string) {
  const s = status.toLowerCase();
  if (['completed', 'paid', 'active', 'delivered', 'won'].includes(s))
    return 'bg-emerald-100 text-emerald-700';
  if (['pending', 'draft', 'scheduled', 'sent', 'qualified'].includes(s))
    return 'bg-amber-100 text-amber-700';
  if (['cancelled', 'overdue', 'rejected', 'failed'].includes(s))
    return 'bg-red-100 text-red-700';
  if (['in_progress', 'partial', 'in-progress'].includes(s))
    return 'bg-teal-100 text-teal-700';
  return 'bg-slate-100 text-slate-600';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Customer360View() {
  // List state
  const [customers, setCustomers] = useState<ContactListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Detail state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // ─── Fetch list ─────────────────────────────────────────────────────

  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '100',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      if (search.trim()) params.set('search', search.trim());

      const res = await authFetch(`/api/contacts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch contacts');
      const data = await res.json();
      setCustomers(data.contacts ?? []);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setListLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // ─── Fetch detail ───────────────────────────────────────────────────

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await authFetch(`/api/contacts/${id}`);
      if (!res.ok) throw new Error('Failed to fetch contact');
      const data = await res.json();
      setDetail(data);
    } catch {
      toast.error('Failed to load customer details');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, fetchDetail]);

  // ─── Create ─────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch('/api/contacts', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          whatsappId: formData.whatsappId.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create customer');
      }
      toast.success('Customer created');
      setShowCreate(false);
      setFormData(EMPTY_FORM);
      fetchList();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Update ─────────────────────────────────────────────────────────

  const handleEdit = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/contacts/${selectedId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          whatsappId: formData.whatsappId.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update customer');
      }
      toast.success('Customer updated');
      setShowEdit(false);
      fetchDetail(selectedId);
      fetchList();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update customer');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/contacts/${selectedId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete customer');
      }
      toast.success('Customer deleted');
      setShowDelete(false);
      setSelectedId(null);
      setDetail(null);
      fetchList();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete customer');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Dialog openers ─────────────────────────────────────────────────

  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setShowCreate(true);
  };

  const openEdit = () => {
    if (!detail) return;
    setFormData({
      name: detail.name,
      phone: detail.phone,
      email: detail.email ?? '',
      address: detail.address ?? '',
      whatsappId: detail.whatsappId ?? '',
    });
    setShowEdit(true);
  };

  // ─── Filtered list (client-side on already fetched data) ────────────

  const filteredCustomers = customers;

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <ViewHeader
        icon={Users}
        iconBg="bg-emerald-600 shadow-lg shadow-emerald-600/20"
        title="Customer 360"
        description="Complete customer profile & timeline"
        action={
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]"
            onClick={openCreate}
          >
            <Plus className="size-4 mr-1" />
            Add Customer
          </Button>
        }
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search customers by name, phone, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ─── Customer List ──────────────────────────────────────── */}
        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="size-4 text-emerald-600" />
              Customers ({filteredCustomers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[600px]">
              {listLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredCustomers.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No customers"
                  description="No customers match your search. Add one to get started."
                  actionLabel="Add Customer"
                  onAction={openCreate}
                  className="py-8"
                />
              ) : (
                <div className="divide-y">
                  {filteredCustomers.map(customer => (
                    <button
                      key={customer.id}
                      className={cn(
                        'w-full p-3 text-left hover:bg-muted/50 transition-colors',
                        selectedId === customer.id &&
                          'bg-emerald-50 border-l-2 border-l-emerald-600'
                      )}
                      onClick={() => setSelectedId(customer.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="size-9">
                          <AvatarFallback className="text-xs font-medium bg-emerald-100 text-emerald-700">
                            {getInitials(customer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {customer.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {customer.phone}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Briefcase className="size-3" />
                              {customer._count.jobs}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <FileText className="size-3" />
                              {customer._count.invoices}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ─── Customer Detail ───────────────────────────────────── */}
        <div className="lg:col-span-3">
          {!selectedId ? (
            <EmptyState
              icon={Eye}
              title="Select a customer"
              description="Choose a customer from the list to view their full profile."
              className="min-h-[400px]"
            />
          ) : detailLoading ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="size-20 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-4 w-56" />
                      <Skeleton className="h-4 w-72" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 rounded-lg" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : detail ? (
            <div className="space-y-4">
              {/* Profile Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 flex-wrap">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <Avatar className="size-20 ring-4 ring-emerald-100">
                        <AvatarFallback className="text-xl font-bold bg-emerald-100 text-emerald-700">
                          {getInitials(detail.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 size-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white bg-emerald-500 text-white">
                        {detail._count.jobs}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold">{detail.name}</h3>
                        <Badge className="text-xs bg-emerald-100 text-emerald-700">
                          {detail._count.leads} lead{detail._count.leads !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Phone className="size-3.5 shrink-0" /> {detail.phone}
                        </div>
                        {detail.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="size-3.5 shrink-0" /> {detail.email}
                          </div>
                        )}
                        {detail.whatsappId && (
                          <div className="flex items-center gap-2">
                            <MessageCircle className="size-3.5 shrink-0" /> WhatsApp: {detail.whatsappId}
                          </div>
                        )}
                        {detail.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="size-3.5 shrink-0" /> {detail.address}
                          </div>
                        )}
                      </div>

                      {/* Created date */}
                      <p className="text-xs text-muted-foreground mt-2">
                        Customer since {formatDate(detail.createdAt)}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={openEdit}
                        className="min-h-[44px]"
                      >
                        <Pencil className="size-4 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowDelete(true)}
                        className="min-h-[44px] text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="size-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Quick Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="rounded-lg bg-emerald-50 p-3 text-center border border-emerald-100">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Briefcase className="size-4 text-emerald-600" />
                        <p className="text-2xl font-bold text-emerald-600">
                          {detail._count.jobs}
                        </p>
                      </div>
                      <p className="text-xs text-emerald-600/70 font-medium">Total Jobs</p>
                    </div>
                    <div className="rounded-lg bg-teal-50 p-3 text-center border border-teal-100">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <FileText className="size-4 text-teal-600" />
                        <p className="text-2xl font-bold text-teal-600">
                          {detail._count.invoices}
                        </p>
                      </div>
                      <p className="text-xs text-teal-600/70 font-medium">Invoices</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-3 text-center border border-amber-100">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <MessageCircle className="size-4 text-amber-600" />
                        <p className="text-2xl font-bold text-amber-600">
                          {detail._count.leads}
                        </p>
                      </div>
                      <p className="text-xs text-amber-600/70 font-medium">Leads</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 text-center border border-slate-200">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Calendar className="size-4 text-slate-500" />
                        <p className="text-sm font-bold text-slate-600">
                          {formatDate(detail.createdAt)}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Created</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="jobs">
                <TabsList className="flex-wrap h-auto">
                  <TabsTrigger value="jobs" className="text-xs">
                    Jobs ({detail._count.jobs})
                  </TabsTrigger>
                  <TabsTrigger value="invoices" className="text-xs">
                    Invoices ({detail._count.invoices})
                  </TabsTrigger>
                  <TabsTrigger value="info" className="text-xs">
                    Contact Info
                  </TabsTrigger>
                </TabsList>

                {/* Jobs Tab */}
                <TabsContent value="jobs">
                  <Card>
                    <CardContent className="p-4">
                      {detail.jobs.length === 0 ? (
                        <EmptyState
                          icon={Briefcase}
                          title="No jobs yet"
                          description="This customer has no associated jobs."
                          className="py-8"
                        />
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Job</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Scheduled</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detail.jobs.map(job => (
                              <TableRow key={job.id}>
                                <TableCell className="font-medium text-sm">
                                  {job.title}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[10px]',
                                      getStatusColor(job.status)
                                    )}
                                  >
                                    {job.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {formatDate(job.scheduledAt)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Invoices Tab */}
                <TabsContent value="invoices">
                  <Card>
                    <CardContent className="p-4">
                      {detail.invoices.length === 0 ? (
                        <EmptyState
                          icon={FileText}
                          title="No invoices yet"
                          description="This customer has no associated invoices."
                          className="py-8"
                        />
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Invoice</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Due Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detail.invoices.map(inv => (
                              <TableRow key={inv.id}>
                                <TableCell className="font-medium text-sm">
                                  {inv.number}
                                </TableCell>
                                <TableCell className="text-sm font-semibold text-emerald-600">
                                  {formatCurrency(inv.total)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[10px]',
                                      getStatusColor(inv.status)
                                    )}
                                  >
                                    {inv.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {formatDate(inv.dueDate)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Contact Info Tab */}
                <TabsContent value="info">
                  <Card>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Name</Label>
                          <p className="text-sm font-medium">{detail.name}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Phone</Label>
                          <p className="text-sm font-medium">{detail.phone}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Email</Label>
                          <p className="text-sm font-medium">{detail.email || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">WhatsApp ID</Label>
                          <p className="text-sm font-medium">{detail.whatsappId || '—'}</p>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs text-muted-foreground">Address</Label>
                          <p className="text-sm font-medium">{detail.address || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Created</Label>
                          <p className="text-sm font-medium">{formatDate(detail.createdAt)}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Last Updated</Label>
                          <p className="text-sm font-medium">{formatDate(detail.updatedAt)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </div>
      </div>

      {/* ─── Create Customer Dialog ────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-4 text-emerald-600" />
              Add Customer
            </DialogTitle>
            <DialogDescription>
              Create a new customer record. Name and phone are required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-name"
                placeholder="Full name"
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-phone">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-phone"
                placeholder="+1 555-0100"
                value={formData.phone}
                onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                placeholder="email@example.com"
                type="email"
                value={formData.email}
                onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-address">Address</Label>
              <Input
                id="create-address"
                placeholder="123 Main Street, City, ST"
                value={formData.address}
                onChange={e => setFormData(f => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-whatsapp">WhatsApp ID</Label>
              <Input
                id="create-whatsapp"
                placeholder="+15550100"
                value={formData.whatsappId}
                onChange={e => setFormData(f => ({ ...f, whatsappId: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Customer Dialog ──────────────────────────────────── */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-4 text-emerald-600" />
              Edit Customer
            </DialogTitle>
            <DialogDescription>
              Update customer information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                placeholder="Full name"
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                placeholder="+1 555-0100"
                value={formData.phone}
                onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                placeholder="email@example.com"
                type="email"
                value={formData.email}
                onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                placeholder="123 Main Street, City, ST"
                value={formData.address}
                onChange={e => setFormData(f => ({ ...f, address: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-whatsapp">WhatsApp ID</Label>
              <Input
                id="edit-whatsapp"
                placeholder="+15550100"
                value={formData.whatsappId}
                onChange={e => setFormData(f => ({ ...f, whatsappId: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]"
              onClick={handleEdit}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ────────────────────────────── */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">{detail?.name}</span>?
              This action cannot be undone. Customers with active jobs cannot be
              deleted — you must remove or reassign their jobs first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
