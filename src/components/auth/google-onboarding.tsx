'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Zap,
  Mail,
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
  Check,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface GoogleOnboardingProps {
  email: string;
  name: string;
  avatar: string;
  onOnboardingComplete: (user: any, tenant: any) => void;
  onBackToLanding: () => void;
}

const INDUSTRIES = [
  { value: 'plumbing', label: 'Plumbing', icon: Wrench, color: 'text-emerald-500' },
  { value: 'cleaning', label: 'Cleaning', icon: Sparkles, color: 'text-teal-500' },
  { value: 'packers-movers', label: 'Packers & Movers', icon: Truck, color: 'text-amber-500' },
  { value: 'window-cleaning', label: 'Window Cleaning', icon: Droplets, color: 'text-cyan-500' },
  { value: 'pest-control', label: 'Pest Control', icon: Bug, color: 'text-red-500' },
  { value: 'hvac', label: 'HVAC', icon: Wind, color: 'text-sky-500' },
  { value: 'electrical', label: 'Electrical', icon: Flame, color: 'text-yellow-500' },
  { value: 'landscaping', label: 'Landscaping', icon: Leaf, color: 'text-green-500' },
  { value: 'courier', label: 'Courier', icon: Package, color: 'text-orange-500' },
  { value: 'home-repair', label: 'Home Repair', icon: Hammer, color: 'text-lime-600' },
  { value: 'salon-beauty', label: 'Salon & Beauty', icon: Scissors, color: 'text-pink-500' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' as const },
  }),
};

export function GoogleOnboarding({
  email,
  name,
  avatar,
  onOnboardingComplete,
  onBackToLanding,
}: GoogleOnboardingProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [phone, setPhone] = useState('');

  const isValid = businessName.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      toast.error('Please enter your business name');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/google/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          industry: industry || undefined,
          phone: phone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to complete setup');
        return;
      }
      localStorage.setItem('serviceos_user', JSON.stringify(data.user));
      if (data.tenant) localStorage.setItem('serviceos_tenant', JSON.stringify(data.tenant));
      toast.success('Business account created!');
      onOnboardingComplete(data.user, data.tenant);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel — Branding */}
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
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/30">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-white text-xl font-bold tracking-tight">ServiceOS</span>
          </div>
        </div>
        <div className="relative z-10 max-w-lg">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4"
          >
            One more step to{' '}
            <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
              get started
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-slate-300 text-base xl:text-lg leading-relaxed"
          >
            Tell us about your business and we&apos;ll set everything up for you
            in under a minute.
          </motion.p>
        </div>
        <div className="absolute top-1/3 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-48 h-48 bg-teal-500/8 rounded-full blur-3xl" />
      </motion.div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-10 bg-white min-h-screen lg:min-h-0">
        <div className="w-full max-w-md">
          {/* Mobile branding + Back */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2.5 mb-8"
          >
            <button
              onClick={onBackToLanding}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mr-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Back
            </button>
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200">
              <Zap className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">ServiceOS</span>
          </motion.div>

          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mb-6"
          >
            <div className="flex items-center gap-3 mb-4">
              {avatar ? (
                <img src={avatar} alt={name} className="w-10 h-10 rounded-full border-2 border-emerald-200" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-emerald-700 font-bold text-sm">
                    {name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-500">Signed in as</p>
                <p className="text-sm font-medium text-slate-900">{email}</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Complete your setup
            </h2>
            <p className="text-slate-500 text-sm mt-1.5">
              Tell us about your business to finish creating your account
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Business Name */}
            <motion.div
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              <Label htmlFor="google-business" className="text-slate-700">
                Business Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="google-business"
                  type="text"
                  placeholder="Acme Services Inc."
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                  autoComplete="organization"
                />
              </div>
            </motion.div>

            {/* Industry */}
            <motion.div
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              <Label className="text-slate-700">Industry</Label>
              <div className="grid grid-cols-3 gap-2">
                {INDUSTRIES.map((ind) => {
                  const IconComp = ind.icon;
                  const isSelected = industry === ind.value;
                  return (
                    <button
                      key={ind.value}
                      type="button"
                      onClick={() => setIndustry(ind.value)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-2 text-xs font-medium transition-all duration-200',
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50'
                      )}
                    >
                      <IconComp className={cn('w-3.5 h-3.5', isSelected ? 'text-emerald-600' : ind.color)} />
                      <span className="truncate">{ind.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-emerald-600 ml-auto flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Phone */}
            <motion.div
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              <Label htmlFor="google-phone" className="text-slate-700">
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="google-phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 h-10 bg-white border-slate-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                  autoComplete="tel"
                />
              </div>
            </motion.div>

            {/* Submit */}
            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="pt-2"
            >
              <Button
                type="submit"
                disabled={isLoading || !isValid}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </motion.div>

            {/* Info */}
            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="pt-2"
            >
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-emerald-700">
                    <p className="font-medium">14-day free trial included</p>
                    <p className="text-emerald-600 mt-0.5">
                      No credit card required. You can choose your plan after exploring the platform.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </form>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-center text-xs text-slate-400 mt-6"
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
