'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import type { PublicBusinessData, PublicServiceData } from '@/lib/public-business'

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

interface Props {
  business: PublicBusinessData
  services: PublicServiceData[]
}

/**
 * Public booking form embedded in the right rail of the business hub page.
 *
 * Submits to /api/public/business/[slug]/book — an unauthenticated endpoint
 * that creates a Lead in the tenant's CRM with source='public_booking'.
 *
 * The form has three modes (book | quote | request) selectable via tabs.
 * All three hit the same endpoint with a different `intent` field.
 */
export function PublicBookingForm({ business, services }: Props) {
  const [intent, setIntent] = useState<'book' | 'quote' | 'request'>('book')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    serviceId: '',
    preferredDate: '',
    message: '',
  })

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'submitting') return

    setStatus('submitting')
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/public/business/${business.slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, intent }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="h-12 w-12 text-emerald-700 mx-auto mb-3" />
        <h3 className="font-semibold text-foreground mb-1">Request received!</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {business.name} will get back to you shortly.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus('idle')
            setForm({ name: '', phone: '', email: '', address: '', serviceId: '', preferredDate: '', message: '' })
          }}
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          Send another request
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-label={`${intent} form`}>
      {/* Intent tabs */}
      <div role="tablist" aria-label="Request type" className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg text-xs font-medium">
        {([
          { id: 'book', label: 'Book' },
          { id: 'quote', label: 'Quote' },
          { id: 'request', label: 'Request' },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={intent === t.id}
            onClick={() => setIntent(t.id)}
            className={`px-2 py-1.5 rounded-md transition-colors ${
              intent === t.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input type="hidden" name="intent" value={intent} />

      {/* Name */}
      <Field label="Full name" htmlFor="pb-name" required>
        <input
          id="pb-name"
          type="text"
          required
          autoComplete="name"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
          placeholder="John Doe"
        />
      </Field>

      {/* Phone */}
      <Field label="Phone" htmlFor="pb-phone" required>
        <input
          id="pb-phone"
          type="tel"
          required
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
          placeholder="+1 555 000 0000"
        />
      </Field>

      {/* Email (optional) */}
      <Field label="Email (optional)" htmlFor="pb-email">
        <input
          id="pb-email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
          placeholder="you@example.com"
        />
      </Field>

      {/* Address */}
      <Field label="Service address" htmlFor="pb-address">
        <input
          id="pb-address"
          type="text"
          autoComplete="street-address"
          value={form.address}
          onChange={(e) => update('address', e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
          placeholder="123 Main St, Dallas, TX"
        />
      </Field>

      {/* Service select */}
      {services.length > 0 && (
        <Field label="Service needed" htmlFor="pb-service">
          <select
            id="pb-service"
            value={form.serviceId}
            onChange={(e) => update('serviceId', e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
          >
            <option value="">Select a service…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {/* Preferred date (only for book) */}
      {intent === 'book' && (
        <Field label="Preferred date" htmlFor="pb-date">
          <input
            id="pb-date"
            type="date"
            value={form.preferredDate}
            onChange={(e) => update('preferredDate', e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
          />
        </Field>
      )}

      {/* Message */}
      <Field
        label={intent === 'quote' ? 'What do you need a quote for?' : 'Describe your problem'}
        htmlFor="pb-message"
      >
        <textarea
          id="pb-message"
          rows={3}
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent resize-none"
          placeholder={intent === 'quote' ? 'Need quote for water heater replacement…' : 'Kitchen sink is leaking…'}
        />
      </Field>

      {/* Error */}
      {status === 'error' && errorMsg && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {status === 'submitting' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'submitting'
          ? 'Sending…'
          : intent === 'book'
            ? 'Book Service'
            : intent === 'quote'
              ? 'Request Quote'
              : 'Send Request'}
      </button>

      <p className="text-xs text-muted-foreground text-center">
        By submitting, you agree to be contacted by {business.name}.
      </p>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-foreground mb-1">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
