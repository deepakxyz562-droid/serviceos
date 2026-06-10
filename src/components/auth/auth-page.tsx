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
  Phone,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  Shield,
  Clock,
  BarChart3,
  Terminal,
  Sparkles,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { setToken } from '@/lib/client-auth';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface AuthPageProps {
  onAuthSuccess: (user: any, tenant: any) => void;
  onBackToLanding?: () => void;
  initialTab?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const INDUSTRIES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'packers-movers', label: 'Packers & Movers' },
  { value: 'window-cleaning', label: 'Window Cleaning' },
  { value: 'pest-control', label: 'Pest Control' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'courier', label: 'Courier' },
  { value: 'home-repair', label: 'Home Repair' },
  { value: 'salon-beauty', label: 'Salon & Beauty' },
];

const FEATURES = [
  {
    icon: Shield,
    title: 'Enterprise Security',
    desc: 'SOC 2 compliant infrastructure',
  },
  {
    icon: Clock,
    title: 'Real-time Ops',
    desc: 'Live dispatch & job tracking',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'Revenue & performance insights',
  },
];

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const tabContentVariants = {
  enter: { opacity: 0, x: 24 },
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
  exit: {
    opacity: 0,
    x: -24,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  },
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Floating geometric shape for the branding panel */
function FloatingShape({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.8, ease: 'easeOut' }}
      className={cn('absolute rounded-full', className)}
    />
  );
}

/** Password strength indicator */
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [len >= 8, hasUpper, hasLower, hasNum, hasSpecial].filter(Boolean).length;

  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-teal-400'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const idx = Math.min(score - 1, 4);

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-300',
              i <= idx ? colors[idx] : 'bg-slate-200',
            )}
          />
        ))}
      </div>
      <p className={cn('text-xs font-medium', idx < 2 ? 'text-red-500' : idx < 3 ? 'text-amber-600' : 'text-emerald-600')}>
        {labels[idx]}
      </p>
    </div>
  );
}

/** Form input with icon and validation state */
function FormInput({
  id,
  label,
  type = 'text',
  placeholder,
  icon: Icon,
  value,
  onChange,
  error,
  autoComplete,
  optional,
  rightElement,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete?: string;
  optional?: boolean;
  rightElement?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </Label>
        {optional && (
          <span className="text-xs text-slate-400 font-normal">Optional</span>
        )}
      </div>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'pl-10 h-11 bg-white border-slate-200 rounded-lg text-sm transition-all duration-200',
            'placeholder:text-slate-400',
            'focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500',
            error && 'border-red-300 focus-visible:ring-red-500/20 focus-visible:border-red-500',
          )}
          autoComplete={autoComplete}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-500 flex items-center gap-1"
        >
          <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
          {error}
        </motion.p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function AuthPage({ onAuthSuccess, onBackToLanding, initialTab }: AuthPageProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'login');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regIndustry, setRegIndustry] = useState('');
  const [regPhone, setRegPhone] = useState('');

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  /* ── Validation ── */
  const loginErrors: Record<string, string> = {};
  if (touched['loginEmail'] && !loginEmail) loginErrors['loginEmail'] = 'Email is required';
  else if (touched['loginEmail'] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) loginErrors['loginEmail'] = 'Enter a valid email';
  if (touched['loginPassword'] && !loginPassword) loginErrors['loginPassword'] = 'Password is required';

  const regErrors: Record<string, string> = {};
  if (touched['regName'] && !regName) regErrors['regName'] = 'Name is required';
  if (touched['regEmail'] && !regEmail) regErrors['regEmail'] = 'Email is required';
  else if (touched['regEmail'] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) regErrors['regEmail'] = 'Enter a valid email';
  if (touched['regPassword'] && regPassword.length < 8) regErrors['regPassword'] = 'Must be at least 8 characters';
  if (touched['regBusinessName'] && !regBusinessName) regErrors['regBusinessName'] = 'Business name is required';

  /* ── Handlers ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ loginEmail: true, loginPassword: true });
    if (!loginEmail || !loginPassword || Object.values(loginErrors).some(Boolean)) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Login failed');
        return;
      }
      if (data.token) setToken(data.token);
      toast.success('Welcome back!');
      onAuthSuccess(data.user, data.tenant);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@serviceos.com', password: 'demo1234' }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Dev login failed');
        return;
      }
      if (data.token) setToken(data.token);
      toast.success('Welcome to the demo!');
      onAuthSuccess(data.user, data.tenant);
    } catch {
      toast.error('Dev login unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      regName: true,
      regEmail: true,
      regPassword: true,
      regBusinessName: true,
    });
    if (!regName || !regEmail || !regPassword || !regBusinessName || Object.values(regErrors).some(Boolean)) {
      return;
    }
    if (regPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          businessName: regBusinessName,
          industry: regIndustry || 'other',
          phone: regPhone || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Registration failed');
        return;
      }
      if (data.token) setToken(data.token);
      toast.success('Account created successfully!');
      onAuthSuccess(data.user, data.tenant);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ────────────────────────────────────────────────────────────────── */
  /*  RENDER                                                           */
  /* ────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ═══════════════════════════════════════════════════════════════
          LEFT PANEL — Branding (desktop)
          ═══════════════════════════════════════════════════════════════ */}
      <div
        className={cn(
          'hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between',
          'p-10 xl:p-14 2xl:p-20',
        )}
        style={{
          background: 'linear-gradient(160deg, #021a12 0%, #0a2e1f 25%, #0f3d2b 50%, #064e3b 80%, #065f46 100%)',
        }}
      >
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Floating decorative shapes */}
        <FloatingShape className="w-96 h-96 -top-48 -left-48 bg-emerald-500/[0.07] blur-3xl" delay={0.2} />
        <FloatingShape className="w-72 h-72 top-1/3 -right-24 bg-teal-400/[0.06] blur-3xl" delay={0.4} />
        <FloatingShape className="w-64 h-64 bottom-20 left-10 bg-emerald-300/[0.04] blur-3xl" delay={0.6} />

        {/* Top — Back + Logo */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex items-center gap-3"
          >
            {onBackToLanding && (
              <button
                onClick={onBackToLanding}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mr-3 group"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                Back
              </button>
            )}
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-xl font-bold tracking-tight">
              ServiceOS
            </span>
          </motion.div>
        </div>

        {/* Middle — Headline + Description */}
        <div className="relative z-10 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-300 tracking-wide">
                Built for Service Businesses
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="text-4xl xl:text-5xl 2xl:text-6xl font-extrabold text-white leading-[1.1] mb-5"
          >
            The operating system for{' '}
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
              modern services
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="text-slate-300 text-base xl:text-lg leading-relaxed max-w-md"
          >
            Streamline dispatch, manage your team, and delight your customers
            — all from one powerful platform.
          </motion.p>

          {/* Feature cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-10 grid grid-cols-3 gap-3"
          >
            {FEATURES.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1, duration: 0.4 }}
                className={cn(
                  'p-4 rounded-xl border border-white/[0.06]',
                  'bg-white/[0.03] backdrop-blur-sm',
                  'hover:bg-white/[0.06] transition-all duration-300',
                  'group cursor-default',
                )}
              >
                <feature.icon className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform duration-200" />
                <p className="text-white text-sm font-semibold leading-tight mb-0.5">
                  {feature.title}
                </p>
                <p className="text-slate-400 text-xs leading-snug">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Bottom — Trust indicators */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="relative z-10"
        >
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {['bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-emerald-400'].map((bg, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 border-[#0a2e1f]',
                    bg,
                    'flex items-center justify-center',
                  )}
                >
                  <span className="text-white text-[10px] font-bold">
                    {['AK', 'MJ', 'SR', 'PL'][i]}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-white text-sm font-medium">2,400+ businesses</p>
              <p className="text-slate-400 text-xs">trust ServiceOS daily</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          RIGHT PANEL — Auth Form
          ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 bg-gradient-to-b from-slate-50/80 to-white">
        {/* Mobile top bar */}
        <div className="lg:hidden">
          <div
            className="relative overflow-hidden px-5 pt-6 pb-8"
            style={{
              background: 'linear-gradient(160deg, #021a12 0%, #064e3b 60%, #065f46 100%)',
            }}
          >
            {/* Mobile decorative shapes */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                {onBackToLanding && (
                  <button
                    onClick={onBackToLanding}
                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors group"
                  >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                    Back
                  </button>
                )}
                <div />
              </div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/20">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-white text-lg font-bold tracking-tight">
                  ServiceOS
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mt-2">
                {activeTab === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-slate-300 text-sm mt-1">
                {activeTab === 'login'
                  ? 'Sign in to your workspace'
                  : 'Get started for free'}
              </p>
            </div>
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 sm:px-6 lg:px-12">
          <div className="w-full max-w-[420px]">
            {/* Desktop heading */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="hidden lg:block mb-8"
            >
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {activeTab === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-slate-500 text-sm mt-1.5">
                {activeTab === 'login'
                  ? 'Sign in to your ServiceOS workspace'
                  : 'Get started with ServiceOS for free'}
              </p>
            </motion.div>

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList
                className={cn(
                  'w-full mb-7 bg-slate-100/80 h-11 p-[3px] rounded-xl',
                  'backdrop-blur-sm',
                )}
              >
                <TabsTrigger
                  value="login"
                  className={cn(
                    'flex-1 h-[38px] text-sm font-medium rounded-lg transition-all duration-200',
                    'data-[state=active]:bg-white data-[state=active]:shadow-sm',
                    'data-[state=active]:text-slate-900 text-slate-500',
                  )}
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className={cn(
                    'flex-1 h-[38px] text-sm font-medium rounded-lg transition-all duration-200',
                    'data-[state=active]:bg-white data-[state=active]:shadow-sm',
                    'data-[state=active]:text-slate-900 text-slate-500',
                  )}
                >
                  Create Account
                </TabsTrigger>
              </TabsList>

              {/* ─── LOGIN ─── */}
              <TabsContent value="login" className="mt-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="login-form"
                    variants={tabContentVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    <form onSubmit={handleLogin} className="space-y-5">
                      <motion.div
                        custom={0}
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                      >
                        <FormInput
                          id="login-email"
                          label="Email"
                          type="email"
                          placeholder="you@company.com"
                          icon={Mail}
                          value={loginEmail}
                          onChange={(v) => { setLoginEmail(v); markTouched('loginEmail'); }}
                          error={loginErrors['loginEmail']}
                          autoComplete="email"
                        />
                      </motion.div>

                      <motion.div
                        custom={1}
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="login-password" className="text-sm font-medium text-slate-700">
                              Password
                            </Label>
                            <button
                              type="button"
                              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline transition-colors"
                            >
                              Forgot password?
                            </button>
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <Input
                              id="login-password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Enter your password"
                              value={loginPassword}
                              onChange={(e) => { setLoginPassword(e.target.value); markTouched('loginPassword'); }}
                              className={cn(
                                'pl-10 pr-10 h-11 bg-white border-slate-200 rounded-lg text-sm transition-all duration-200',
                                'placeholder:text-slate-400',
                                'focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500',
                                loginErrors['loginPassword'] && 'border-red-300 focus-visible:ring-red-500/20 focus-visible:border-red-500',
                              )}
                              autoComplete="current-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {loginErrors['loginPassword'] && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs text-red-500 flex items-center gap-1"
                            >
                              <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                              {loginErrors['loginPassword']}
                            </motion.p>
                          )}
                        </div>
                      </motion.div>

                      <motion.div
                        custom={2}
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                      >
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className={cn(
                            'w-full h-11 font-semibold text-sm cursor-pointer rounded-lg',
                            'bg-gradient-to-r from-emerald-600 to-teal-600',
                            'hover:from-emerald-700 hover:to-teal-700',
                            'active:from-emerald-800 active:to-teal-800',
                            'shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30',
                            'transition-all duration-200',
                            'disabled:opacity-60 disabled:cursor-not-allowed',
                          )}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Signing in...
                            </>
                          ) : (
                            'Sign In'
                          )}
                        </Button>
                      </motion.div>

                      {/* Dev Login */}
                      <motion.div
                        custom={3}
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isLoading}
                              onClick={handleDevLogin}
                              className={cn(
                                'w-full h-11 font-medium text-sm cursor-pointer rounded-lg',
                                'border-slate-200 bg-slate-50/50',
                                'hover:bg-slate-100 hover:border-slate-300',
                                'transition-all duration-200',
                                'disabled:opacity-60 disabled:cursor-not-allowed',
                              )}
                            >
                              <Terminal className="w-4 h-4 mr-1.5 text-slate-500" />
                              Demo Login
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Sign in with a pre-configured demo account</p>
                          </TooltipContent>
                        </Tooltip>
                      </motion.div>

                      <motion.div
                        custom={4}
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        className="relative"
                      >
                        <div className="absolute inset-0 flex items-center">
                          <Separator className="w-full bg-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-gradient-to-b from-slate-50/80 to-white px-3 text-slate-400 font-medium">
                            or
                          </span>
                        </div>
                      </motion.div>

                      <motion.div
                        custom={5}
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                      >
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full h-11 font-medium text-sm cursor-pointer rounded-lg',
                            'border-slate-200 hover:bg-slate-50',
                            'transition-all duration-200',
                          )}
                          onClick={() => {
                            const origin = encodeURIComponent(window.location.origin);
                            window.location.href = `/api/auth/google?mode=login&XTransformPort=3000&origin=${origin}`;
                          }}
                        >
                          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                          </svg>
                          Continue with Google
                        </Button>
                      </motion.div>

                      <motion.div
                        custom={6}
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        className="text-center pt-1"
                      >
                        <p className="text-sm text-slate-500">
                          Don&apos;t have an account?{' '}
                          <button
                            type="button"
                            onClick={() => setActiveTab('register')}
                            className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-colors"
                          >
                            Create one
                          </button>
                        </p>
                      </motion.div>
                    </form>
                  </motion.div>
                </AnimatePresence>
              </TabsContent>

              {/* ─── REGISTER ─── */}
              <TabsContent value="register" className="mt-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="register-form"
                    variants={tabContentVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    <form onSubmit={handleRegister} className="space-y-4">
                      {/* Full Name */}
                      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                        <FormInput
                          id="reg-name"
                          label="Full Name"
                          placeholder="John Doe"
                          icon={User}
                          value={regName}
                          onChange={(v) => { setRegName(v); markTouched('regName'); }}
                          error={regErrors['regName']}
                          autoComplete="name"
                        />
                      </motion.div>

                      {/* Email */}
                      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
                        <FormInput
                          id="reg-email"
                          label="Email"
                          type="email"
                          placeholder="you@company.com"
                          icon={Mail}
                          value={regEmail}
                          onChange={(v) => { setRegEmail(v); markTouched('regEmail'); }}
                          error={regErrors['regEmail']}
                          autoComplete="email"
                        />
                      </motion.div>

                      {/* Password */}
                      <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
                        <div className="space-y-1.5">
                          <Label htmlFor="reg-password" className="text-sm font-medium text-slate-700">
                            Password
                          </Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <Input
                              id="reg-password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Min 8 characters"
                              value={regPassword}
                              onChange={(e) => { setRegPassword(e.target.value); markTouched('regPassword'); }}
                              className={cn(
                                'pl-10 pr-10 h-11 bg-white border-slate-200 rounded-lg text-sm transition-all duration-200',
                                'placeholder:text-slate-400',
                                'focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500',
                                regErrors['regPassword'] && 'border-red-300 focus-visible:ring-red-500/20 focus-visible:border-red-500',
                              )}
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <PasswordStrength password={regPassword} />
                        </div>
                      </motion.div>

                      {/* Business Name */}
                      <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
                        <FormInput
                          id="reg-business"
                          label="Business Name"
                          placeholder="Acme Services Inc."
                          icon={Building2}
                          value={regBusinessName}
                          onChange={(v) => { setRegBusinessName(v); markTouched('regBusinessName'); }}
                          error={regErrors['regBusinessName']}
                          autoComplete="organization"
                        />
                      </motion.div>

                      {/* Phone (optional) */}
                      <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible">
                        <FormInput
                          id="reg-phone"
                          label="Phone Number"
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          icon={Phone}
                          value={regPhone}
                          onChange={setRegPhone}
                          autoComplete="tel"
                          optional
                        />
                      </motion.div>

                      {/* Create Account Button */}
                      <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible" className="pt-1">
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className={cn(
                            'w-full h-11 font-semibold text-sm cursor-pointer rounded-lg',
                            'bg-gradient-to-r from-emerald-600 to-teal-600',
                            'hover:from-emerald-700 hover:to-teal-700',
                            'active:from-emerald-800 active:to-teal-800',
                            'shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30',
                            'transition-all duration-200',
                            'disabled:opacity-60 disabled:cursor-not-allowed',
                          )}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Creating account...
                            </>
                          ) : (
                            'Create Account'
                          )}
                        </Button>
                      </motion.div>

                      {/* Divider */}
                      <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible" className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <Separator className="w-full bg-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-gradient-to-b from-slate-50/80 to-white px-3 text-slate-400 font-medium">
                            or
                          </span>
                        </div>
                      </motion.div>

                      {/* Google */}
                      <motion.div custom={7} variants={fadeUp} initial="hidden" animate="visible">
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full h-11 font-medium text-sm cursor-pointer rounded-lg',
                            'border-slate-200 hover:bg-slate-50',
                            'transition-all duration-200',
                          )}
                          onClick={() => {
                            const origin = encodeURIComponent(window.location.origin);
                            window.location.href = `/api/auth/google?mode=register&XTransformPort=3000&origin=${origin}`;
                          }}
                        >
                          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                          </svg>
                          Continue with Google
                        </Button>
                      </motion.div>

                      {/* Already have account */}
                      <motion.div custom={8} variants={fadeUp} initial="hidden" animate="visible" className="text-center pt-1">
                        <p className="text-sm text-slate-500">
                          Already have an account?{' '}
                          <button
                            type="button"
                            onClick={() => setActiveTab('login')}
                            className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-colors"
                          >
                            Sign In
                          </button>
                        </p>
                      </motion.div>
                    </form>
                  </motion.div>
                </AnimatePresence>
              </TabsContent>
            </Tabs>

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="text-center text-xs text-slate-400 mt-8 leading-relaxed"
            >
              By continuing, you agree to ServiceOS&apos;s{' '}
              <span className="underline cursor-pointer hover:text-slate-500 transition-colors">
                Terms of Service
              </span>{' '}
              and{' '}
              <span className="underline cursor-pointer hover:text-slate-500 transition-colors">
                Privacy Policy
              </span>
            </motion.p>
          </div>
        </div>
      </div>
    </div>
  );
}
