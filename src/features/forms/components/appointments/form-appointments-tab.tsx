'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Search,
  RefreshCw,
  ExternalLink,
  CalendarCheck,
  CalendarX,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Download,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateIcsCalendar,
} from '@/lib/scheduling/calendar-helper';

interface FormBookingItem {
  id: string;
  title: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  scheduledAt?: string | null;
  scheduledEndTime?: string | null;
  duration?: number;
  status: string;
  source: string;
  notes?: string | null;
  createdAt: string;
  metadataJson?: string;
}

export function FormAppointmentsTab() {
  const [bookings, setBookings] = useState<FormBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'upcoming' | 'past' | 'cancelled' | 'all'>('upcoming');

  // Reschedule state
  const [rescheduleBooking, setRescheduleBooking] = useState<FormBookingItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00');
  const [rescheduling, setRescheduling] = useState(false);

  // Cancel state
  const [cancelBooking, setCancelBooking] = useState<FormBookingItem | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings?limit=100');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.bookings) ? data.bookings : Array.isArray(data) ? data : [];
        setBookings(list);
      }
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    const now = new Date();
    return bookings.filter((b) => {
      // Search filter
      const matchesSearch =
        !search.trim() ||
        (b.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.customerEmail || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.title || '').toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      const aptTime = b.scheduledAt ? new Date(b.scheduledAt) : null;

      if (statusFilter === 'cancelled') {
        return b.status === 'cancelled';
      }
      if (statusFilter === 'upcoming') {
        return b.status !== 'cancelled' && aptTime && aptTime >= now;
      }
      if (statusFilter === 'past') {
        return b.status !== 'cancelled' && aptTime && aptTime < now;
      }
      return true;
    });
  }, [bookings, search, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const upcoming = bookings.filter((b) => b.status !== 'cancelled' && b.scheduledAt && new Date(b.scheduledAt) >= now).length;
    const past = bookings.filter((b) => b.status !== 'cancelled' && b.scheduledAt && new Date(b.scheduledAt) < now).length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    return { upcoming, past, cancelled, total: bookings.length };
  }, [bookings]);

  // Handle Reschedule
  const handleRescheduleSubmit = async () => {
    if (!rescheduleBooking || !rescheduleDate) return;
    setRescheduling(true);
    try {
      const newScheduledAt = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
      const duration = rescheduleBooking.duration || 30;
      const newScheduledEndTime = new Date(newScheduledAt.getTime() + duration * 60 * 1000);

      const res = await fetch(`/api/bookings/${rescheduleBooking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: newScheduledAt.toISOString(),
          scheduledEndTime: newScheduledEndTime.toISOString(),
          status: 'confirmed',
          notes: `${rescheduleBooking.notes || ''}\n[Rescheduled on ${new Date().toLocaleDateString()}]`,
        }),
      });

      if (!res.ok) throw new Error('Failed to reschedule');
      toast.success('Appointment successfully rescheduled!');
      setRescheduleBooking(null);
      fetchBookings();
    } catch {
      toast.error('Could not reschedule appointment');
    } finally {
      setRescheduling(false);
    }
  };

  // Handle Cancel
  const handleCancelSubmit = async () => {
    if (!cancelBooking) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${cancelBooking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          cancellationReason: 'Cancelled by administrator via appointments dashboard',
        }),
      });

      if (!res.ok) throw new Error('Failed to cancel');
      toast.success('Appointment cancelled');
      setCancelBooking(null);
      fetchBookings();
    } catch {
      toast.error('Could not cancel appointment');
    } finally {
      setCancelling(false);
    }
  };

  // Download .ICS
  const handleDownloadIcs = (b: FormBookingItem) => {
    if (!b.scheduledAt) return;
    const start = new Date(b.scheduledAt);
    const end = b.scheduledEndTime ? new Date(b.scheduledEndTime) : new Date(start.getTime() + (b.duration || 30) * 60000);

    const icsContent = generateIcsCalendar({
      title: b.title,
      description: b.notes || 'Appointment booked via Fieseros',
      scheduledAt: start,
      scheduledEndTime: end,
      attendeeName: b.customerName || 'Client',
      attendeeEmail: b.customerEmail || undefined,
    });

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `appointment-${b.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded .ics calendar file');
  };

  return (
    <div className="space-y-6">
      {/* ── Top Metrics Strip (Calendly Style) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CalendarCheck className="size-3.5 text-emerald-500" />
              Upcoming
            </div>
            <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {metrics.upcoming}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="size-3.5 text-blue-500" />
              Past Completed
            </div>
            <div className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
              {metrics.past}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CalendarX className="size-3.5 text-rose-500" />
              Canceled
            </div>
            <div className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
              {metrics.cancelled}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-violet-500" />
              Total Bookings
            </div>
            <div className="text-2xl font-bold mt-1 text-foreground">
              {metrics.total}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl w-full sm:w-auto">
          {(['upcoming', 'past', 'cancelled', 'all'] as const).map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setStatusFilter(filterKey)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                statusFilter === filterKey
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {filterKey}
            </button>
          ))}
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client or form..."
              className="pl-8 h-9 text-xs"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchBookings} className="h-9 px-2.5">
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ── Appointments Feed ── */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          <RefreshCw className="size-6 animate-spin mx-auto mb-2 opacity-50" />
          Loading appointments...
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card className="border-dashed border-border/80 p-12 text-center">
          <CalendarDays className="size-10 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No {statusFilter} appointments found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Appointments booked through your forms and AI chatbot will appear here in real time.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((b) => {
            const start = b.scheduledAt ? new Date(b.scheduledAt) : null;
            const end = b.scheduledEndTime
              ? new Date(b.scheduledEndTime)
              : start
              ? new Date(start.getTime() + (b.duration || 30) * 60000)
              : null;

            const googleUrl = start && end ? generateGoogleCalendarUrl({
              title: b.title,
              description: b.notes || 'Appointment via Fieseros',
              scheduledAt: start,
              scheduledEndTime: end,
            }) : null;

            const outlookUrl = start && end ? generateOutlookCalendarUrl({
              title: b.title,
              description: b.notes || 'Appointment via Fieseros',
              scheduledAt: start,
              scheduledEndTime: end,
            }) : null;

            return (
              <Card key={b.id} className="border-border/70 hover:border-primary/40 transition-all shadow-sm">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Left: Timing & Customer Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        {start ? start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD'}
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold">
                        &bull; {start ? start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
                        {end ? ` – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-semibold py-0">
                        {b.duration || 30} min
                      </Badge>
                      <Badge
                        variant={b.status === 'confirmed' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'secondary'}
                        className="text-[10px] capitalize py-0"
                      >
                        {b.status}
                      </Badge>
                    </div>

                    <h4 className="text-sm font-semibold text-foreground/90 truncate">
                      {b.title}
                    </h4>

                    {/* Customer contact pill */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-0.5">
                      {b.customerName && (
                        <span className="flex items-center gap-1 font-medium text-foreground/80">
                          <User className="size-3 text-primary/75" />
                          {b.customerName}
                        </span>
                      )}
                      {b.customerEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="size-3" />
                          {b.customerEmail}
                        </span>
                      )}
                      {b.customerPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3" />
                          {b.customerPhone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Calendly Action Bar */}
                  <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
                    {/* Add to Google Calendar */}
                    {googleUrl && b.status !== 'cancelled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="text-xs h-8 px-2.5 gap-1.5"
                      >
                        <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                          <Calendar className="size-3 text-blue-500" />
                          <span className="hidden lg:inline">Google Cal</span>
                        </a>
                      </Button>
                    )}

                    {/* Add to Outlook */}
                    {outlookUrl && b.status !== 'cancelled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="text-xs h-8 px-2.5 gap-1.5"
                      >
                        <a href={outlookUrl} target="_blank" rel="noopener noreferrer">
                          <Calendar className="size-3 text-sky-600" />
                          <span className="hidden lg:inline">Outlook</span>
                        </a>
                      </Button>
                    )}

                    {/* Download .ICS */}
                    {b.status !== 'cancelled' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadIcs(b)}
                        title="Download .ics Calendar Invite"
                        className="text-xs h-8 px-2"
                      >
                        <Download className="size-3.5" />
                      </Button>
                    )}

                    {/* Reschedule Button */}
                    {b.status !== 'cancelled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRescheduleBooking(b);
                          if (b.scheduledAt) {
                            setRescheduleDate(b.scheduledAt.split('T')[0]);
                          }
                        }}
                        className="text-xs h-8 text-primary font-semibold"
                      >
                        Reschedule
                      </Button>
                    )}

                    {/* Cancel Button */}
                    {b.status !== 'cancelled' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancelBooking(b)}
                        className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Reschedule Dialog ── */}
      <Dialog open={!!rescheduleBooking} onOpenChange={(open) => !open && setRescheduleBooking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new date and time for {rescheduleBooking?.customerName || 'this client'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">New Date</label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">New Time</label>
              <Input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setRescheduleBooking(null)}>
              Cancel
            </Button>
            <Button onClick={handleRescheduleSubmit} disabled={rescheduling || !rescheduleDate}>
              {rescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Confirmation Dialog ── */}
      <Dialog open={!!cancelBooking} onOpenChange={(open) => !open && setCancelBooking(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Cancel Appointment?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the appointment for {cancelBooking?.customerName || 'this client'}? This action will mark it as cancelled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setCancelBooking(null)}>
              Keep Appointment
            </Button>
            <Button variant="destructive" onClick={handleCancelSubmit} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
