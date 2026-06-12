'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  MessageCircle,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Phone,
  Key,
  Shield,
  Crown,
  Star,
  Zap,
  UserPlus,
  FileText,
  LayoutDashboard,
  Loader2,
  Check,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SaaSOnboardingProps {
  tenant: any;
  user: any;
  onComplete: () => void;
}

type WhatsAppOption = 'platform' | 'own-api' | 'skip';

interface Step1Data {
  businessName: string;
  industry: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

interface Step2Data {
  whatsappOption: WhatsAppOption;
  whatsappPhone: string;
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
}

interface Step3Data {
  plan: string;
  billing: 'monthly' | 'yearly';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 1, label: 'Your Business', icon: Building2 },
  { id: 2, label: 'Connect WhatsApp', icon: MessageCircle },
  { id: 3, label: 'Choose Your Plan', icon: CreditCard },
  { id: 4, label: 'All Set!', icon: CheckCircle2 },
] as const;

const INDUSTRIES = [
  { id: 'plumbing', label: 'Plumbing', icon: '🔧' },
  { id: 'cleaning', label: 'Cleaning', icon: '🧹' },
  { id: 'packers-movers', label: 'Packers & Movers', icon: '📦' },
  { id: 'window-cleaning', label: 'Window Cleaning', icon: '🪟' },
  { id: 'pest-control', label: 'Pest Control', icon: '🐛' },
  { id: 'hvac', label: 'HVAC', icon: '❄️' },
  { id: 'electrical', label: 'Electrical', icon: '⚡' },
  { id: 'landscaping', label: 'Landscaping', icon: '🌿' },
  { id: 'courier', label: 'Courier', icon: '🚚' },
  { id: 'home-repair', label: 'Home Repair', icon: '🏠' },
  { id: 'salon-beauty', label: 'Salon & Beauty', icon: '💇' },
] as const;

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 10,
    yearlyPrice: 100, // 2 months free
    description: 'Perfect for getting started',
    features: ['1 user', '100 jobs/month', '10 workflows', 'Email support'],
    icon: Zap,
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 25,
    yearlyPrice: 250,
    description: 'For growing businesses',
    features: ['5 users', '1,000 jobs/month', '50 workflows', 'Priority support', 'Custom templates'],
    icon: Star,
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 50,
    yearlyPrice: 500,
    description: 'For scaling operations',
    features: ['Unlimited users', 'Unlimited jobs', 'Unlimited workflows', 'Priority support', 'Custom templates', 'API access', 'Advanced analytics'],
    icon: Crown,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'For large organizations',
    features: ['Everything in Pro', 'White-label', 'Dedicated account manager', 'Priority support', 'Custom integrations', 'SLA guarantee'],
    icon: Shield,
  },
] as const;

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SaaSOnboarding({ tenant, user, onComplete }: SaaSOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [step1, setStep1] = useState<Step1Data>({
    businessName: tenant?.name || user?.name || '',
    industry: null,
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Step 2
  const [step2, setStep2] = useState<Step2Data>({
    whatsappOption: 'platform',
    whatsappPhone: '',
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
  });

  // Step 3
  const [step3, setStep3] = useState<Step3Data>({
    plan: 'growth',
    billing: 'monthly',
  });

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const tenantId = tenant?.id || tenant?.tenantId || 'default';

  const goToStep = useCallback(
    (step: number) => {
      if (step < 1 || step > 4) return;
      // Only allow jumping to completed steps or the next available step
      if (step > currentStep + 1) return;
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
    },
    [currentStep],
  );

  const goNext = useCallback(() => {
    if (currentStep < 4) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  // -------------------------------------------------------------------------
  // API helpers
  // -------------------------------------------------------------------------

  const saveTenantProgress = useCallback(
    async (payload: Record<string, any>) => {
      try {
        const res = await fetch(`/api/tenants/${tenantId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error('Failed to save progress');
        }
      } catch (err) {
        console.error('Save tenant progress error:', err);
      }
    },
    [tenantId],
  );

  const createSubscription = useCallback(
    async (plan: string, billing: string) => {
      try {
        const res = await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, plan, billing }),
        });
        if (!res.ok) {
          throw new Error('Failed to create subscription');
        }
      } catch (err) {
        console.error('Create subscription error:', err);
      }
    },
    [tenantId],
  );

  // -------------------------------------------------------------------------
  // Step validators & handlers
  // -------------------------------------------------------------------------

  const isStep1Valid = step1.businessName.trim().length > 0 && step1.industry !== null;

  const isStep2Valid = (() => {
    if (step2.whatsappOption === 'platform') {
      return step2.whatsappPhone.trim().length >= 10;
    }
    if (step2.whatsappOption === 'own-api') {
      return (
        step2.phoneNumberId.trim().length > 0 &&
        step2.businessAccountId.trim().length > 0 &&
        step2.accessToken.trim().length > 0
      );
    }
    return true; // skip
  })();

  const handleStep1Next = useCallback(async () => {
    if (!isStep1Valid) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      await saveTenantProgress({
        onboardingStep: 2,
        industry: step1.industry,
        name: step1.businessName,
        address: step1.address,
        city: step1.city,
        state: step1.state,
        pincode: step1.pincode,
      });
      toast.success('Business details saved!');
      goNext();
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [isStep1Valid, saveTenantProgress, step1, goNext]);

  const handleStep2Next = useCallback(async () => {
    if (!isStep2Valid) {
      toast.error('Please complete the WhatsApp setup');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        onboardingStep: 3,
      };
      if (step2.whatsappOption === 'platform') {
        payload.whatsappPhone = step2.whatsappPhone;
      } else if (step2.whatsappOption === 'own-api') {
        payload.whatsappPhone = step2.whatsappPhone;
        payload.whatsappConfigJson = JSON.stringify({
          phoneNumberId: step2.phoneNumberId,
          businessAccountId: step2.businessAccountId,
          accessToken: step2.accessToken,
          provider: 'meta-business',
        });
      }
      await saveTenantProgress(payload);
      toast.success('WhatsApp configuration saved!');
      goNext();
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [isStep2Valid, saveTenantProgress, step2, goNext]);

  const handleStep3Next = useCallback(async () => {
    setSaving(true);
    try {
      await createSubscription(step3.plan, step3.billing);
      await saveTenantProgress({
        onboardingStep: 4,
        plan: step3.plan,
      });
      toast.success('Plan selected! Starting your free trial.');
      goNext();
    } catch {
      toast.error('Failed to select plan. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [createSubscription, saveTenantProgress, step3, goNext]);

  const handleComplete = useCallback(async () => {
    setSaving(true);
    try {
      await saveTenantProgress({
        onboardingStep: 4,
        onboardingCompleted: true,
      });
      toast.success('Welcome to ServiceOS! 🎉');
      onComplete();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [saveTenantProgress, onComplete]);

  const handleNext = useCallback(() => {
    if (currentStep === 1) handleStep1Next();
    else if (currentStep === 2) handleStep2Next();
    else if (currentStep === 3) handleStep3Next();
    else if (currentStep === 4) handleComplete();
  }, [currentStep, handleStep1Next, handleStep2Next, handleStep3Next, handleComplete]);

  // -------------------------------------------------------------------------
  // Format price
  // -------------------------------------------------------------------------

  const formatPrice = (amount: number) => {
    if (amount === 0) return 'Custom';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // -------------------------------------------------------------------------
  // Render: Step Indicator
  // -------------------------------------------------------------------------

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6">
      {STEPS.map((step, idx) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        const isClickable = isCompleted || step.id === currentStep;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step circle */}
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && goToStep(step.id)}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-200',
                isActive &&
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                isCompleted &&
                  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-pointer hover:bg-emerald-500/20',
                !isActive &&
                  !isCompleted &&
                  'text-muted-foreground opacity-50',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-xs font-bold transition-all',
                  isActive && 'bg-emerald-500 text-white',
                  isCompleted && 'bg-emerald-500 text-white',
                  !isActive && !isCompleted && 'bg-muted text-muted-foreground',
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  step.id
                )}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-1 h-0.5 w-4 sm:w-8 rounded-full transition-all',
                  currentStep > step.id
                    ? 'bg-emerald-500'
                    : 'bg-muted',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // -------------------------------------------------------------------------
  // Render: Step 1 – Your Business
  // -------------------------------------------------------------------------

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Your Business</h2>
        <p className="text-muted-foreground mt-1">
          Tell us about your business so we can tailor your experience
        </p>
      </div>

      {/* Business Name */}
      <div className="space-y-2">
        <Label htmlFor="businessName" className="text-sm font-medium">
          Business Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="businessName"
          placeholder="Enter your business name"
          value={step1.businessName}
          onChange={(e) => setStep1((s) => ({ ...s, businessName: e.target.value }))}
          className="h-11"
        />
      </div>

      {/* Industry Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Industry <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {INDUSTRIES.map((ind) => {
            const isSelected = step1.industry === ind.id;
            return (
              <button
                key={ind.id}
                type="button"
                onClick={() => setStep1((s) => ({ ...s, industry: ind.id }))}
                className={cn(
                  'group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all duration-200',
                  'hover:border-emerald-400/50 hover:shadow-md hover:shadow-emerald-500/5',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10 dark:bg-emerald-950/20'
                    : 'border-border bg-card hover:bg-accent/50',
                )}
              >
                <span className="text-3xl" role="img" aria-label={ind.label}>
                  {ind.icon}
                </span>
                <span
                  className={cn(
                    'text-xs font-semibold leading-tight',
                    isSelected
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-foreground',
                  )}
                >
                  {ind.label}
                </span>
                {isSelected && (
                  <motion.div
                    layoutId="industry-check"
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <Check className="h-3 w-3" />
                  </motion.div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Business Address */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Business Address</Label>
        <Input
          placeholder="Street address"
          value={step1.address}
          onChange={(e) => setStep1((s) => ({ ...s, address: e.target.value }))}
          className="h-11"
        />
        <div className="grid grid-cols-3 gap-3">
          <Input
            placeholder="City"
            value={step1.city}
            onChange={(e) => setStep1((s) => ({ ...s, city: e.target.value }))}
            className="h-11"
          />
          <Input
            placeholder="State"
            value={step1.state}
            onChange={(e) => setStep1((s) => ({ ...s, state: e.target.value }))}
            className="h-11"
          />
          <Input
            placeholder="Pincode"
            value={step1.pincode}
            onChange={(e) => setStep1((s) => ({ ...s, pincode: e.target.value }))}
            className="h-11"
          />
        </div>
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // Render: Step 2 – Connect WhatsApp
  // -------------------------------------------------------------------------

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Connect WhatsApp</h2>
        <p className="text-muted-foreground mt-1">
          Set up WhatsApp to communicate with your customers
        </p>
      </div>

      <RadioGroup
        value={step2.whatsappOption}
        onValueChange={(val) =>
          setStep2((s) => ({ ...s, whatsappOption: val as WhatsAppOption }))
        }
        className="space-y-4"
      >
        {/* Option A: Platform WhatsApp */}
        <div
          className={cn(
            'relative rounded-xl border-2 p-5 transition-all duration-200 cursor-pointer',
            step2.whatsappOption === 'platform'
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-border hover:border-emerald-400/30',
          )}
          onClick={() => setStep2((s) => ({ ...s, whatsappOption: 'platform' }))}
        >
          <div className="flex items-start gap-3">
            <RadioGroupItem value="platform" id="platform" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="platform" className="text-base font-semibold cursor-pointer">
                  Use Platform WhatsApp
                </Label>
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-[10px] px-2">
                  Easiest
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Just enter your WhatsApp number. Our platform handles all the setup,
                messaging, and compliance.
              </p>

              <AnimatePresence>
                {step2.whatsappOption === 'platform' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="whatsappPhone" className="text-sm font-medium">
                        WhatsApp Number <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="whatsappPhone"
                          placeholder="+91 98765 43210"
                          value={step2.whatsappPhone}
                          onChange={(e) =>
                            setStep2((s) => ({ ...s, whatsappPhone: e.target.value }))
                          }
                          className="h-11 pl-10"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Option B: Own WhatsApp API */}
        <div
          className={cn(
            'relative rounded-xl border-2 p-5 transition-all duration-200 cursor-pointer',
            step2.whatsappOption === 'own-api'
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-border hover:border-emerald-400/30',
          )}
          onClick={() => setStep2((s) => ({ ...s, whatsappOption: 'own-api' }))}
        >
          <div className="flex items-start gap-3">
            <RadioGroupItem value="own-api" id="own-api" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="own-api" className="text-base font-semibold cursor-pointer">
                  Connect Your Own WhatsApp API
                </Label>
                <Badge variant="outline" className="text-[10px] px-2">
                  Advanced
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Use your existing Meta Business Account and WhatsApp Business API
                credentials.
              </p>

              <AnimatePresence>
                {step2.whatsappOption === 'own-api' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumberId" className="text-sm font-medium">
                          Phone Number ID <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phoneNumberId"
                            placeholder="Enter Phone Number ID"
                            value={step2.phoneNumberId}
                            onChange={(e) =>
                              setStep2((s) => ({ ...s, phoneNumberId: e.target.value }))
                            }
                            className="h-11 pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessAccountId" className="text-sm font-medium">
                          Business Account ID <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="businessAccountId"
                            placeholder="Enter Business Account ID"
                            value={step2.businessAccountId}
                            onChange={(e) =>
                              setStep2((s) => ({
                                ...s,
                                businessAccountId: e.target.value,
                              }))
                            }
                            className="h-11 pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accessToken" className="text-sm font-medium">
                          Access Token <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="accessToken"
                            type="password"
                            placeholder="Enter your access token"
                            value={step2.accessToken}
                            onChange={(e) =>
                              setStep2((s) => ({ ...s, accessToken: e.target.value }))
                            }
                            className="h-11 pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Option C: Skip */}
        <div
          className={cn(
            'relative rounded-xl border-2 p-5 transition-all duration-200 cursor-pointer',
            step2.whatsappOption === 'skip'
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-border hover:border-emerald-400/30',
          )}
          onClick={() => setStep2((s) => ({ ...s, whatsappOption: 'skip' }))}
        >
          <div className="flex items-start gap-3">
            <RadioGroupItem value="skip" id="skip" className="mt-1" />
            <div>
              <Label htmlFor="skip" className="text-base font-semibold cursor-pointer">
                Skip for now
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                You can always configure WhatsApp later from your settings.
              </p>
            </div>
          </div>
        </div>
      </RadioGroup>
    </div>
  );

  // -------------------------------------------------------------------------
  // Render: Step 3 – Choose Your Plan
  // -------------------------------------------------------------------------

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Choose Your Plan</h2>
        <p className="text-muted-foreground mt-1">
          Start with a 14-day free trial. No credit card required.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3">
        <span
          className={cn(
            'text-sm font-medium',
            step3.billing === 'monthly' ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={step3.billing === 'yearly'}
          onClick={() =>
            setStep3((s) => ({
              ...s,
              billing: s.billing === 'monthly' ? 'yearly' : 'monthly',
            }))
          }
          className={cn(
            'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200',
            step3.billing === 'yearly' ? 'bg-emerald-500' : 'bg-muted',
          )}
        >
          <span
            className={cn(
              'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200',
              step3.billing === 'yearly' ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
        <span
          className={cn(
            'text-sm font-medium',
            step3.billing === 'yearly' ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          Yearly
        </span>
        {step3.billing === 'yearly' && (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-xs">
            Save 2 months!
          </Badge>
        )}
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLANS.map((plan) => {
          const PlanIcon = plan.icon;
          const isSelected = step3.plan === plan.id;
          const price =
            step3.billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;

          return (
            <Card
              key={plan.id}
              className={cn(
                'relative cursor-pointer transition-all duration-200 overflow-hidden',
                isSelected
                  ? 'border-2 border-emerald-500 shadow-lg shadow-emerald-500/10'
                  : 'border hover:border-emerald-400/30 hover:shadow-md',
              )}
              onClick={() => setStep3((s) => ({ ...s, plan: plan.id }))}
            >
              {'popular' in plan && (
                <div className="absolute top-0 right-0">
                  <div className="flex items-center gap-1 rounded-bl-lg bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
                    <Sparkles className="h-3 w-3" />
                    Popular
                  </div>
                </div>
              )}

              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      isSelected
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : 'bg-muted',
                    )}
                  >
                    <PlanIcon
                      className={cn(
                        'h-5 w-5',
                        isSelected
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground',
                      )}
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-4">
                  {plan.monthlyPrice === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">Custom</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">
                        {formatPrice(price)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        /{step3.billing === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>
                  )}
                </div>

                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  className={cn(
                    'w-full',
                    isSelected &&
                      'bg-emerald-600 hover:bg-emerald-700 text-white',
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setStep3((s) => ({ ...s, plan: plan.id }));
                  }}
                >
                  {plan.monthlyPrice === 0 ? 'Contact Sales' : 'Start Free Trial'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        14-day free trial on all plans. No credit card required. Cancel anytime.
      </p>
    </div>
  );

  // -------------------------------------------------------------------------
  // Render: Step 4 – All Set!
  // -------------------------------------------------------------------------

  const renderStep4 = () => {
    const quickActions = [
      {
        icon: UserPlus,
        label: 'Add Employees',
        description: 'Invite your team members',
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      },
      {
        icon: FileText,
        label: 'Create First Job',
        description: 'Set up your first service job',
        color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      },
      {
        icon: MessageCircle,
        label: 'Connect WhatsApp',
        description: 'Set up messaging',
        color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
      },
      {
        icon: LayoutDashboard,
        label: 'Go to Dashboard',
        description: 'Explore your workspace',
        color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      },
    ];

    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center text-center">
          {/* Animated Checkmark */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.1,
            }}
            className="mb-6"
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                  delay: 0.3,
                }}
              >
                <CheckCircle2 className="h-14 w-14 text-emerald-500" />
              </motion.div>
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-3xl font-bold text-foreground"
          >
            Your workspace is ready!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-muted-foreground mt-2 max-w-md"
          >
            Everything is set up. Here are some quick actions to get you started.
          </motion.p>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-2 gap-3"
        >
          {quickActions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                className="group flex flex-col items-center gap-2 rounded-xl border-2 border-border p-5 text-center transition-all duration-200 hover:border-emerald-400/50 hover:shadow-md hover:shadow-emerald-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-lg transition-transform group-hover:scale-110',
                    action.color,
                  )}
                >
                  <ActionIcon className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {action.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {action.description}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* Get Started CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="flex justify-center"
        >
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 h-12 text-base font-semibold shadow-lg shadow-emerald-500/25"
            onClick={handleComplete}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Get Started
              </>
            )}
          </Button>
        </motion.div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Render: Navigation
  // -------------------------------------------------------------------------

  const renderNavigation = () => {
    if (currentStep === 4) return null;

    const isValid =
      currentStep === 1
        ? isStep1Valid
        : currentStep === 2
          ? isStep2Valid
          : true;

    return (
      <div className="flex items-center justify-between pt-4 mt-2 border-t">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={currentStep === 1 || saving}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Step {currentStep} of {STEPS.length}
        </div>

        <Button
          onClick={handleNext}
          disabled={!isValid || saving}
          className={cn(
            'gap-2',
            isValid &&
              'bg-emerald-600 hover:bg-emerald-700 text-white',
          )}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              {currentStep === 3 ? 'Start Free Trial' : 'Continue'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  return (
    <Dialog open onOpenChange={() => {/* not closeable */}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-3xl max-h-[92vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>ServiceOS Onboarding</DialogTitle>
          <DialogDescription>Set up your ServiceOS workspace</DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-1.5 mb-2">
          <motion.div
            className="bg-emerald-500 h-1.5 rounded-full"
            initial={false}
            animate={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>

        {/* Step indicator */}
        {renderStepIndicator()}

        <Separator className="mb-2" />

        {/* Step content with animation */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {renderCurrentStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        {renderNavigation()}
      </DialogContent>
    </Dialog>
  );
}
