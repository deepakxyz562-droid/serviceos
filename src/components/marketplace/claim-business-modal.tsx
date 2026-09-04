'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Mail,
  Globe,
  FileText,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Upload,
  X,
  AlertCircle,
  Phone,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';

/**
 * ClaimBusinessModal
 * -------------------
 * Single-form modal for claiming an unclaimed marketplace business.
 *
 * The claimant provides:
 *   1. Business email (required) — where the approval email goes
 *   2. Google Business Profile URL + name + address (optional, auto-approve if ≥80% match)
 *   3. Document upload (optional, admin review path)
 *
 * Flow:
 *   - On submit → POST /api/marketplace/claim/request
 *   - If auto-approved (Google match) → "Approved! Check your email" screen
 *   - If pending review (documents) → "Under review" screen
 *   - User closes modal. Email contains the registration link.
 *
 * Anti-spam measures:
 *   - No phone OTP (removed entirely)
 *   - Business email is pre-filled from the tenant record (masked) when available
 *   - Rate-limited server-side (one pending claim per user per business)
 */

interface UploadedDoc {
  url: string;
  name: string;
  size: number;
}

interface ClaimBusinessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  tenantEmail?: string | null;
  tenantCity?: string | null;
  tenantState?: string | null;
}

export function ClaimBusinessModal({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  tenantEmail,
  tenantCity,
  tenantState,
}: ClaimBusinessModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    status: 'auto_approved' | 'pending';
    message: string;
  } | null>(null);

  // Form state
  const [claimantEmail, setClaimantEmail] = React.useState('');
  const [showGoogle, setShowGoogle] = React.useState(false);
  const [gbpUrl, setGbpUrl] = React.useState('');
  const [gbpName, setGbpName] = React.useState('');
  const [gbpAddress, setGbpAddress] = React.useState('');
  const [showDocs, setShowDocs] = React.useState(false);
  const [documents, setDocuments] = React.useState<UploadedDoc[]>([]);
  const [docNote, setDocNote] = React.useState('');
  const [uploading, setUploading] = React.useState(false);

  // ── Gate D: Anchor-based verification state ────────────────────────
  // Fetches the listing's available verification anchors (masked phone/email)
  // and offers OTP-based verification against the listing's EXISTING contact.
  const [anchors, setAnchors] = React.useState<{
    phone?: { available: boolean; masked: string };
    email?: { available: boolean; masked: string };
  } | null>(null);
  const [anchorsLoading, setAnchorsLoading] = React.useState(false);
  const [otpChannel, setOtpChannel] = React.useState<'phone' | 'email' | null>(null);
  const [otpCode, setOtpCode] = React.useState('');
  const [otpSending, setOtpSending] = React.useState(false);
  const [otpVerifying, setOtpVerifying] = React.useState(false);
  const [otpSent, setOtpSent] = React.useState(false);
  const [otpVerified, setOtpVerified] = React.useState(false);

  // Fetch anchors when modal opens
  React.useEffect(() => {
    if (!open) return;
    setAnchorsLoading(true);
    authFetch(`/api/marketplace/claim/anchors/${tenantId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setAnchors(data);
      })
      .catch(() => {})
      .finally(() => setAnchorsLoading(false));
  }, [open, tenantId]);

  // Send OTP to the listing's anchor (phone or email)
  async function sendAnchorOtp(channel: 'phone' | 'email') {
    setOtpChannel(channel);
    setOtpSending(true);
    setOtpSent(false);
    try {
      const res = await authFetch('/api/marketplace/claim/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, channel }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        toast.success(data.message || `Code sent to ${data.maskedTarget}`);
      } else {
        toast.error(data.error || 'Failed to send code');
        setOtpChannel(null);
      }
    } catch {
      toast.error('Network error');
      setOtpChannel(null);
    } finally {
      setOtpSending(false);
    }
  }

  // Verify the OTP code
  async function verifyAnchorOtp() {
    if (!otpCode.trim()) {
      toast.error('Enter the code');
      return;
    }
    setOtpVerifying(true);
    try {
      const res = await authFetch('/api/marketplace/claim/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, code: otpCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpVerified(true);
        toast.success('Verified! You can now submit your claim.');
        setOtpCode('');
      } else {
        toast.error(data.error || 'Verification failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setOtpVerifying(false);
    }
  }

  // Pre-fill email from tenant record (masked) when available
  React.useEffect(() => {
    if (open && tenantEmail && !claimantEmail) {
      setClaimantEmail(tenantEmail);
    }
  }, [open, tenantEmail, claimantEmail]);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setError(null);
        setResult(null);
        setShowGoogle(false);
        setShowDocs(false);
        setGbpUrl('');
        setGbpName('');
        setGbpAddress('');
        setDocuments([]);
        setDocNote('');
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ── Document upload handler ─────────────────────────────────────────────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (documents.length + files.length > 5) {
      toast.error('Maximum 5 documents allowed');
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/marketplace/claim/upload?XTransformPort=3000', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || `Failed to upload ${file.name}`);
          continue;
        }
        setDocuments((prev) => [
          ...prev,
          { url: data.url, name: data.name, size: data.size },
        ]);
        toast.success(`Uploaded ${file.name}`);
      }
    } catch {
      toast.error('Upload failed — please try again');
    } finally {
      setUploading(false);
      // Clear the input so the same file can be re-selected
      e.target.value = '';
    }
  }

  function removeDoc(idx: number) {
    setDocuments((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Submit handler ──────────────────────────────────────────────────────
  async function submitClaim() {
    if (!claimantEmail) {
      setError('Please enter your business email');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claimantEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    const hasGoogle = showGoogle && gbpUrl && gbpName;
    const hasDocs = showDocs && documents.length > 0;
    const hasAnchorOtp = otpVerified;

    if (!hasGoogle && !hasDocs && !hasAnchorOtp) {
      setError(
        'Please verify your business using one of the methods above (phone/email OTP, Google Business Profile, or document upload).',
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/marketplace/claim/request?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          claimantEmail,
          // The old paste-URL Google verification is replaced by OAuth.
          // When showGoogle is true now, it means "manual verification requested"
          // — we send a note (in gbpUrl) + the claim goes to pending (admin review).
          // Auto-approval only happens via the OAuth-based match flow
          // (/api/verification/google/match).
          google: hasGoogle
            ? { gbpUrl: `MANUAL_VERIFICATION: ${gbpUrl}`, gbpName: '', gbpAddress: '' }
            : undefined,
          documents: hasDocs
            ? { urls: documents.map((d) => d.url), note: docNote }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit claim request');
        return;
      }
      setResult({ status: data.status, message: data.message });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  // ── Result screen ───────────────────────────────────────────────────────
  if (result) {
    const isApproved = result.status === 'auto_approved';
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="space-y-4 py-4 text-center">
            {isApproved ? (
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            ) : (
              <ShieldCheck className="mx-auto h-12 w-12 text-amber-500" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {isApproved ? 'Claim approved!' : 'Claim submitted'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{result.message}</p>
            </div>
            {isApproved ? (
              <div className="rounded-md bg-emerald-50 p-3 text-left text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <p className="font-semibold">Next steps:</p>
                <ol className="mt-1 space-y-0.5 list-decimal list-inside">
                  <li>Check your inbox at <strong>{claimantEmail}</strong></li>
                  <li>Click the &ldquo;Create my account&rdquo; button in the email</li>
                  <li>Set your password and access your listing dashboard</li>
                </ol>
                <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                  The link expires in 7 days.
                </p>
              </div>
            ) : (
              <div className="rounded-md bg-amber-50 p-3 text-left text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <p className="font-semibold">What happens next:</p>
                <ol className="mt-1 space-y-0.5 list-decimal list-inside">
                  <li>Our team reviews your claim (1-2 business days)</li>
                  <li>You&rsquo;ll receive an email with the result</li>
                  <li>If approved, the email contains a link to create your account</li>
                </ol>
              </div>
            )}
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Claim &ldquo;{tenantName}&rdquo;
          </DialogTitle>
          <DialogDescription>
            Verify your ownership to manage this business listing. We&rsquo;ll send an
            approval link to your business email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── Gate D: Anchor-based verification ─────────────────────────── */}
          {/* The strongest path: verify control of the listing's EXISTING
              phone/email. This is better than pasting a Google URL. */}
          {anchorsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking available verification methods...
            </div>
          ) : anchors && (anchors.phone?.available || anchors.email?.available) ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-3 dark:bg-emerald-950/20">
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Verify your business
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Verify control of this business&rsquo;s contact info for instant approval.
                </p>
              </div>

              {otpVerified ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  {otpChannel === 'phone' ? 'Phone' : 'Email'} verified — submit your claim below.
                </div>
              ) : (
                <>
                  {/* Anchor buttons */}
                  <div className="flex flex-col gap-2">
                    {anchors.phone?.available && !otpSent && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendAnchorOtp('phone')}
                        disabled={otpSending || otpChannel !== null}
                        className="gap-1.5 justify-start"
                      >
                        {otpSending && otpChannel === 'phone' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Phone className="h-3.5 w-3.5" />
                        )}
                        Send code to {anchors.phone.masked}
                      </Button>
                    )}
                    {anchors.email?.available && !otpSent && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendAnchorOtp('email')}
                        disabled={otpSending || otpChannel !== null}
                        className="gap-1.5 justify-start"
                      >
                        {otpSending && otpChannel === 'email' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Mail className="h-3.5 w-3.5" />
                        )}
                        Send code to {anchors.email.masked}
                      </Button>
                    )}
                  </div>

                  {/* OTP input */}
                  {otpSent && (
                    <div className="space-y-2">
                      <Label className="text-xs">
                        Enter the code sent to{' '}
                        {otpChannel === 'phone' ? anchors.phone?.masked : anchors.email?.masked}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="6-digit code"
                          maxLength={6}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={verifyAnchorOtp}
                          disabled={otpVerifying}
                          className="gap-1.5"
                        >
                          {otpVerifying ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <KeyRound className="h-3 w-3" />
                          )}
                          Verify
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}

          {/* ── Business Email (required) ─────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="claimant-email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Business email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="claimant-email"
              type="email"
              placeholder="owner@yourbusiness.com"
              value={claimantEmail}
              onChange={(e) => setClaimantEmail(e.target.value)}
              disabled={loading}
            />
            <p className="text-[11px] text-muted-foreground">
              We&rsquo;ll send the approval and registration link to this address. Use an
              email you check regularly.
            </p>
          </div>

          {/* ── Google Business Profile (via OAuth, NOT paste-URL) ────────── */}
          {/* Replaced the old paste-URL fields (gbpUrl + gbpName + gbpAddress → 80% string match → auto_approved)
              with the secure OAuth flow: Connect Google → OAuth → server-side match → evidence.
              The old approach trusted browser-submitted Google data (a security weakness).
              The new approach is server-authoritative: the server fetches Google data via OAuth + matches it. */}
          <div className="rounded-lg border border-border">
            <div className="flex items-center gap-2.5 p-3">
              <Globe className="h-4 w-4 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  Google Business Profile
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Connect your Google account to verify you manage this business
                </p>
              </div>
            </div>
            <div className="border-t border-border p-3 space-y-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full gap-1.5"
                disabled={loading}
                onClick={() => {
                  // Redirect to the Google OAuth flow with claim context.
                  // The OAuth callback will return to the verification view,
                  // where the user selects their Google location + the server
                  // matches it against this marketplace listing.
                  // The tenantId is passed via the state blob so the callback
                  // knows which business is being claimed.
                  window.location.href = `/api/oauth/googlebusiness/connect?claimTenantId=${tenantId}`;
                }}
              >
                <Globe className="h-3.5 w-3.5" /> Connect Google Business Profile
              </Button>
              <p className="text-[11px] text-muted-foreground">
                We&apos;ll check the businesses you manage on Google and match one to this listing.
                A strong match enables auto-approval (but claim completion is still required).
              </p>
            </div>
          </div>

          {/* ── OR divider ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* ── Manual verification fallback (NOT paste-URL) ─────────────── */}
          {/* Replaces the old document-upload section. The old approach accepted
              any Google URL + name + address → 80% match → auto_approved.
              The new approach sends the claim to UNDER_REVIEW for admin review. */}
          <div className="rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setShowGoogle((v) => !v)}
              className="flex w-full items-center justify-between p-3 text-left"
              disabled={loading}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Can&apos;t connect Google?
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Request manual verification
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {showGoogle ? 'Remove' : 'Add'}
              </span>
            </button>
            {showGoogle && (
              <div className="space-y-2 border-t border-border p-3">
                <p className="text-[11px] text-muted-foreground">
                  Submit a note describing your business ownership. An administrator will
                  review your request. This may take 1-2 business days.
                </p>
                <div>
                  <Label htmlFor="manual-note" className="text-xs">
                    Note for reviewer (optional)
                  </Label>
                  <Input
                    id="manual-note"
                    placeholder="e.g., I am the owner of this business but don't have a Google Business Profile"
                    value={gbpUrl}
                    onChange={(e) => setGbpUrl(e.target.value)}
                    disabled={loading}
                    className="mt-1"
                  />
                </div>
                <p className="text-[11px] text-amber-600">
                  Manual verification goes to admin review — it is NOT auto-approved.
                </p>
              </div>
            )}
          </div>

          {/* ── OR divider ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* ── Document Upload (optional, collapsible) ──────────────────── */}
          <div className="rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setShowDocs((v) => !v)}
              className="flex w-full items-center justify-between p-3 text-left"
              disabled={loading}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Upload documents
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Business license, utility bill, tax doc (admin review)
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {showDocs ? 'Remove' : 'Add'}
              </span>
            </button>
            {showDocs && (
              <div className="space-y-3 border-t border-border p-3">
                {/* File input */}
                <label
                  htmlFor="doc-upload"
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border p-6 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20',
                    uploading && 'pointer-events-none opacity-60',
                  )}
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  )}
                  <p className="mt-2 text-xs font-medium text-foreground">
                    {uploading ? 'Uploading...' : 'Click to upload'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    PDF, PNG, JPG, WebP, DOC — max 10MB each
                  </p>
                  <input
                    id="doc-upload"
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                    onChange={handleFileUpload}
                    className="sr-only"
                    disabled={uploading || loading}
                  />
                </label>

                {/* Uploaded files list */}
                {documents.length > 0 && (
                  <div className="space-y-1.5">
                    {documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                          {doc.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {(doc.size / 1024).toFixed(0)}KB
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDoc(idx)}
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          disabled={loading}
                          aria-label={`Remove ${doc.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Optional note */}
                <div>
                  <Label htmlFor="doc-note" className="text-xs">
                    Additional note (optional)
                  </Label>
                  <Textarea
                    id="doc-note"
                    placeholder="e.g. I'm the owner of Summit Roofing Co since 2015..."
                    value={docNote}
                    onChange={(e) => setDocNote(e.target.value)}
                    rows={2}
                    disabled={loading}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Error ─────────────────────────────────────────────────────── */}
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* ── Trust note ────────────────────────────────────────────────── */}
          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mb-1 inline h-3.5 w-3.5 text-emerald-600" />{' '}
            Your claim is reviewed against the business&rsquo;s existing records. False
            claims are subject to account termination.
          </div>

          {/* ── Submit ────────────────────────────────────────────────────── */}
          <Button
            onClick={submitClaim}
            disabled={loading || uploading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...
              </>
            ) : (
              'Submit claim'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
