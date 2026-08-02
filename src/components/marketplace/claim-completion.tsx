'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Store,
  Lock,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';

/**
 * ClaimCompletion
 * ----------------
 * Shown when a user navigates to `/?claim=complete&token=<token>` from the
 * approval email. Handles two paths:
 *
 *   Path A (anonymous): "Create your account" form — name + password.
 *     The email is locked to the claimantEmail from the claim record.
 *     On submit → POST /api/marketplace/claim/complete → creates user, sets
 *     cookie, redirects to listing dashboard.
 *
 *   Path B (already logged in): "Confirm claim" button.
 *     On submit → POST /api/marketplace/claim/complete → attaches business
 *     to existing user's account, redirects to listing dashboard.
 *
 * Error states:
 *   - Invalid/expired token → red error card with "contact support" CTA
 *   - Email already exists (Path A) → tell user to sign in first
 *   - Already completed → "This claim has already been completed"
 */
interface ClaimCompletionProps {
  token: string;
}

interface ClaimInfo {
  valid: boolean;
  businessName?: string;
  email?: string;
  status?: string;
  requiresAuth?: boolean;
  error?: string;
}

export function ClaimCompletion({ token }: ClaimCompletionProps) {
  const [loading, setLoading] = React.useState(true);
  const [info, setInfo] = React.useState<ClaimInfo | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [name, setName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  const setAuth = useAppStore((s) => s.setAuth);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  // ── Validate token on mount ─────────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false;
    async function validate() {
      try {
        const res = await fetch(
          `/api/marketplace/claim/complete?XTransformPort=3000&token=${encodeURIComponent(token)}`,
        );
        const data = await res.json();
        if (!cancelled) {
          setInfo(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setInfo({ valid: false, error: 'Network error — please try again' });
          setLoading(false);
        }
      }
    }
    validate();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ── Submit handler ──────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!info?.valid) return;

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { token };
      // If the user needs to create an account, include name + password
      if (info.requiresAuth) {
        if (!name.trim()) {
          toast.error('Please enter your name');
          setSubmitting(false);
          return;
        }
        if (password.length < 8) {
          toast.error('Password must be at least 8 characters');
          setSubmitting(false);
          return;
        }
        payload.name = name.trim();
        payload.password = password;
      }

      const res = await fetch('/api/marketplace/claim/complete?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.needsLogin) {
          toast.error(data.error);
          // Redirect to login with returnUrl back to this claim completion
          const returnUrl = encodeURIComponent(
            typeof window !== 'undefined' ? window.location.href : '/',
          );
          setTimeout(() => {
            window.location.href = `/?auth=login&returnUrl=${returnUrl}`;
          }, 1500);
        } else {
          toast.error(data.error || 'Failed to complete claim');
        }
        setSubmitting(false);
        return;
      }

      // Success — hydrate auth state and redirect to listing dashboard
      toast.success('Claim completed! Redirecting to your dashboard...');

      if (info.requiresAuth && data.token) {
        // New user — set auth from the response
        setAuth({
          isAuthenticated: true,
          user: data.user,
          tenant: data.tenant,
        });
      }
      // If the user was already logged in (Path B), their auth state is already
      // in the store — we just need to update the tenantId on their user object.

      // Redirect to the listing dashboard after a short delay
      setTimeout(() => {
        setCurrentView('marketplaceDashboard');
        // Clean the URL
        window.history.replaceState({}, '', '/');
      }, 1200);
    } catch {
      toast.error('Network error — please try again');
      setSubmitting(false);
    }
  }

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-3 text-sm text-muted-foreground">Verifying your claim link...</p>
        </div>
      </div>
    );
  }

  // ── Invalid token state ─────────────────────────────────────────────────
  if (!info?.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Link invalid</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {info?.error || 'This claim link is invalid or has expired.'}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            If you believe this is an error, please contact our support team and mention
            your claim reference ID.
          </p>
          <Link href="/marketplace">
            <Button variant="outline" className="w-full">
              Browse marketplace
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Valid token — show form ─────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 px-4 dark:from-emerald-950/20 dark:to-teal-950/20">
      <div className="w-full max-w-md space-y-5 rounded-xl border border-border bg-card p-6 shadow-lg sm:p-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-xl font-bold text-foreground">
            Claim approved!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You&rsquo;re now the verified owner of{' '}
            <strong className="text-foreground">{info.businessName}</strong>.
          </p>
        </div>

        {/* Success notice */}
        <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/40">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          <p className="text-xs text-emerald-800 dark:text-emerald-200">
            Your ownership has been verified. Complete the step below to access your
            listing dashboard.
          </p>
        </div>

        {info.requiresAuth ? (
          // ── Path A: Create account form ──────────────────────────────────
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="claim-name" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Your name
              </Label>
              <Input
                id="claim-name"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim-email" className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Email
              </Label>
              <Input
                id="claim-email"
                type="email"
                value={info.email || ''}
                disabled
                className="bg-muted/50"
              />
              <p className="text-[11px] text-muted-foreground">
                Locked to your verified business email. This will be your login.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim-password" className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Create password
              </Label>
              <div className="relative">
                <Input
                  id="claim-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Use 8+ characters with a mix of letters, numbers, and symbols.
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating account...
                </>
              ) : (
                'Create account & claim business'
              )}
            </Button>
          </div>
        ) : (
          // ── Path B: Already logged in — confirm ──────────────────────────
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Business email</p>
              <p className="text-sm font-medium text-foreground">{info.email}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              You&rsquo;re signed in. Click below to attach this business to your account
              and access its listing dashboard.
            </p>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Claiming...
                </>
              ) : (
                'Confirm & claim business'
              )}
            </Button>
          </div>
        )}

        {/* Trust footer */}
        <div className="flex items-center justify-center gap-1.5 border-t border-border pt-4 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-emerald-600" />
          <span>Secured by Fieseros — your information is encrypted</span>
        </div>
      </div>
    </div>
  );
}
