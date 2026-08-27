'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Mail,
  ArrowLeft,
  ArrowRight,
  Building2,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { setToken } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

/** One selectable company in the 409 multi-company conflict response. */
interface CompanyChoice {
  customerId: string;
  customerName?: string | null;
  tenantId: string;
  tenantName?: string | null;
  tenantSlug?: string | null;
  workspaceName?: string | null;
  industry?: string | null;
  logo?: string | null;
}

/** The full 409 response body from POST /api/auth/customer/verify-otp. */
interface MultiCompanyConflict {
  error?: string;
  multiCompany: boolean;
  companies: CompanyChoice[];
}

type Step = 'email' | 'otp' | 'picker';

// ─── Helpers ────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mask an email for display: "jo***@example.com".
 * Mirrors the backend's `maskEmail` helper (Task 1-a) so the OTP step shows
 * the same masked address the server returned, with a client-side fallback.
 */
function maskEmail(email: string): string {
  if (!email) return '';
  const at = email.indexOf('@');
  if (at < 2) return email;
  const head = email.slice(0, 2);
  const domain = email.slice(at + 1);
  return `${head}***@${domain}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * CustomerEmailOtpLogin
 * ---------------------
 * Cross-tenant customer sign-in for the PWA — mirrors the mobile app's email
 * OTP flow (Task 2-b) but as a standalone Next.js page.
 *
 * Three internal steps driven by the `step` state:
 *   1. 'email'  → enter email, POST send-otp, move to step 2 on success
 *   2. 'otp'    → enter 6-digit code, POST verify-otp:
 *                  • 200 → handleLoginSuccess → redirect to '/'
 *                  • 404 → friendly "ask your provider" error
 *                  • 409 → store conflict, move to step 3
 *                  • 400 → inline "invalid/expired OTP" error
 *   3. 'picker' → list companies from the 409 body, re-POST verify-otp with
 *                  the chosen tenantId, on 200 → handleLoginSuccess
 *
 * All API requests use relative paths + `?XTransformPort=3000` (gateway) and
 * `credentials: 'include'` so the HTTP-only auth cookie is set.
 */
export function CustomerEmailOtpLogin() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [multiCompanyConflict, setMultiCompanyConflict] =
    useState<MultiCompanyConflict | null>(null);
  // tenantId of the company currently being picked (for per-card loading state)
  const [pickingTenantId, setPickingTenantId] = useState<string | null>(null);

  // ── Shared success handler (mirrors the magic-link flow in ──────────────
  //    src/components/home/home-page-client.tsx lines ~225-253) ────────────
  function handleLoginSuccess(data: {
    user: any;
    tenant: any;
    token: string;
    portalToken?: string;
  }) {
    // 1. Set the PWA app store auth state
    useAppStore.getState().setAuth({
      isAuthenticated: true,
      user: data.user,
      tenant: data.tenant || null,
    });
    // 2. Persist to localStorage (mirror magic-link shape) so a refresh keeps
    //    the session and home-page-client renders CustomerPortalLayout.
    try {
      localStorage.setItem(
        'fieseros_auth',
        JSON.stringify({
          isAuthenticated: true,
          user: data.user,
          tenant: data.tenant || null,
          token: data.token,
          isCustomer: true,
        })
      );
    } catch {
      // localStorage unavailable (private mode) — non-fatal; the in-memory
      // store + the HTTP-only cookie are enough for this session.
    }
    // 3. Also set the token in client-auth (some code paths read this)
    setToken(data.token);
    // 4. Redirect to homepage — home-page-client will render CustomerPortalLayout
    router.replace('/');
  }

  // ── Step 1: send OTP ────────────────────────────────────────────────────
  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setError('Please enter your email address.');
      return;
    }
    if (!EMAIL_REGEX.test(normalized)) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(
        '/api/auth/customer/send-otp?XTransformPort=3000',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: normalized }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data && (data.error as string)) ||
            'Could not send verification code. Please try again.'
        );
        return;
      }
      // Backend returns maskedEmail; fall back to client-side mask if absent.
      const masked = (data && (data.email as string)) || maskEmail(normalized);
      setMaskedEmail(masked);
      setEmail(normalized);
      setOtpCode('');
      setStep('otp');
      toast.success('Verification code sent', {
        description: `Check your inbox at ${masked}.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Resend code (Step 2 secondary action) ───────────────────────────────
  async function handleResend() {
    if (isResending || isLoading) return;
    try {
      setIsResending(true);
      setError(null);
      const res = await fetch(
        '/api/auth/customer/send-otp?XTransformPort=3000',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data && (data.error as string)) ||
            'Could not resend the code. Please try again.'
        );
        return;
      }
      const masked = (data && (data.email as string)) || maskedEmail;
      toast.success('Code resent', {
        description: `A new code was sent to ${masked}.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsResending(false);
    }
  }

  // ── Step 2: verify OTP ──────────────────────────────────────────────────
  async function handleVerifyOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(
        '/api/auth/customer/verify-otp?XTransformPort=3000',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, otpCode }),
        }
      );
      const data = await res.json().catch(() => ({}));
      // Multi-company conflict → step 3 picker
      if (res.status === 409 && data && data.multiCompany) {
        setMultiCompanyConflict(data as MultiCompanyConflict);
        setStep('picker');
        return;
      }
      if (!res.ok) {
        // 404 = no account; backend returns a friendly "ask your provider"
        // message. 400 = invalid/expired OTP. Either way, surface inline.
        setError(
          (data && (data.error as string)) ||
            'Verification failed. Please try again.'
        );
        return;
      }
      toast.success('Signed in', {
        description: 'Welcome back to your customer portal.',
      });
      handleLoginSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Step 3: re-verify with the selected tenantId ────────────────────────
  async function handlePickCompany(company: CompanyChoice) {
    if (pickingTenantId || isLoading) return;
    try {
      setPickingTenantId(company.tenantId);
      setError(null);
      const res = await fetch(
        '/api/auth/customer/verify-otp?XTransformPort=3000',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email,
            otpCode,
            tenantId: company.tenantId,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data && (data.error as string)) ||
            'Could not sign in to this provider. Please try again.'
        );
        return;
      }
      toast.success('Signed in', {
        description: `Welcome to ${
          company.tenantName || company.workspaceName || 'your provider'
        }.`,
      });
      handleLoginSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setPickingTenantId(null);
    }
  }

  function backToEmail() {
    setStep('email');
    setError(null);
    setOtpCode('');
    setMultiCompanyConflict(null);
    setPickingTenantId(null);
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 py-10 sm:py-16 bg-gradient-to-b from-teal-50 via-background to-cyan-100/40 dark:from-teal-950/30 dark:via-background dark:to-cyan-950/20">
      <div className="w-full max-w-md">
        <BrandHeader />

        {step === 'email' && (
          <EmailStep
            email={email}
            setEmail={setEmail}
            isLoading={isLoading}
            error={error}
            onSubmit={handleSendOtp}
          />
        )}

        {step === 'otp' && (
          <OtpStep
            maskedEmail={maskedEmail}
            otpCode={otpCode}
            setOtpCode={setOtpCode}
            isLoading={isLoading}
            isResending={isResending}
            error={error}
            onSubmit={handleVerifyOtp}
            onResend={handleResend}
            onBack={backToEmail}
          />
        )}

        {step === 'picker' && multiCompanyConflict && (
          <PickerStep
            conflict={multiCompanyConflict}
            pickingTenantId={pickingTenantId}
            error={error}
            onPick={handlePickCompany}
            onBack={backToEmail}
          />
        )}

        {/* Powered by footer (outside the card) */}
        <p className="mt-6 text-center text-[11px] text-muted-foreground/80">
          Powered by{' '}
          <Link
            href="/"
            className="font-medium text-foreground hover:underline underline-offset-2"
          >
            Fieseros
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function BrandHeader() {
  return (
    <div className="flex flex-col items-center text-center gap-2 mb-6">
      <div className="flex items-center gap-2.5">
        <div
          className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-sm"
          aria-hidden
        >
          <span className="text-xl font-bold tracking-tight">F</span>
        </div>
        <span className="text-2xl font-bold tracking-tight text-foreground">
          Fieseros
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        The Operating System for Service Businesses
      </p>
    </div>
  );
}

function ErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
    >
      <AlertCircle className="size-4 shrink-0 mt-0.5" />
      <span className="min-w-0 flex-1">{error}</span>
    </div>
  );
}

function EmailStep({
  email,
  setEmail,
  isLoading,
  error,
  onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  isLoading: boolean;
  error: string | null;
  onSubmit: (e?: React.FormEvent) => void;
}) {
  return (
    <Card className="border-t-4 border-teal-500 shadow-xl shadow-black/5 rounded-2xl">
      <CardHeader className="space-y-1.5 px-6 pt-6">
        <CardTitle className="text-xl">Customer sign in</CardTitle>
        <CardDescription className="text-sm">
          Enter the email your service provider used to invite you. We&apos;ll
          send a verification code.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="customer-email" className="text-sm font-medium">
              Email address
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="customer-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-11 pl-9"
                aria-invalid={!!error}
              />
            </div>
          </div>

          <ErrorBanner error={error} />

          <Button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="h-11 w-full bg-teal-600 text-white shadow-sm hover:bg-teal-700 disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending code…
              </>
            ) : (
              <>
                Send verification code
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>

        <div className="pt-1 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to home
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function OtpStep({
  maskedEmail,
  otpCode,
  setOtpCode,
  isLoading,
  isResending,
  error,
  onSubmit,
  onResend,
  onBack,
}: {
  maskedEmail: string;
  otpCode: string;
  setOtpCode: (v: string) => void;
  isLoading: boolean;
  isResending: boolean;
  error: string | null;
  onSubmit: (e?: React.FormEvent) => void;
  onResend: () => void;
  onBack: () => void;
}) {
  return (
    <Card className="border-t-4 border-teal-500 shadow-xl shadow-black/5 rounded-2xl">
      <CardHeader className="space-y-1.5 px-6 pt-6">
        <CardTitle className="text-xl">Check your email</CardTitle>
        <CardDescription className="text-sm">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-foreground">{maskedEmail}</span>.
          Enter it below.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="customer-otp" className="text-sm font-medium">
              Verification code
            </Label>
            <Input
              id="customer-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="123456"
              value={otpCode}
              onChange={(e) => {
                // Strip non-digits, cap at 6 — the OTP is always a 6-digit code.
                const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                setOtpCode(v);
              }}
              disabled={isLoading}
              className="h-14 text-center text-2xl font-semibold tracking-[0.5em] pl-3"
              aria-invalid={!!error}
              autoFocus
            />
          </div>

          <ErrorBanner error={error} />

          <Button
            type="submit"
            disabled={isLoading || otpCode.length !== 6}
            className="h-11 w-full bg-teal-600 text-white shadow-sm hover:bg-teal-700 disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Verify &amp; sign in
              </>
            )}
          </Button>
        </form>

        <div className="flex flex-col items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onResend}
            disabled={isResending || isLoading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-800 disabled:opacity-50 dark:text-teal-300 dark:hover:text-teal-200 transition-colors"
          >
            {isResending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Resending…
              </>
            ) : (
              <>Resend code</>
            )}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Use a different email
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function PickerStep({
  conflict,
  pickingTenantId,
  error,
  onPick,
  onBack,
}: {
  conflict: MultiCompanyConflict;
  pickingTenantId: string | null;
  error: string | null;
  onPick: (c: CompanyChoice) => void;
  onBack: () => void;
}) {
  const companies = Array.isArray(conflict.companies) ? conflict.companies : [];
  return (
    <Card className="border-t-4 border-teal-500 shadow-xl shadow-black/5 rounded-2xl">
      <CardHeader className="space-y-1.5 px-6 pt-6">
        <CardTitle className="text-xl">Select your service provider</CardTitle>
        <CardDescription className="text-sm">
          Your email is linked to multiple companies. Choose which one you want
          to access.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">
        <ErrorBanner error={error} />

        <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
          {companies.map((c) => {
            const name =
              c.tenantName || c.workspaceName || 'Your service provider';
            const isPicking = pickingTenantId === c.tenantId;
            const isDisabled = !!pickingTenantId && !isPicking;
            return (
              <button
                key={c.tenantId}
                type="button"
                onClick={() => onPick(c)}
                disabled={isDisabled || isPicking}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all',
                  'hover:border-teal-400 hover:bg-teal-50/50 hover:shadow-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  'dark:hover:border-teal-700 dark:hover:bg-teal-950/30'
                )}
              >
                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-sm">
                  {c.logo ? (
                    <img
                      src={c.logo}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <Building2 className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {name}
                  </p>
                  {c.industry ? (
                    <p className="truncate text-xs capitalize text-muted-foreground">
                      {c.industry}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-teal-600 dark:text-teal-400">
                  {isPicking ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-1 flex justify-center">
          <button
            type="button"
            onClick={onBack}
            disabled={!!pickingTenantId}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Use a different email
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default CustomerEmailOtpLogin;
