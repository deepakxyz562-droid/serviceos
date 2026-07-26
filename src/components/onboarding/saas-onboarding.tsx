'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Shield,
  Crown,
  Star,
  Zap,
  UserPlus,
  FileText,
  LayoutDashboard,
  Loader2,
  Check,
  Briefcase,
  MapPin,
  Clock,
  Wrench,
  DollarSign,
  Users,
  ShieldCheck,
  Languages,
  Store,
  Plus,
  X,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { PayPalCheckoutDialog, type PaypalCheckoutPlan } from '@/components/billing/paypal-checkout-dialog';
import {
  INDUSTRY_CATALOG,
  VERTICALS,
  getIndustriesByVertical,
  type Industry,
} from '@/lib/industry-catalog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SaaSOnboardingProps {
  tenant: any;
  user: any;
  onComplete: () => void;
}

interface Step1Data {
  businessName: string;
  industry: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

interface Step3Data {
  plan: string;
  billing: 'monthly' | 'yearly';
  // How the user wants to start: 'trial' (14-day free trial, no card) or
  // 'pay' (subscribe & pay now via PayPal, immediate access).
  startMode: 'trial' | 'pay';
}

// ── Phase-3 Business Profile step ────────────────────────────────────────────
// Captures all the marketplace-eligibility fields needed for a tenant to
// receive public marketplace leads: categories, coverage area, hours, pricing,
// insurance, credentials, languages, marketplace opt-in, Stripe Connect.
type PricingType = 'fixed' | 'hourly' | 'starting_from' | 'custom_quote' | 'mixed';

interface DayHours {
  open: string;   // "09:00" — 24h HH:MM
  close: string;  // "17:00"
  byAppointment: boolean; // when true, open/close are ignored
  closed: boolean;         // when true, not operating that day
}

interface Step2Data {
  // Categories (multi-select from 25 industries grouped by 9 verticals)
  businessCategories: string[]; // industry IDs from INDUSTRY_CATALOG
  // Coverage area — postcodes or city names (free-form tag input)
  coverageAreas: string[];
  coverageAreaInput: string;
  // Business hours — mon-sun, or "by appointment" globally
  businessHours: Record<string, DayHours>;
  byAppointmentOnly: boolean;
  // Emergency service toggle
  emergencyServiceAvailable: boolean;
  // Pricing
  pricingType: PricingType | '';
  callOutFee: string;       // number-as-string for input control
  travelFeePerKm: string;
  emergencySurchargePct: string;
  weekendSurchargePct: string;
  // Operations
  employeesCount: string;
  // Insurance
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insuranceExpiryDate: string; // ISO date string (yyyy-mm-dd)
  // Credentials
  licenceNumber: string;
  vatNumber: string;
  // Languages spoken (multi-select from preset list)
  languages: string[];
  // Marketplace opt-in
  marketplaceOptIn: boolean;
  marketplaceTermsAccepted: boolean;
  // Stripe Connect — tracked locally; source-of-truth is the backend
  stripeConnected: boolean;
  stripeStatusLoading: boolean;
  // Profile completion — populated after PATCH save
  profileCompletionPct: number;
  // Validation errors keyed by field id
  errors: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// 4-step wizard (phase-3 adds the "Business Profile" step at #2, pushing the
// existing plan + completion steps down):
//   1. Your Business    → basic identity (name, industry, address)
//   2. Business Profile → rich marketplace-eligibility data (this phase)
//   3. Choose Your Plan → subscription / trial
//   4. All Set!         → completion + quick actions
const STEPS = [
  { id: 1, label: 'Your Business', icon: Building2 },
  { id: 2, label: 'Business Profile', icon: Briefcase },
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
    yearlyPrice: 60, // 50% off annual
    description: 'Perfect for getting started',
    features: ['1 user', '100 jobs/month', '10 workflows', 'Email support'],
    icon: Zap,
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 25,
    yearlyPrice: 150, // 50% off annual
    description: 'For growing businesses',
    features: ['5 users', '1,000 jobs/month', '50 workflows', 'Priority support', 'Custom templates'],
    icon: Star,
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 50,
    yearlyPrice: 300, // 50% off annual
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

// ── Phase-3 Business Profile: pricing + language + day presets ───────────────
const PRICING_TYPE_OPTIONS: { value: PricingType; label: string; hint: string }[] = [
  { value: 'fixed', label: 'Fixed Price', hint: 'Same price for every job' },
  { value: 'hourly', label: 'Hourly Rate', hint: 'Billed by the hour' },
  { value: 'starting_from', label: 'Starting From', hint: 'Base price — final quote varies' },
  { value: 'custom_quote', label: 'Custom Quote', hint: 'Each job quoted individually' },
  { value: 'mixed', label: 'Mixed', hint: 'Combination of the above' },
];

const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh', label: 'Chinese' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'ko', label: 'Korean' },
  { code: 'tr', label: 'Turkish' },
  { code: 'pl', label: 'Polish' },
  { code: 'ur', label: 'Urdu' },
  { code: 'bn', label: 'Bengali' },
  { code: 'pa', label: 'Punjabi' },
];

const DAYS_OF_WEEK: { key: string; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

/** Default business hours: 9-5 Mon-Fri, closed Sat/Sun. */
const DEFAULT_BUSINESS_HOURS: Record<string, DayHours> = DAYS_OF_WEEK.reduce(
  (acc, day) => {
    const isWeekend = day.key === 'sat' || day.key === 'sun';
    acc[day.key] = {
      open: '09:00',
      close: '17:00',
      byAppointment: false,
      closed: isWeekend,
    };
    return acc;
  },
  {} as Record<string, DayHours>,
);

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

/**
 * Initialize step-2 state from an existing tenant object. Lets the user
 * resume onboarding mid-flight without losing their previously-saved
 * marketplace-eligibility data.
 */
function initializeStep2(tenant: any): Step2Data {
  // Parse the JSON columns defensively — they may be missing/malformed on a
  // fresh tenant that hasn't been through step 2 yet.
  const parseArr = (raw: unknown): string[] => {
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const parseHours = (raw: unknown): Record<string, DayHours> => {
    let obj: Record<string, unknown> = {};
    if (typeof raw === 'string') {
      try {
        obj = JSON.parse(raw) || {};
      } catch {
        obj = {};
      }
    } else if (raw && typeof raw === 'object') {
      obj = raw as Record<string, unknown>;
    }
    // If the tenant previously chose "by appointment only", the JSON is
    // { byAppointmentOnly: true }. Detect that + fall back to defaults.
    if (obj?.byAppointmentOnly === true) {
      return { ...DEFAULT_BUSINESS_HOURS };
    }
    // Merge any saved per-day entries over the defaults so missing days
    // still have sensible open/close values.
    const merged: Record<string, DayHours> = { ...DEFAULT_BUSINESS_HOURS };
    for (const day of DAYS_OF_WEEK) {
      const saved = obj[day.key] as Partial<DayHours> | undefined;
      if (saved && typeof saved === 'object') {
        merged[day.key] = {
          open: saved.open || '09:00',
          close: saved.close || '17:00',
          byAppointment: !!saved.byAppointment,
          closed: !!saved.closed,
        };
      }
    }
    return merged;
  };

  const categories = parseArr(tenant?.businessCategoriesJson);
  const languages = parseArr(tenant?.languagesJson);
  const coverageAreas = parseArr(tenant?.serviceAreasJson);
  const businessHours = parseHours(tenant?.businessHoursJson);
  const byAppointmentOnly =
    typeof tenant?.businessHoursJson === 'string' &&
    tenant.businessHoursJson.includes('"byAppointmentOnly":true');

  // Format the insurance expiry date as yyyy-mm-dd for <input type="date">.
  let insuranceExpiryDate = '';
  if (tenant?.insuranceExpiryDate) {
    try {
      const d = new Date(tenant.insuranceExpiryDate);
      if (!isNaN(d.getTime())) {
        insuranceExpiryDate = d.toISOString().slice(0, 10);
      }
    } catch {
      // ignore
    }
  }

  return {
    businessCategories: categories,
    coverageAreas,
    coverageAreaInput: '',
    businessHours,
    byAppointmentOnly,
    emergencyServiceAvailable: !!tenant?.emergencyServiceAvailable,
    pricingType: (tenant?.pricingType as PricingType) || '',
    callOutFee: tenant?.callOutFee != null ? String(tenant.callOutFee) : '',
    travelFeePerKm: tenant?.travelFeePerKm != null ? String(tenant.travelFeePerKm) : '',
    emergencySurchargePct:
      tenant?.emergencySurchargePct != null ? String(tenant.emergencySurchargePct) : '',
    weekendSurchargePct:
      tenant?.weekendSurchargePct != null ? String(tenant.weekendSurchargePct) : '',
    employeesCount:
      tenant?.employeesCount != null ? String(tenant.employeesCount) : '',
    insuranceProvider: tenant?.insuranceProvider || '',
    insurancePolicyNumber: tenant?.insurancePolicyNumber || '',
    insuranceExpiryDate,
    licenceNumber: tenant?.licenceNumber || '',
    vatNumber: tenant?.vatNumber || '',
    languages,
    marketplaceOptIn: !!tenant?.marketplaceOptIn,
    marketplaceTermsAccepted: !!tenant?.marketplaceTermsAcceptedAt,
    stripeConnected: !!tenant?.stripeConnected,
    stripeStatusLoading: false,
    profileCompletionPct: tenant?.profileCompletionPct ?? 0,
    errors: {},
  };
}

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

  // Step 2 — Business Profile (phase-3). Pre-populated from the tenant object
  // when the user re-opens onboarding mid-flight (e.g. they saved step 1 but
  // bounced before finishing step 2 — server returns the saved fields).
  const [step2, setStep2] = useState<Step2Data>(() => initializeStep2(tenant));

  // Step 4 (was step 3 — Choose Your Plan; now step 3 after the new
  // Business Profile step was inserted at position 2).
  const [step4, setStep4] = useState<Step3Data>({
    plan: 'growth',
    billing: 'monthly',
    startMode: 'trial',
  });

  // Backwards-compat alias so the rest of the existing PayPal/plan code can
  // keep reading `step3.*` without a giant rename.
  const step3 = step4;
  const setStep3 = setStep4;

  // PayPal inline checkout (opened when the user picks "Subscribe & Pay Now"
  // in step 3). The dialog handles create-subscription + activate-
  // subscription end-to-end; on success we advance to step 4, on close we
  // advance with the "payment pending" banner visible.
  const [payCheckoutPlan, setPayCheckoutPlan] = useState<PaypalCheckoutPlan | null>(null);
  // Tracks whether the inline PayPal checkout (opened from Step 3) completed
  // successfully. Used on Step 4 to decide whether to show the "payment
  // pending" banner (cancelled) or a "payment successful" banner (paid).
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const tenantId = tenant?.id || tenant?.tenantId || 'default';

  const goToStep = useCallback(
    (step: number) => {
      if (step < 1 || step > STEPS.length) return;
      // Only allow jumping to completed steps or the next available step
      if (step > currentStep + 1) return;
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
    },
    [currentStep],
  );

  const goNext = useCallback(() => {
    if (currentStep < STEPS.length) {
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

  // Phase-3: dedicated PATCH helper for the rich Business Profile fields.
  // Hits the PATCH handler on /api/tenants/[id] (server-side computes
  // profileCompletionPct + persists it back). Returns the parsed JSON body
  // so the caller can read the freshly-computed completion %.
  const patchBusinessProfile = useCallback(
    async (payload: Record<string, any>) => {
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `Failed to save (HTTP ${res.status})`);
      }
      return res.json();
    },
    [tenantId],
  );

  const createSubscription = useCallback(
    async (plan: string, billing: string, startMode: 'trial' | 'pay') => {
      try {
        const res = await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, plan, billing, startMode }),
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
  // Step 1 validator & handler
  // -------------------------------------------------------------------------

  const isStep1Valid = step1.businessName.trim().length > 0 && step1.industry !== null;

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
      // Pre-select the chosen industry as the first business category on
      // step 2 so the user doesn't have to re-pick it.
      setStep2((s) =>
        s.businessCategories.includes(step1.industry as string)
          ? s
          : { ...s, businessCategories: [step1.industry as string, ...s.businessCategories] },
      );
      toast.success('Business details saved!');
      goNext();
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [isStep1Valid, saveTenantProgress, step1, goNext]);

  // -------------------------------------------------------------------------
  // Step 2 — Business Profile validator + handler
  // -------------------------------------------------------------------------

  const isStep2Valid = useCallback(() => {
    const errors: Record<string, string> = {};
    if (step2.businessCategories.length === 0) {
      errors.businessCategories = 'Please select at least one business category.';
    }
    if (step2.coverageAreas.length === 0) {
      errors.coverageAreas = 'Add at least one coverage area (postcode or city).';
    }
    if (!step2.pricingType) {
      errors.pricingType = 'Please select a pricing type.';
    }
    if (step2.employeesCount && Number(step2.employeesCount) < 0) {
      errors.employeesCount = 'Employee count cannot be negative.';
    }
    if (step2.callOutFee && Number(step2.callOutFee) < 0) {
      errors.callOutFee = 'Call-out fee cannot be negative.';
    }
    if (step2.travelFeePerKm && Number(step2.travelFeePerKm) < 0) {
      errors.travelFeePerKm = 'Travel fee cannot be negative.';
    }
    if (step2.emergencySurchargePct && Number(step2.emergencySurchargePct) < 0) {
      errors.emergencySurchargePct = 'Surcharge cannot be negative.';
    }
    if (step2.weekendSurchargePct && Number(step2.weekendSurchargePct) < 0) {
      errors.weekendSurchargePct = 'Surcharge cannot be negative.';
    }
    // Marketplace opt-in requires terms acceptance
    if (step2.marketplaceOptIn && !step2.marketplaceTermsAccepted) {
      errors.marketplaceTermsAccepted = 'Please accept the marketplace terms to opt in.';
    }
    return errors;
  }, [step2]);

  const handleStep2Next = useCallback(async () => {
    const errors = isStep2Valid();
    if (Object.keys(errors).length > 0) {
      setStep2((s) => ({ ...s, errors }));
      // Scroll the first error into view (best-effort).
      const firstKey = Object.keys(errors)[0];
      const el = document.getElementById(`step2-field-${firstKey}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.error('Please fix the highlighted fields before continuing.');
      return;
    }

    setSaving(true);
    setStep2((s) => ({ ...s, errors: {} }));
    try {
      // Build the payload for the PATCH endpoint. Number fields are coerced
      // from the string state used by <Input type="number">.
      const payload: Record<string, any> = {
        onboardingStep: 3,
        // Categories + coverage area
        businessCategoriesJson: step2.businessCategories,
        serviceAreasJson: step2.coverageAreas,
        // Business hours — when "by appointment only" is on, store a sentinel
        // object so the marketplace-eligibility checker sees a non-empty
        // businessHoursJson and credits the 10% completion weight.
        businessHoursJson: step2.byAppointmentOnly
          ? { byAppointmentOnly: true }
          : step2.businessHours,
        // Emergency service
        emergencyServiceAvailable: step2.emergencyServiceAvailable,
        // Pricing
        pricingType: step2.pricingType || null,
        callOutFee: Number(step2.callOutFee) || 0,
        travelFeePerKm: Number(step2.travelFeePerKm) || 0,
        emergencySurchargePct: Number(step2.emergencySurchargePct) || 0,
        weekendSurchargePct: Number(step2.weekendSurchargePct) || 0,
        // Operations
        employeesCount: Number(step2.employeesCount) || 1,
        languagesJson: step2.languages,
        // Insurance
        insuranceProvider: step2.insuranceProvider || null,
        insurancePolicyNumber: step2.insurancePolicyNumber || null,
        insuranceExpiryDate: step2.insuranceExpiryDate || null,
        insuranceVerified:
          !!step2.insuranceProvider && !!step2.insurancePolicyNumber,
        // Credentials
        licenceNumber: step2.licenceNumber || null,
        vatNumber: step2.vatNumber || null,
        // Marketplace opt-in
        marketplaceOptIn: step2.marketplaceOptIn,
        marketplaceTermsAcceptedAt: step2.marketplaceOptIn && step2.marketplaceTermsAccepted,
        // Stripe flag (read-only from local state; the Stripe Connect button
        // updates this directly via the status endpoint).
        stripeConnected: step2.stripeConnected,
      };

      const data = await patchBusinessProfile(payload);
      const pct = data?.tenant?.profileCompletionPct ?? 0;
      setStep2((s) => ({ ...s, profileCompletionPct: pct }));

      toast.success('Business profile saved!', {
        description: `Profile ${pct}% complete${pct >= 80 ? ' — marketplace eligible!' : ` — ${80 - pct}% to go for marketplace access`}.`,
      });
      goNext();
    } catch (err) {
      console.error('Save business profile error:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to save business profile. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }, [isStep2Valid, patchBusinessProfile, step2, goNext]);

  // -------------------------------------------------------------------------
  // Step 2 — Stripe Connect handler
  // -------------------------------------------------------------------------

  // On mount: if the user is returning from Stripe Connect (URL has
  // ?stripe_connect=return), pull the latest status so the toggle reflects
  // the freshly-completed onboarding. Runs once on mount — we intentionally
  // don't depend on `refreshStripeStatus` because it's a stable useCallback.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const flag = url.searchParams.get('stripe_connect');
    if (flag === 'return' || flag === 'refresh') {
      // Best-effort: clear the query param so a refresh doesn't re-trigger.
      url.searchParams.delete('stripe_connect');
      window.history.replaceState({}, '', url.toString());
      refreshStripeStatus();
    }
  }, []);

  const refreshStripeStatus = useCallback(async () => {
    setStep2((s) => ({ ...s, stripeStatusLoading: true }));
    try {
      const res = await fetch('/api/billing/stripe/connect/status');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const connected = !!data?.connected;
      setStep2((s) => ({ ...s, stripeConnected: connected }));
      if (connected) {
        toast.success('Stripe account connected!', {
          description: data?.payoutsEnabled
            ? 'Payouts enabled — you can receive marketplace payments.'
            : 'Account linked — finish any pending Stripe requirements to enable payouts.',
        });
      } else if (data?.requirements?.currently_due?.length) {
        toast.warning('Stripe onboarding incomplete', {
          description: `${data.requirements.currently_due.length} requirement(s) still pending.`,
        });
      }
    } catch (err) {
      console.error('Stripe status check failed:', err);
      toast.error('Could not verify Stripe status. Try again later.');
    } finally {
      setStep2((s) => ({ ...s, stripeStatusLoading: false }));
    }
  }, []);

  const handleConnectStripe = useCallback(async () => {
    setStep2((s) => ({ ...s, stripeStatusLoading: true }));
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const returnUrl = `${origin}/?stripe_connect=return`;
      const refreshUrl = `${origin}/?stripe_connect=refresh`;
      const res = await fetch(
        `/api/billing/stripe/connect?returnUrl=${encodeURIComponent(returnUrl)}&refreshUrl=${encodeURIComponent(refreshUrl)}`,
        { method: 'POST' },
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data?.accountLinkUrl) {
        // Open in a new tab so the onboarding wizard state survives the
        // Stripe redirect roundtrip. The user closes the tab and clicks
        // "Refresh Status" here when done.
        window.open(data.accountLinkUrl, '_blank', 'noopener,noreferrer');
        toast.info('Stripe onboarding opened in a new tab', {
          description: 'Complete the Stripe flow, then come back and click "Refresh Status".',
        });
      }
    } catch (err) {
      console.error('Stripe connect failed:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to start Stripe Connect. Please try again.',
      );
    } finally {
      setStep2((s) => ({ ...s, stripeStatusLoading: false }));
    }
  }, []);

  // -------------------------------------------------------------------------
  // Step 3 — Choose Your Plan (was Step 2 before phase-3)
  // -------------------------------------------------------------------------

  // (was handleStep3Next) Now the 3rd step — Choose Your Plan
  // Handles both start modes:
  //   'trial' → creates a 14-day free-trial subscription, advances to step 4.
  //   'pay'   → saves the tenant's plan choice, then opens the PayPal
  //             checkout dialog INLINE (right here in onboarding). The dialog's
  //             create-subscription + activate-subscription APIs create the
  //             local Subscription record end-to-end, so we do NOT call
  //             createSubscription() here for 'pay' mode (that would create a
  //             duplicate pending_payment row). On dialog success → advance to
  //             step 4. On dialog close → advance with the "payment pending"
  //             banner visible as a fallback.
  const handleStep3Next = useCallback(
    async (mode: 'trial' | 'pay') => {
      setSaving(true);
      try {
        if (mode === 'trial') {
          await createSubscription(step3.plan, step3.billing, 'trial');
          await saveTenantProgress({
            onboardingStep: 4,
            plan: step3.plan,
          });
          toast.success('Plan selected! Your 14-day free trial has started.');
          setStep3((s) => ({ ...s, startMode: 'trial' }));
          goNext();
        } else {
          // 'pay' mode: open PayPal checkout inline.
          const selectedPlan = PLANS.find((p) => p.id === step3.plan);
          if (!selectedPlan || selectedPlan.monthlyPrice === 0) {
            toast.error('Please select a paid plan to subscribe.');
            return;
          }
          await saveTenantProgress({
            onboardingStep: 4,
            plan: step3.plan,
          });
          setStep3((s) => ({ ...s, startMode: 'pay' }));
          setPayCheckoutPlan({
            id: selectedPlan.id,
            name: selectedPlan.name,
            monthlyPrice: selectedPlan.monthlyPrice,
            yearlyPrice: selectedPlan.yearlyPrice,
          });
          // Don't goNext() yet — wait for the PayPal dialog's
          // onSuccess/onClose callback to advance.
        }
      } catch {
        toast.error('Failed to select plan. Please try again.');
      } finally {
        setSaving(false);
      }
    },
    [createSubscription, saveTenantProgress, step3, goNext],
  );

  // (was handleComplete) Now the 4th step — All Set!
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
    else if (currentStep === 4) handleComplete();
    // Step 3 has no single "next" — the plan cards themselves carry the
    // two CTAs (Start Free Trial / Subscribe & Pay Now), each calling
    // handleStep3Next('trial' | 'pay') directly.
  }, [currentStep, handleStep1Next, handleStep2Next, handleComplete]);

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
  // Render: Step 2 – Business Profile (phase-3)
  // Collects all marketplace-eligibility fields: categories, coverage area,
  // business hours, emergency service, pricing, fees, employee count,
  // insurance, credentials, languages, marketplace opt-in, Stripe Connect.
  // -------------------------------------------------------------------------

  const renderStep2 = () => {
    // Toggle a business category on/off
    const toggleCategory = (industryId: string) => {
      setStep2((s) => ({
        ...s,
        businessCategories: s.businessCategories.includes(industryId)
          ? s.businessCategories.filter((id) => id !== industryId)
          : [...s.businessCategories, industryId],
        errors: { ...s.errors, businessCategories: '' },
      }));
    };

    // Toggle a language on/off
    const toggleLanguage = (code: string) => {
      setStep2((s) => ({
        ...s,
        languages: s.languages.includes(code)
          ? s.languages.filter((c) => c !== code)
          : [...s.languages, code],
      }));
    };

    // Coverage-area tag input — add on Enter or comma, remove via X badge
    const addCoverageArea = () => {
      const val = step2.coverageAreaInput.trim().replace(/,$/, '');
      if (!val) return;
      if (step2.coverageAreas.includes(val)) {
        setStep2((s) => ({ ...s, coverageAreaInput: '' }));
        return;
      }
      setStep2((s) => ({
        ...s,
        coverageAreas: [...s.coverageAreas, val],
        coverageAreaInput: '',
        errors: { ...s.errors, coverageAreas: '' },
      }));
    };
    const removeCoverageArea = (area: string) => {
      setStep2((s) => ({
        ...s,
        coverageAreas: s.coverageAreas.filter((a) => a !== area),
      }));
    };

    // Update a single day's hours
    const updateDay = (dayKey: string, patch: Partial<DayHours>) => {
      setStep2((s) => ({
        ...s,
        businessHours: {
          ...s.businessHours,
          [dayKey]: { ...s.businessHours[dayKey], ...patch },
        },
      }));
    };

    // Find an industry object by ID (for badge labels)
    const findIndustry = (id: string): Industry | undefined =>
      INDUSTRY_CATALOG.find((i) => i.id === id);

    // Helper: render an inline error message under a field
    const FieldError = ({ id }: { id: string }) => {
      const msg = step2.errors[id];
      if (!msg) return null;
      return (
        <p className="mt-1 text-xs text-red-500" role="alert">
          {msg}
        </p>
      );
    };

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Business Profile</h2>
          <p className="text-muted-foreground mt-1">
            Tell us about your services, coverage, pricing, and credentials so customers can find you on the marketplace.
          </p>
        </div>

        {/* Profile completion progress bar — populated after the first PATCH save */}
        {step2.profileCompletionPct > 0 && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Profile completion
              </span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {step2.profileCompletionPct}%
                {step2.profileCompletionPct >= 80
                  ? ' — Marketplace eligible!'
                  : ` — ${Math.max(0, 80 - step2.profileCompletionPct)}% to marketplace access`}
              </span>
            </div>
            <Progress
              value={step2.profileCompletionPct}
              className="h-2 bg-emerald-100 dark:bg-emerald-900/40 [&>[data-slot=progress-indicator]]:bg-emerald-500"
            />
          </div>
        )}

        {/* ── Business Categories ─────────────────────────────────────────── */}
        <Card id="step2-field-businessCategories">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Business Categories <span className="text-red-500">*</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Select all the service categories your business covers. Grouped by 9 verticals.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Selected categories as badges */}
            {step2.businessCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {step2.businessCategories.map((id) => {
                  const ind = findIndustry(id);
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="gap-1 pl-2 pr-1 py-1 text-xs"
                    >
                      <span>{ind?.emoji || '•'}</span>
                      {ind?.name || id}
                      <button
                        type="button"
                        aria-label={`Remove ${ind?.name || id}`}
                        onClick={() => toggleCategory(id)}
                        className="ml-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Accordion: 9 verticals, each expands to show its industries */}
            <Accordion type="multiple" className="w-full">
              {VERTICALS.map((vertical) => {
                const industries = getIndustriesByVertical(vertical.id);
                const selectedInVertical = industries.filter((i) =>
                  step2.businessCategories.includes(i.id),
                ).length;
                return (
                  <AccordionItem key={vertical.id} value={vertical.id}>
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-lg">{vertical.icon}</span>
                        <span className="text-sm font-semibold">{vertical.name}</span>
                        {selectedInVertical > 0 && (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-[10px] px-1.5 py-0">
                            {selectedInVertical}
                          </Badge>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground pr-2">
                          {industries.length} industries
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        {industries.map((ind) => {
                          const isSelected = step2.businessCategories.includes(ind.id);
                          return (
                            <button
                              key={ind.id}
                              type="button"
                              onClick={() => toggleCategory(ind.id)}
                              className={cn(
                                'flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-left text-xs font-medium transition-all',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                                  : 'border-border bg-card hover:border-emerald-400/40 hover:bg-accent/50',
                              )}
                              title={ind.description}
                            >
                              <span className="text-base">{ind.emoji}</span>
                              <span className="flex-1 truncate">{ind.name}</span>
                              {isSelected && <Check className="h-3 w-3 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
            <FieldError id="businessCategories" />
          </CardContent>
        </Card>

        {/* ── Coverage Area ───────────────────────────────────────────────── */}
        <Card id="step2-field-coverageAreas">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Coverage Area <span className="text-red-500">*</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Postcodes or city names where you accept jobs. Press Enter or comma to add.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 90210, Beverly Hills, Santa Monica"
                value={step2.coverageAreaInput}
                onChange={(e) =>
                  setStep2((s) => ({ ...s, coverageAreaInput: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addCoverageArea();
                  } else if (
                    e.key === 'Backspace' &&
                    step2.coverageAreaInput === '' &&
                    step2.coverageAreas.length > 0
                  ) {
                    removeCoverageArea(step2.coverageAreas[step2.coverageAreas.length - 1]);
                  }
                }}
                className="h-10"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCoverageArea}
                disabled={!step2.coverageAreaInput.trim()}
                className="gap-1.5 shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </div>
            {step2.coverageAreas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {step2.coverageAreas.map((area) => (
                  <Badge
                    key={area}
                    variant="secondary"
                    className="gap-1 pl-2 pr-1 py-1 text-xs"
                  >
                    <MapPin className="h-3 w-3" />
                    {area}
                    <button
                      type="button"
                      aria-label={`Remove ${area}`}
                      onClick={() => removeCoverageArea(area)}
                      className="ml-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <FieldError id="coverageAreas" />
          </CardContent>
        </Card>

        {/* ── Business Hours ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Business Hours
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Set your standard operating hours, or toggle &ldquo;by appointment only&rdquo;.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
              <div>
                <Label htmlFor="byAppointment" className="text-sm font-medium">
                  By appointment only
                </Label>
                <p className="text-xs text-muted-foreground">
                  Skip per-day hours — customers call to book.
                </p>
              </div>
              <Switch
                id="byAppointment"
                checked={step2.byAppointmentOnly}
                onCheckedChange={(checked) =>
                  setStep2((s) => ({ ...s, byAppointmentOnly: !!checked }))
                }
              />
            </div>

            {!step2.byAppointmentOnly && (
              <div className="space-y-1.5">
                {/* Header row */}
                <div className="hidden sm:grid grid-cols-[120px_1fr_1fr_auto_auto] gap-2 px-1 text-xs font-medium text-muted-foreground">
                  <span>Day</span>
                  <span>Open</span>
                  <span>Close</span>
                  <span className="text-center">Appt.</span>
                  <span className="text-center">Closed</span>
                </div>
                {DAYS_OF_WEEK.map((day) => {
                  const hrs = step2.businessHours[day.key];
                  return (
                    <div
                      key={day.key}
                      className="grid grid-cols-2 sm:grid-cols-[120px_1fr_1fr_auto_auto] gap-2 items-center"
                    >
                      <Label className="text-sm font-medium col-span-2 sm:col-span-1">
                        {day.label}
                      </Label>
                      <Input
                        type="time"
                        value={hrs.open}
                        disabled={hrs.closed}
                        onChange={(e) => updateDay(day.key, { open: e.target.value })}
                        className="h-9 text-xs"
                      />
                      <Input
                        type="time"
                        value={hrs.close}
                        disabled={hrs.closed}
                        onChange={(e) => updateDay(day.key, { close: e.target.value })}
                        className="h-9 text-xs"
                      />
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={hrs.byAppointment}
                          disabled={hrs.closed}
                          onCheckedChange={(v) =>
                            updateDay(day.key, { byAppointment: !!v })
                          }
                          aria-label={`${day.label} by appointment`}
                        />
                      </div>
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={hrs.closed}
                          onCheckedChange={(v) => updateDay(day.key, { closed: !!v })}
                          aria-label={`${day.label} closed`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Emergency Service + Pricing ────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Service &amp; Pricing
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Tell customers how you charge and whether you offer emergency service.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Emergency service toggle */}
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
              <div className="flex-1 min-w-0">
                <Label htmlFor="emergencyService" className="text-sm font-medium">
                  Do you offer emergency / after-hours service?
                </Label>
                <p className="text-xs text-muted-foreground">
                  Customers searching for urgent jobs will see you first.
                </p>
              </div>
              <Switch
                id="emergencyService"
                checked={step2.emergencyServiceAvailable}
                onCheckedChange={(v) =>
                  setStep2((s) => ({ ...s, emergencyServiceAvailable: !!v }))
                }
              />
            </div>

            <Separator />

            {/* Pricing type */}
            <div id="step2-field-pricingType" className="space-y-1.5">
              <Label className="text-sm font-medium">
                Pricing Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={step2.pricingType || undefined}
                onValueChange={(v) =>
                  setStep2((s) => ({
                    ...s,
                    pricingType: v as PricingType,
                    errors: { ...s.errors, pricingType: '' },
                  }))
                }
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Select how you charge…" />
                </SelectTrigger>
                <SelectContent>
                  {PRICING_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.hint}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="pricingType" />
            </div>

            {/* Numeric pricing fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div id="step2-field-callOutFee" className="space-y-1.5">
                <Label htmlFor="callOutFee" className="text-sm font-medium">
                  Call-out Fee (USD)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="callOutFee"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={step2.callOutFee}
                    onChange={(e) =>
                      setStep2((s) => ({ ...s, callOutFee: e.target.value }))
                    }
                    className="h-10 pl-8"
                  />
                </div>
                <FieldError id="callOutFee" />
              </div>

              <div id="step2-field-travelFeePerKm" className="space-y-1.5">
                <Label htmlFor="travelFeePerKm" className="text-sm font-medium">
                  Travel Fee / km (USD)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="travelFeePerKm"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={step2.travelFeePerKm}
                    onChange={(e) =>
                      setStep2((s) => ({ ...s, travelFeePerKm: e.target.value }))
                    }
                    className="h-10 pl-8"
                  />
                </div>
                <FieldError id="travelFeePerKm" />
              </div>

              <div id="step2-field-emergencySurchargePct" className="space-y-1.5">
                <Label htmlFor="emergencySurchargePct" className="text-sm font-medium">
                  Emergency Surcharge (%)
                </Label>
                <div className="relative">
                  <Input
                    id="emergencySurchargePct"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    placeholder="e.g. 40 = +40%"
                    value={step2.emergencySurchargePct}
                    onChange={(e) =>
                      setStep2((s) => ({ ...s, emergencySurchargePct: e.target.value }))
                    }
                    className="h-10 pr-8"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
                <FieldError id="emergencySurchargePct" />
              </div>

              <div id="step2-field-weekendSurchargePct" className="space-y-1.5">
                <Label htmlFor="weekendSurchargePct" className="text-sm font-medium">
                  Weekend Surcharge (%)
                </Label>
                <div className="relative">
                  <Input
                    id="weekendSurchargePct"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    placeholder="e.g. 20 = +20%"
                    value={step2.weekendSurchargePct}
                    onChange={(e) =>
                      setStep2((s) => ({ ...s, weekendSurchargePct: e.target.value }))
                    }
                    className="h-10 pr-8"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
                <FieldError id="weekendSurchargePct" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Operations: Employees + Languages ─────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div id="step2-field-employeesCount" className="space-y-1.5">
              <Label htmlFor="employeesCount" className="text-sm font-medium">
                Employee Count
              </Label>
              <Input
                id="employeesCount"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="e.g. 5"
                value={step2.employeesCount}
                onChange={(e) =>
                  setStep2((s) => ({ ...s, employeesCount: e.target.value }))
                }
                className="h-10 max-w-[200px]"
              />
              <FieldError id="employeesCount" />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Languages className="h-4 w-4 text-muted-foreground" />
                Languages Spoken
              </Label>
              <p className="text-xs text-muted-foreground">
                Multi-lingual businesses reach more customers.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const isSelected = step2.languages.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => toggleLanguage(lang.code)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : 'border-border bg-card hover:border-emerald-400/40 hover:bg-accent/50',
                      )}
                    >
                      {lang.label}
                      {isSelected && <Check className="inline-block h-3 w-3 ml-1" />}
                    </button>
                  );
                })}
              </div>
              {step2.languages.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {step2.languages.map((code) => {
                    const lang = LANGUAGE_OPTIONS.find((l) => l.code === code);
                    return (
                      <Badge
                        key={code}
                        variant="secondary"
                        className="gap-1 pl-2 pr-1 py-1 text-xs"
                      >
                        {lang?.label || code}
                        <button
                          type="button"
                          aria-label={`Remove ${lang?.label || code}`}
                          onClick={() => toggleLanguage(code)}
                          className="ml-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Insurance + Credentials ───────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Insurance &amp; Credentials
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Building trust — verified businesses rank higher in the marketplace.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="insuranceProvider" className="text-sm font-medium">
                  Insurance Provider
                </Label>
                <Input
                  id="insuranceProvider"
                  placeholder="e.g. Allstate, State Farm"
                  value={step2.insuranceProvider}
                  onChange={(e) =>
                    setStep2((s) => ({ ...s, insuranceProvider: e.target.value }))
                  }
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="insurancePolicyNumber" className="text-sm font-medium">
                  Insurance Policy #
                </Label>
                <Input
                  id="insurancePolicyNumber"
                  placeholder="Policy number"
                  value={step2.insurancePolicyNumber}
                  onChange={(e) =>
                    setStep2((s) => ({ ...s, insurancePolicyNumber: e.target.value }))
                  }
                  className="h-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="insuranceExpiryDate" className="text-sm font-medium">
                Insurance Expiry Date
              </Label>
              <Input
                id="insuranceExpiryDate"
                type="date"
                value={step2.insuranceExpiryDate}
                onChange={(e) =>
                  setStep2((s) => ({ ...s, insuranceExpiryDate: e.target.value }))
                }
                className="h-10 max-w-[220px]"
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="licenceNumber" className="text-sm font-medium">
                  Licence Number
                </Label>
                <Input
                  id="licenceNumber"
                  placeholder="Business / trade licence #"
                  value={step2.licenceNumber}
                  onChange={(e) =>
                    setStep2((s) => ({ ...s, licenceNumber: e.target.value }))
                  }
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vatNumber" className="text-sm font-medium">
                  VAT / Tax Number
                </Label>
                <Input
                  id="vatNumber"
                  placeholder="VAT or tax ID"
                  value={step2.vatNumber}
                  onChange={(e) =>
                    setStep2((s) => ({ ...s, vatNumber: e.target.value }))
                  }
                  className="h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Marketplace Opt-in ─────────────────────────────────────────── */}
        <Card id="step2-field-marketplaceTermsAccepted">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Marketplace Opt-in
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Opt in to receive customer bookings from the public marketplace.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
              <div className="flex-1 min-w-0">
                <Label htmlFor="marketplaceOptIn" className="text-sm font-medium">
                  List my business on the marketplace
                </Label>
                <p className="text-xs text-muted-foreground">
                  Eligibility checks still apply (subscription, KYC, insurance, Stripe).
                </p>
              </div>
              <Switch
                id="marketplaceOptIn"
                checked={step2.marketplaceOptIn}
                onCheckedChange={(v) =>
                  setStep2((s) => ({
                    ...s,
                    marketplaceOptIn: !!v,
                    // Auto-clear terms when opt-in is turned off
                    marketplaceTermsAccepted: !!v && s.marketplaceTermsAccepted,
                    errors: { ...s.errors, marketplaceTermsAccepted: '' },
                  }))
                }
              />
            </div>

            {step2.marketplaceOptIn && (
              <div className="flex items-start gap-2.5 rounded-md border border-border p-3">
                <Checkbox
                  id="marketplaceTerms"
                  checked={step2.marketplaceTermsAccepted}
                  onCheckedChange={(v) =>
                    setStep2((s) => ({
                      ...s,
                      marketplaceTermsAccepted: !!v,
                      errors: { ...s.errors, marketplaceTermsAccepted: '' },
                    }))
                  }
                  className="mt-0.5"
                />
                <Label htmlFor="marketplaceTerms" className="text-xs leading-relaxed">
                  I accept the{' '}
                  <a
                    href="/marketplace-terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 underline hover:no-underline"
                  >
                    marketplace terms and conditions
                  </a>{' '}
                  and the service-level agreement for marketplace leads. I understand that marketplace commissions apply to bookings sourced through the marketplace.
                </Label>
              </div>
            )}
            <FieldError id="marketplaceTermsAccepted" />
          </CardContent>
        </Card>

        {/* ── Stripe Connect ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Stripe Connect
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Connect a Stripe account to receive marketplace payouts.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    step2.stripeConnected
                      ? 'bg-emerald-100 dark:bg-emerald-900/40'
                      : 'bg-muted',
                  )}
                >
                  {step2.stripeConnected ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {step2.stripeConnected ? 'Stripe account connected' : 'No Stripe account connected'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step2.stripeConnected
                      ? 'You can receive marketplace payments.'
                      : 'Required to receive marketplace payouts.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  variant={step2.stripeConnected ? 'outline' : 'default'}
                  onClick={handleConnectStripe}
                  disabled={step2.stripeStatusLoading}
                  className={cn(
                    'gap-1.5',
                    !step2.stripeConnected &&
                      'bg-emerald-600 hover:bg-emerald-700 text-white',
                  )}
                >
                  {step2.stripeStatusLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  {step2.stripeConnected ? 'Re-connect' : 'Connect Stripe'}
                </Button>
                {step2.stripeConnected && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={refreshStripeStatus}
                    disabled={step2.stripeStatusLoading}
                    className="gap-1.5"
                  >
                    {step2.stripeStatusLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Refresh Status</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Render: Step 3 – Choose Your Plan
  // (was Step 2 before phase-3 inserted the Business Profile step.)
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
            Save 50%!
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
                    <div>
                      {/* Crossed-out original annual price (yearly only) */}
                      {step3.billing === 'yearly' && (
                        <p className="text-xs text-muted-foreground line-through mb-0.5">
                          {formatPrice(plan.monthlyPrice * 12)}/yr
                        </p>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {formatPrice(price)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /{step3.billing === 'monthly' ? 'month' : 'year'}
                        </span>
                      </div>
                      {step3.billing === 'yearly' && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                          {formatPrice(Math.round(plan.yearlyPrice / 12))}/mo · 50% off
                        </p>
                      )}
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

                {/* Dual CTA: both "Start Free Trial" (14-day, no card) and
                    "Subscribe & Pay Now" (immediate PayPal checkout) are
                    offered on every paid plan once selected. Enterprise
                    stays as "Contact Sales" (no self-serve checkout). */}
                {plan.monthlyPrice === 0 ? (
                  <Button
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    className={cn(
                      'w-full',
                      isSelected && 'bg-emerald-600 hover:bg-emerald-700 text-white',
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStep3((s) => ({ ...s, plan: plan.id }));
                    }}
                  >
                    Contact Sales
                  </Button>
                ) : isSelected ? (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      disabled={saving}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStep3Next('trial');
                      }}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Start Free Trial
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-1.5"
                      disabled={saving}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStep3Next('pay');
                      }}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      Subscribe &amp; Pay Now
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStep3((s) => ({ ...s, plan: plan.id }));
                    }}
                  >
                    Select {plan.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        14-day free trial on all plans · No credit card required for trial · Cancel anytime · Yearly plans save 50% · Subscribe &amp; Pay Now sets up auto-recurring billing
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

        {/* "Subscribe & Pay Now" outcome banner.
            - If the inline PayPal checkout SUCCEEDED → show a green success
              banner (subscription is active, auto-recurring billing set up).
            - If the user CANCELLED the PayPal dialog → show an amber
              "payment pending" banner directing them to Billing to complete. */}
        {step3.startMode === 'pay' && paymentCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-800 dark:bg-emerald-950/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Payment successful — subscription active
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                Your {step3.plan.charAt(0).toUpperCase() + step3.plan.slice(1)} plan ({step3.billing}) is now active with auto-recurring PayPal billing. You'll be charged automatically each {step3.billing === 'yearly' ? 'year' : 'month'} until you cancel.
              </p>
            </div>
          </motion.div>
        )}
        {step3.startMode === 'pay' && !paymentCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-950/30"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Payment pending — complete your subscription
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  You chose the {step3.plan.charAt(0).toUpperCase() + step3.plan.slice(1)} plan ({step3.billing}). Visit Billing to set up auto-recurring PayPal billing and activate full access. You'll be charged automatically each {step3.billing === 'yearly' ? 'year' : 'month'} until you cancel.
                </p>
              </div>
            </div>
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shrink-0"
              onClick={() => {
                onComplete();
                // Defer the navigation so the onboarding dialog closes first.
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('navigate', { detail: 'billing' }));
                }, 100);
              }}
            >
              <CreditCard className="h-4 w-4" />
              Go to Billing
            </Button>
          </motion.div>
        )}

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
      currentStep === 1 ? isStep1Valid : true;

    // Step 3 (Choose Your Plan) has no footer "Next" button — each plan card
    // carries its own dual CTA (Start Free Trial / Subscribe & Pay Now), so
    // a footer Next would be redundant and ambiguous. We only show Back.
    if (currentStep === 3) {
      return (
        <div className="flex items-center justify-between pt-4 mt-2 border-t">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={saving}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Step {currentStep} of {STEPS.length}
          </div>
          {/* Spacer to keep the step indicator centered */}
          <div className="w-[72px]" aria-hidden />
        </div>
      );
    }

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
              Continue
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
    <>
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

    {/* ── Inline PayPal checkout ──────────────────────────────────────
        Opened from Step 2's "Subscribe & Pay Now" button. The dialog
        handles PayPal's create-subscription + activate-subscription flow
        end-to-end. On success we advance to step 3; on close we advance
        with the "payment pending" banner visible as a fallback. */}
    {payCheckoutPlan && (
      <PayPalCheckoutDialog
        plan={payCheckoutPlan}
        billingCycle={step3.billing}
        onClose={() => {
          setPayCheckoutPlan(null);
          toast.info('Payment cancelled', {
            description: 'You can complete payment later from the Subscription page.',
          });
          goNext();
        }}
        onSuccess={() => {
          setPayCheckoutPlan(null);
          setPaymentCompleted(true);
          toast.success('Subscription activated! Welcome to ServiceOS 🎉');
          goNext();
        }}
      />
    )}
    </>
  );
}
