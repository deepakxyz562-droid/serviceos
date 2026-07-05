'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Calendar, Plus, Search, Clock, CheckCircle2, XCircle,
  MoreHorizontal, Eye, Trash2, Phone, Globe, MessageCircle,
  UserPlus, MapPin, User, Briefcase, LayoutGrid, List,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// ─── Types ──────────────────────────────────────────────────────────────────

type BookingStatus = 'pending' | 'confirmed' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
type BookingSource = 'website' | 'whatsapp' | 'phone' | 'manual';

interface Booking {
  id: string;
  title: string;
  description?: string;
  status: BookingStatus;
  source: BookingSource;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  employeeId?: string;
  employee?: { id: string; name: string; avatar?: string };
  serviceId?: string;
  address?: string;
  scheduledAt?: string;
  scheduledEndTime?: string;
  duration: number;
  notes?: string;
  createdAt: string;
}

interface BookingFormData {
  title: string;
  customer: string;
  service: string;
  employee: string;
  scheduledAt: string;
  duration: number;
  address: string;
  source: BookingSource;
  notes: string;
}

interface Customer {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
}

interface ServiceItem {
  id: string;
  name: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BookingStatus, { label: string; bg: string; text: string; border: string; dotColor: string }> = {
  pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dotColor: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dotColor: 'bg-sky-500' },
  assigned: { label: 'Assigned', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dotColor: 'bg-teal-500' },
  in_progress: { label: 'In Progress', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dotColor: 'bg-emerald-500' },
  completed: { label: 'Completed', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dotColor: 'bg-green-500' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dotColor: 'bg-red-500' },
};

const SOURCE_CONFIG: Record<BookingSource, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  website: { label: 'Website', icon: <Globe className="size-3" />, bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  whatsapp: { label: 'WhatsApp', icon: <MessageCircle className="size-3" />, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  phone: { label: 'Phone', icon: <Phone className="size-3" />, bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  manual: { label: 'Manual', icon: <User className="size-3" />, bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

const EMPTY_FORM = (): BookingFormData => ({
  title: '', customer: '', service: '', employee: '', scheduledAt: '',
  duration: 60, address: '', source: 'manual', notes: '',
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BookingsView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [form, setForm] = useState<BookingFormData>(EMPTY_FORM());
  const [saving, setSaving] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const res = await authFetch(`/api/bookings?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const data = await res.json();
      setBookings(data.bookings || data || []);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter, searchQuery]);

  const fetchSupportingData = useCallback(async () => {
    try {
      const [custRes, empRes, svcRes] = await Promise.all([
        authFetch('/api/customers?limit=100'),
        authFetch('/api/employees?limit=100'),
        authFetch('/api/services?limit=100'),
      ]);
      if (custRes.ok) { const d = await custRes.json(); setCustomers(d.customers || d || []); }
      if (empRes.ok) { const d = await empRes.json(); setEmployees(d.employees || d || []); }
      if (svcRes.ok) { const d = await svcRes.json(); setServices(d.services || d || []); }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { fetchSupportingData(); }, [fetchSupportingData]);

  // ─── Computed Stats ─────────────────────────────────────────────────────

  const stats = useCallback(() => {
    const total = bookings.length;
    const confirmed = bookings.filter((b) => ['confirmed', 'assigned'].includes(b.status)).length;
    const completed = bookings.filter((b) => b.status === 'completed').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const today = bookings.filter((b) => b.scheduledAt?.startsWith(todayStr)).length;
    return { total, confirmed, completed, cancelled, today };
  }, [bookings]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const renderStatusBadge = (status: BookingStatus) => {
    const config = STATUS_CONFIG[status];
    return (
      <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${config.bg} ${config.text} ${config.border}`}>
        <span className={`size-1.5 rounded-full ${config.dotColor}`} />
        {config.label}
      </Badge>
    );
  };

  const renderSourceBadge = (source: BookingSource) => {
    const config = SOURCE_CONFIG[source];
    return (
      <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${config.bg} ${config.text} ${config.border}`}>
        {config.icon} {config.label}
      </Badge>
    );
  };

  const openCreateDialog = () => { setForm(EMPTY_FORM()); setShowCreateDialog(true); };
  const openDetailDialog = (booking: Booking) => { setSelectedBooking(booking); setShowDetailDialog(true); };

  const handleCreateBooking = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.scheduledAt) { toast.error('Please set a date and time'); return; }
    setSaving(true);
    try {
      const customer = customers.find((c) => c.id === form.customer);
      const employee = employees.find((e) => e.id === form.employee);
      const res = await authFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          description: form.notes,
          source: form.source,
          customerId: form.customer || null,
          customerName: customer?.name || null,
          employeeId: form.employee || null,
          serviceId: form.service || null,
          address: form.address || null,
          scheduledAt: form.scheduledAt,
          duration: form.duration,
          notes: form.notes,
        }),
      });
      if (!res.ok) throw new Error('Failed to create booking');
      toast.success('Booking created successfully');
      setShowCreateDialog(false);
      fetchBookings();
    } catch {
      toast.error('Failed to create booking');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      const res = await authFetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update booking');
      toast.success(`Booking marked as ${STATUS_CONFIG[newStatus].label}`);
      fetchBookings();
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking((prev) => prev ? { ...prev, status: newStatus } : prev);
      }
    } catch {
      toast.error('Failed to update booking status');
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const res = await authFetch(`/api/bookings/${bookingId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete booking');
      toast.success('Booking deleted');
      if (selectedBooking?.id === bookingId) { setShowDetailDialog(false); setSelectedBooking(null); }
      fetchBookings();
    } catch {
      toast.error('Failed to delete booking');
    }
  };

  const s = stats();

  // ─── Loading Skeleton ───────────────────────────────────────────────────

  if (loading && bookings.length === 0) {
    return (
      <div className="space-y-6 w-full">
        <ViewHeader icon={Calendar} iconBg="bg-violet-600" title="Booking Management" description="Manage bookings from all sources" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 w-full">
      <ViewHeader
        icon={Calendar}
        iconBg="bg-violet-600"
        title="Booking Management"
        description="Manage bookings from all sources — website, WhatsApp, phone"
        action={
          <Button className="bg-violet-600 hover:bg-violet-700" onClick={openCreateDialog}>
            <Plus className="size-4 mr-1.5" /> New Booking
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Bookings', value: s.total, icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Confirmed', value: s.confirmed, icon: CheckCircle2, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: "Today's", value: s.today, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Completed', value: s.completed, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Cancelled', value: s.cancelled, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-lg font-bold truncate">{stat.value}</p>
                  </div>
                  <div className={`${stat.bg} p-2 rounded-xl shrink-0`}><Icon className={`size-4 ${stat.color}`} /></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs px-2">All</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs px-2">Pending</TabsTrigger>
            <TabsTrigger value="confirmed" className="text-xs px-2">Confirmed</TabsTrigger>
            <TabsTrigger value="assigned" className="text-xs px-2">Assigned</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs px-2">Active</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs px-2">Done</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search bookings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 border rounded-lg p-0.5">
          <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs px-2" onClick={() => setViewMode('table')}>
            <List className="size-3.5" />
          </Button>
          <Button variant={viewMode === 'cards' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs px-2" onClick={() => setViewMode('cards')}>
            <LayoutGrid className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {bookings.length === 0 && !loading ? (
        <EmptyState icon={Calendar} title="No bookings found" description="Try adjusting your filters or create a new booking" actionLabel="New Booking" onAction={openCreateDialog} />
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetailDialog(booking)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{booking.title}</span>
                  {renderStatusBadge(booking.status)}
                </div>
                {booking.customerName && (
                  <div>
                    <h4 className="font-medium text-sm">{booking.customerName}</h4>
                  </div>
                )}
                <div className="space-y-1 text-xs text-muted-foreground">
                  {booking.scheduledAt && (
                    <div className="flex items-center gap-1"><Clock className="size-3" /> {formatDateTime(booking.scheduledAt)}</div>
                  )}
                  {booking.address && (
                    <div className="flex items-center gap-1"><MapPin className="size-3" /> <span className="truncate">{booking.address}</span></div>
                  )}
                  <div className="flex items-center gap-1"><Briefcase className="size-3" /> {booking.duration} min</div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  {renderSourceBadge(booking.source)}
                  {booking.employee ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5"><AvatarFallback className="text-[8px] bg-violet-100 text-violet-700">{booking.employee.name[0]}</AvatarFallback></Avatar>
                      <span className="text-xs text-muted-foreground">{booking.employee.name}</span>
                    </div>
                  ) : <span className="text-xs text-muted-foreground">Unassigned</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Source</TableHead>
                    <TableHead className="hidden lg:table-cell">Scheduled</TableHead>
                    <TableHead className="hidden lg:table-cell">Assignee</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetailDialog(booking)}>
                      <TableCell className="font-medium text-sm">{booking.title}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{booking.customerName || '—'}</TableCell>
                      <TableCell>{renderStatusBadge(booking.status)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{renderSourceBadge(booking.source)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{formatDateTime(booking.scheduledAt)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {booking.employee ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="size-5"><AvatarFallback className="text-[8px] bg-violet-100 text-violet-700">{booking.employee.name[0]}</AvatarFallback></Avatar>
                            <span className="text-xs">{booking.employee.name}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="size-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => openDetailDialog(booking)}><Eye className="size-3.5 mr-2" /> View</DropdownMenuItem>
                            {booking.status === 'pending' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'confirmed')}><CheckCircle2 className="size-3.5 mr-2" /> Confirm</DropdownMenuItem>
                            )}
                            {booking.status === 'confirmed' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'assigned')}><UserPlus className="size-3.5 mr-2" /> Assign</DropdownMenuItem>
                            )}
                            {booking.status === 'assigned' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'in_progress')}><Clock className="size-3.5 mr-2" /> Start</DropdownMenuItem>
                            )}
                            {booking.status === 'in_progress' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'completed')}><CheckCircle2 className="size-3.5 mr-2" /> Complete</DropdownMenuItem>
                            )}
                            {!['completed', 'cancelled'].includes(booking.status) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => handleStatusChange(booking.id, 'cancelled')}><XCircle className="size-3.5 mr-2" /> Cancel</DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => handleDeleteBooking(booking.id)}><Trash2 className="size-3.5 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Booking Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="size-5 text-violet-600" /> New Booking</DialogTitle>
            <DialogDescription>Schedule a new service booking</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-1">
            <div className="space-y-4 pr-3">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input placeholder="Booking title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select value={form.customer} onValueChange={(v) => setForm((p) => ({ ...p, customer: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Service</Label>
                  <Select value={form.service} onValueChange={(v) => setForm((p) => ({ ...p, service: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                    <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input placeholder="Service location" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scheduled At *</Label>
                  <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Duration (min)</Label>
                  <Input type="number" min={15} step={15} value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: parseInt(e.target.value) || 60 }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={(v) => setForm((p) => ({ ...p, source: v as BookingSource }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select value={form.employee} onValueChange={(v) => setForm((p) => ({ ...p, employee: v }))}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea placeholder="Special instructions..." value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} className="text-sm" />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={saving}>Cancel</Button>
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={handleCreateBooking} disabled={saving}>{saving ? 'Creating...' : 'Create Booking'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          {selectedBooking && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Calendar className="size-5 text-violet-600" /> {selectedBooking.title}</DialogTitle>
                <DialogDescription>{selectedBooking.customerName || 'No customer assigned'}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[65vh] pr-1">
                <div className="space-y-4 pr-3">
                  <div className="flex items-center justify-between">
                    {renderStatusBadge(selectedBooking.status)}
                    {renderSourceBadge(selectedBooking.source)}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Duration</p>
                      <p className="font-medium">{selectedBooking.duration} min</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Scheduled</p>
                      <p className="font-medium">{formatDateTime(selectedBooking.scheduledAt)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Assignee</p>
                      <p className="font-medium">{selectedBooking.employee?.name || 'Unassigned'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Created</p>
                      <p className="font-medium">{formatDateTime(selectedBooking.createdAt)}</p>
                    </div>
                  </div>
                  {selectedBooking.address && (
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground text-xs">Address</p>
                      <p className="font-medium flex items-center gap-1"><MapPin className="size-3.5 text-muted-foreground" /> {selectedBooking.address}</p>
                    </div>
                  )}
                  {selectedBooking.notes && (
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground text-xs">Notes</p>
                      <p className="text-muted-foreground">{selectedBooking.notes}</p>
                    </div>
                  )}
                  {selectedBooking.description && (
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground text-xs">Description</p>
                      <p className="text-muted-foreground">{selectedBooking.description}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <div className="flex gap-2 flex-1 flex-wrap">
                  {selectedBooking.status === 'pending' && (
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => { handleStatusChange(selectedBooking.id, 'confirmed'); setShowDetailDialog(false); }}>
                      <CheckCircle2 className="size-3.5 mr-1" /> Confirm
                    </Button>
                  )}
                  {selectedBooking.status === 'confirmed' && (
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => { handleStatusChange(selectedBooking.id, 'assigned'); setShowDetailDialog(false); }}>
                      <UserPlus className="size-3.5 mr-1" /> Assign
                    </Button>
                  )}
                  {selectedBooking.status === 'assigned' && (
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => { handleStatusChange(selectedBooking.id, 'in_progress'); setShowDetailDialog(false); }}>
                      <Clock className="size-3.5 mr-1" /> Start
                    </Button>
                  )}
                  {selectedBooking.status === 'in_progress' && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleStatusChange(selectedBooking.id, 'completed'); setShowDetailDialog(false); }}>
                      <CheckCircle2 className="size-3.5 mr-1" /> Complete
                    </Button>
                  )}
                </div>
                {!['completed', 'cancelled'].includes(selectedBooking.status) && (
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => { handleStatusChange(selectedBooking.id, 'cancelled'); setShowDetailDialog(false); }}>
                    <XCircle className="size-3.5 mr-1" /> Cancel
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
