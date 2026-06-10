'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import {
  CalendarDays, ChevronLeft, ChevronRight, Search, Clock,
  MapPin, Briefcase, Bell,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// ─── Types ──────────────────────────────────────────────────────────────────

type CalendarEventType = 'job' | 'booking' | 'follow_up';

interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  date: string;
  startTime: string;
  endTime: string;
  assignee: string;
  location: string;
  status: string;
  customer: string;
  color: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const EVENT_TYPE_CONFIG: Record<CalendarEventType, { label: string; color: string; bg: string; border: string }> = {
  job: { label: 'Job', color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-300' },
  booking: { label: 'Booking', color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300' },
  follow_up: { label: 'Follow-up', color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-300' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatTime24(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const dateFrom = formatDateStr(new Date(year, month, 1));
      const dateTo = formatDateStr(new Date(year, month + 1, 0));

      const calendarEvents: CalendarEvent[] = [];

      // Fetch jobs
      try {
        const jobsRes = await authFetch(`/api/jobs?dateFrom=${dateFrom}&dateTo=${dateTo}&limit=100`);
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          const jobs = jobsData.jobs || jobsData || [];
          jobs.forEach((job: Record<string, unknown>) => {
            if (job.scheduledAt) {
              const scheduledDate = new Date(job.scheduledAt as string);
              const startH = scheduledDate.getHours();
              const startM = scheduledDate.getMinutes();
              const endH = startH + Math.floor((job.estimatedDuration as number || 60) / 60);
              calendarEvents.push({
                id: job.id as string,
                title: (job.title as string) || 'Untitled Job',
                type: 'job',
                date: formatDateStr(scheduledDate),
                startTime: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
                endTime: `${String(endH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
                assignee: (job.assigneeName as string) || '',
                location: (job.address as string) || '',
                status: (job.status as string) || 'pending',
                customer: (job.customerName as string) || '',
                color: 'bg-emerald-500',
              });
            }
          });
        }
      } catch { /* silent */ }

      // Fetch bookings
      try {
        const bookingsRes = await authFetch(`/api/bookings?dateFrom=${dateFrom}&dateTo=${dateTo}&limit=100`);
        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          const bookings = bookingsData.bookings || bookingsData || [];
          bookings.forEach((booking: Record<string, unknown>) => {
            if (booking.scheduledAt) {
              const scheduledDate = new Date(booking.scheduledAt as string);
              const startH = scheduledDate.getHours();
              const startM = scheduledDate.getMinutes();
              const duration = (booking.duration as number) || 60;
              const endH = startH + Math.floor(duration / 60);
              calendarEvents.push({
                id: booking.id as string,
                title: (booking.title as string) || 'Untitled Booking',
                type: 'booking',
                date: formatDateStr(scheduledDate),
                startTime: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
                endTime: `${String(endH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
                assignee: (booking.employee as { name?: string })?.name || '',
                location: (booking.address as string) || '',
                status: (booking.status as string) || 'pending',
                customer: (booking.customerName as string) || '',
                color: 'bg-violet-500',
              });
            }
          });
        }
      } catch { /* silent */ }

      setEvents(calendarEvents);
    } catch {
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchCalendarData(); }, [fetchCalendarData]);

  // ─── Filtered events ────────────────────────────────────────────────────

  const filteredEvents = useCallback(() => {
    let result = [...events];
    if (typeFilter !== 'all') result = result.filter((e) => e.type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.title.toLowerCase().includes(q) || e.customer.toLowerCase().includes(q) || e.assignee.toLowerCase().includes(q));
    }
    return result;
  }, [events, typeFilter, searchQuery]);

  const filtered = filteredEvents();

  // ─── Stats widgets ──────────────────────────────────────────────────────

  const todayStr = formatDateStr(new Date());
  const todayEvents = filtered.filter((e) => e.date === todayStr);
  const todayJobs = todayEvents.filter((e) => e.type === 'job');
  const upcomingAppointments = filtered.filter((e) => e.type === 'booking' && e.date >= todayStr).slice(0, 5);
  const pendingFollowUps = filtered.filter((e) => e.type === 'follow_up' && e.status === 'pending');

  // ─── Month view data ────────────────────────────────────────────────────

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const getEventsForDay = (day: number | null) => {
    if (day === null) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filtered.filter((e) => e.date === dateStr);
  };

  // ─── Navigation ────────────────────────────────────────────────────────

  const navigatePrev = () => {
    if (viewMode === 'month') setCurrentDate(new Date(year, month - 1, 1));
    else if (viewMode === 'week') setCurrentDate(new Date(year, month, currentDate.getDate() - 7));
    else setCurrentDate(new Date(year, month, currentDate.getDate() - 1));
  };

  const navigateNext = () => {
    if (viewMode === 'month') setCurrentDate(new Date(year, month + 1, 1));
    else if (viewMode === 'week') setCurrentDate(new Date(year, month, currentDate.getDate() + 7));
    else setCurrentDate(new Date(year, month, currentDate.getDate() + 1));
  };

  const navigateToday = () => setCurrentDate(new Date());

  const openEventDetail = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  // ─── Render: Month View ─────────────────────────────────────────────────

  const renderMonthView = () => (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 bg-muted/50">
        {DAYS.map((day) => (
          <div key={day} className="p-2 text-center text-xs font-semibold text-muted-foreground border-b">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
          return (
            <div key={idx} className={`min-h-[100px] p-1.5 border-b border-r ${day === null ? 'bg-muted/20' : ''} ${isToday ? 'bg-sky-50/50' : ''}`}>
              {day !== null && (
                <>
                  <div className={`text-xs font-medium mb-1 flex items-center justify-center size-6 rounded-full ${isToday ? 'bg-sky-600 text-white' : 'text-muted-foreground'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5 max-h-[72px] overflow-y-auto">
                    {dayEvents.slice(0, 3).map((event) => {
                      const typeConfig = EVENT_TYPE_CONFIG[event.type];
                      return (
                        <button
                          key={event.id}
                          className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded ${typeConfig.bg} ${typeConfig.color} truncate hover:opacity-80 transition-opacity`}
                          onClick={() => openEventDetail(event)}
                        >
                          {event.title}
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <p className="text-[10px] text-muted-foreground text-center">+{dayEvents.length - 3} more</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── Render: Day View ────────────────────────────────────────────────────

  const renderDayView = () => {
    const dateStr = formatDateStr(currentDate);
    const dayEvents = filtered.filter((e) => e.date === dateStr);

    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/50 p-3 text-center border-b">
          <p className="text-sm font-semibold">{currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          {HOURS.map((hour) => {
            const hourEvents = dayEvents.filter((e) => e.startTime.startsWith(`${String(hour).padStart(2, '0')}:`));
            return (
              <div key={hour} className="flex border-b min-h-[50px]">
                <div className="w-20 p-2 text-xs text-muted-foreground border-r shrink-0">
                  {formatTime24(`${String(hour).padStart(2, '0')}:00`)}
                </div>
                <div className="flex-1 p-1 space-y-1">
                  {hourEvents.map((event) => {
                    const typeConfig = EVENT_TYPE_CONFIG[event.type];
                    return (
                      <button
                        key={event.id}
                        className={`w-full text-left p-2 rounded-md border ${typeConfig.bg} ${typeConfig.border} ${typeConfig.color} text-xs hover:opacity-80 transition-opacity`}
                        onClick={() => openEventDetail(event)}
                      >
                        <p className="font-medium">{event.title}</p>
                        <p className="opacity-70">{formatTime24(event.startTime)} - {formatTime24(event.endTime)} • {event.assignee || 'Unassigned'}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Render: Week View ───────────────────────────────────────────────────

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      return d;
    });

    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-8 bg-muted/50">
          <div className="p-2 text-center text-xs font-semibold text-muted-foreground border-b border-r">Time</div>
          {weekDays.map((d, i) => {
            const isToday = formatDateStr(d) === todayStr;
            return (
              <div key={i} className={`p-2 text-center text-xs font-semibold border-b border-r ${isToday ? 'bg-sky-50' : ''}`}>
                <div>{DAYS[i]}</div>
                <div className={`text-lg font-bold ${isToday ? 'text-sky-600' : ''}`}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {HOURS.slice(0, 8).map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b">
              <div className="p-2 text-[10px] text-muted-foreground border-r text-center">{formatTime24(`${String(hour).padStart(2, '0')}:00`)}</div>
              {weekDays.map((d, dayIdx) => {
                const dateStr = formatDateStr(d);
                const cellEvents = filtered.filter((e) => e.date === dateStr && e.startTime.startsWith(`${String(hour).padStart(2, '0')}:`));
                return (
                  <div key={dayIdx} className="p-0.5 min-h-[50px] border-r">
                    {cellEvents.map((event) => {
                      const typeConfig = EVENT_TYPE_CONFIG[event.type];
                      return (
                        <button
                          key={event.id}
                          className={`w-full text-left text-[9px] p-1 rounded ${typeConfig.bg} ${typeConfig.color} truncate`}
                          onClick={() => openEventDetail(event)}
                        >
                          {event.title}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Loading Skeleton ───────────────────────────────────────────────────

  if (loading && events.length === 0) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <ViewHeader icon={CalendarDays} iconBg="bg-sky-600" title="Calendar & Scheduling" description="View and manage jobs, bookings, and follow-ups" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-4"><Skeleton className="h-96 w-full" /></CardContent></Card>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <ViewHeader
        icon={CalendarDays}
        iconBg="bg-sky-600"
        title="Calendar & Scheduling"
        description="View and manage jobs, bookings, and follow-ups"
      />

      {/* Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="size-4 text-emerald-600" /> Today&apos;s Jobs</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{todayJobs.length}</p>
            <div className="space-y-1 mt-2 max-h-24 overflow-y-auto">
              {todayJobs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No jobs scheduled today</p>
              ) : todayJobs.map((e) => (
                <div key={e.id} className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground" onClick={() => openEventDetail(e)}>
                  <span className="size-1.5 rounded-full bg-emerald-500" /> {e.title} — {formatTime24(e.startTime)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="size-4 text-violet-600" /> Upcoming Appointments</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
            <div className="space-y-1 mt-2 max-h-24 overflow-y-auto">
              {upcomingAppointments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No upcoming appointments</p>
              ) : upcomingAppointments.slice(0, 4).map((e) => (
                <div key={e.id} className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground" onClick={() => openEventDetail(e)}>
                  <span className="size-1.5 rounded-full bg-violet-500" /> {e.title} — {e.date.slice(5)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bell className="size-4 text-amber-600" /> Pending Follow-ups</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingFollowUps.length}</p>
            <div className="space-y-1 mt-2 max-h-24 overflow-y-auto">
              {pendingFollowUps.length === 0 ? (
                <p className="text-xs text-muted-foreground">No pending follow-ups</p>
              ) : pendingFollowUps.slice(0, 4).map((e) => (
                <div key={e.id} className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground" onClick={() => openEventDetail(e)}>
                  <span className="size-1.5 rounded-full bg-amber-500" /> {e.title} — {e.date.slice(5)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={navigateToday} className="text-xs">Today</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigatePrev}><ChevronLeft className="size-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigateNext}><ChevronRight className="size-4" /></Button>
          <span className="text-sm font-semibold min-w-[160px]">{MONTHS[month]} {year}</span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="job">Jobs</SelectItem>
              <SelectItem value="booking">Bookings</SelectItem>
              <SelectItem value="follow_up">Follow-ups</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className="w-auto">
            <TabsList className="h-9">
              <TabsTrigger value="month" className="text-xs px-2">Month</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-2">Week</TabsTrigger>
              <TabsTrigger value="day" className="text-xs px-2">Day</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Calendar Content */}
      {filtered.length === 0 && !loading ? (
        <EmptyState icon={CalendarDays} title="No events found" description="Adjust your filters or check another date range" />
      ) : (
        <>
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`size-3 rounded ${config.bg} border ${config.border}`} />
            {config.label}
          </span>
        ))}
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className={`size-3 rounded ${selectedEvent.color}`} />
                  {selectedEvent.title}
                </DialogTitle>
                <DialogDescription>
                  <Badge variant="outline" className={`text-[10px] ${EVENT_TYPE_CONFIG[selectedEvent.type].bg} ${EVENT_TYPE_CONFIG[selectedEvent.type].color} ${EVENT_TYPE_CONFIG[selectedEvent.type].border}`}>
                    {EVENT_TYPE_CONFIG[selectedEvent.type].label}
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedEvent.customer || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assignee</p>
                    <div className="flex items-center gap-1.5">
                      {selectedEvent.assignee ? (
                        <>
                          <Avatar className="size-5"><AvatarFallback className="text-[8px] bg-sky-100 text-sky-700">{selectedEvent.assignee[0]}</AvatarFallback></Avatar>
                          <span className="font-medium">{selectedEvent.assignee}</span>
                        </>
                      ) : <span className="text-muted-foreground">Unassigned</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-medium">{formatTime24(selectedEvent.startTime)} - {formatTime24(selectedEvent.endTime)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium flex items-center gap-1"><MapPin className="size-3" /> {selectedEvent.location || '—'}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <Badge variant="outline" className="text-[10px]">{selectedEvent.status}</Badge>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEventDialog(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
