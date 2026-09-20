'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Calendar, Clock, MapPin, Star, ShieldCheck, ArrowRight,
  ArrowLeft, Loader2, Check, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  basePrice: number;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  label: string;
}

const STEPS = ['service', 'datetime', 'details', 'confirm'] as const;
type Step = typeof STEPS[number];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PublicBookingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [step, setStep] = useState<Step>('service');
  const [tenantId, setTenantId] = useState<string>('');
  const [tenantName, setTenantName] = useState<string>('');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // Fetch tenant + services
  useEffect(() => {
    // slug could be a tenant slug or a service slug
    fetch(`/api/public/business/${slug}/services`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTenantId(data.tenantId || '');
          setTenantName(data.tenantName || data.tenant?.name || slug);
          setServices(data.services || []);
        }
      })
      .catch(() => {
        // Fallback — slug might be a tenant slug, try fetching services differently
      });
  }, [slug]);

  // Fetch slots when date changes
  const fetchSlots = useCallback(async (date: string) => {
    if (!tenantId || !date) return;
    setLoadingSlots(true);
    try {
      const params = new URLSearchParams({
        tenantId,
        date,
      });
      if (selectedService?.id) params.set('serviceId', selectedService.id);

      const res = await fetch(`/api/availability/slots?${params}`);
      const data = await res.json();
      if (data.success) {
        setSlots(data.slots || []);
      }
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [tenantId, selectedService]);

  useEffect(() => {
    if (selectedDate && tenantId) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate, tenantId, fetchSlots]);

  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedSlot || !customer.name || !customer.phone) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          serviceId: selectedService.id,
          title: selectedService.name,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email || undefined,
          scheduledAt: selectedSlot.startTime,
          scheduledEndTime: selectedSlot.endTime,
          duration: selectedService.duration,
          notes: customer.notes || undefined,
          bookingType: 'instant',
          source: 'website',
        }),
      });
      const data = await res.json();
      if (data.success || data.booking || res.ok) {
        setBookingConfirmed(true);
      } else {
        alert(data.error || 'Failed to book');
      }
    } catch {
      alert('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  };

  // Render confirmed state
  if (bookingConfirmed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="size-8 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Booking Confirmed!</h1>
            <p className="text-sm text-slate-500 mt-2">
              We&apos;ve sent a confirmation email to {customer.email || 'your phone'} with the calendar invite.
            </p>
            {selectedService && (
              <div className="mt-6 p-4 bg-slate-50 rounded-xl text-left space-y-2">
                <p className="text-xs font-bold text-slate-700">{selectedService.name}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="size-3" /> {selectedDate}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="size-3" /> {selectedSlot?.label}
                </p>
              </div>
            )}
            <Button className="mt-6 w-full" variant="outline" onClick={() => router.push('/')}>
              Done
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {step !== 'service' && (
            <button onClick={() => setStep(STEPS[STEPS.indexOf(step) - 1] || 'service')}>
              <ArrowLeft className="size-5 text-slate-400" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-sm font-bold text-slate-900">{tenantName}</h1>
            <p className="text-[10px] text-slate-500">Book an appointment</p>
          </div>
          <Badge className="text-[10px] bg-emerald-100 text-emerald-700">{step} / {STEPS.indexOf(step) + 1} of 4</Badge>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Step 1: Service Selection */}
        {step === 'service' && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Select a Service</h2>
            {services.length === 0 ? (
              <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
            ) : (
              services.map((service) => (
                <Card key={service.id} className="hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => { setSelectedService(service); setStep('datetime'); }}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-slate-900">{service.name}</h3>
                      {service.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{service.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                        <span className="flex items-center gap-0.5"><Clock className="size-3" /> {service.duration} min</span>
                        {service.basePrice > 0 && <span className="flex items-center gap-0.5">${service.basePrice}</span>}
                      </div>
                    </div>
                    <ArrowRight className="size-4 text-slate-300" />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Step 2: Date + Time Selection */}
        {step === 'datetime' && selectedService && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Pick a Date & Time</h2>
              <button onClick={() => setStep('service')} className="text-xs text-emerald-600">Change service</button>
            </div>

            {/* Calendar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                    <ChevronLeft className="size-5 text-slate-400" />
                  </button>
                  <span className="text-sm font-bold text-slate-900">
                    {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </span>
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                    <ChevronRight className="size-5 text-slate-400" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {DAYS.map((day) => (
                    <span key={day} className="text-[10px] font-bold text-slate-400 py-1">{day}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarDays(currentMonth).map((day, idx) => {
                    if (!day) return <div key={idx} />;
                    const dateStr = formatDateForInput(day);
                    const isSelected = selectedDate === dateStr;
                    const isPast = day < new Date(new Date().toDateString());
                    return (
                      <button
                        key={idx}
                        disabled={isPast}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`aspect-square rounded-lg text-xs font-medium transition ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : isPast
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Time Slots */}
            {selectedDate && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-700">Available Times — {selectedDate}</p>
                {loadingSlots ? (
                  <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-slate-400" /></div>
                ) : slots.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No available slots for this date. Try another day.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map((slot, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setSelectedSlot(slot); setStep('details'); }}
                        className={`p-2 rounded-lg text-xs font-medium border transition ${
                          selectedSlot?.startTime === slot.startTime
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50'
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Customer Details */}
        {step === 'details' && selectedService && selectedSlot && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Your Details</h2>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">Full Name *</Label>
                  <Input id="name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    placeholder="Jane Doe" className="text-sm h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs">Phone *</Label>
                  <Input id="phone" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000" className="text-sm h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input id="email" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    placeholder="jane@example.com" className="text-sm h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs">Notes (optional)</Label>
                  <Textarea id="notes" value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                    placeholder="Any special requests?" className="text-sm" rows={3} />
                </div>
              </CardContent>
            </Card>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={!customer.name || !customer.phone}
              onClick={() => setStep('confirm')}
            >
              Review Booking <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && selectedService && selectedSlot && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Confirm Your Booking</h2>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">{selectedService.name}</h3>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <p className="flex items-center gap-2"><Calendar className="size-3.5 text-slate-400" /> {selectedDate}</p>
                  <p className="flex items-center gap-2"><Clock className="size-3.5 text-slate-400" /> {selectedSlot.label} ({selectedService.duration} min)</p>
                  <p className="flex items-center gap-2"><Star className="size-3.5 text-slate-400" /> {tenantName}</p>
                  {selectedService.basePrice > 0 && (
                    <p className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-emerald-600" /> ${selectedService.basePrice} (may be collected at appointment)</p>
                  )}
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-700">{customer.name}</p>
                  <p className="text-[11px] text-slate-500">{customer.phone} {customer.email && `• ${customer.email}`}</p>
                  {customer.notes && <p className="text-[11px] text-slate-500 mt-1">Notes: {customer.notes}</p>}
                </div>
              </CardContent>
            </Card>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={submitting}
              onClick={handleConfirmBooking}
            >
              {submitting ? <><Loader2 className="size-4 mr-1 animate-spin" /> Confirming...</> : 'Confirm Booking'}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function generateCalendarDays(month: Date): (Date | null)[] {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1);
  const lastDay = new Date(year, m + 1, 0);
  const startWeekday = firstDay.getDay();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, m, d));
  return days;
}

function formatDateForInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
