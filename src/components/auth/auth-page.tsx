'use client';

import { useState } from 'react';
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
  Wrench,
  Sparkles,
  Truck,
  Scissors,
  Bug,
  Flame,
  Wind,
  Package,
  Droplets,
  Hammer,
  Leaf,
} from 'lucide-react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface AuthPageProps {
  onAuthSuccess: (user: any, tenant: any) => void;
  onBackToLanding?: () => void;
  initialTab?: string;
}

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

const INDUSTRY_ICONS = [
  { icon: Wrench, label: 'Plumbing', color: 'text-emerald-300' },
  { icon: Sparkles, label: 'Cleaning', color: 'text-teal-300' },
  { icon: Truck, label: 'Movers', color: 'text-amber-300' },
  { icon: Droplets, label: 'Windows', color: 'text-cyan-300' },
  { icon: Bug, label: 'Pest Ctrl', color: 'text-red-300' },
  { icon: Wind, label: 'HVAC', color: 'text-sky-300' },
  { icon: Flame, label: 'Electrical', color: 'text-yellow-300' },
  { icon: Leaf, label: 'Landscape', color: 'text-green-300' },
  { icon: Package, label: 'Courier', color: 'text-orange-300' },
  { icon: Hammer, label: 'Repair', color: 'text-lime-300' },
  { icon: Scissors, label: 'Salon', color: 'text-pink-300' },
];

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' as const },
  }),
};

const formVariants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

export function AuthPage({ onAuthSuccess, onBackToLanding, initialTab }: AuthPageProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'login');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Please fill in all fields');
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
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.tenant) localStorage.setItem('tenant', JSON.stringify(data.tenant));
      toast.success('Welcome back!');
      onAuthSuccess(data.user, data.tenant);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword || !regBusinessName || !regIndustry || !regPhone) {
      toast.error('Please fill in all fields');
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
          industry: regIndustry,
          phone: regPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Registration failed');
        return;
      }
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.tenant) localStorage.setItem('tenant', JSON.stringify(data.tenant));
      toast.success('Account created successfully!');
      onAuthSuccess(data.user, data.tenant);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel — Branding (desktop only, full-screen on lg) */}
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

        {/* Top — Logo & Brand */}
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

        {/* Middle — Tagline */}
        <div className="relative z-10 max-w-lg">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4"
          >
            Operations OS for{' '}
            <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
              Service Businesses
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-slate-300 text-base xl:text-lg leading-relaxed"
          >
            Streamline your operations, manage your team, and delight your
            customers — all from one powerful platform built for service
            businesses.
          </motion.p>

          {/* Feature bullets */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-8 space-y-3"
          >
            {[
              'Automated scheduling & dispatch',
              'Real-time job tracking & updates',
              'Customer management & invoicing',
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

        {/* Bottom — Industry Icons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="relative z-10"
        >
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-4 font-medium">
            Trusted across industries
          </p>
          <div className="grid grid-cols-6 gap-3">
            {INDUSTRY_ICONS.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.05, duration: 0.3 }}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-colors"
              >
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <span className="text-slate-400 text-[10px] leading-tight text-center">
                  {item.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Decorative glow */}
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-48 h-48 bg-teal-500/8 rounded-full blur-3xl" />
      </motion.div>

      {/* Right Panel — Auth Form */}
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
              {activeTab === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-slate-500 text-sm mt-1.5">
              {activeTab === 'login'
                ? 'Sign in to your ServiceOS workspace'
                : 'Get started with ServiceOS for free'}
            </p>
          </motion.div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full mb-6 bg-slate-100 h-10 p-[3px]">
              <TabsTrigger
                value="login"
                className="flex-1 h-[34px] text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="flex-1 h-[34px] text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500"
              >
                Create Account
              </TabsTrigger>
            </TabsList>

            {/* ─── LOGIN TAB ─── */}
            <TabsContent value="login">
              <AnimatePresence mode="wait">
                <motion.div
                  key="login-form"
                  variants={formVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <form onSubmit={handleLogin} className="space-y-4">
                    <motion.div
                      custom={0}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      className="space-y-2"
                    >
                      <Label htmlFor="login-email" className="text-slate-700">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@company.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                          autoComplete="email"
                        />
                      </div>
                    </motion.div>

                    <motion.div
                      custom={1}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password" className="text-slate-700">
                          Password
                        </Label>
                        <button
                          type="button"
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline transition-colors"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="Enter your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                          autoComplete="current-password"
                        />
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
                        className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
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

                    <motion.div
                      custom={3}
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
                          or
                        </span>
                      </div>
                    </motion.div>

                    <motion.div
                      custom={4}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-10 border-slate-200 hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          const origin = encodeURIComponent(window.location.origin);
                          window.location.href = `/api/auth/google?mode=login&XTransformPort=3000&origin=${origin}`;
                        }}
                      >
                        <GoogleIcon />
                        Continue with Google
                      </Button>
                    </motion.div>

                    <motion.div
                      custom={5}
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

            {/* ─── REGISTER TAB ─── */}
            <TabsContent value="register">
              <AnimatePresence mode="wait">
                <motion.div
                  key="register-form"
                  variants={formVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <form onSubmit={handleRegister} className="space-y-4">
                    {/* Full Name */}
                    <motion.div
                      custom={0}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      className="space-y-2"
                    >
                      <Label htmlFor="reg-name" className="text-slate-700">
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="reg-name"
                          type="text"
                          placeholder="John Doe"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                          autoComplete="name"
                        />
                      </div>
                    </motion.div>

                    {/* Email */}
                    <motion.div
                      custom={1}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      className="space-y-2"
                    >
                      <Label htmlFor="reg-email" className="text-slate-700">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="you@company.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                          autoComplete="email"
                        />
                      </div>
                    </motion.div>

                    {/* Password */}
                    <motion.div
                      custom={2}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      className="space-y-2"
                    >
                      <Label htmlFor="reg-password" className="text-slate-700">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="reg-password"
                          type="password"
                          placeholder="Min 8 characters"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                          autoComplete="new-password"
                        />
                      </div>
                      {regPassword && regPassword.length < 8 && (
                        <p className="text-xs text-amber-600 mt-1">
                          Password must be at least 8 characters
                        </p>
                      )}
                    </motion.div>

                    {/* Business Name */}
                    <motion.div
                      custom={3}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      className="space-y-2"
                    >
                      <Label htmlFor="reg-business" className="text-slate-700">
                        Business Name
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="reg-business"
                          type="text"
                          placeholder="Acme Services Inc."
                          value={regBusinessName}
                          onChange={(e) => setRegBusinessName(e.target.value)}
                          className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                          autoComplete="organization"
                        />
                      </div>
                    </motion.div>

                    {/* Industry */}
                    <motion.div
                      custom={4}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      className="space-y-2"
                    >
                      <Label className="text-slate-700">Industry</Label>
                      <Select value={regIndustry} onValueChange={setRegIndustry}>
                        <SelectTrigger className="w-full h-10 bg-white border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500">
                          <SelectValue placeholder="Select your industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map((industry) => (
                            <SelectItem key={industry.value} value={industry.value}>
                              {industry.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>

                    {/* Phone Number */}
                    <motion.div
                      custom={5}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      className="space-y-2"
                    >
                      <Label htmlFor="reg-phone" className="text-slate-700">
                        Phone Number
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="reg-phone"
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                          autoComplete="tel"
                        />
                      </div>
                    </motion.div>

                    {/* Create Account Button */}
                    <motion.div
                      custom={6}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      className="pt-1"
                    >
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
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
                    <motion.div
                      custom={7}
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
                          or
                        </span>
                      </div>
                    </motion.div>

                    {/* Google */}
                    <motion.div
                      custom={8}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-10 border-slate-200 hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          const origin = encodeURIComponent(window.location.origin);
                          window.location.href = `/api/auth/google?mode=register&XTransformPort=3000&origin=${origin}`;
                        }}
                      >
                        <GoogleIcon />
                        Continue with Google
                      </Button>
                    </motion.div>

                    {/* Already have account */}
                    <motion.div
                      custom={9}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      className="text-center pt-1"
                    >
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
    </div>
  );
}
