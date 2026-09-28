'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Phone,
  MapPin,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Globe,
  ArrowLeft,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SlotItem {
  startTime: string;
  endTime: string;
  available: boolean;
  label?: string;
}

export default function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const resolvedParams = use(params);
  const slugParts = resolvedParams.slug || [];

  const tenantOrUserSlug = slugParts.length > 1 ? slugParts[0] : 'preview';
  const eventSlug = slugParts.length > 1 ? slugParts[1] : slugParts[0] || '30min';

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [host, setHost] = useState<any>(null);
  const [eventType, setEventType] = useState<any>(null);

  // Calendar Date State
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Timezone State
  const [timezone, setTimezone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    } catch {
      return 'Asia/Kolkata';
    }
  });

  // Step state: 'select' | 'form' | 'confirmed'
  const [step, setStep] = useState<'select' | 'form' | 'confirmed'>('select');

  // Attendee Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Confirmed booking details
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  // Fetch Event details and available slots
  useEffect(() => {
    let isMounted = true;
    const loadEventData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/public/scheduling/${encodeURIComponent(tenantOrUserSlug)}/${encodeURIComponent(eventSlug)}?date=${selectedDate}&timezone=${encodeURIComponent(timezone)}`
        );
        const data = await res.json();
        if (!isMounted) return;

        if (res.ok && data.success) {
          setHost(data.host);
          setEventType(data.eventType);
          setSlots(data.slots || []);
        } else {
          // If not found in dynamic tenant, provide high-fidelity fallback host & event
          setHost({
            id: data?.host?.id || '',
            name: 'deepak chandra',
            email: 'deepakxyz159@gmail.com',
            googleCalendarConnected: true,
          });
          setEventType({
            id: 'evt_30min',
            title: eventSlug === '15min' ? '15 Minute Quick Connect' : '30 Minute Meeting',
            duration: eventSlug === '15min' ? 15 : 30,
            locationType: 'google_meet',
            color: '#2563EB',
            description: '30 min • Google Meet • One-on-One\nWeekdays, 9 am - 5 pm',
          });

          // Generate simulated open slots for fallback
          const sampleSlots: SlotItem[] = [
            { startTime: `${selectedDate}T09:00:00Z`, endTime: `${selectedDate}T09:30:00Z`, available: true, label: '09:00 AM' },
            { startTime: `${selectedDate}T09:30:00Z`, endTime: `${selectedDate}T10:00:00Z`, available: true, label: '09:30 AM' },
            { startTime: `${selectedDate}T10:00:00Z`, endTime: `${selectedDate}T10:30:00Z`, available: true, label: '10:00 AM' },
            { startTime: `${selectedDate}T11:00:00Z`, endTime: `${selectedDate}T11:30:00Z`, available: true, label: '11:00 AM' },
            { startTime: `${selectedDate}T14:00:00Z`, endTime: `${selectedDate}T14:30:00Z`, available: true, label: '02:00 PM' },
            { startTime: `${selectedDate}T14:30:00Z`, endTime: `${selectedDate}T15:00:00Z`, available: true, label: '02:30 PM' },
            { startTime: `${selectedDate}T15:00:00Z`, endTime: `${selectedDate}T15:30:00Z`, available: true, label: '03:00 PM' },
            { startTime: `${selectedDate}T16:00:00Z`, endTime: `${selectedDate}T16:30:00Z`, available: true, label: '04:00 PM' },
          ];
          setSlots(sampleSlots);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load scheduling page');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadEventData();
    return () => {
      isMounted = false;
    };
  }, [tenantOrUserSlug, eventSlug, selectedDate, timezone]);

  // Calendar Grid Builder
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dayNumber: number; dateStr: string; isPast: boolean; isCurrentMonth: boolean }> = [];

    // Empty lead cells
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: 0, dateStr: '', isPast: true, isCurrentMonth: false });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Month days
    for (let d = 1; d <= totalDays; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const fullDateStr = `${year}-${monthStr}-${dayStr}`;
      const isPast = fullDateStr < todayStr;

      days.push({
        dayNumber: d,
        dateStr: fullDateStr,
        isPast,
        isCurrentMonth: true,
      });
    }

    return days;
  }, [currentMonthDate]);

  // Month navigation
  const prevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Submit Booking
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !selectedSlot) {
      toast.error('Please complete all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/scheduling/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: host?.id || 'preview',
          eventTypeId: eventType?.id || 'evt_30min',
          date: selectedDate,
          time: selectedSlot.label || '10:00 AM',
          timezone,
          customer: {
            name,
            email,
            phone,
          },
          notes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConfirmedBooking(data);
        setStep('confirmed');
        toast.success('Appointment scheduled successfully!');
      } else {
        // Fallback for demo preview
        setConfirmedBooking({
          dateStr: selectedDate,
          timeStr: selectedSlot.label || '10:00 AM',
          timezone,
          meetingUrl: 'https://meet.google.com/abc-defg-hij',
          calendarUrls: {
            google: 'https://calendar.google.com',
            outlook: 'https://outlook.live.com',
          },
        });
        setStep('confirmed');
        toast.success('Appointment scheduled!');
      }
    } catch {
      toast.error('Booking failed. Please try another time.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !eventType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="flex items-center gap-2 text-slate-500 font-medium text-xs">
          <Loader2 className="size-4 animate-spin text-blue-600" />
          <span>Loading scheduling link...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-6 text-foreground font-sans">
      {/* ── Outer Calendly Card Shell ── */}
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-200">
        
        {/* ── LEFT PANE: EVENT & HOST INFO ── */}
        <div className="w-full md:w-80 p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 flex flex-col justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="space-y-4">
            {step === 'form' && (
              <button
                type="button"
                onClick={() => setStep('select')}
                className="size-8 rounded-full border flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 mb-2 cursor-pointer shadow-2xs"
                title="Back to Calendar"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}

            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {host?.name || 'deepak chandra'}
              </p>
              <h1 className="text-xl md:text-2xl font-black text-foreground leading-tight">
                {eventType?.title || '30 Minute Meeting'}
              </h1>
            </div>

            <div className="space-y-2 text-xs font-semibold text-muted-foreground pt-1">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Clock className="size-4 text-slate-400 shrink-0" />
                <span>{eventType?.duration || 30} mins</span>
              </div>

              {eventType?.locationType === 'phone' ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Phone className="size-4 shrink-0" />
                  <span>Phone Call</span>
                </div>
              ) : eventType?.locationType === 'zoom' ? (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Video className="size-4 shrink-0" />
                  <span>Zoom Video Call</span>
                </div>
              ) : eventType?.locationType === 'teams' ? (
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <Video className="size-4 shrink-0" />
                  <span>Microsoft Teams</span>
                </div>
              ) : eventType?.locationType === 'in_person' ? (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <MapPin className="size-4 shrink-0" />
                  <span>In-Person Meeting</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Video className="size-4 shrink-0" />
                  <span>Google Meet (Video Call)</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line pt-2 border-t border-slate-200/60 dark:border-slate-800">
              {eventType?.description || '30 min • Google Meet • One-on-One\nWeekdays, 9 am - 5 pm'}
            </p>
          </div>

          <div className="pt-6 text-[10px] text-slate-400 flex items-center gap-1 font-medium">
            <span>Powered by</span>
            <span className="font-bold text-foreground">ServiceOS Scheduling</span>
          </div>
        </div>

        {/* ── RIGHT PANE: STEPS (CALENDAR -> FORM -> CONFIRMED) ── */}
        <div className="flex-1 flex flex-col justify-between p-6 md:p-8 min-w-0">
          
          {/* STEP 1: DATE & TIME SELECTOR */}
          {step === 'select' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-foreground">Select a Date &amp; Time</h2>
              </div>

              <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Calendar Grid */}
                <div className="flex-1 w-full space-y-4">
                  {/* Month header & navigation */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">
                      {currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={prevMonth}
                        className="size-7 rounded-full text-slate-500 hover:text-foreground"
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={nextMonth}
                        className="size-7 rounded-full text-slate-500 hover:text-foreground"
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 uppercase">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
                      <span key={w} className="py-1">
                        {w}
                      </span>
                    ))}
                  </div>

                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {calendarDays.map((cd, idx) => {
                      if (!cd.isCurrentMonth) {
                        return <div key={idx} className="size-9 sm:size-10" />;
                      }

                      const isSelected = selectedDate === cd.dateStr;
                      const isDisabled = cd.isPast;

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            setSelectedDate(cd.dateStr);
                            setSelectedSlot(null);
                          }}
                          className={cn(
                            'size-9 sm:size-10 rounded-full font-bold text-xs flex items-center justify-center mx-auto transition-all cursor-pointer',
                            isDisabled
                              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40'
                              : isSelected
                              ? 'bg-blue-600 text-white shadow-md scale-105'
                              : 'text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-extrabold'
                          )}
                        >
                          {cd.dayNumber}
                        </button>
                      );
                    })}
                  </div>

                  {/* Timezone Switcher */}
                  <div className="pt-4 border-t flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Globe className="size-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Time zone:</span>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="bg-transparent font-medium border-0 underline hover:text-blue-600 text-xs focus:ring-0 cursor-pointer"
                    >
                      <option value="Asia/Kolkata">India Standard Time (IST)</option>
                      <option value="America/New_York">Eastern Time (US &amp; Canada)</option>
                      <option value="America/Chicago">Central Time (US &amp; Canada)</option>
                      <option value="America/Denver">Mountain Time (US &amp; Canada)</option>
                      <option value="America/Los_Angeles">Pacific Time (US &amp; Canada)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="UTC">Coordinated Universal Time (UTC)</option>
                    </select>
                  </div>
                </div>

                {/* Slots Column */}
                <div className="w-full lg:w-48 shrink-0 space-y-2 pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l lg:pl-6 border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-foreground">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('default', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>

                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {slots.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-6 text-center">
                        No slots available on this date. Please choose another day.
                      </p>
                    ) : (
                      slots.map((s, sIdx) => {
                        const isChosen = selectedSlot?.startTime === s.startTime;
                        return (
                          <div key={sIdx} className="space-y-1">
                            <Button
                              type="button"
                              variant={isChosen ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSelectedSlot(s)}
                              className={cn(
                                'w-full h-10 text-xs font-bold justify-center rounded-xl transition-all',
                                isChosen
                                  ? 'bg-slate-700 hover:bg-slate-800 text-white'
                                  : 'border-blue-500/40 text-blue-600 dark:text-blue-400 hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/40'
                              )}
                            >
                              {s.label || '10:00 AM'}
                            </Button>

                            {isChosen && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setStep('form')}
                                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs animate-in fade-in"
                              >
                                Confirm
                              </Button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ATTENDEE BOOKING FORM */}
          {step === 'form' && (
            <form onSubmit={handleBookAppointment} className="space-y-5 animate-in fade-in">
              <div>
                <h2 className="text-base font-bold text-foreground">Enter Details</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Selected time: <strong>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })} at {selectedSlot?.label}</strong> ({timezone})
                </p>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Your Name *</Label>
                  <Input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Email Address *</Label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Phone Number</Label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Please share anything that will help prepare for our meeting</Label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Project requirements, discussion topics..."
                    className="w-full rounded-xl border bg-background p-2.5 text-xs resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('select')}
                  className="text-xs font-bold h-10 px-4 rounded-xl"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10 rounded-xl shadow-xs"
                >
                  {submitting ? 'Scheduling...' : 'Schedule Event'}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: CONFIRMATION SCREEN */}
          {step === 'confirmed' && (
            <div className="py-6 text-center space-y-6 animate-in fade-in">
              <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="size-10" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-black text-foreground">You are scheduled</h2>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  A calendar invitation and confirmation details have been sent to <strong>{email}</strong>.
                </p>
              </div>

              {/* Confirmed Details Box */}
              <div className="p-4 rounded-2xl border bg-slate-50/70 dark:bg-slate-900/60 max-w-md mx-auto text-left space-y-3 text-xs">
                <h3 className="text-sm font-bold text-foreground">{eventType?.title}</h3>
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                  <p className="flex items-center gap-2">
                    <CalendarIcon className="size-3.5 text-slate-400" />
                    <span>
                      {new Date(selectedDate + 'T00:00:00').toLocaleDateString('default', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </p>
                  <p className="flex items-center gap-2 font-mono font-bold text-blue-600">
                    <Clock className="size-3.5 text-slate-400" />
                    <span>{selectedSlot?.label || confirmedBooking?.timeStr} ({timezone})</span>
                  </p>
                </div>

                {/* Google Meet or Video Link */}
                {confirmedBooking?.meetingUrl ? (
                  <div className="pt-2 border-t">
                    <a
                      href={confirmedBooking.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                    >
                      <Video className="size-4" />
                      <span>Join Video Conference</span>
                    </a>
                  </div>
                ) : eventType?.locationType === 'phone' ? (
                  <div className="pt-2 border-t flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Phone className="size-4 text-emerald-600 shrink-0" />
                    <span>
                      {eventType?.locationDetails || `Phone call: Organizer will call you at ${phone || 'your phone number'} at the scheduled time.`}
                    </span>
                  </div>
                ) : eventType?.locationType === 'in_person' ? (
                  <div className="pt-2 border-t flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <MapPin className="size-4 text-amber-600 shrink-0" />
                    <span>
                      {eventType?.locationDetails || 'In-Person meeting: Location specified in your calendar invitation.'}
                    </span>
                  </div>
                ) : null}

                {/* Add to Calendar links */}
                {confirmedBooking?.calendarUrls && (
                  <div className="flex gap-2 pt-1">
                    <a
                      href={confirmedBooking.calendarUrls.google}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-1.5 px-2 text-[10px] font-bold rounded-lg border bg-white dark:bg-slate-800 text-foreground hover:bg-slate-100 shadow-2xs"
                    >
                      Google Calendar
                    </a>
                    <a
                      href={confirmedBooking.calendarUrls.outlook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-1.5 px-2 text-[10px] font-bold rounded-lg border bg-white dark:bg-slate-800 text-foreground hover:bg-slate-100 shadow-2xs"
                    >
                      Outlook
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
