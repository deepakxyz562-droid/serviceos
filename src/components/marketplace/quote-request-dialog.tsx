'use client';

import * as React from 'react';
import {
  Loader2,
  FileText,
  ImagePlus,
  X,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Megaphone,
  DollarSign,
  Clock,
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
import { mpUrl, type QuoteRequestResponse, type Urgency } from './types';

interface QuoteRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill title (e.g., from AI route extraction) */
  defaultTitle?: string;
  /** Pre-fill description */
  defaultDescription?: string;
  /** Pre-fill industry */
  defaultIndustry?: string | null;
  /** Pre-fill city/address */
  defaultCity?: string | null;
  defaultAddress?: string | null;
  /** Pre-fill budget range */
  defaultBudgetLow?: number | null;
  defaultBudgetHigh?: number | null;
  /** Pre-fill urgency */
  defaultUrgency?: Urgency;
  /**
   * DIRECT MODE — when set, the request goes to this specific provider
   * instead of broadcasting to nearby providers. Used on unclaimed provider
   * profile pages where the customer wants a quote from that one business.
   * The API will send the provider an email with the customer's details.
   */
  targetTenantId?: string;
  /** Provider name for display in direct mode (title + success message) */
  targetProviderName?: string;
}

type Step = 'form' | 'submitting' | 'success';

const URGENCY_OPTIONS: { value: Urgency; label: string; tone: string }[] = [
  { value: 'low', label: 'Flexible — whenever', tone: 'text-emerald-700' },
  { value: 'medium', label: 'Within 1–2 weeks', tone: 'text-amber-700' },
  { value: 'high', label: 'This week', tone: 'text-orange-700' },
  { value: 'emergency', label: 'Emergency — ASAP', tone: 'text-rose-700' },
];

export function QuoteRequestDialog({
  open,
  onOpenChange,
  defaultTitle,
  defaultDescription,
  defaultIndustry,
  defaultCity,
  defaultAddress,
  defaultBudgetLow,
  defaultBudgetHigh,
  defaultUrgency,
  targetTenantId,
  targetProviderName,
}: QuoteRequestDialogProps) {
  const isDirectMode = !!targetTenantId;
  const [step, setStep] = React.useState<Step>('form');
  const [title, setTitle] = React.useState(defaultTitle ?? '');
  const [description, setDescription] = React.useState(defaultDescription ?? '');
  const [industry, setIndustry] = React.useState<string>(defaultIndustry ?? '');
  const [address, setAddress] = React.useState(defaultAddress ?? '');
  const [city, setCity] = React.useState(defaultCity ?? '');
  const [postalCode, setPostalCode] = React.useState('');
  const [budgetLow, setBudgetLow] = React.useState<string>(
    defaultBudgetLow != null ? String(defaultBudgetLow) : '',
  );
  const [budgetHigh, setBudgetHigh] = React.useState<string>(
    defaultBudgetHigh != null ? String(defaultBudgetHigh) : '',
  );
  const [urgency, setUrgency] = React.useState<Urgency>(defaultUrgency ?? 'medium');
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [photoUrls, setPhotoUrls] = React.useState<string[]>([]);
  const [photoInput, setPhotoInput] = React.useState('');
  const [requestId, setRequestId] = React.useState<string>('');
  const [broadcastCount, setBroadcastCount] = React.useState<number>(0);
  const [errorMsg, setErrorMsg] = React.useState<string>('');

  React.useEffect(() => {
    if (open) {
      setStep('form');
      setTitle(defaultTitle ?? '');
      setDescription(defaultDescription ?? '');
      setIndustry(defaultIndustry ?? '');
      setCity(defaultCity ?? '');
      setAddress(defaultAddress ?? '');
      setBudgetLow(defaultBudgetLow != null ? String(defaultBudgetLow) : '');
      setBudgetHigh(defaultBudgetHigh != null ? String(defaultBudgetHigh) : '');
      setUrgency(defaultUrgency ?? 'medium');
      setRequestId('');
      setBroadcastCount(0);
      setErrorMsg('');
      setPhotoUrls([]);
      setPhotoInput('');
    }
  }, [
    open,
    defaultTitle,
    defaultDescription,
    defaultIndustry,
    defaultCity,
    defaultAddress,
    defaultBudgetLow,
    defaultBudgetHigh,
    defaultUrgency,
  ]);

  const canSubmit =
    title.trim().length >= 5 &&
    customerName.trim().length >= 2 &&
    customerPhone.trim().length >= 7 &&
    step === 'form';

  function addPhoto() {
    const url = photoInput.trim();
    if (!url) return;
    if (photoUrls.length >= 10) {
      toast.warning('Up to 10 photos allowed');
      return;
    }
    setPhotoUrls((p) => [...p, url]);
    setPhotoInput('');
  }

  function removePhoto(idx: number) {
    setPhotoUrls((p) => p.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStep('submitting');
    setErrorMsg('');

    const lowNum = budgetLow ? Number(budgetLow) : null;
    const highNum = budgetHigh ? Number(budgetHigh) : null;
    if (lowNum != null && highNum != null && lowNum > highNum) {
      setErrorMsg('Budget low cannot exceed budget high.');
      setStep('form');
      return;
    }

    try {
      const res = await fetch(mpUrl('/api/marketplace/quote-request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          industry: industry || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          budgetLow: lowNum,
          budgetHigh: highNum,
          urgency,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          photos: photoUrls,
          ...(targetTenantId ? { targetTenantId } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to submit request');
      }

      const response = data as QuoteRequestResponse & { directMode?: boolean; providerName?: string };
      setRequestId(response.jobRequest.id);
      setBroadcastCount(response.broadcastCount);
      setStep('success');
      if (response.directMode) {
        toast.success('Request sent!', {
          description: `${targetProviderName || 'The provider'} has been notified by email.`,
        });
      } else {
        toast.success('Request broadcast!', {
          description: `${response.broadcastCount} providers notified.`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit request';
      setErrorMsg(msg);
      setStep('form');
      toast.error('Submission failed', { description: msg });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <FileText className="h-4 w-4" />
            </span>
            {isDirectMode && targetProviderName
              ? `Request a Quote from ${targetProviderName}`
              : 'Request Quotes from Local Providers'}
          </DialogTitle>
          <DialogDescription>
            {isDirectMode && targetProviderName
              ? `Describe your project below and ${targetProviderName} will receive your request by email. They will contact you directly with a quote.`
              : 'Describe your project and nearby verified providers will respond with quotes — usually within 24 hours.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'success' ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
              <CheckCircle2 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold">Request Sent!</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              {isDirectMode && targetProviderName
                ? <>We&apos;ve sent your request to <span className="font-semibold text-foreground">{targetProviderName}</span>. They will contact you directly by phone or email with a quote.</>
                : <>We&apos;ve notified <span className="font-semibold text-foreground">{broadcastCount}</span> marketplace-eligible providers about your request. You&apos;ll receive quotes by phone and email as they respond.</>}
            </p>
            <div className="mt-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-amber-600" />
                <span className="text-muted-foreground">Request ID:</span>
                <code className="font-mono text-xs font-semibold">{requestId}</code>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qr-title">Project title *</Label>
              <Input
                id="qr-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Interior painting for 3-bedroom apartment"
                required
                minLength={5}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qr-desc">Project description</Label>
              <Textarea
                id="qr-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell providers what you need done — scope of work, materials, deadlines, anything specific."
                rows={4}
                maxLength={5000}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="qr-industry">Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger id="qr-industry" className="w-full">
                    <SelectValue placeholder="Auto-detect from title" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_CATALOG.map((ind) => (
                      <SelectItem key={ind.id} value={ind.id}>
                        {ind.emoji} {ind.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qr-urgency">Urgency</Label>
                <Select
                  value={urgency}
                  onValueChange={(v) => setUrgency(v as Urgency)}
                >
                  <SelectTrigger id="qr-urgency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {URGENCY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className={o.tone}>{o.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="qr-city">City</Label>
                <Input
                  id="qr-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Austin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qr-postal">Postal code</Label>
                <Input
                  id="qr-postal"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="78701"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qr-address">Service address</Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="qr-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address (optional)"
                  className="pl-9"
                  rows={2}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="qr-bl">Budget low</Label>
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="qr-bl"
                    type="number"
                    min={0}
                    step="any"
                    value={budgetLow}
                    onChange={(e) => setBudgetLow(e.target.value)}
                    placeholder="500"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qr-bh">Budget high</Label>
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="qr-bh"
                    type="number"
                    min={0}
                    step="any"
                    value={budgetHigh}
                    onChange={(e) => setBudgetHigh(e.target.value)}
                    placeholder="1500"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <Label>Photos <span className="text-xs text-muted-foreground">(optional, up to 10)</span></Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ImagePlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="url"
                    value={photoInput}
                    onChange={(e) => setPhotoInput(e.target.value)}
                    placeholder="Paste photo URL"
                    className="pl-9"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addPhoto();
                      }
                    }}
                  />
                </div>
                <Button type="button" variant="outline" onClick={addPhoto}>
                  Add
                </Button>
              </div>
              {photoUrls.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {photoUrls.map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      className="group relative h-16 w-16 overflow-hidden rounded-md border bg-muted"
                    >
                      <img
                        src={url}
                        alt={`Photo ${idx + 1}`}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute right-0.5 top-0.5 rounded-full bg-rose-600 p-0.5 text-white shadow-sm transition-opacity hover:bg-rose-700"
                        aria-label="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="border-t pt-3">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Your contact details
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="qr-name">Name *</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="qr-name"
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
                    <Label htmlFor="qr-phone">Phone *</Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="qr-phone"
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
                    <Label htmlFor="qr-email">Email (optional)</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="qr-email"
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
                onClick={() => onOpenChange(false)}
                disabled={step === 'submitting'}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                className="gap-2 bg-amber-600 text-white hover:bg-amber-700"
              >
                {step === 'submitting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Broadcasting…
                  </>
                ) : (
                  <>
                    <Megaphone className="h-4 w-4" /> Submit Request
                  </>
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
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Done
            </Button>
          </DialogFooter>
        ) : null}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <Badge variant="outline" className="font-normal">Avg. first quote in 4 hours</Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
}
