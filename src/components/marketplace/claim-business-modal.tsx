'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  Mail,
  Globe,
  FileText,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ClaimBusinessModal
 * -------------------
 * A 3-step modal wizard for claiming an unclaimed marketplace business:
 *
 *   Step 1: Choose verification method (phone / email / google / document)
 *   Step 2: Complete the chosen verification (enter OTP/code, paste GBP URL,
 *           or upload documents)
 *   Step 3: Success screen — "You now manage this business"
 *
 * Verification methods:
 *   - phone    → we send a 6-digit OTP to the tenant's seeded phone (instant)
 *   - email    → we send a 6-digit code to the tenant's email (instant)
 *   - google   → user pastes their Google Business Profile URL + name + address;
 *                if it matches our tenant record (>=80% similarity) → auto-approve
 *   - document → user uploads business license / utility bill; goes to admin review
 *
 * On success, calls onSuccess() so the parent page can refresh / redirect.
 */

type VerificationMethod = 'phone' | 'email' | 'google' | 'document';

interface ClaimBusinessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  tenantPhone?: string | null;
  tenantEmail?: string | null;
  tenantCity?: string | null;
  tenantState?: string | null;
  onSuccess?: () => void;
}

export function ClaimBusinessModal({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  tenantPhone,
  tenantEmail,
  tenantCity,
  tenantState,
  onSuccess,
}: ClaimBusinessModalProps) {
  const [step, setStep] = React.useState<'method' | 'verify' | 'success' | 'pending'>('method');
  const [method, setMethod] = React.useState<VerificationMethod | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [requestId, setRequestId] = React.useState<string | null>(null);

  // Verification-form state
  const [otpCode, setOtpCode] = React.useState('');
  const [gbpUrl, setGbpUrl] = React.useState('');
  const [gbpName, setGbpName] = React.useState('');
  const [gbpAddress, setGbpAddress] = React.useState('');
  const [documentNote, setDocumentNote] = React.useState('');

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep('method');
        setMethod(null);
        setError(null);
        setRequestId(null);
        setOtpCode('');
        setGbpUrl('');
        setGbpName('');
        setGbpAddress('');
        setDocumentNote('');
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const maskedPhone = tenantPhone
    ? `•••••${tenantPhone.slice(-4)}`
    : null;
  const maskedEmail = tenantEmail
    ? `${tenantEmail.split('@')[0].slice(0, 2)}•••@${tenantEmail.split('@')[1]}`
    : null;

  async function submitClaimRequest() {
    if (!method) return;
    setLoading(true);
    setError(null);
    try {
      const verificationData: Record<string, unknown> = {};
      if (method === 'google') {
        verificationData.gbpUrl = gbpUrl;
        verificationData.gbpName = gbpName;
        verificationData.gbpAddress = gbpAddress;
      } else if (method === 'document') {
        verificationData.documentUrls = ['pending-upload']; // TODO: wire to file upload
        verificationData.note = documentNote;
      }

      const res = await fetch('/api/marketplace/claim/request?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          verificationMethod: method,
          verificationData,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit claim request');
        return;
      }
      setRequestId(data.requestId);
      if (data.status === 'auto_approved') {
        setStep('success');
      } else if (method === 'phone' || method === 'email') {
        setStep('verify');
      } else {
        // document or google (pending review)
        setStep('pending');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!requestId || !otpCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/marketplace/claim/verify-otp?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification failed');
        return;
      }
      setStep('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Claim &ldquo;{tenantName}&rdquo;
          </DialogTitle>
          <DialogDescription>
            Verify you own this business to manage its profile, respond to reviews, and receive leads.
          </DialogDescription>
        </DialogHeader>

        {/* ─── Step 1: Choose verification method ─────────────────────────── */}
        {step === 'method' && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Choose a verification method:</p>

            <MethodOption
              icon={Phone}
              title="Phone OTP"
              description={maskedPhone ? `Call/text ${maskedPhone}` : 'No phone on file'}
              disabled={!tenantPhone}
              onClick={() => {
                setMethod('phone');
                submitClaimRequest();
              }}
            />
            <MethodOption
              icon={Mail}
              title="Email code"
              description={maskedEmail ? `Send code to ${maskedEmail}` : 'No email on file'}
              disabled={!tenantEmail}
              onClick={() => {
                setMethod('email');
                submitClaimRequest();
              }}
            />
            <MethodOption
              icon={Globe}
              title="Google Business Profile"
              description="Connect your verified GBP listing (instant if name + address match)"
              onClick={() => setMethod('google')}
            />
            <MethodOption
              icon={FileText}
              title="Document upload"
              description="Upload business license / utility bill (admin review, 1-2 business days)"
              onClick={() => setMethod('document')}
            />

            {error ? (
              <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
            ) : null}

            <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mb-1 inline h-3.5 w-3.5 text-emerald-600" />{' '}
              Your claim is reviewed against the business&rsquo;s existing records. False claims are subject to account termination.
            </div>
          </div>
        )}

        {/* ─── Step 2a: Google GBP form ─────────────────────────────────────── */}
        {step === 'verify' && method === 'google' && (
          <div className="space-y-3">
            <BackButton onClick={() => setStep('method')} />
            <p className="text-sm font-medium text-foreground">
              Enter your Google Business Profile details:
            </p>
            <div className="space-y-2">
              <Label htmlFor="gbp-url">Google Business Profile URL</Label>
              <Input
                id="gbp-url"
                placeholder="https://www.google.com/maps/place/..."
                value={gbpUrl}
                onChange={(e) => setGbpUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gbp-name">Business name (as shown on Google)</Label>
              <Input
                id="gbp-name"
                placeholder="Summit Roofing Co"
                value={gbpName}
                onChange={(e) => setGbpName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gbp-address">Business address (as shown on Google)</Label>
              <Input
                id="gbp-address"
                placeholder="123 Main St, Denver, CO"
                value={gbpAddress}
                onChange={(e) => setGbpAddress(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We compare the name + address to our records. If they match &ge;80&percnt;, your claim is auto-approved. Otherwise it goes to admin review.
            </p>
            {error ? (
              <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
            ) : null}
            <Button
              onClick={submitClaimRequest}
              disabled={loading || !gbpUrl || !gbpName}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit claim'}
            </Button>
          </div>
        )}

        {/* ─── Step 2b: OTP / email code entry ──────────────────────────────── */}
        {step === 'verify' && (method === 'phone' || method === 'email') && (
          <div className="space-y-3">
            <BackButton onClick={() => setStep('method')} />
            <p className="text-sm font-medium text-foreground">
              {method === 'phone'
                ? `Enter the 6-digit code we sent to ${maskedPhone}`
                : `Enter the 6-digit code we sent to ${maskedEmail}`}
            </p>
            <Input
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-lg tracking-[0.5em]"
            />
            <p className="text-xs text-muted-foreground">
              {method === 'phone' ? 'Code expires in 10 minutes.' : 'Code expires in 1 hour.'}
            </p>
            {error ? (
              <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
            ) : null}
            <Button onClick={verifyOtp} disabled={loading || otpCode.length !== 6} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify code'}
            </Button>
          </div>
        )}

        {/* ─── Step 2c: Document upload ─────────────────────────────────────── */}
        {step === 'verify' && method === 'document' && (
          <div className="space-y-3">
            <BackButton onClick={() => setStep('method')} />
            <p className="text-sm font-medium text-foreground">
              Upload verification documents:
            </p>
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              <FileText className="mx-auto mb-2 h-8 w-8" />
              Drag &amp; drop files here, or click to browse
              <br />
              <span className="text-xs">Business license, utility bill, or tax document (PDF/PNG/JPG)</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-note">Additional note (optional)</Label>
              <Textarea
                id="doc-note"
                placeholder="e.g. I'm the owner of Summit Roofing Co since 2015..."
                value={documentNote}
                onChange={(e) => setDocumentNote(e.target.value)}
                rows={3}
              />
            </div>
            {error ? (
              <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
            ) : null}
            <Button onClick={submitClaimRequest} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for review'}
            </Button>
          </div>
        )}

        {/* ─── Step 3a: Success ─────────────────────────────────────────────── */}
        {step === 'success' && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Claim approved!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You now manage <strong>{tenantName}</strong>. You can edit your profile, add services, respond to reviews, and upgrade to receive online bookings.
              </p>
            </div>
            <div className="rounded-md bg-emerald-50 p-3 text-left text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <p className="font-semibold">What you can do now (free):</p>
              <ul className="mt-1 space-y-0.5">
                <li>• Edit your public hub profile (hours, photos, description)</li>
                <li>• Respond to customer reviews</li>
                <li>• Show a full provider card on the marketplace</li>
                <li>• Receive phone calls from the &ldquo;Call now&rdquo; button</li>
              </ul>
              <p className="mt-2 font-semibold">Upgrade to receive:</p>
              <ul className="mt-1 space-y-0.5">
                <li>• Online bookings (&ldquo;Book Now&rdquo; button)</li>
                <li>• Quote requests in your dashboard</li>
                <li>• 24/7 emergency dispatch</li>
                <li>• Featured placement (amber ring)</li>
              </ul>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onSuccess?.();
                }}
                className="w-full"
              >
                Go to my dashboard
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ─── Step 3b: Pending review ──────────────────────────────────────── */}
        {step === 'pending' && (
          <div className="space-y-4 py-4 text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-amber-500" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Claim submitted for review</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your claim for <strong>{tenantName}</strong> is pending admin review. We&rsquo;ll notify you at your account email within 1-2 business days.
              </p>
            </div>
            <Badge variant="outline" className="text-amber-700">
              Status: Pending review
            </Badge>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} className="w-full">
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MethodOption({
  icon: Icon,
  title,
  description,
  disabled,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20',
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Back to methods
    </button>
  );
}
