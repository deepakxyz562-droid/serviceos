'use client';

import { useState } from 'react';
import { CalendarCheck, Clock, Loader2 } from 'lucide-react';

export interface BookableEvent {
  id: string;
  title: string;
  slug: string;
  duration: number;
  price?: number;
  currency?: string;
}

interface BookFormProps {
  tenantId: string;
  tenantSlug: string;
  businessName: string;
  events: BookableEvent[];
}

/**
 * Public booking form for /store/[slug]/book. Posts to the existing public
 * booking endpoint (/api/public/scheduling/book) with the same contract the
 * other public booking flows use (see src/app/book/[slug]/page.tsx):
 * tenantId + tenantSlug + event id/slug + customer name/phone/email + date +
 * time. Email falls back to the guest.local pattern when the visitor leaves
 * it blank, exactly like the existing flow.
 */
export function BookForm({ tenantId, tenantSlug, businessName, events }: BookFormProps) {
  const [eventTypeId, setEventTypeId] = useState(events[0]?.id || '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedFor, setConfirmedFor] = useState<string | null>(null);

  const selected = events.find((e) => e.id === eventTypeId) || null;

  if (confirmedFor) {
    return (
      <div className="rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] p-6 text-center">
        <CalendarCheck className="mx-auto h-10 w-10 text-[#0A6847]" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-bold text-[#065F46]">Booking requested!</h2>
        <p className="mt-1.5 text-sm text-[#065F46]/80">
          {confirmedFor} — {businessName} will confirm your appointment shortly.
        </p>
        <button
          type="button"
          onClick={() => {
            setConfirmedFor(null);
            setName('');
            setPhone('');
            setEmail('');
            setNotes('');
          }}
          className="mt-4 rounded-xl border border-[#0A6847]/30 bg-white px-4 py-2 text-sm font-semibold text-[#0A6847] transition hover:bg-[#F0FDF4] cursor-pointer"
        >
          Book another appointment
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !name.trim() || !phone.trim() || !date || !time) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/public/scheduling/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          tenantSlug,
          eventTypeId: selected.id,
          eventSlug: selected.slug,
          serviceName: selected.title,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || `${phone.replace(/[^0-9]/g, '')}@guest.local`,
          date,
          time,
          notes: notes.trim() || undefined,
          source: 'scheduling_link',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Booking failed (HTTP ${res.status}). Please try again.`);
      }
      setConfirmedFor(`${selected.title} on ${date} at ${time}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-[#DCE9E3] bg-white p-5 shadow-sm sm:p-6"
      aria-label={`Book an appointment with ${businessName}`}
    >
      <h2 className="text-base font-bold text-[#111827]">Book an appointment</h2>

      <div>
        <label htmlFor="book-event" className="mb-1 block text-xs font-semibold text-[#334155]">
          Service *
        </label>
        <select
          id="book-event"
          value={eventTypeId}
          onChange={(e) => setEventTypeId(e.target.value)}
          required
          className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3 py-2.5 text-sm text-[#111827] focus:border-[#0A6847] focus:outline-none"
        >
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title} ({ev.duration} min)
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="book-name" className="mb-1 block text-xs font-semibold text-[#334155]">
            Your name *
          </label>
          <input
            id="book-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            placeholder="e.g. Priya Sharma"
            className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2.5 text-sm text-[#111827] focus:border-[#0A6847] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="book-phone" className="mb-1 block text-xs font-semibold text-[#334155]">
            Phone *
          </label>
          <input
            id="book-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            maxLength={20}
            placeholder="+91 98765 43210"
            className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2.5 text-sm text-[#111827] focus:border-[#0A6847] focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="book-date" className="mb-1 block text-xs font-semibold text-[#334155]">
            Date *
          </label>
          <input
            id="book-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2.5 text-sm text-[#111827] focus:border-[#0A6847] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="book-time" className="mb-1 block text-xs font-semibold text-[#334155]">
            Time *
          </label>
          <input
            id="book-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2.5 text-sm text-[#111827] focus:border-[#0A6847] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="book-email" className="mb-1 block text-xs font-semibold text-[#334155]">
          Email (optional)
        </label>
        <input
          id="book-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={160}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2.5 text-sm text-[#111827] focus:border-[#0A6847] focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="book-notes" className="mb-1 block text-xs font-semibold text-[#334155]">
          Notes (optional)
        </label>
        <textarea
          id="book-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Anything we should know before your visit?"
          className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2.5 text-sm text-[#111827] focus:border-[#0A6847] focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !selected || !name.trim() || !phone.trim()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A6847] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#085238] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Booking…
          </>
        ) : (
          <>
            <Clock className="h-4 w-4" aria-hidden="true" /> Request booking
          </>
        )}
      </button>
      <p className="text-center text-[11px] text-[#94A3B8]">
        Your request is sent to {businessName} for confirmation.
      </p>
    </form>
  );
}
