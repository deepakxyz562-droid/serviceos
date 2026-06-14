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
type LoginTab = 'business' | 'customer';
type BusinessTab = 'login' | 'register';
type CustomerStep = 'phone' | 'otp';

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

  // Customer Login state
  const [customerStep, setCustomerStep] = useState<CustomerStep>('phone');
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
    // Reset customer step when switching to customer tab
    if (tab === 'customer') {
      setCustomerStep('phone');
      setOtpValue('');
      setOtpSent(false);
      setSimulatedOtp(null);
    }
  };

  const goBackToPhone = () => {
    setCustomerStep('phone');
    setOtpValue('');
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

  // ─── Send OTP Handler ───
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

      // Store auth data
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

  // ─── Render: Customer Tab Content (Phone Step) ───
  const renderCustomerPhoneStep = () => (
    <motion.div
      key="customer-phone"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="w-full"
    >
      {/* WhatsApp icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex justify-center mb-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-green-50 border-2 border-green-200 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="customer-phone" className="text-slate-700">
            Mobile Number
          </Label>
          <div className="flex gap-2">
            <div className="flex-shrink-0 w-[88px] h-10 rounded-md border border-slate-200 bg-white flex items-center justify-center gap-1.5 px-3 text-sm font-medium text-slate-600">
              🇮🇳 +91
            </div>
            <Input
              id="customer-phone"
              type="tel"
              placeholder="98765 43210"
              value={customerPhone}
              onChange={(e) => {
                // Only allow digits and spaces
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
          className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-medium cursor-pointer text-base"
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
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="text-center text-xs text-slate-400 mt-6"
      >
        We&apos;ll send a 6-digit code to your WhatsApp number
      </motion.p>
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
          onClick={goBackToPhone}
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

          {/* ─── Prominent Login Tabs ─── */}
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
                className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  loginTab === 'business'
                    ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 border border-transparent'
                }`}
              >
                <Building2 className={`w-4.5 h-4.5 ${loginTab === 'business' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Business Login</span>
              </button>

              {/* Customer Login Tab */}
              <button
                type="button"
                onClick={() => handleTabSwitch('customer')}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  loginTab === 'customer'
                    ? 'bg-white text-teal-700 shadow-sm border border-teal-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 border border-transparent'
                }`}
              >
                <MessageSquare className={`w-4.5 h-4.5 ${loginTab === 'customer' ? 'text-teal-600' : 'text-slate-400'}`} />
                <span>Customer Login</span>
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
            {loginTab === 'customer' && customerStep === 'phone' && renderCustomerPhoneStep()}
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
