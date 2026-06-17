'use client';

import { useState, FormEvent, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface AcceptInviteInvitation {
  email: string;
  name?: string | null;
  role: string;
  tenantName?: string | null;
  tenantSlug?: string | null;
  tenantLogo?: string | null;
  isCustomer?: boolean;
}

export interface AcceptInviteFormProps {
  token: string;
  invitation: AcceptInviteInvitation;
  mode: 'activate' | 'reset';
  /** Slug resolved from the URL (used to build the "Continue to login" link). */
  slug: string;
  /** Called after a successful accept (before the success-screen CTA is shown). */
  onSuccess?: (user: any, tenant: any) => void;
}

type Strength = 'weak' | 'fair' | 'good' | 'strong';

const API_SUFFIX = '?XTransformPort=3000';

// ─── Password strength scoring ───────────────────────────────────────────────
function scorePassword(pw: string): { score: number; strength: Strength } {
  if (!pw) return { score: 0, strength: 'weak' };

  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;

  // Map 0..5 → weak/fair/good/strong
  let strength: Strength = 'weak';
  if (score >= 4) strength = 'strong';
  else if (score >= 3) strength = 'good';
  else if (score >= 2) strength = 'fair';

  // Cap score for the progress bar at 4 segments
  return { score: Math.min(score, 4), strength };
}

const STRENGTH_META: Record<
  Strength,
  { label: string; barClass: string; textClass: string }
> = {
  weak: {
    label: 'Weak',
    barClass: 'bg-red-500',
    textClass: 'text-red-600 dark:text-red-400',
  },
  fair: {
    label: 'Fair',
    barClass: 'bg-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  good: {
    label: 'Good',
    barClass: 'bg-teal-500',
    textClass: 'text-teal-600 dark:text-teal-400',
  },
  strong: {
    label: 'Strong',
    barClass: 'bg-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
};

export function AcceptInviteForm({
  token,
  invitation,
  mode,
  slug,
  onSuccess,
}: AcceptInviteFormProps) {
  const isReset = mode === 'reset';
  const isCustomer = invitation.isCustomer || invitation.role === 'customer';
  const isEmployee = invitation.role === 'employee';

  // Resolve which login page to send the user to after success.
  const postAcceptHref = isCustomer
    ? `/${slug}/customer`
    : isEmployee
      ? `/${slug}/employee`
      : `/${slug}/login`;

  const [fullName, setFullName] = useState(invitation.name ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const pwScore = useMemo(() => scorePassword(password), [password]);
  const matchError =
    confirmPassword.length > 0 && password !== confirmPassword;
  const tooShort = password.length > 0 && password.length < 8;
  const canSubmit =
    fullName.trim().length > 0 &&
    password.length >= 8 &&
    password === confirmPassword &&
    !isLoading;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/invitations/accept${API_SUFFIX}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: fullName.trim(),
          password,
          phone: phone.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          data?.error || 'Failed to set password. Please try again.';
        setError(message);
        toast.error(message);
        return;
      }

      // Persist auth: the API also sets the serviceos_session cookie, so the
      // user could go straight to `/` and the layout would pick it up. We
      // also mirror the auth object to localStorage for parity with the
      // existing auth flow.
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'serviceos_auth',
          JSON.stringify({
            isAuthenticated: true,
            user: data.user,
            tenant: data.tenant || null,
            isCustomer,
          })
        );
      }

      toast.success(
        isReset ? 'Password updated successfully!' : 'Account activated!'
      );
      onSuccess?.(data.user, data.tenant);
      setDone(true);
    } catch (err) {
      console.error('[AcceptInviteForm] error', err);
      const message = 'Something went wrong. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Success screen ──────────────────────────────────────────────────────
  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-5 py-2"
      >
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-700"
        >
          <CheckCircle2 className="size-9 text-emerald-600 dark:text-emerald-400" />
        </motion.div>

        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">
            {isReset ? 'Your password has been reset' : 'Your account is active'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isReset
              ? 'You can now sign in with your new password.'
              : `Welcome${invitation.name ? `, ${invitation.name}` : ''}! You can now sign in to your account.`}
          </p>
        </div>

        <div className="space-y-2">
          <Button asChild className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link href={postAcceptHref}>Continue to login</Link>
          </Button>
          <Button asChild variant="outline" className="w-full h-10">
            <Link href="/">Go to home</Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  // ─── Form ────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="form"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0, transition: { duration: 0.25 } }}
        exit={{ opacity: 0, x: 10 }}
        className="space-y-4"
      >
        <div className="rounded-md border border-muted bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between gap-2">
          <span className="truncate">
            Account:{' '}
            <span className="font-medium text-foreground">
              {invitation.email}
            </span>
          </span>
          {invitation.tenantName ? (
            <span className="truncate text-right">
              {invitation.tenantName}
            </span>
          ) : null}
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-3 flex items-start gap-2.5"
          >
            <AlertCircle className="size-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed">
              {error}
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor="ai-name" className="text-xs font-medium">
              Full name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="ai-name"
                type="text"
                autoComplete="name"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-9 h-10"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="ai-password" className="text-xs font-medium">
              {isReset ? 'New password' : 'Create a password'}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="ai-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isReset ? 'new-password' : 'new-password'}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  'pl-9 pr-10 h-10',
                  tooShort &&
                    'border-red-400 focus-visible:border-red-400 focus-visible:ring-red-400/30'
                )}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>

            {/* Strength meter */}
            <PasswordStrengthMeter strength={pwScore.strength} score={pwScore.score} />

            {tooShort ? (
              <p className="text-[11px] text-red-600 dark:text-red-400">
                Password must be at least 8 characters.
              </p>
            ) : null}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="ai-confirm" className="text-xs font-medium">
              Confirm password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="ai-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(
                  'pl-9 pr-10 h-10',
                  matchError &&
                    'border-red-400 focus-visible:border-red-400 focus-visible:ring-red-400/30'
                )}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirm ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {matchError ? (
              <p className="text-[11px] text-red-600 dark:text-red-400">
                Passwords do not match.
              </p>
            ) : null}
          </div>

          {/* Phone (optional) */}
          <div className="space-y-1.5">
            <Label
              htmlFor="ai-phone"
              className="text-xs font-medium text-muted-foreground"
            >
              Phone <span className="text-[10px]">(optional)</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="ai-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1 555 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-9 h-10"
                disabled={isLoading}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isReset ? 'Resetting…' : 'Activating…'}
              </>
            ) : isReset ? (
              <>
                <KeyRound className="size-4" />
                Reset password
              </>
            ) : (
              'Activate account'
            )}
          </Button>
        </form>

        <div className="pt-1 flex justify-center">
          <Link
            href={`/${slug}/login`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to login
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Password strength meter (sub-component) ────────────────────────────────
function PasswordStrengthMeter({
  strength,
  score,
}: {
  strength: Strength;
  score: number;
}) {
  if (score === 0) return null;
  const meta = STRENGTH_META[strength];

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-4 gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 rounded-full transition-colors',
              i < score ? meta.barClass : 'bg-muted'
            )}
          />
        ))}
      </div>
      <p className={cn('text-[11px] font-medium', meta.textClass)}>
        Password strength: {meta.label}
      </p>
    </div>
  );
}
