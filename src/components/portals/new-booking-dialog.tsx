'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Wrench,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface ServiceOption {
  id: string;
  name: string;
  description: string | null;
  category: string;
  basePrice: number;
  duration: number;
}

interface NewBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a booking is successfully created */
  onCreated?: () => void;
  /** Pre-fill address (from customer profile) */
  defaultAddress?: string;
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

export function NewBookingDialog({
  open,
  onOpenChange,
  onCreated,
  defaultAddress,
}: NewBookingDialogProps) {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const [serviceId, setServiceId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [address, setAddress] = useState(defaultAddress || '');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ─── Fetch services when the dialog opens ────────────────────────────────
  const fetchServices = useCallback(async () => {
    setServicesLoading(true);
    setServicesError(null);
    try {
      const res = await fetch('/api/services?XTransformPort=3000&active=true&limit=50');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to load services.');
      }
      const data = await res.json();
      const list: ServiceOption[] = data.services || [];
      setServices(list);
      if (list.length === 0) {
        setServicesError(
          'No services are available from this business yet. Please check back later or contact the business directly.'
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load services.';
      setServicesError(msg);
    } finally {
      setServicesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchServices();
      setError(null);
      setSuccess(false);
    }
  }, [open, fetchServices]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setServiceId('');
        setScheduledDate('');
        setScheduledTime('10:00');
        setAddress(defaultAddress || '');
        setNotes('');
        setError(null);
        setSuccess(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open, defaultAddress]);

  const selectedService = services.find((s) => s.id === serviceId) || null;

  const validate = (): string | null => {
    if (!serviceId) return 'Please choose a service.';
    if (!scheduledDate) return 'Please pick a preferred date.';
    if (!scheduledTime) return 'Please pick a preferred time.';
    const chosen = new Date(`${scheduledDate}T${scheduledTime}`);
    if (isNaN(chosen.getTime())) return 'Invalid date or time.';
    if (chosen.getTime() < Date.now() - 60_000) {
      return 'Please choose a future date and time.';
    }
    if (!address.trim()) return 'Please enter the service address.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
    const service = selectedService;

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: service?.name || 'Service Booking',
          description: service?.description || null,
          source: 'website',
          serviceId: serviceId,
          address: address.trim(),
          scheduledAt,
          duration: service?.duration || 60,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create booking.');
      }

      setSuccess(true);
      toast.success('Booking request submitted!', {
        description: 'The business will confirm your appointment shortly.',
      });
      onCreated?.();
      // Auto-close after a short delay so the user sees the success state
      setTimeout(() => {
        onOpenChange(false);
      }, 1600);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create booking.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="size-5 text-teal-600" />
            New Booking Request
          </DialogTitle>
          <DialogDescription>
            Pick a service and a preferred time. The business will confirm your appointment.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 flex flex-col items-center text-center gap-3">
            <div className="size-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
              <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Booking request submitted!</p>
              <p className="text-sm text-muted-foreground mt-1">
                We&apos;ve sent your request. You&apos;ll see it under <span className="font-medium">Bookings</span> once confirmed.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Service picker */}
            <div className="space-y-1.5">
              <Label htmlFor="nb-service" className="text-xs font-medium">
                Service <span className="text-red-500">*</span>
              </Label>
              {servicesLoading ? (
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/30 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Loading services...
                </div>
              ) : services.length === 0 ? (
                <div className="flex items-start gap-2 p-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>
                    {servicesError ||
                      'No services are available from this business yet.'}
                  </span>
                </div>
              ) : (
                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger id="nb-service" className="h-10">
                    <SelectValue placeholder="Choose a service..." />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{s.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatINR(s.basePrice)} · {s.duration} min
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedService?.description && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
                  <Info className="size-3 shrink-0 mt-0.5" />
                  <span>{selectedService.description}</span>
                </p>
              )}
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nb-date" className="text-xs font-medium">
                  Preferred Date <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="nb-date"
                    type="date"
                    min={todayISO()}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="pl-9 h-10"
                    disabled={submitting}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nb-time" className="text-xs font-medium">
                  Preferred Time <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="nb-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="pl-9 h-10"
                    disabled={submitting}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="nb-address" className="text-xs font-medium">
                Service Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground pointer-events-none" />
                <Textarea
                  id="nb-address"
                  placeholder="Flat / House no, Building, Street, Area, City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="pl-9 min-h-[64px] resize-none"
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="nb-notes" className="text-xs font-medium">
                Notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 size-4 text-muted-foreground pointer-events-none" />
                <Textarea
                  id="nb-notes"
                  placeholder="Describe the issue or any special instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="pl-9 min-h-[72px] resize-none"
                  disabled={submitting}
                />
              </div>
            </div>

            {selectedService && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
                <div className="flex items-center gap-2 text-xs text-teal-800 dark:text-teal-200">
                  <Wrench className="size-3.5" />
                  <span>
                    Estimated duration: <strong>{selectedService.duration} min</strong>
                  </span>
                </div>
                <span className="text-sm font-bold text-teal-700 dark:text-teal-300">
                  {formatINR(selectedService.basePrice)}
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 text-xs text-red-800 dark:text-red-200">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || servicesLoading || services.length === 0}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 mr-1.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <CalendarCheck className="size-4 mr-1.5" /> Submit Request
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default NewBookingDialog;
