'use client';

import * as React from 'react';
import {
  Loader2,
  Siren,
  User,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Clock,
  PhoneCall,
  X,
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
import { INDUSTRY_CATALOG } from '@/lib/industry-catalog';
import { toast } from 'sonner';
import {
  mpUrl,
  type EmergencyDispatchResponse,
  type EmergencyStatusResponse,
} from './types';

interface EmergencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill title (e.g., from AI route extraction) */
  defaultTitle?: string;
  /** Pre-fill description */
  defaultDescription?: string;
  /** Pre-fill industry */
  defaultIndustry?: string | null;
  /** Pre-fill address */
  defaultAddress?: string | null;
}

type Step = 'form' | 'broadcasting' | 'accepted' | 'failed';

const EMERGENCY_INDUSTRIES = [
  'plumbing',
  'electrical',
  'hvac',
  'locksmith',
  'appliance-repair',
  'roofing',
  'security',
  'pest-control',
  'cleaning',
];

export function EmergencyDialog({
  open,
  onOpenChange,
  defaultTitle,
  defaultDescription,
  defaultIndustry,
  defaultAddress,
}: EmergencyDialogProps) {
  const [step, setStep] = React.useState<Step>('form');
  const [title, setTitle] = React.useState(defaultTitle ?? '');
  const [description, setDescription] = React.useState(defaultDescription ?? '');
  const [industry, setIndustry] = React.useState<string>(defaultIndustry ?? '');
  const [address, setAddress] = React.useState(defaultAddress ?? '');
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [dispatchId, setDispatchId] = React.useState<string>('');
  const [broadcastCount, setBroadcastCount] = React.useState<number>(0);
  const [acceptedProviderName, setAcceptedProviderName] = React.useState<string | null>(null);
  const [etaMins, setEtaMins] = React.useState<number | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string>('');
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    if (open) {
      setStep('form');
      setTitle(defaultTitle ?? '');
      setDescription(defaultDescription ?? '');
      setIndustry(defaultIndustry ?? '');
      setAddress(defaultAddress ?? '');
      setDispatchId('');
      setBroadcastCount(0);
      setAcceptedProviderName(null);
      setEtaMins(null);
      setErrorMsg('');
    }
  }, [open, defaultTitle, defaultDescription, defaultIndustry, defaultAddress]);

  // Cleanup polling on close
  React.useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch(mpUrl(`/api/marketplace/emergency/${id}`));
        if (!res.ok) return;
        const data = (await res.json()) as EmergencyStatusResponse;
        const dispatch = data.emergencyDispatch;
        if (dispatch.status === 'accepted' || dispatch.status === 'en_route') {
          setAcceptedProviderName('A verified technician');
          setEtaMins(dispatch.estimatedArrivalMins ?? 35);
          setStep('accepted');
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } else if (dispatch.status === 'cancelled' || dispatch.status === 'expired') {
          setStep('failed');
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        // network blip — keep polling
      }
      // Stop polling after ~5 minutes
      if (attempts > 60) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    }, 5000);
  }

  const canSubmit =
    title.trim().length >= 5 &&
    customerName.trim().length >= 2 &&
    customerPhone.trim().length >= 7 &&
    step === 'form';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStep('broadcasting');
    setErrorMsg('');

    try {
      const res = await fetch(mpUrl('/api/marketplace/emergency'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          industry: industry || undefined,
          address: address.trim() || undefined,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to dispatch emergency');
      }

      const response = data as EmergencyDispatchResponse;
      setDispatchId(response.emergencyDispatch.id);
      setBroadcastCount(response.broadcastCount);
      toast.error('Emergency dispatched', {
        description: `Notifying ${response.broadcastCount} nearby technicians…`,
      });
      startPolling(response.emergencyDispatch.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to dispatch emergency';
      setErrorMsg(msg);
      setStep('form');
      toast.error('Dispatch failed', { description: msg });
    }
  }

  function handleClose(open: boolean) {
    if (!open && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden border-rose-300 p-0 sm:max-w-lg dark:border-rose-900">
        {/* Red header banner */}
        <div className="relative bg-gradient-to-br from-rose-600 to-red-700 px-6 pb-4 pt-6 text-white">
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="absolute right-4 top-4 rounded-full bg-white/15 p-1.5 transition-colors hover:bg-white/25"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 animate-pulse items-center justify-center rounded-xl bg-white/20">
              <Siren className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold leading-tight">Emergency Dispatch</h2>
              <p className="text-xs text-rose-100">
                Available 24/7 · Avg. response &lt; 5 min · Avg. arrival 35 min
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-4">
          {step === 'form' ? (
            <>
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Use this for <strong>real emergencies</strong> — burst pipes, no electricity, gas leaks, lockouts, heating failures. For non-urgent jobs, use the AI search or browse categories above.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="em-title" className="text-rose-700 dark:text-rose-300">
                    What&apos;s the emergency? *
                  </Label>
                  <Input
                    id="em-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Burst pipe flooding kitchen"
                    required
                    minLength={5}
                    maxLength={200}
                    className="border-rose-200 focus-visible:border-rose-400 focus-visible:ring-rose-200/50 dark:border-rose-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="em-desc">Describe the situation</Label>
                  <Textarea
                    id="em-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="How long has it been happening? Is water/electricity shut off? Any safety concerns?"
                    rows={3}
                    maxLength={5000}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="em-industry">Type of emergency</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger id="em-industry" className="w-full">
                      <SelectValue placeholder="Auto-detect from description" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMERGENCY_INDUSTRIES.map((id) => {
                        const meta = INDUSTRY_CATALOG.find((i) => i.id === id);
                        if (!meta) return null;
                        return (
                          <SelectItem key={id} value={id}>
                            {meta.emoji} {meta.name}
                          </SelectItem>
                        );
                      })}
                      <SelectItem value="_other">Other / not sure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="em-address">Address (so we can dispatch nearby)</Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="em-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street, unit, city — be as specific as possible"
                      className="pl-9"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="border-t border-rose-100 pt-3 dark:border-rose-900/60">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                    Your contact details
                  </p>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="em-name">Name *</Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="em-name"
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
                        <Label htmlFor="em-phone">Phone *</Label>
                        <div className="relative">
                          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="em-phone"
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
                        <Label htmlFor="em-email">Email (optional)</Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="em-email"
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="jane@example.com"
                            className="pl-9"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
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
                    onClick={() => handleClose(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="gap-2 bg-rose-600 text-white hover:bg-rose-700"
                  >
                    <Siren className="h-4 w-4" /> Dispatch Emergency
                  </Button>
                </DialogFooter>
              </form>
            </>
          ) : null}

          {step === 'broadcasting' ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-rose-300 opacity-60" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950">
                  <Siren className="h-8 w-8 animate-pulse text-rose-600 dark:text-rose-400" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-rose-700 dark:text-rose-300">
                Finding nearest technician…
              </h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                We&apos;ve broadcast your emergency to <span className="font-semibold text-foreground">{broadcastCount}</span> verified nearby providers. The first to accept gets the job — typically within 2–5 minutes.
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Listening for acceptances…</span>
              </div>
              {dispatchId ? (
                <code className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                  Dispatch ID: {dispatchId}
                </code>
              ) : null}
            </div>
          ) : null}

          {step === 'accepted' ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                Technician on the way!
              </h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{acceptedProviderName}</span> has accepted your emergency dispatch and is heading to your address now.
              </p>
              <div className="mt-2 flex items-center gap-6 rounded-xl border bg-emerald-50 px-6 py-4 dark:bg-emerald-950/40">
                <div className="flex flex-col items-center gap-1">
                  <Clock className="h-5 w-5 text-emerald-600" />
                  <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {etaMins ?? 35}
                  </span>
                  <span className="text-xs text-muted-foreground">min ETA</span>
                </div>
                <div className="h-12 w-px bg-emerald-200 dark:bg-emerald-800" />
                <div className="flex flex-col items-center gap-1">
                  <Truck className="h-5 w-5 text-emerald-600" />
                  <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    En route
                  </span>
                  <span className="text-xs text-muted-foreground">Live tracking</span>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2 text-sm">
                <PhoneCall className="h-4 w-4 text-emerald-600" />
                <span className="text-muted-foreground">
                  The technician will call you at <span className="font-medium text-foreground">{customerPhone}</span> shortly.
                </span>
              </div>
              {dispatchId ? (
                <Badge variant="outline" className="font-mono text-xs">
                  Dispatch ID: {dispatchId}
                </Badge>
              ) : null}
            </div>
          ) : null}

          {step === 'failed' ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950">
                <AlertTriangle className="h-9 w-9 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-rose-700 dark:text-rose-300">
                No technician available right now
              </h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                None of the broadcast providers were able to accept your emergency. Please call 911 for life-threatening emergencies or try again in a few minutes.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('form')}
              >
                Try again
              </Button>
            </div>
          ) : null}

          {(step === 'accepted' || step === 'failed') ? (
            <DialogFooter>
              <Button
                type="button"
                onClick={() => handleClose(false)}
                className={
                  step === 'accepted'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-rose-600 text-white hover:bg-rose-700'
                }
              >
                Close
              </Button>
            </DialogFooter>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
