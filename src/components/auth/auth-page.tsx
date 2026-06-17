'use client';

import { useState, useEffect } from 'react';
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
  MessageSquare,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  HardHat,
  Copy,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';

interface AuthPageProps {
  onAuthSuccess: (user: any, tenant: any) => void;
  onBackToLanding?: () => void;
  initialTab?: string;
}

// Tab state
type LoginTab = 'business' | 'employee' | 'customer';
type BusinessTab = 'login' | 'register';
type CustomerStep = 'credentials' | 'company' | 'otp';
type CustomerMode = 'password' | 'otp';

interface CompanyInfo {
  customerId: string;
  customerName: string;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  workspaceName: string | null;
  industry: string | null;
  logo: string | null;
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
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
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

const tabContentVariants = {
  enter: { opacity: 0, y: 8 },
  center: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export function AuthPage({ onAuthSuccess, onBackToLanding }: AuthPageProps) {
  // Top-level tab
  const [loginTab, setLoginTab] = useState<LoginTab>('business');
  const [isLoading, setIsLoading] = useState(false);

  // Business Login state
  const [businessTab, setBusinessTab] = useState<BusinessTab>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Business Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regIndustry, setRegIndustry] = useState('');
  const [regPhone, setRegPhone] = useState('');

  // Employee Login state
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');

  // Customer Login state (Email/Phone + Password flow)
  const [customerMode, setCustomerMode] = useState<CustomerMode>('password');
  const [customerStep, setCustomerStep] = useState<CustomerStep>('credentials');
  const [customerIdentifier, setCustomerIdentifier] = useState(''); // email OR phone
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerCompanies, setCustomerCompanies] = useState<CompanyInfo[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [activationLink, setActivationLink] = useState<string | null>(null);

  // Customer OTP state (fallback)
  const [customerPhone, setCustomerPhone] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  // ─── Tab Switch Handler ───
  const handleTabSwitch = (tab: LoginTab) => {
    if (tab === loginTab) return;
    setLoginTab(tab);
    // Reset customer state when switching tabs
    if (tab === 'customer') {
      setCustomerStep('credentials');
      setCustomerMode('password');
      setCustomerIdentifier('');
      setCustomerPassword('');
      setCustomerCompanies([]);
      setSelectedTenantId(null);
      setActivationLink(null);
      setOtpValue('');
      setOtpSent(false);
      setSimulatedOtp(null);
    }
  };

  // ─── Business Login Handler ───
  const handleBusinessLogin = async (e: React.FormEvent) => {
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
      localStorage.setItem('serviceos_auth', JSON.stringify({
        isAuthenticated: true,
        user: data.user,
        tenant: data.tenant || null,
        token: data.token,
      }));
      toast.success('Welcome back!');
      onAuthSuccess(data.user, data.tenant);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Business Register Handler ───
  const handleBusinessRegister = async (e: React.FormEvent) => {
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
      localStorage.setItem('serviceos_auth', JSON.stringify({
        isAuthenticated: true,
        user: data.user,
        tenant: data.tenant || null,
        token: data.token,
      }));
      toast.success('Account created successfully!');
      onAuthSuccess(data.user, data.tenant);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Employee Login Handler ───
  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empEmail || !empPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: empEmail, password: empPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Login failed');
        return;
      }
      if (data.user.role !== 'employee') {
        toast.error('This login is for employees only. Please use the Business tab for admin/owner accounts.');
        setIsLoading(false);
        return;
      }
      localStorage.setItem('serviceos_auth', JSON.stringify({
        isAuthenticated: true,
        user: data.user,
        tenant: data.tenant || null,
        token: data.token,
      }));
      toast.success('Welcome to your employee portal!');
      onAuthSuccess(data.user, data.tenant);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Customer Login (Email/Phone + Password) ───
  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerIdentifier || !customerPassword) {
      toast.error('Please enter your email/phone and password');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/customer/login?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: customerIdentifier,
          password: customerPassword,
          tenantId: customerStep === 'company' ? selectedTenantId : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Multi-company → switch to company picker
        if (res.status === 409 && data.multiCompany) {
          setCustomerCompanies(data.companies || []);
          setCustomerStep('company');
          toast.info('Multiple companies found — please select one.');
          return;
        }
        // Account not activated → offer to send activation link
        if (res.status === 403 && data.needsActivation) {
          toast.error(data.error || 'Account not activated');
          return;
        }
        toast.error(data.error || 'Login failed');
        return;
      }
      localStorage.setItem('serviceos_auth', JSON.stringify({
        isAuthenticated: true,
        user: data.user,
        tenant: data.tenant || null,
        token: data.token,
        portalToken: data.portalToken,
        isCustomer: true,
      }));
      toast.success('Welcome back!');
      onAuthSuccess(data.user, data.tenant);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Customer: Request Activation Link (Forgot Password / First-time) ───
  const handleRequestActivation = async () => {
    if (!customerIdentifier) {
      toast.error('Please enter your email or phone first');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/customer/resend-activation?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: customerIdentifier }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to send activation link');
        return;
      }
      if (data.devMode && data.inviteUrl) {
        setActivationLink(data.inviteUrl);
        toast.success('Demo Mode: Activation link generated.', {
          description: 'Click the link below to set your password.',
          duration: 8000,
        });
      } else {
        toast.success(data.message || 'If an account exists, an activation link has been sent.');
      }
    } catch {
      toast.error('Failed to send activation link');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Send OTP Handler (WhatsApp fallback) ───
  const handleSendOtp = async () => {
    if (!customerPhone || customerPhone.replace(/\D/g, '').length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/customer/send-otp?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: customerPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to send OTP');
        return;
      }
      setOtpSent(true);
      setResendTimer(30);
      setCustomerStep('otp');

      if (data.simulated && data.otpCode) {
        setSimulatedOtp(data.otpCode);
        toast.success(`Demo Mode: Your OTP is ${data.otpCode}`, { duration: 8000 });
      } else {
        toast.success('OTP sent to your WhatsApp!', { description: `Check WhatsApp on ${data.phone}` });
      }
    } catch {
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Verify OTP Handler ───
  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/customer/verify-otp?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: customerPhone, otpCode: otpValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Verification failed');
        return;
      }
      localStorage.setItem('serviceos_auth', JSON.stringify({
        isAuthenticated: true,
        user: data.user,
        tenant: data.tenant || null,
        token: data.token,
        portalToken: data.portalToken,
        isCustomer: true,
      }));

      if (data.isNewCustomer) {
        toast.success('Welcome! Your customer portal is ready.');
      } else {
        toast.success('Welcome back!');
      }
      onAuthSuccess(data.user, data.tenant);
    } catch {
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Resend OTP Handler ───
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/customer/send-otp?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: customerPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to resend OTP');
        return;
      }
      setResendTimer(30);
      setOtpValue('');

      if (data.simulated && data.otpCode) {
        setSimulatedOtp(data.otpCode);
        toast.success(`Demo Mode: Your OTP is ${data.otpCode}`, { duration: 8000 });
      } else {
        toast.success('New OTP sent to your WhatsApp!');
      }
    } catch {
      toast.error('Failed to resend OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Render: Business Tab Content ───
  const renderBusinessContent = () => (
    <div className="w-full">
      {/* Business Tabs: Sign In / Create Account */}
      <div className="flex mb-6 bg-slate-100 rounded-lg p-[3px] h-10">
        <button
          onClick={() => setBusinessTab('login')}
          className={`flex-1 h-[34px] text-sm rounded-md font-medium transition-all cursor-pointer ${
            businessTab === 'login'
              ? 'bg-white shadow-sm text-slate-900'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => setBusinessTab('register')}
          className={`flex-1 h-[34px] text-sm rounded-md font-medium transition-all cursor-pointer ${
            businessTab === 'register'
              ? 'bg-white shadow-sm text-slate-900'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Create Account
        </button>
      </div>

      <AnimatePresence mode="wait">
        {businessTab === 'login' ? (
          <motion.div
            key="biz-login"
            variants={formVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <form onSubmit={handleBusinessLogin} className="space-y-4">
              <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="space-y-2">
                <Label htmlFor="login-email" className="text-slate-700">Email</Label>
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

              <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password" className="text-slate-700">Password</Label>
                  <button type="button" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline transition-colors">
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

              <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                  ) : 'Sign In'}
                </Button>
              </motion.div>

              <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="relative">
                <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-medium">or</span>
                </div>
              </motion.div>

              <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible">
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

              <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible" className="text-center pt-1">
                <p className="text-sm text-slate-500">
                  Don&apos;t have an account?{' '}
                  <button type="button" onClick={() => setBusinessTab('register')} className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-colors">
                    Create one
                  </button>
                </p>
              </motion.div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="biz-register"
            variants={formVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <form onSubmit={handleBusinessRegister} className="space-y-4">
              <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="space-y-2">
                <Label htmlFor="reg-name" className="text-slate-700">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="reg-name" type="text" placeholder="John Doe" value={regName} onChange={(e) => setRegName(e.target.value)} className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" autoComplete="name" />
                </div>
              </motion.div>

              <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="space-y-2">
                <Label htmlFor="reg-email" className="text-slate-700">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="reg-email" type="email" placeholder="you@company.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" autoComplete="email" />
                </div>
              </motion.div>

              <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="space-y-2">
                <Label htmlFor="reg-password" className="text-slate-700">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="reg-password" type="password" placeholder="Min 8 characters" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" autoComplete="new-password" />
                </div>
                {regPassword && regPassword.length < 8 && (
                  <p className="text-xs text-amber-600 mt-1">Password must be at least 8 characters</p>
                )}
              </motion.div>

              <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="space-y-2">
                <Label htmlFor="reg-business" className="text-slate-700">Business Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="reg-business" type="text" placeholder="Acme Services Inc." value={regBusinessName} onChange={(e) => setRegBusinessName(e.target.value)} className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" autoComplete="organization" />
                </div>
              </motion.div>

              <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="space-y-2">
                <Label className="text-slate-700">Industry</Label>
                <Select value={regIndustry} onValueChange={setRegIndustry}>
                  <SelectTrigger className="w-full h-10 bg-white border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500">
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry.value} value={industry.value}>{industry.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>

              <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible" className="space-y-2">
                <Label htmlFor="reg-phone" className="text-slate-700">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="reg-phone" type="tel" placeholder="+1 (555) 000-0000" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" autoComplete="tel" />
                </div>
              </motion.div>

              <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible" className="pt-1">
                <Button type="submit" disabled={isLoading} className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer">
                  {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : 'Create Account'}
                </Button>
              </motion.div>

              <motion.div custom={7} variants={fadeUp} initial="hidden" animate="visible" className="relative">
                <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-medium">or</span>
                </div>
              </motion.div>

              <motion.div custom={8} variants={fadeUp} initial="hidden" animate="visible">
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

              <motion.div custom={9} variants={fadeUp} initial="hidden" animate="visible" className="text-center pt-1">
                <p className="text-sm text-slate-500">
                  Already have an account?{' '}
                  <button type="button" onClick={() => setBusinessTab('login')} className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-colors">
                    Sign In
                  </button>
                </p>
              </motion.div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ─── Render: Employee Tab Content ───
  const renderEmployeeContent = () => (
    <motion.div
      key="employee-content"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="w-full"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex justify-center mb-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
          <HardHat className="w-8 h-8 text-amber-600" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight text-center mb-1">
          Employee Portal
        </h2>
        <p className="text-slate-500 text-sm text-center mb-6">
          Sign in with your company email and password
        </p>

        <form onSubmit={handleEmployeeLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emp-email" className="text-slate-700">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="emp-email"
                type="email"
                placeholder="mike@abccompany.com"
                value={empEmail}
                onChange={(e) => setEmpEmail(e.target.value)}
                className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emp-password" className="text-slate-700">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="emp-password"
                type="password"
                placeholder="Enter your password"
                value={empPassword}
                onChange={(e) => setEmpPassword(e.target.value)}
                className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
                autoComplete="current-password"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 bg-amber-600 hover:bg-amber-700 text-white font-medium cursor-pointer"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
            ) : 'Sign In'}
          </Button>

          <p className="text-center text-xs text-slate-400 pt-2">
            Don&apos;t have an employee account? Ask your manager to send you an invitation.
          </p>
        </form>
      </motion.div>
    </motion.div>
  );

  // ─── Render: Customer Tab Content (Credentials Step — Email/Phone + Password) ───
  const renderCustomerCredentialsStep = () => (
    <motion.div
      key="customer-credentials"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="w-full"
    >
      {/* Customer icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex justify-center mb-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-teal-50 border-2 border-teal-200 flex items-center justify-center">
          <User className="w-8 h-8 text-teal-600" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="space-y-4"
      >
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Customer Portal
          </h2>
          <p className="text-slate-500 text-sm mt-1.5">
            Sign in with your email or phone and password
          </p>
        </div>

        {/* Mode switcher: Password | WhatsApp OTP */}
        {customerMode === 'password' && (
          <form onSubmit={handleCustomerLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-identifier" className="text-slate-700">
                Email or Mobile Number
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="customer-identifier"
                  type="text"
                  placeholder="john@gmail.com  or  98765 43210"
                  value={customerIdentifier}
                  onChange={(e) => setCustomerIdentifier(e.target.value)}
                  className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-teal-500 focus-visible:ring-teal-500/20"
                  autoComplete="username"
                />
              </div>
              <p className="text-xs text-slate-400">
                We&apos;ll automatically find the company you belong to
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="customer-password" className="text-slate-700">Password</Label>
                <button
                  type="button"
                  onClick={handleRequestActivation}
                  disabled={isLoading || !customerIdentifier}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Forgot / Need activation?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="customer-password"
                  type="password"
                  placeholder="Enter your password"
                  value={customerPassword}
                  onChange={(e) => setCustomerPassword(e.target.value)}
                  className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-teal-500 focus-visible:ring-teal-500/20"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !customerIdentifier || !customerPassword}
              className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-medium cursor-pointer"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : 'Sign In'}
            </Button>
          </form>
        )}

        {/* Activation link panel (dev/demo mode) */}
        {activationLink && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-2"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-800">Your Activation Link</p>
            </div>
            <p className="text-xs text-emerald-700">
              Click the link below to set your password and activate your portal account.
            </p>
            <div className="flex gap-2">
              <a
                href={activationLink}
                className="flex-1 text-center text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md py-2 px-3 transition-colors"
              >
                Activate My Account →
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(activationLink);
                  toast.success('Link copied to clipboard');
                }}
                className="text-xs font-medium text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 rounded-md py-2 px-3 transition-colors flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
          </motion.div>
        )}

        {/* Divider */}
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-medium">or</span>
          </div>
        </div>

        {/* OTP mode toggle */}
        {customerMode === 'password' ? (
          <button
            type="button"
            onClick={() => {
              setCustomerMode('otp');
              setCustomerStep('credentials');
              setActivationLink(null);
            }}
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-teal-700 font-medium py-2 transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-green-500" />
            Login with WhatsApp OTP instead
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCustomerMode('password');
              setCustomerStep('credentials');
              setOtpValue('');
              setOtpSent(false);
              setSimulatedOtp(null);
            }}
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-teal-700 font-medium py-2 transition-colors"
          >
            <Lock className="w-4 h-4 text-slate-400" />
            Use Email / Phone + Password instead
          </button>
        )}

        {/* WhatsApp OTP form (when in OTP mode) */}
        {customerMode === 'otp' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label htmlFor="customer-phone-otp" className="text-slate-700">
                Mobile Number
              </Label>
              <div className="flex gap-2">
                <div className="flex-shrink-0 w-[88px] h-10 rounded-md border border-slate-200 bg-white flex items-center justify-center gap-1.5 px-3 text-sm font-medium text-slate-600">
                  🇮🇳 +91
                </div>
                <Input
                  id="customer-phone-otp"
                  type="tel"
                  placeholder="98765 43210"
                  value={customerPhone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d\s]/g, '');
                    if (val.replace(/\s/g, '').length <= 10) {
                      setCustomerPhone(val);
                    }
                  }}
                  className="flex-1 h-10 bg-white border-slate-200 focus-visible:border-teal-500 focus-visible:ring-teal-500/20 text-base tracking-wider"
                  maxLength={12}
                  autoFocus
                />
              </div>
              <p className="text-xs text-slate-400">
                Enter your 10-digit mobile number
              </p>
            </div>

            <Button
              type="button"
              onClick={handleSendOtp}
              disabled={isLoading || customerPhone.replace(/\s/g, '').length < 10}
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium cursor-pointer text-base"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending OTP...</>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-1.5" />
                  Send OTP via WhatsApp
                </>
              )}
            </Button>

            <p className="text-center text-xs text-slate-400 mt-2">
              We&apos;ll send a 6-digit code to your WhatsApp number
            </p>
          </motion.div>
        )}

        <p className="text-center text-xs text-slate-400 pt-2">
          Don&apos;t have an account yet? Ask your service provider to send you a portal invitation.
        </p>
      </motion.div>
    </motion.div>
  );

  // ─── Render: Customer Tab Content (Company Picker Step) ───
  const renderCustomerCompanyStep = () => (
    <motion.div
      key="customer-company"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="w-full"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <button
          onClick={() => {
            setCustomerStep('credentials');
            setSelectedTenantId(null);
          }}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Select Company
        </h2>
        <p className="text-slate-500 text-sm mt-1.5">
          Your email belongs to multiple companies. Choose which one you want to log in to.
        </p>
      </motion.div>

      <div className="space-y-3">
        {customerCompanies.map((company) => (
          <button
            key={company.customerId}
            type="button"
            onClick={() => setSelectedTenantId(company.tenantId)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
              selectedTenantId === company.tenantId
                ? 'border-teal-500 bg-teal-50'
                : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/30'
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {(company.tenantName || company.workspaceName || 'C').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 truncate">
                {company.tenantName || company.workspaceName || 'Unknown Company'}
              </p>
              {company.industry && (
                <p className="text-xs text-slate-500 capitalize">{company.industry.replace('-', ' ')}</p>
              )}
            </div>
            {selectedTenantId === company.tenantId && (
              <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>

      <Button
        type="button"
        onClick={handleCustomerLogin}
        disabled={isLoading || !selectedTenantId}
        className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-medium cursor-pointer mt-6"
      >
        {isLoading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
        ) : 'Continue'}
      </Button>
    </motion.div>
  );

  // ─── Render: Customer Tab Content (OTP Step) ───
  const renderCustomerOtpStep = () => (
    <motion.div
      key="customer-otp"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="w-full"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <button
          onClick={() => {
            setCustomerStep('credentials');
            setOtpValue('');
          }}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Verify OTP
        </h2>
        <p className="text-slate-500 text-sm mt-1.5">
          Enter the 6-digit code sent to{' '}
          <span className="font-semibold text-slate-700">
            +91 {customerPhone}
          </span>
        </p>
      </motion.div>

      {/* Shield icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex justify-center mb-6"
      >
        <div className="w-14 h-14 rounded-2xl bg-teal-50 border-2 border-teal-200 flex items-center justify-center">
          <ShieldCheck className="w-7 h-7 text-teal-600" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="space-y-6"
      >
        {/* OTP Input */}
        <div className="flex flex-col items-center gap-2">
          <InputOTP
            maxLength={6}
            value={otpValue}
            onChange={setOtpValue}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="h-14 w-12 text-xl font-semibold border-2 border-slate-200 data-[active=true]:border-teal-500 data-[active=true]:ring-teal-500/20" />
              <InputOTPSlot index={1} className="h-14 w-12 text-xl font-semibold border-2 border-slate-200 data-[active=true]:border-teal-500 data-[active=true]:ring-teal-500/20" />
              <InputOTPSlot index={2} className="h-14 w-12 text-xl font-semibold border-2 border-slate-200 data-[active=true]:border-teal-500 data-[active=true]:ring-teal-500/20" />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} className="h-14 w-12 text-xl font-semibold border-2 border-slate-200 data-[active=true]:border-teal-500 data-[active=true]:ring-teal-500/20" />
              <InputOTPSlot index={4} className="h-14 w-12 text-xl font-semibold border-2 border-slate-200 data-[active=true]:border-teal-500 data-[active=true]:ring-teal-500/20" />
              <InputOTPSlot index={5} className="h-14 w-12 text-xl font-semibold border-2 border-slate-200 data-[active=true]:border-teal-500 data-[active=true]:ring-teal-500/20" />
            </InputOTPGroup>
          </InputOTP>

          {/* Simulated OTP hint */}
          {simulatedOtp && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium"
            >
              Demo Mode — OTP: <span className="font-bold text-amber-900">{simulatedOtp}</span>
            </motion.div>
          )}
        </div>

        {/* Verify Button */}
        <Button
          type="button"
          onClick={handleVerifyOtp}
          disabled={isLoading || otpValue.length !== 6}
          className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-medium cursor-pointer text-base"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              Verify & Login
            </>
          )}
        </Button>

        {/* Resend OTP */}
        <div className="text-center">
          {resendTimer > 0 ? (
            <p className="text-sm text-slate-500">
              Resend OTP in{' '}
              <span className="font-semibold text-slate-700">{resendTimer}s</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-semibold hover:underline transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Resend OTP
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );

  // ─── Main Render ───
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel — Branding (desktop only) */}
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

          {/* ─── Login Tabs — Business | Employee | Customer ─── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mb-6"
          >
            <div className="flex rounded-xl bg-slate-100 p-1.5 gap-1.5">
              {/* Business Login Tab */}
              <button
                type="button"
                onClick={() => handleTabSwitch('business')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  loginTab === 'business'
                    ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 border border-transparent'
                }`}
              >
                <Building2 className={`w-4 h-4 ${loginTab === 'business' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Business</span>
              </button>

              {/* Employee Login Tab */}
              <button
                type="button"
                onClick={() => handleTabSwitch('employee')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  loginTab === 'employee'
                    ? 'bg-white text-amber-700 shadow-sm border border-amber-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 border border-transparent'
                }`}
              >
                <HardHat className={`w-4 h-4 ${loginTab === 'employee' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>Employee</span>
              </button>

              {/* Customer Login Tab */}
              <button
                type="button"
                onClick={() => handleTabSwitch('customer')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  loginTab === 'customer'
                    ? 'bg-white text-teal-700 shadow-sm border border-teal-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 border border-transparent'
                }`}
              >
                <User className={`w-4 h-4 ${loginTab === 'customer' ? 'text-teal-600' : 'text-slate-400'}`} />
                <span>Customer</span>
              </button>
            </div>
          </motion.div>

          {/* Dynamic Content based on active tab */}
          <AnimatePresence mode="wait">
            {loginTab === 'business' && (
              <motion.div
                key="business-tab"
                variants={tabContentVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {renderBusinessContent()}
              </motion.div>
            )}
            {loginTab === 'employee' && renderEmployeeContent()}
            {loginTab === 'customer' && customerStep === 'credentials' && renderCustomerCredentialsStep()}
            {loginTab === 'customer' && customerStep === 'company' && renderCustomerCompanyStep()}
            {loginTab === 'customer' && customerStep === 'otp' && renderCustomerOtpStep()}
          </AnimatePresence>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-center text-xs text-slate-400 mt-8"
          >
            By continuing, you agree to ServiceOS&apos;s{' '}
            <span className="underline cursor-pointer hover:text-slate-500">Terms of Service</span>
            {' '}and{' '}
            <span className="underline cursor-pointer hover:text-slate-500">Privacy Policy</span>
          </motion.p>
        </div>
      </div>
    </div>
  );
}
