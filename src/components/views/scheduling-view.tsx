'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Link as LinkIcon,
  Plus,
  Video,
  Phone,
  MapPin,
  Check,
  Copy,
  ExternalLink,
  Settings,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  CalendarCheck,
  CalendarX,
  Users,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  ChevronRight,
  ShieldCheck,
  Bot,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { EventType, WeeklyAvailabilitySettings, MeetingLocationType } from '@/features/scheduling/types/event-types';
import { cn } from '@/lib/utils';

export function SchedulingView() {
  const [activeTab, setActiveTab] = useState<'event-types' | 'upcoming' | 'availability' | 'calendars'>('event-types');
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Onboarding Modal state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['schedule_meetings', 'optimize_ai']);

  // Edit / Create Event Type Modal
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState<{
    title: string;
    slug: string;
    duration: number;
    locationType: MeetingLocationType;
    description: string;
    color: string;
  }>({
    title: '30 Minute Meeting',
    slug: '30min',
    duration: 30,
    locationType: 'google_meet',
    description: '30 min • Google Meet • One-on-One',
    color: '#2563EB',
  });
  const [savingEvent, setSavingEvent] = useState(false);

  // Upcoming Meetings state
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Availability state
  const [availability, setAvailability] = useState<WeeklyAvailabilitySettings | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);

  // Connected Calendars state
  const [calendarSettings, setCalendarSettings] = useState<{
    connected: boolean;
    email: string | null;
    authUrl: string;
    subCalendars: any[];
    conflictCalendars: string[];
    targetCalendarId: string;
  } | null>(null);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [savingCalendars, setSavingCalendars] = useState(false);

  // Load Event Types
  const fetchEventTypes = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch('/api/scheduling/event-types');
      if (res.ok) {
        const data = await res.json();
        setEventTypes(data.eventTypes || []);
      }
    } catch {
      toast.error('Failed to load event types');
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  // Load Meetings
  const fetchMeetings = useCallback(async () => {
    setLoadingMeetings(true);
    try {
      const res = await fetch('/api/bookings?limit=50');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.bookings) ? data.bookings : Array.isArray(data) ? data : [];
        setMeetings(list);
      }
    } catch {
      // silent
    } finally {
      setLoadingMeetings(false);
    }
  }, []);

  // Load Availability
  const fetchAvailability = useCallback(async () => {
    setLoadingAvailability(true);
    try {
      const res = await fetch('/api/scheduling/availability');
      if (res.ok) {
        const data = await res.json();
        setAvailability(data.availability);
      }
    } catch {
      // silent
    } finally {
      setLoadingAvailability(false);
    }
  }, []);

  // Load Calendars
  const fetchCalendarSettings = useCallback(async () => {
    setLoadingCalendars(true);
    try {
      const res = await fetch('/api/scheduling/calendars');
      if (res.ok) {
        const data = await res.json();
        setCalendarSettings(data);
      }
    } catch {
      // silent
    } finally {
      setLoadingCalendars(false);
    }
  }, []);

  useEffect(() => {
    fetchEventTypes();
    fetchCalendarSettings();
  }, [fetchEventTypes, fetchCalendarSettings]);

  useEffect(() => {
    if (activeTab === 'upcoming') fetchMeetings();
    if (activeTab === 'availability') fetchAvailability();
    if (activeTab === 'calendars') fetchCalendarSettings();
  }, [activeTab, fetchMeetings, fetchAvailability, fetchCalendarSettings]);

  // Copy Link Helper
  const handleCopyLink = (slug: string, id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/book/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    toast.success('Public booking link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Toggle Event Active
  const handleToggleActive = async (event: EventType) => {
    const updated = { ...event, isActive: !event.isActive };
    setEventTypes((prev) => prev.map((e) => (e.id === event.id ? updated : e)));
    try {
      await fetch(`/api/scheduling/event-types/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: updated.isActive }),
      });
      toast.success(updated.isActive ? 'Event type activated' : 'Event type paused');
    } catch {
      toast.error('Failed to update event type');
    }
  };

  // Save Event Type Form
  const handleSaveEvent = async () => {
    setSavingEvent(true);
    try {
      if (editingEvent) {
        // Update existing
        const res = await fetch(`/api/scheduling/event-types/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventForm),
        });
        if (res.ok) {
          toast.success('Event type updated successfully');
          setShowEventModal(false);
          fetchEventTypes();
        }
      } else {
        // Create new
        const res = await fetch('/api/scheduling/event-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventForm),
        });
        if (res.ok) {
          toast.success('Event type created successfully');
          setShowEventModal(false);
          fetchEventTypes();
        }
      }
    } catch {
      toast.error('Failed to save event type');
    } finally {
      setSavingEvent(false);
    }
  };

  // Save Availability Form
  const handleSaveAvailability = async () => {
    if (!availability) return;
    setSavingAvailability(true);
    try {
      const res = await fetch('/api/scheduling/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(availability),
      });
      if (res.ok) {
        toast.success('Weekly availability schedule saved!');
      }
    } catch {
      toast.error('Failed to save availability');
    } finally {
      setSavingAvailability(false);
    }
  };

  // Save Calendar Preferences
  const handleSaveCalendarPreferences = async () => {
    if (!calendarSettings) return;
    setSavingCalendars(true);
    try {
      const res = await fetch('/api/scheduling/calendars', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflictCalendars: calendarSettings.conflictCalendars,
          targetCalendarId: calendarSettings.targetCalendarId,
        }),
      });
      if (res.ok) {
        toast.success('Calendar conflict checking preferences saved!');
      }
    } catch {
      toast.error('Failed to save calendar preferences');
    } finally {
      setSavingCalendars(false);
    }
  };

  const filteredMeetings = useMemo(() => {
    const now = new Date();
    return meetings.filter((m) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (m.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.customerEmail || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch && m.status !== 'cancelled';
    });
  }, [meetings, searchQuery]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      {/* ── Top Header / User Profile ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md ring-2 ring-blue-500/20">
            DC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">deepak chandra</h1>
              <Badge variant="outline" className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/50 border-blue-200">
                PRO HOST
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <a
                href="/book/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 hover:underline flex items-center gap-1 font-semibold text-blue-600"
              >
                <span>View landing page</span>
                <ExternalLink className="size-3" />
              </a>
              <span>•</span>
              <button
                type="button"
                onClick={() => setShowOnboarding(true)}
                className="hover:text-foreground transition-colors cursor-pointer text-slate-500"
              >
                Onboarding Setup Guide
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            onClick={() => {
              setEditingEvent(null);
              setEventForm({
                title: 'New Event Type',
                slug: 'meeting',
                duration: 30,
                locationType: 'google_meet',
                description: 'One-on-one consultation',
                color: '#2563EB',
              });
              setShowEventModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 shadow-sm rounded-xl h-9 text-xs"
          >
            <Plus className="size-4" />
            <span>Create Event Type</span>
          </Button>
        </div>
      </div>

      {/* ── Main Navigation Tabs ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl h-11 border">
          <TabsTrigger value="event-types" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-2xs">
            <CalendarCheck className="size-3.5" />
            <span>Event Types</span>
            <Badge variant="secondary" className="text-[10px] ml-1 px-1.5 py-0">
              {eventTypes.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-2xs">
            <Clock className="size-3.5" />
            <span>Upcoming Meetings</span>
            {filteredMeetings.length > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-1 px-1.5 py-0 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {filteredMeetings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="availability" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-2xs">
            <Settings className="size-3.5" />
            <span>Availability</span>
          </TabsTrigger>
          <TabsTrigger value="calendars" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-2xs">
            <ShieldCheck className="size-3.5" />
            <span>Calendar Conflict Check</span>
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: EVENT TYPES ── */}
        <TabsContent value="event-types" className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventTypes.map((evt) => {
              const isCopied = copiedId === evt.id;
              return (
                <Card
                  key={evt.id}
                  className={cn(
                    'relative overflow-hidden transition-all duration-200 border-t-4 hover:shadow-md group rounded-2xl',
                    evt.isActive ? 'bg-card' : 'bg-slate-50/60 dark:bg-slate-900/40 opacity-70'
                  )}
                  style={{ borderTopColor: evt.color || '#2563EB' }}
                >
                  <CardHeader className="pb-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-bold text-foreground group-hover:text-blue-600 transition-colors">
                          {evt.title}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5 flex items-center gap-1.5 text-muted-foreground font-medium">
                          <Clock className="size-3 text-slate-400" />
                          <span>{evt.duration} mins</span>
                          <span>•</span>
                          <span className="capitalize flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                            {evt.locationType === 'google_meet' ? (
                              <>
                                <Video className="size-3" /> Google Meet
                              </>
                            ) : evt.locationType === 'phone' ? (
                              <>
                                <Phone className="size-3" /> Phone Call
                              </>
                            ) : (
                              evt.locationType
                            )}
                          </span>
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-1">
                        <Switch
                          checked={evt.isActive}
                          onCheckedChange={() => handleToggleActive(evt)}
                          title={evt.isActive ? 'Active (Click to Pause)' : 'Paused (Click to Activate)'}
                          className="scale-90"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {evt.description || 'One-on-one booking link.'}
                    </p>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center justify-between text-xs pt-2 border-t text-muted-foreground">
                      <span className="font-mono text-[11px] text-slate-500 truncate max-w-[160px]">
                        /book/{evt.slug}
                      </span>
                      <a
                        href={`/book/${evt.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-bold text-xs flex items-center gap-1"
                      >
                        Preview <ExternalLink className="size-3" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyLink(evt.slug, evt.id)}
                        className={cn(
                          'flex-1 text-xs font-bold gap-1.5 h-8 rounded-xl transition-all',
                          isCopied ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : ''
                        )}
                      >
                        {isCopied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                        <span>{isCopied ? 'Copied!' : 'Copy link'}</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingEvent(evt);
                          setEventForm({
                            title: evt.title,
                            slug: evt.slug,
                            duration: evt.duration,
                            locationType: evt.locationType,
                            description: evt.description || '',
                            color: evt.color,
                          });
                          setShowEventModal(true);
                        }}
                        className="size-8 rounded-xl text-slate-500 hover:text-foreground"
                        title="Edit Event Type"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── TAB 2: UPCOMING MEETINGS ── */}
        <TabsContent value="upcoming" className="pt-4 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative w-full max-w-sm">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search meetings by attendee, title, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchMeetings}
              disabled={loadingMeetings}
              className="text-xs font-bold gap-1.5 rounded-xl h-9"
            >
              <RefreshCw className={cn('size-3.5', loadingMeetings && 'animate-spin')} />
              <span>Refresh</span>
            </Button>
          </div>

          {filteredMeetings.length === 0 ? (
            <div className="text-center py-16 border rounded-2xl bg-card space-y-2">
              <CalendarCheck className="size-10 text-muted-foreground mx-auto opacity-50" />
              <h3 className="text-sm font-bold text-foreground">No upcoming meetings</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Share your public booking link or let your AI Concierge book meetings for you!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredMeetings.map((m) => {
                let meta: any = {};
                try {
                  meta = JSON.parse(m.metadataJson || '{}');
                } catch {}

                const meetUrl = meta.meetingUrl;
                const scheduledDate = m.scheduledAt ? new Date(m.scheduledAt) : null;

                return (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl border bg-card hover:border-blue-400 transition-all shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex flex-col items-center justify-center font-bold shrink-0 border border-blue-200/50">
                        <span className="text-[10px] uppercase leading-none">
                          {scheduledDate ? scheduledDate.toLocaleString('en-US', { month: 'short' }) : 'APT'}
                        </span>
                        <span className="text-sm leading-none font-black mt-0.5">
                          {scheduledDate ? scheduledDate.getDate() : '--'}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span>{m.title}</span>
                          <Badge variant="outline" className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border-emerald-200">
                            Confirmed
                          </Badge>
                        </h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{m.customerName || 'Attendee'}</span>
                          <span>•</span>
                          <span>{m.customerEmail || 'No email'}</span>
                          <span>•</span>
                          <span className="font-mono text-blue-600 font-bold">
                            {scheduledDate ? scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0">
                      {meetUrl ? (
                        <a
                          href={meetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                        >
                          <Video className="size-3.5" />
                          <span>Join Google Meet</span>
                        </a>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          In-Person / Phone
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 3: AVAILABILITY & WORKING HOURS ── */}
        <TabsContent value="availability" className="pt-4 space-y-6">
          <Card className="rounded-2xl border">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Weekly Hours &amp; Working Schedule</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Set when you are typically available for meetings. You will only be booked during these times.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  onClick={handleSaveAvailability}
                  disabled={savingAvailability}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-4 rounded-xl shadow-xs"
                >
                  {savingAvailability ? 'Saving...' : 'Save Schedule'}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">Time Zone</Label>
                  <Input
                    value={availability?.timezone || 'America/New_York'}
                    onChange={(e) =>
                      setAvailability((prev) => (prev ? { ...prev, timezone: e.target.value } : null))
                    }
                    className="h-9 text-xs rounded-xl"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    e.g. Asia/Kolkata (IST), America/New_York (EST), America/Los_Angeles (PST)
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">Buffer Between Meetings (Minutes)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={availability?.bufferTime || 0}
                    onChange={(e) =>
                      setAvailability((prev) => (prev ? { ...prev, bufferTime: Number(e.target.value) || 0 } : null))
                    }
                    className="h-9 text-xs rounded-xl"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Extra gap between appointments for preparation or notes.
                  </p>
                </div>
              </div>

              {/* 7 Days of the Week */}
              <div className="space-y-3">
                {availability?.days?.map((day, idx) => (
                  <div
                    key={day.dayOfWeek}
                    className={cn(
                      'p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors',
                      day.isWorkingDay ? 'bg-card' : 'bg-slate-50 dark:bg-slate-900/40 opacity-60'
                    )}
                  >
                    <div className="flex items-center gap-3 w-36">
                      <Switch
                        checked={day.isWorkingDay}
                        onCheckedChange={(checked) => {
                          setAvailability((prev) => {
                            if (!prev) return null;
                            const days = [...prev.days];
                            days[idx] = { ...days[idx], isWorkingDay: checked };
                            return { ...prev, days };
                          });
                        }}
                      />
                      <span className="text-xs font-bold text-foreground">{day.name}</span>
                    </div>

                    {day.isWorkingDay ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Input
                          type="time"
                          value={day.startTime}
                          onChange={(e) => {
                            setAvailability((prev) => {
                              if (!prev) return null;
                              const days = [...prev.days];
                              days[idx] = { ...days[idx], startTime: e.target.value };
                              return { ...prev, days };
                            });
                          }}
                          className="h-8 w-28 text-xs font-mono rounded-lg"
                        />
                        <span className="text-muted-foreground font-bold">-</span>
                        <Input
                          type="time"
                          value={day.endTime}
                          onChange={(e) => {
                            setAvailability((prev) => {
                              if (!prev) return null;
                              const days = [...prev.days];
                              days[idx] = { ...days[idx], endTime: e.target.value };
                              return { ...prev, days };
                            });
                          }}
                          className="h-8 w-28 text-xs font-mono rounded-lg"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Unavailable</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 4: CALENDAR CONFLICT CHECK ── */}
        <TabsContent value="calendars" className="pt-4 space-y-6">
          <Card className="rounded-2xl border">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Google Calendar 2-Way Sync &amp; Conflict Checks</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Up to 6 work/personal calendars can be checked to prevent double bookings.
                  </CardDescription>
                </div>
                {calendarSettings?.connected && (
                  <Button
                    type="button"
                    onClick={handleSaveCalendarPreferences}
                    disabled={savingCalendars}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-4 rounded-xl shadow-xs"
                  >
                    {savingCalendars ? 'Saving...' : 'Save Preferences'}
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-6">
              {/* Connection Status Card */}
              <div className="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-xl bg-white border shadow-xs flex items-center justify-center font-black text-blue-600 text-lg">
                    31
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Google Calendar</h4>
                    <p className="text-xs text-muted-foreground font-mono">
                      {calendarSettings?.email || 'Not connected'}
                    </p>
                  </div>
                </div>

                <div>
                  {calendarSettings?.connected ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold gap-1 px-3 py-1">
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                      Connected &amp; Syncing
                    </Badge>
                  ) : (
                    <a
                      href={calendarSettings?.authUrl || '/api/auth/google-calendar'}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <span>Connect Google Account</span>
                      <ArrowRight className="size-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Sub-calendars list */}
              {calendarSettings?.connected && (
                <div className="space-y-4 pt-2">
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Calendars to Check for Conflicts (Up to 6)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Events on these calendars will automatically block booking slots to prevent double bookings.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {(calendarSettings.subCalendars.length > 0
                      ? calendarSettings.subCalendars
                      : [{ id: calendarSettings.email || 'primary', summary: 'Primary Google Calendar', primary: true }]
                    ).map((subCal) => {
                      const isChecked = calendarSettings.conflictCalendars.includes(subCal.id);
                      return (
                        <div
                          key={subCal.id}
                          className="p-3 rounded-xl border flex items-center justify-between bg-card hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={subCal.id}
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setCalendarSettings((prev) => {
                                  if (!prev) return null;
                                  let next = [...prev.conflictCalendars];
                                  if (checked) {
                                    if (next.length < 6 && !next.includes(subCal.id)) next.push(subCal.id);
                                  } else {
                                    next = next.filter((id) => id !== subCal.id);
                                  }
                                  return { ...prev, conflictCalendars: next };
                                });
                              }}
                              className="size-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <Label htmlFor={subCal.id} className="text-xs font-bold text-foreground cursor-pointer">
                                {subCal.summary}
                              </Label>
                              {subCal.primary && (
                                <Badge variant="secondary" className="text-[9px] ml-2 px-1 py-0">
                                  Default
                                </Badge>
                              )}
                            </div>
                          </div>

                          <span className="text-[10px] text-muted-foreground font-mono">
                            {isChecked ? 'Checking for busy times' : 'Ignored'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── CREATE / EDIT EVENT TYPE MODAL ── */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingEvent ? 'Edit Event Type' : 'New Event Type'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure your meeting name, duration, and video conferencing location.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Event Name</Label>
              <Input
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="e.g. 30 Minute Meeting"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Custom URL Slug</Label>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-mono text-xs">/book/</span>
                <Input
                  value={eventForm.slug}
                  onChange={(e) => setEventForm({ ...eventForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '') })}
                  placeholder="30min"
                  className="h-9 text-xs font-mono rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Duration (Minutes)</Label>
                <Input
                  type="number"
                  min={5}
                  max={240}
                  value={eventForm.duration}
                  onChange={(e) => setEventForm({ ...eventForm, duration: Number(e.target.value) || 30 })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Location</Label>
                <select
                  value={eventForm.locationType}
                  onChange={(e) => setEventForm({ ...eventForm, locationType: e.target.value as any })}
                  className="w-full h-9 rounded-xl border bg-background px-3 text-xs font-medium"
                >
                  <option value="google_meet">Google Meet (Auto-Link)</option>
                  <option value="phone">Phone Call</option>
                  <option value="zoom">Zoom</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="in_person">In-Person</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Description / Instructions</Label>
              <textarea
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Add helpful details for attendees..."
                rows={3}
                className="w-full rounded-xl border bg-background p-2.5 text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEventModal(false)}
              className="text-xs font-bold h-9 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEvent}
              disabled={savingEvent}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl"
            >
              {savingEvent ? 'Saving...' : 'Save Event Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ONBOARDING MODAL: HOW CAN CALENDLY HELP YOU? ── */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6">
          <DialogHeader className="text-center space-y-1">
            <DialogTitle className="text-xl font-black text-foreground">
              How can Calendly help you?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select all that apply to tailor your automated scheduling experience.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2.5 py-4">
            {[
              { id: 'schedule_meetings', icon: '🗓️', label: 'Schedule meetings' },
              { id: 'scheduling_emails_ai', icon: '✨', label: 'Handle scheduling emails with AI' },
              { id: 'transcribe_meetings', icon: '🎥', label: 'Record and transcribe meetings' },
              { id: 'optimize_ai', icon: '🤖', label: 'Optimize scheduling with AI' },
              { id: 'contact_records', icon: '📋', label: 'Manage contact records' },
              { id: 'collect_payment', icon: '💰', label: 'Collect payment' },
              { id: 'automate_emails', icon: '🕗', label: 'Automate pre/post meeting emails' },
              { id: 'multiple_attendees', icon: '🧑🤝🧑', label: 'Meet with multiple attendees' },
            ].map((goal) => {
              const isSelected = selectedGoals.includes(goal.id);
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => {
                    setSelectedGoals((prev) =>
                      isSelected ? prev.filter((g) => g !== goal.id) : [...prev, goal.id]
                    );
                  }}
                  className={cn(
                    'p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer',
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500/80 ring-1 ring-blue-500/30 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100'
                      : 'bg-card border-slate-200/80 hover:border-slate-300 dark:border-slate-800'
                  )}
                >
                  <span className="text-2xl shrink-0">{goal.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-snug">{goal.label}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setShowOnboarding(false);
                toast.success('Preferences saved! Your scheduling workspace is configured.');
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 rounded-2xl text-xs"
            >
              Continue to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
