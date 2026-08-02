'use client';

import * as React from 'react';
import {
  Loader2,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Sparkles,
  Tag,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { mpUrl, type InstantBookingResponse, type ProviderService } from './types';

interface InstantBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Provider tenant id */
  providerTenantId: string;
  providerName: string;
  /** Default currency from the provider */
  currency?: string | null;
  services: ProviderService[];
  /** Pre-selected service (e.g., when user clicks "Book" on a specific service) */
  defaultServiceId?: string | null;
}

type Step = 'form' | 'submitting' | 'success';

export function InstantBookingDialog({
  open,
  onOpenChange,
  providerTenantId,
  providerName,
  currency,
  services,
  defaultServiceId,
}: InstantBookingDialogProps) {
  const [step, setStep] = React.useState<Step>('form');
  const [serviceId, setServiceId] = React.useState<string>(defaultServiceId ?? '');
  const [scheduledAt, setScheduledAt] = React.useState<string>('');
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [bookingId, setBookingId] = React.useState<string>('');
  const [errorMsg, setErrorMsg] = React.useState<string>('');

  // Reset form state when the dialog re-opens
  React.useEffect(() => {
    if (open) {
      setStep('form');
      setServiceId(defaultServiceId ?? '');
      setBookingId('');
      setErrorMsg('');
    }
  }, [open, defaultServiceId]);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;
  const currencyCode = currency || 'USD';
  const estimatedPrice = selectedService?.basePrice ?? null;

  const canSubmit =
    customerName.trim().length >= 2 &&
    customerPhone.trim().length >= 7 &&
    step === 'form';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStep('submitting');
    setErrorMsg('');

    try {
      const res = await fetch(mpUrl('/api/marketplace/book/instant'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerTenantId,
          serviceId: serviceId || undefined,
          scheduledAt: scheduledAt || undefined,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          amount: estimatedPrice ?? undefined,
          currency: currencyCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create booking');
      }

      const response = data as InstantBookingResponse;
      setBookingId(response.booking.id);
      setStep('success');
      toast.success('Booking confirmed!', {
        description: `${providerName} has been notified.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create booking';
      setErrorMsg(msg);
      setStep('form');
      toast.error('Booking failed', { description: msg });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Calendar className="h-4 w-4" />
            </span>
            Book {providerName}
          </DialogTitle>
          <DialogDescription>
            Pick a service, choose your preferred time, and confirm your booking instantly.
          </DialogDescription>
        </DialogHeader>

        {step === 'success' ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold">Booking Confirmed!</h3>
            <p className="text-sm text-muted-foreground">
              Your booking with <span className="font-medium text-foreground">{providerName}</span> is confirmed. They&apos;ve been notified and will reach out shortly to confirm details.
            </p>
            <div className="mt-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-emerald-600" />
                <span className="text-muted-foreground">Booking ID:</span>
                <code className="font-mono text-xs font-semibold">{bookingId}</code>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Service picker */}
            <div className="space-y-2">
              <Label htmlFor="ib-service">Service *</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger id="ib-service" className="w-full">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No services listed
                    </SelectItem>
                  ) : (
                    services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                        {s.basePrice != null
                          ? ` · ${currencyCode} ${s.basePrice}`
                          : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedService?.description ? (
                <p className="text-xs text-muted-foreground">
                  {selectedService.description}
                </p>
              ) : null}
            </div>

            {/* Date / time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ib-date">Preferred date</Label>
                <Input
                  id="ib-date"
                  type="date"
                  value={scheduledAt ? scheduledAt.slice(0, 10) : ''}
                  onChange={(e) => {
                    const date = e.target.value;
                    // Default to 10:00 if no time set
                    setScheduledAt(date ? `${date}T10:00` : '');
                  }}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ib-time">Time</Label>
                <Input
                  id="ib-time"
                  type="time"
                  value={scheduledAt ? scheduledAt.slice(11, 16) : ''}
                  onChange={(e) => {
                    const date = scheduledAt ? scheduledAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
                    setScheduledAt(`${date}T${e.target.value}`);
                  }}
                />
              </div>
            </div>

            {/* Estimate */}
            {estimatedPrice != null ? (
              <div className="flex items-center justify-between rounded-lg border bg-emerald-50 px-3 py-2 dark:bg-emerald-950/40">
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium text-emerald-800 dark:text-emerald-300">
                    Estimated total
                  </span>
                </div>
                <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  {currencyCode} {estimatedPrice.toFixed(2)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Final price will be confirmed by {providerName} after the visit.
              </div>
            )}

            {/* Customer details */}
            <div className="space-y-2">
              <Label htmlFor="ib-name">Your name *</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ib-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Jane Doe"
                  className="pl-9"
                  required
                  minLength={2}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ib-phone">Phone *</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="ib-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+1 555 000 1234"
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ib-email">Email (optional)</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="ib-email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ib-address">Service address</Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="ib-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, Apt 4B, City"
                  className="pl-9"
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ib-notes">Notes (optional)</Label>
              <Textarea
                id="ib-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any details the provider should know (gate code, parking, pet on premises, etc.)"
                rows={2}
                maxLength={2000}
              />
            </div>

            {errorMsg ? (
              <p className="text-sm text-rose-600" role="alert">
                {errorMsg}
              </p>
            ) : null}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={step === 'submitting'}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {step === 'submitting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Confirming…
                  </>
                ) : (
                  <>Confirm Booking</>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === 'success' ? (
          <DialogFooter>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Done
            </Button>
          </DialogFooter>
        ) : null}

        {services.length === 0 ? (
          <Badge variant="outline" className="mx-auto">
            This provider hasn&apos;t listed any bookable services yet.
          </Badge>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
