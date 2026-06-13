'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Zap,
  Lock,
  User,
  Phone,
  ChevronRight,
  Loader2,
  ShieldCheck,
  AlertCircle,
  PartyPopper,
  Eye,
  EyeOff,
  Building2,
  Briefcase,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { authFetch } from '@/lib/client-auth';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AcceptInvitationProps {
  token: string;
  onAuthSuccess: (user: any, tenant?: any) => void;
  onBackToLanding?: () => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvitationData {
  valid: boolean;
  companyName: string;
  companyLogo?: string;
  employeeName?: string;
  employeeEmail?: string;
  employeePhone?: string;
  employeeRole?: string;
  tenantId: string;
  expiresAt?: string;
}

type PageState = 'loading' | 'valid' | 'invalid' | 'expired' | 'submitting' | 'success';

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

// ─── Confetti particles (CSS-only) ────────────────────────────────────────────

function ConfettiEffect() {
  const colors = ['#10b981', '#14b8a6', '#f59e0b', '#6366f1', '#ec4899', '#3b82f6', '#f97316'];
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 1.5 + Math.random() * 1.5,
    size: 4 + Math.random() * 8,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.left}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.size > 8 ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AcceptInvitation({ token, onAuthSuccess, onBackToLanding }: AcceptInvitationProps) {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form state
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ─── Verify invitation token on mount ─────────────────────────────────────

  const verifyToken = useCallback(async () => {
    try {
      const res = await authFetch(`/api/invitations/verify?token=${encodeURIComponent(token)}&XTransformPort=3000`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 410 || data.expired) {
          setPageState('expired');
          setErrorMessage(data.error || 'This invitation has expired');
        } else {
          setPageState('invalid');
          setErrorMessage(data.error || 'Invalid invitation link');
        }
        return;
      }

      setInvitation(data);
      setFullName(data.employeeName || '');
      setPhone(data.employeePhone || '');
      setPageState('valid');
    } catch {
      setPageState('invalid');
      setErrorMessage('Unable to verify invitation. Please check your link.');
    }
  }, [token]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  // ─── Handle form submission ───────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setPageState('submitting');

    try {
      const res = await authFetch('/api/invitations/accept?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: fullName,
          password,
          phone: phone || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to accept invitation');
        setPageState('valid');
        return;
      }

      // Show success state
      setPageState('success');
      toast.success('Account created successfully!');

      // Auto-login after brief delay
      setTimeout(() => {
        onAuthSuccess(data.user, data.tenant);
      }, 2500);
    } catch {
      toast.error('Something went wrong. Please try again.');
      setPageState('valid');
    }
  };

  // ─── Render: Loading ──────────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">Verifying invitation...</h2>
            <p className="text-sm text-muted-foreground mt-1">Please wait while we validate your invite link</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Render: Success ──────────────────────────────────────────────────────

  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background relative">
        <ConfettiEffect />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center gap-6 text-center px-4 z-10"
        >
          <motion.div
            initial={{ rotate: -10, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-300"
          >
            <PartyPopper className="w-10 h-10 text-emerald-600" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">You&apos;re in! 🎉</h2>
            <p className="text-muted-foreground mt-2">
              Welcome to {invitation?.companyName || 'the team'}! Redirecting to your dashboard...
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Setting up your workspace...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Render: Error (Invalid / Expired) ────────────────────────────────────

  if (pageState === 'invalid' || pageState === 'expired') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-8 pb-8 px-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mx-auto mb-4"
              >
                <AlertCircle className="w-8 h-8 text-red-500" />
              </motion.div>
              <h2 className="text-xl font-bold text-red-800">
                {pageState === 'expired' ? 'Invitation Expired' : 'Invalid Invitation'}
              </h2>
              <p className="text-red-600 text-sm mt-2 mb-1">
                {errorMessage}
              </p>
              <p className="text-red-500 text-sm">
                Please contact your manager or administrator for a new invitation link.
              </p>
              {onBackToLanding && (
                <Button
                  variant="outline"
                  className="mt-6 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800 cursor-pointer"
                  onClick={onBackToLanding}
                >
                  Back to Home
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ─── Render: Valid Invitation (Main form) ─────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ─── Left Panel — Company Branding ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-10 xl:p-14"
        style={{
          background:
            'linear-gradient(135deg, #0f2027 0%, #1a3a2a 40%, #1e4d3a 70%, #0d1f17 100%)',
        }}
      >
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Top — Logo & Back */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center gap-3 mb-2"
          >
            {onBackToLanding && (
              <button
                onClick={onBackToLanding}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors mr-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Back
              </button>
            )}
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/30">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-white text-xl font-bold tracking-tight">
              ServiceOS
            </span>
          </motion.div>
        </div>

        {/* Middle — Welcome Message */}
        <div className="relative z-10 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20">
                <Building2 className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-emerald-300 text-sm font-medium uppercase tracking-wider">
                You&apos;re Invited
              </span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                {invitation?.companyName || 'the Team'}
              </span>!
            </h1>
            <p className="text-slate-300 text-base xl:text-lg leading-relaxed">
              You&apos;ve been invited to join {invitation?.companyName || 'the team'} on ServiceOS.
              Set up your account to get started with your new workspace.
            </p>
          </motion.div>

          {/* Employee role badge */}
          {invitation?.employeeRole && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mb-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1]">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300 text-sm">
                  Your role:{' '}
                  <span className="text-emerald-300 font-semibold capitalize">
                    {invitation.employeeRole}
                  </span>
                </span>
              </div>
            </motion.div>
          )}

          {/* Feature bullets */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-8 space-y-3"
          >
            {[
              'Manage jobs & scheduling',
              'Connect with your team in real-time',
              'Track performance & insights',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="text-slate-300 text-sm">{feature}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom — Security badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="relative z-10"
        >
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secure invitation • Powered by ServiceOS</span>
          </div>
        </motion.div>

        {/* Decorative glow */}
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-48 h-48 bg-teal-500/8 rounded-full blur-3xl" />
      </motion.div>

      {/* ─── Right Panel — Form ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-10 bg-white min-h-screen lg:min-h-0">
        <div className="w-full max-w-md">
          {/* Mobile branding + Back button */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2.5 mb-8"
          >
            {onBackToLanding && (
              <button
                onClick={onBackToLanding}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mr-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Back
              </button>
            )}
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200">
              <Zap className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              ServiceOS
            </span>
          </motion.div>

          {/* Welcome text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mb-6"
          >
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Set up your account
            </h2>
            <p className="text-slate-500 text-sm mt-1.5">
              {invitation?.companyName
                ? `Join ${invitation.companyName} on ServiceOS`
                : 'Complete your profile to get started'}
            </p>
          </motion.div>

          {/* Company & Role badge (mobile-visible) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="flex flex-wrap items-center gap-2 mb-6"
          >
            {invitation?.companyName && (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <Building2 className="w-3 h-3 mr-1" />
                {invitation.companyName}
              </Badge>
            )}
            {invitation?.employeeRole && (
              <Badge variant="secondary" className="bg-teal-50 text-teal-700 border-teal-200 capitalize">
                <Briefcase className="w-3 h-3 mr-1" />
                {invitation.employeeRole}
              </Badge>
            )}
            {invitation?.employeeEmail && (
              <span className="text-xs text-slate-400">{invitation.employeeEmail}</span>
            )}
          </motion.div>

          {/* ─── Form ─────────────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key="invitation-form"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <motion.div
                  custom={0}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="space-y-2"
                >
                  <Label htmlFor="invite-name" className="text-slate-700">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="invite-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                      autoComplete="name"
                    />
                  </div>
                </motion.div>

                {/* Password */}
                <motion.div
                  custom={1}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="space-y-2"
                >
                  <Label htmlFor="invite-password" className="text-slate-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="invite-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && password.length < 8 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Password must be at least 8 characters
                    </p>
                  )}
                  {/* Password strength indicator */}
                  {password && password.length >= 8 && (
                    <div className="flex gap-1 mt-1.5">
                      {[1, 2, 3, 4].map((level) => {
                        const strength =
                          password.length >= 12 ? 4 :
                          /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? 4 :
                          /[A-Z]/.test(password) && /[0-9]/.test(password) ? 3 :
                          /[A-Z]/.test(password) || /[0-9]/.test(password) ? 2 : 1;
                        return (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              level <= strength
                                ? strength <= 1 ? 'bg-red-400'
                                : strength <= 2 ? 'bg-amber-400'
                                : strength <= 3 ? 'bg-emerald-400'
                                : 'bg-emerald-500'
                                : 'bg-slate-100'
                            }`}
                          />
                        );
                      })}
                    </div>
                  )}
                </motion.div>

                {/* Confirm Password */}
                <motion.div
                  custom={2}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="space-y-2"
                >
                  <Label htmlFor="invite-confirm-password" className="text-slate-700">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="invite-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </motion.div>

                {/* Phone (optional) */}
                <motion.div
                  custom={3}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="space-y-2"
                >
                  <Label htmlFor="invite-phone" className="text-slate-700">
                    Phone Number <span className="text-slate-400 font-normal">(optional)</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="invite-phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                      autoComplete="tel"
                    />
                  </div>
                </motion.div>

                {/* Submit button */}
                <motion.div
                  custom={4}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="pt-2"
                >
                  <Button
                    type="submit"
                    disabled={pageState === 'submitting' || password.length < 8 || password !== confirmPassword}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer text-sm"
                  >
                    {pageState === 'submitting' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating your account...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 mr-1" />
                        Create Account &amp; Join
                      </>
                    )}
                  </Button>
                </motion.div>

                {/* Separator */}
                <motion.div
                  custom={5}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="relative"
                >
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-slate-400 font-medium">
                      secure
                    </span>
                  </div>
                </motion.div>

                {/* Security note */}
                <motion.div
                  custom={6}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="text-center"
                >
                  <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
                    <Lock className="w-3 h-3" />
                    Your data is encrypted and secure
                  </p>
                </motion.div>
              </form>
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-center text-xs text-slate-400 mt-8"
          >
            By continuing, you agree to ServiceOS&apos;s{' '}
            <span className="underline cursor-pointer hover:text-slate-500">
              Terms of Service
            </span>{' '}
            and{' '}
            <span className="underline cursor-pointer hover:text-slate-500">
              Privacy Policy
            </span>
          </motion.p>
        </div>
      </div>

      {/* Confetti animation keyframes */}
      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti-fall ease-out forwards;
        }
      `}</style>
    </div>
  );
}
