'use client';

import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { setToken } from '@/lib/client-auth';
import { CompanyAuthRole, ROLE_CONFIG } from './company-auth-card';

export interface CompanyLoginFormProps {
  slug: string;
  role: CompanyAuthRole;
  companyName: string;
  /** Called after a successful login (before the page reloads). */
  onSuccess?: (user: any, tenant: any) => void;
  /** Optional: pre-fill email (e.g. from query string). */
  defaultEmail?: string;
  /** Optional: hide the "Forgot password?" toggle. */
  hideForgotPassword?: boolean;
}

type Mode = 'login' | 'reset';

const API_SUFFIX = '?XTransformPort=3000';

export function CompanyLoginForm({
  slug,
  role,
  companyName,
  onSuccess,
  defaultEmail = '',
  hideForgotPassword,
}: CompanyLoginFormProps) {
  const cfg = ROLE_CONFIG[role];
  const setAuth = useAppStore((s) => s.setAuth);

  const [mode, setMode] = useState<Mode>('login');

  // Login form state
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset-request state
  const [resetEmail, setResetEmail] = useState(defaultEmail);
  const [resetSent, setResetSent] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/auth/company-login${API_SUFFIX}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          email: email.trim(),
          password,
          role,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          data?.error || 'Login failed. Please check your credentials.';
        setError(message);
        toast.error(message);
        return;
      }

      // Persist auth to localStorage (same shape as existing auth-page.tsx)
      if (typeof window !== 'undefined') {
        const existingAuth = localStorage.getItem('serviceos_auth');
        const existingData = existingAuth ? safeParse(existingAuth) : {};
        const token = data.token ?? existingData.token ?? undefined;
        localStorage.setItem(
          'serviceos_auth',
          JSON.stringify({
            isAuthenticated: true,
            user: data.user,
            tenant: data.tenant || null,
            token,
            isCustomer: role === 'customer' || existingData.isCustomer === true,
            portalToken: existingData.portalToken,
          })
        );
        // Also save to the dedicated token key so authFetch() can find it
        if (token) {
          setToken(token);
        }
      }

      // Update Zustand store so any mounted listeners pick it up immediately
      setAuth({
        isAuthenticated: true,
        user: data.user,
        tenant: data.tenant || null,
      });

      toast.success(`Welcome${data.user?.name ? `, ${data.user.name}` : ''}!`);

      onSuccess?.(data.user, data.tenant);

      // Let the main app take over (AppLayout / portal layouts are at `/`)
      if (typeof window !== 'undefined') {
        // Slight delay so the toast is visible before the page reloads
        setTimeout(() => {
          window.location.href = '/';
        }, 250);
      }
    } catch (err) {
      console.error('[CompanyLoginForm] login error', err);
      const message = 'Something went wrong. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRequest = async (e: FormEvent) => {
    e.preventDefault();
    setResetSent(false);

    if (!resetEmail.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    setIsResetLoading(true);
    try {
      const res = await fetch(`/api/auth/request-reset${API_SUFFIX}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim(), slug }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data?.error || 'Failed to send reset link.');
        return;
      }

      setResetSent(true);
      toast.success('Reset link sent', {
        description:
          'If an account exists for that email, a reset link has been sent.',
      });

      // In dev mode, the API returns the URL directly — show it as a hint.
      if (data.resetUrl && typeof window !== 'undefined') {
        // Don't navigate automatically; let the user click through.
        console.info('[reset url]', data.resetUrl);
      }
    } catch (err) {
      console.error('[CompanyLoginForm] reset error', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsResetLoading(false);
    }
  };

  // ─── Render: Reset request mode ──────────────────────────────────────────
  if (mode === 'reset') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="reset"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.25 } }}
          exit={{ opacity: 0, x: -12 }}
          className="space-y-4"
        >
          <div className="space-y-1 text-center">
            <h3 className="text-base font-semibold text-foreground flex items-center justify-center gap-1.5">
              <KeyRound className={cn('size-4', cfg.accentText)} />
              Reset your password
            </h3>
            <p className="text-xs text-muted-foreground">
              Enter the email linked to your {companyName} account. We&apos;ll
              send a reset link.
            </p>
          </div>

          {resetSent ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 p-3 flex items-start gap-2.5">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
                <p className="font-medium">Check your inbox</p>
                <p className="text-emerald-700 dark:text-emerald-300">
                  If an account exists for{' '}
                  <span className="font-medium">{resetEmail}</span>, a reset
                  link is on its way. The link expires in 24 hours.
                </p>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleResetRequest} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email" className="text-xs font-medium">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="pl-9 h-10"
                  disabled={isResetLoading || resetSent}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isResetLoading || resetSent}
              className={cn(
                'w-full h-10',
                role === 'admin' && 'bg-emerald-600 hover:bg-emerald-700 text-white',
                role === 'employee' && 'bg-amber-600 hover:bg-amber-700 text-white',
                role === 'customer' && 'bg-teal-600 hover:bg-teal-700 text-white'
              )}
            >
              {isResetLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending link…
                </>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode('login');
              setResetSent(false);
              setError(null);
            }}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="size-3.5" />
            Back to sign in
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── Render: Login mode ──────────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="login"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0, transition: { duration: 0.25 } }}
        exit={{ opacity: 0, x: 12 }}
        className="space-y-4"
      >
        {/* Error banner */}
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

        <form onSubmit={handleLogin} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium">
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-10"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-10 h-10"
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
          </div>

          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="remember-me"
              className="inline-flex items-center gap-2 cursor-pointer select-none"
            >
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(v) => setRememberMe(v === true)}
                className="size-4"
              />
              <span className="text-xs text-muted-foreground">Remember me</span>
            </label>

            {!hideForgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setMode('reset');
                  setResetEmail(email);
                  setError(null);
                }}
                className={cn(
                  'text-xs font-medium hover:underline underline-offset-2 transition-colors',
                  cfg.accentText
                )}
              >
                Forgot password?
              </button>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full h-10',
              role === 'admin' && 'bg-emerald-600 hover:bg-emerald-700 text-white',
              role === 'employee' && 'bg-amber-600 hover:bg-amber-700 text-white',
              role === 'customer' && 'bg-teal-600 hover:bg-teal-700 text-white'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        <div className="relative">
          <Separator className="my-1" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="bg-card px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Or continue as
            </span>
          </span>
        </div>

        {/* Role switcher: links to the other two role-specific login pages */}
        <RoleSwitchLinks slug={slug} currentRole={role} />
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Role switch links ──────────────────────────────────────────────────────
function RoleSwitchLinks({
  slug,
  currentRole,
}: {
  slug: string;
  currentRole: CompanyAuthRole;
}) {
  const others: Array<{ role: CompanyAuthRole; href: string; label: string }> = [
    { role: 'admin', href: `/${slug}/login`, label: 'Admin' },
    { role: 'employee', href: `/${slug}/employee`, label: 'Employee' },
    { role: 'customer', href: `/${slug}/customer`, label: 'Customer' },
  ].filter((o) => o.role !== currentRole) as typeof others;

  return (
    <div className="grid grid-cols-2 gap-2">
      {others.map((o) => {
        const cfg = ROLE_CONFIG[o.role];
        return (
          <a
            key={o.role}
            href={o.href}
            className={cn(
              'flex items-center justify-center gap-1.5 h-9 rounded-md border text-xs font-medium transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              cfg.badgeClass
            )}
          >
            {o.label} login
          </a>
        );
      })}
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────
function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return {};
  }
}
