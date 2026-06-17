'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Zap,
  Mail,
  Lock,
  User,
  Building2,
  CheckCircle2,
  Loader2,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/store/app-store';

interface ActivationPageProps {
  token: string;
  onAuthSuccess: (user: any, tenant: any) => void;
  onBackToLanding?: () => void;
}

interface ActivationInfo {
  valid: boolean;
  alreadyActivated?: boolean;
  expired?: boolean;
  customer?: {
    name: string;
    email?: string | null;
    phone: string;
  };
  company?: {
    tenantName: string | null;
    tenantSlug: string | null;
    industry: string | null;
    logo: string | null;
  };
  error?: string;
}

export function ActivationPage({ token, onAuthSuccess, onBackToLanding }: ActivationPageProps) {
  const [info, setInfo] = useState<ActivationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const setAuth = useAppStore((s) => s.setAuth);

  // Verify the token on mount
  useEffect(() => {
    let cancelled = false;
    async function verify() {
      try {
        const res = await fetch(`/api/auth/customer/activate?token=${encodeURIComponent(token)}&XTransformPort=3000`);
        const data = await res.json();
        if (!cancelled) {
          setInfo(data);
          if (data.valid && !data.alreadyActivated) {
            // Auto-focus password field
            setTimeout(() => {
              document.getElementById('activate-password')?.focus();
            }, 200);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setInfo({
            valid: false,
            error: 'Failed to verify activation link. Please try again.',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleActivate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password || !confirmPassword) {
        toast.error('Please fill in both password fields');
        return;
      }
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters long');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch('/api/auth/customer/activate?XTransformPort=3000', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Activation failed');
          return;
        }
        // Store auth and call success
        localStorage.setItem(
          'serviceos_auth',
          JSON.stringify({
            isAuthenticated: true,
            user: data.user,
            tenant: data.tenant || null,
            token: data.token,
            portalToken: data.portalToken,
            isCustomer: true,
          })
        );
        setAuth({
          isAuthenticated: true,
          user: data.user,
          tenant: data.tenant || null,
        });
        toast.success('Your portal account is now active!');
        // Small delay so the success screen shows before navigation
        setTimeout(() => {
          onAuthSuccess(data.user, data.tenant);
        }, 1500);
      } catch {
        toast.error('Activation failed. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [token, password, confirmPassword, onAuthSuccess, setAuth]
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-teal-500 mx-auto" />
          <p className="text-slate-600 font-medium">Verifying your activation link…</p>
        </div>
      </div>
    );
  }

  // Invalid / expired token
  if (!info || !info.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-rose-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-rose-100 p-8 text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-rose-50 border-2 border-rose-200 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {info?.expired ? 'Link Expired' : 'Invalid Activation Link'}
          </h1>
          <p className="text-slate-600 text-sm">
            {info?.error ||
              'This activation link is invalid or has expired. Please ask your service provider to send a new invitation.'}
          </p>
          {onBackToLanding && (
            <Button
              type="button"
              onClick={onBackToLanding}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              Go to Home
            </Button>
          )}
        </motion.div>
      </div>
    );
  }

  // Already activated — show success and CTA to login
  if (info.alreadyActivated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-emerald-100 p-8 text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Account Already Active</h1>
          <p className="text-slate-600 text-sm">
            Your portal account is already activated. Please sign in with your email/phone and password.
          </p>
          {onBackToLanding && (
            <Button
              type="button"
              onClick={onBackToLanding}
              className="bg-teal-600 hover:bg-teal-700 text-white w-full"
            >
              Go to Sign In
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </motion.div>
      </div>
    );
  }

  // Active activation form
  const customerName = info.customer?.name || 'there';
  const companyName = info.company?.tenantName || 'your service provider';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50 to-emerald-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200">
            <Zap className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">
            ServiceOS
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header banner */}
          <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="w-16 h-16 rounded-full bg-white/20 backdrop-blur border-2 border-white/30 flex items-center justify-center mx-auto mb-3"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-xl font-bold text-white">
              Welcome to your Customer Portal
            </h1>
            <p className="text-teal-50 text-sm mt-1">
              {companyName} has invited you to access your account
            </p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Greeting */}
            <div className="text-center">
              <p className="text-slate-700">
                Hi <span className="font-semibold">{customerName}</span>! 👋
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Set a password to activate your portal account. You&apos;ll use this
                with your email or phone to sign in.
              </p>
            </div>

            {/* Account info card */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-slate-500">Company:</span>
                <span className="font-medium text-slate-900 truncate">{companyName}</span>
              </div>
              {info.customer?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-900 truncate">{info.customer.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-slate-500">Name:</span>
                <span className="font-medium text-slate-900">{customerName}</span>
              </div>
            </div>

            {/* Set password form */}
            <form onSubmit={handleActivate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="activate-password" className="text-slate-700">
                  Set Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="activate-password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-teal-500 focus-visible:ring-teal-500/20"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
                {password && password.length < 8 && (
                  <p className="text-xs text-amber-600">Password must be at least 8 characters</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="activate-confirm" className="text-slate-700">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="activate-confirm"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-teal-500 focus-visible:ring-teal-500/20"
                    autoComplete="new-password"
                    required
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-rose-600">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={submitting || password.length < 8 || password !== confirmPassword}
                className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-medium cursor-pointer text-base"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Activating…</>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 mr-1.5" />
                    Activate My Account
                  </>
                )}
              </Button>
            </form>

            {/* Security note */}
            <div className="flex items-start gap-2 rounded-lg bg-teal-50 border border-teal-100 p-3">
              <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-teal-700">
                Your password is encrypted and stored securely. Never share it with anyone —
                including {companyName} staff.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          By activating your account, you agree to ServiceOS&apos;s{' '}
          <span className="underline cursor-pointer hover:text-slate-500">Terms of Service</span>
          {' '}and{' '}
          <span className="underline cursor-pointer hover:text-slate-500">Privacy Policy</span>
        </p>
      </motion.div>
    </div>
  );
}
