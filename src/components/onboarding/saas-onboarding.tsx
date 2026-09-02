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
  Store,
  Plus,
  X,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { PayPalCheckoutDialog, type PaypalCheckoutPlan } from '@/components/billing/paypal-checkout-dialog';
import { PaymentMethodChooserDialog, type ChooserPlan } from '@/components/billing/payment-method-chooser-dialog';
import {
  INDUSTRY_CATALOG,
  VERTICALS,
  getIndustriesByVertical,
  type Industry,
} from '@/lib/industry-catalog';
import { AddressAutocomplete, type AddressValue } from '@/components/onboarding/address-autocomplete';

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
  address: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  countryCode?: string;
  latitude: number | null;
  longitude: number | null;
}

interface Step3Data {
  plan: string;
  billing: 'monthly' | 'yearly';
  // How the user wants to start: 'trial' (14-day free trial, no card) or
  // 'pay' (subscribe & pay now via PayPal, immediate access).
  startMode: 'trial' | 'pay';
}

// ── Phase-3 Business Profile step ────────────────────────────────────────────
// Captures the marketplace-eligibility fields needed for a tenant to receive
// public marketplace leads: categories, coverage area, hours, marketplace
// opt-in, Stripe Connect.
interface DayHours {
  open: string;   // "09:00" — 24h HH:MM
  close: string;  // "17:00"
  byAppointment: boolean; // when true, open/close are ignored
  closed: boolean;         // when true, not operating that day
}

interface Step2Data {
  // Categories (multi-select from 29 industries grouped by 11 verticals) —
  // this is the SINGLE source of truth for industry on the tenant.
  businessCategories: string[]; // industry IDs from INDUSTRY_CATALOG
  // Free-text description shown when the user selects the "others" industry.
  // Persisted into settingsJson.otherCategoryDescription (no schema change).
  otherCategoryDescription: string;
  // Coverage area — postcodes or city names (free-form tag input)
  coverageAreas: string[];
  coverageAreaInput: string;
  // Business hours — mon-sun, or "by appointment" globally
  businessHours: Record<string, DayHours>;
  byAppointmentOnly: boolean;
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
//   1. Your Business    → basic identity (name + address — industry is now
//                         chosen on Step 2 via the Business Categories picker)
//   2. Business Profile → marketplace-eligibility data (this phase)
//   3. Choose Your Plan → subscription / trial
//   4. All Set!         → completion + quick actions
const STEPS = [
  { id: 1, label: 'Your Business', icon: Building2 },
  { id: 2, label: 'Business Profile', icon: Briefcase },
  { id: 3, label: 'Choose Your Plan', icon: CreditCard },
  { id: 4, label: 'All Set!', icon: CheckCircle2 },
] as const;

// ─── Plan catalog (DB-backed at runtime — see useEffect below) ──────────────
//
// The local FALLBACK_PLANS array is used if the fetch to /api/plans fails
// (network error, DB unreachable, etc.). At runtime we map DB Plan rows to
// the same Plan shape. Canonical plan codes: starter | growth | business |
// enterprise. NOTE: the mid-tier is code `growth` but its display name is
// "Professional" (DB Plan.name); the legacy `pro` code was migrated to
// `business` and is no longer a valid plan code.

interface OnboardingPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  /** Strikethrough "original" monthly price (0 = no discount badge shown). */
  originalMonthlyPrice: number;
  description: string;
  features: string[];
  icon: typeof Zap;
  popular?: boolean;
}

const FALLBACK_PLANS: OnboardingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 29,
    yearlyPrice: 290, // 2 months free on yearly
    originalMonthlyPrice: 49,
    description: 'For solo pros & new businesses',
    features: ['1 user', '200 jobs/month', 'CRM, jobs, scheduling, invoicing', 'Customer portal', 'Email support'],
    icon: Zap,
  },
  {
    id: 'growth',
    name: 'Professional',
    monthlyPrice: 79,
    yearlyPrice: 790, // 2 months free on yearly
    originalMonthlyPrice: 129,
    description: 'For growing teams — most popular',
    features: ['Up to 5 users', 'Unlimited jobs', 'WhatsApp + Email + SMS', 'AI Assistant + AI Quote Generator', 'Workflow + Forms Builder', 'Omnichannel Inbox', 'API access'],
    icon: Star,
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 149,
    yearlyPrice: 1490, // 2 months free on yearly
    originalMonthlyPrice: 249,
    description: 'For multi-branch operators',
    features: ['Up to 20 users', 'AI Receptionist + AI Dispatcher', 'Inventory + Purchase Orders', 'Recurring Jobs', 'Live Technician Map (GPS)', 'Advanced Reports', 'Role Permissions'],
    icon: Crown,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 0,
    yearlyPrice: 0,
    originalMonthlyPrice: 0,
    description: 'For large organizations',
    features: ['Everything in Business', 'White-label branding', 'Advanced security & audit logs', 'Data retention policies', 'Dedicated support', 'Custom onboarding'],
    icon: Shield,
  },
];

// Maps a DB feature flag (boolean key from Plan.featuresJson) to a
// human-readable display string shown in the plan card feature list.
// Only `true` flags are surfaced; falsy/missing flags are omitted.
const PLAN_FEATURE_LABELS: Record<string, string> = {
  customerPortal: 'Customer Portal',
  estimates: 'Quotes & Estimates',
  invoicing: 'Invoices & Online Payments',
  scheduling: 'Jobs & Scheduling',
  calendar: 'Calendar',
  dispatchBoard: 'Dispatch Board',
  gpsTracking: 'GPS Tracking',
  customer360: 'Customer 360',
  salesPipeline: 'Leads & Sales Pipeline',
  reviews: 'Reviews Management',
  knowledgeBase: 'Knowledge Base',
  documentCenter: 'Document Center',
  timeTracking: 'Time Tracking & Expenses',
  expenses: 'Expenses',
  digitalSignatures: 'Digital Signatures',
  beforeAfterPhotos: 'Before & After Photos',
  onlinePayments: 'Online Payments',
  onlineBooking: 'Online Booking',
  employeePortal: 'Employee Portal',
  basicReports: 'Basic Reports',
  whatsappIntegration: 'WhatsApp Integration',
  emailIntegration: 'Email Integration',
  smsNumbers: 'SMS Numbers',
  aiAssistant: 'AI Assistant',
  aiQuoteGenerator: 'AI Quote Generator',
  aiJobSummary: 'AI Job Summary',
  aiSuggestedReplies: 'AI Suggested Replies',
  aiFormGenerator: 'AI Form Generator',
  customWorkflows: 'Workflow Builder',
  formBuilder: 'Forms Builder',
  marketingCampaigns: 'Marketing Campaigns',
  broadcast: 'Broadcast',
  customerSegments: 'Customer Segments',
  templateStudio: 'Template Studio',
  omnichannelInbox: 'Omnichannel Inbox',
  liveChat: 'Live Chat Widget',
  apiAccess: 'API Access',
  webhooks: 'Webhooks',
  aiReceptionist: 'AI Receptionist (Voice Agents)',
  aiAgents: 'AI Agents',
  aiPhoneNumbers: 'AI Phone Numbers',
  aiCallHistory: 'AI Call History',
  aiDispatcher: 'AI Dispatcher (Smart Dispatch)',
  inventory: 'Inventory Management',
  purchaseOrders: 'Purchase Orders',
  recurringJobs: 'Recurring Jobs',
  routeOptimization: 'Live Technician Map',
  advancedReports: 'Advanced Reports',
  rolePermissions: 'Role Permissions',
  whiteLabel: 'White Label Branding',
  advancedSecurity: 'Advanced Security & Audit Logs',
  dataRetention: 'Data Retention Policies',
  dedicatedSupport: 'Dedicated Support',
};

/** Convert a DB plan's featuresJson object (boolean map) into a display string array. */
function featuresFromJson(features: unknown): string[] {
  if (!features || typeof features !== 'object') return [];
  const obj = features as Record<string, unknown>;
  const labels: string[] = [];
  for (const key of Object.keys(obj)) {
    if (obj[key] === true && PLAN_FEATURE_LABELS[key]) {
      labels.push(PLAN_FEATURE_LABELS[key]);
    }
  }
  return labels;
}

// Icon lookup by plan code — keeps the card UI consistent between
// fallback and DB-backed plans.
const PLAN_ICON_BY_CODE: Record<string, typeof Zap> = {
  starter: Zap,
  growth: Star,
  business: Crown,
  enterprise: Shield,
};

// ── Phase-3 Business Profile: day presets ───────────────────────────────────
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

  // Parse the free-form settingsJson object defensively.
  const parseSettings = (raw: unknown): Record<string, unknown> => {
    if (raw && typeof raw === 'object') return raw as Record<string, unknown>;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return (parsed && typeof parsed === 'object') ? parsed : {};
      } catch {
        return {};
      }
    }
    return {};
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
  const coverageAreas = parseArr(tenant?.serviceAreasJson);
  const businessHours = parseHours(tenant?.businessHoursJson);
  const byAppointmentOnly =
    typeof tenant?.businessHoursJson === 'string' &&
    tenant.businessHoursJson.includes('"byAppointmentOnly":true');
  const settings = parseSettings(tenant?.settingsJson);
  const otherCategoryDescription =
    typeof settings?.otherCategoryDescription === 'string'
      ? settings.otherCategoryDescription
      : '';

  return {
    businessCategories: categories,
    otherCategoryDescription,
    coverageAreas,
    coverageAreaInput: '',
    businessHours,
    byAppointmentOnly,
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
    address: tenant?.address || '',
    city: tenant?.city || '',
    state: tenant?.state || '',
    pincode: tenant?.postalCode || '',
    country: tenant?.country || 'US',
    countryCode: tenant?.country || 'US',
    latitude: tenant?.latitude ?? null,
    longitude: tenant?.longitude ?? null,
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

  // Phase 9.8: Payment method chooser (PayPal vs Card-via-Creem).
  // When the user clicks "Subscribe & Pay Now", we show this chooser FIRST.
  // If they pick PayPal → we open the existing PayPalCheckoutDialog.
  // If they pick Creem → the chooser itself redirects to Creem's hosted checkout.
  const [chooserPlan, setChooserPlan] = useState<ChooserPlan | null>(null);
  // Tracks whether the inline PayPal checkout (opened from Step 3) completed
  // successfully. Used on Step 4 to decide whether to show the "payment
  // pending" banner (cancelled) or a "payment successful" banner (paid).
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // Plan catalog — fetched from /api/plans on mount so prices stay in sync
  // with the DB (editable by super-admins). Falls back to FALLBACK_PLANS
  // (the hardcoded canonical plan list above) on any fetch failure.
  const [plans, setPlans] = useState<OnboardingPlan[]>(FALLBACK_PLANS);
  // Currency code from the DB plan rows (defaults to USD). Used by
  // formatPrice() so we don't hardcode 'USD'.
  const [planCurrency, setPlanCurrency] = useState<string>('USD');

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

  // Fetch the plan catalog from the DB on mount so we always show live
  // prices + feature sets (super-admins can edit them without a code
  // deploy). Falls back to FALLBACK_PLANS on any failure — the wizard
  // still works end-to-end even if /api/plans is unreachable.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/plans');
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.plans || !Array.isArray(data.plans)) return;
        // Filter out add-ons (ai_pro_addon etc.) — only standalone plans
        // are shown on the plan picker.
        const standalone = data.plans.filter(
          (p: any) => !p.isAddon && !p.parentPlanCode,
        );
        if (standalone.length === 0) return;
        const mapped: OnboardingPlan[] = standalone.map((p: any) => ({
          id: p.code,
          name: p.name,
          monthlyPrice: Number(p.monthlyPrice) || 0,
          yearlyPrice: Number(p.yearlyPrice) || 0,
          originalMonthlyPrice: Number(p.originalMonthlyPrice) || 0,
          description: p.description || '',
          features: featuresFromJson(p.features),
          icon: PLAN_ICON_BY_CODE[p.code] ?? Zap,
          popular: !!p.popular,
        }));
        if (cancelled) return;
        setPlans(mapped);
        // Take currency from the first plan row (all rows share the same
        // currency in the seed). Falls back to USD if missing.
        if (standalone[0]?.currency) {
          setPlanCurrency(String(standalone[0].currency));
        }
      } catch (err) {
        // Network / parse error — keep FALLBACK_PLANS (already in state).
        console.warn('[onboarding] Failed to fetch /api/plans, using fallback:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Step 1 validator & handler
  // -------------------------------------------------------------------------

  // Step 1 only requires the business name — address is optional (the user
  // can pick from autocomplete or enter manually). Industry is now chosen on
  // Step 2 via the Business Categories multi-select.
  const isStep1Valid = step1.businessName.trim().length > 0;

  const handleStep1Next = useCallback(async () => {
    if (!isStep1Valid) {
      toast.error('Please enter your business name');
      return;
    }
    setSaving(true);
    try {
      const resolvedCountry = (step1.countryCode || step1.country || 'US').toUpperCase();
      const currencyMap: Record<string, string> = {
        AU: 'AUD',
        CA: 'CAD',
        GB: 'GBP',
        IN: 'INR',
        NZ: 'NZD',
        EU: 'EUR',
        US: 'USD',
      };
      const resolvedCurrency = currencyMap[resolvedCountry] || 'USD';

      await saveTenantProgress({
        onboardingStep: 2,
        name: step1.businessName,
        address: step1.address,
        city: step1.city,
        state: step1.state,
        pincode: step1.pincode,
        country: resolvedCountry,
        currency: resolvedCurrency,
        latitude: step1.latitude,
        longitude: step1.longitude,
      });
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
      // Build the payload for the PATCH endpoint. The 3 removed UI cards
      // (Service & Pricing, Operations, Insurance & Credentials) are
      // intentionally NOT set here — the underlying schema fields keep their
      // defaults (0 / false / null / "[]") and can be edited later from
      // the in-app Settings pages.
      //
      // Merge `otherCategoryDescription` into the existing settingsJson so we
      // don't wipe keys other features depend on (invoice-automation,
      // integrations, vapi, etc.).
      let existingSettings: Record<string, unknown> = {};
      const raw = tenant?.settingsJson;
      if (raw && typeof raw === 'object') {
        existingSettings = raw as Record<string, unknown>;
      } else if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            existingSettings = parsed as Record<string, unknown>;
          }
        } catch {
          // ignore — start with empty object
        }
      }
      const mergedSettings: Record<string, unknown> = {
        ...existingSettings,
        otherCategoryDescription: step2.otherCategoryDescription || '',
      };

      const payload: Record<string, any> = {
        onboardingStep: 3,
        // Industry — derive from businessCategories[0] to preserve the
        // canonical single-select field used by SEO routing + marketplace.
        industry: step2.businessCategories[0] || null,
        // Categories + coverage area
        businessCategoriesJson: step2.businessCategories,
        serviceAreasJson: step2.coverageAreas,
        // Business hours — when "by appointment only" is on, store a sentinel
        // object so the marketplace-eligibility checker sees a non-empty
        // businessHoursJson and credits the 10% completion weight.
        businessHoursJson: step2.byAppointmentOnly
          ? { byAppointmentOnly: true }
          : step2.businessHours,
        // Marketplace opt-in
        marketplaceOptIn: step2.marketplaceOptIn,
        marketplaceTermsAcceptedAt: step2.marketplaceOptIn && step2.marketplaceTermsAccepted,
        // Stripe flag (read-only from local state; the Stripe Connect button
        // updates this directly via the status endpoint).
        stripeConnected: step2.stripeConnected,
        // Free-form settings — merged with existing keys on the client.
        settingsJson: mergedSettings,
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
  }, [isStep2Valid, patchBusinessProfile, step2, goNext, tenant]);

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
          // Uses the live `plans` state (DB-backed) so the plan id passed
          // to PayPal is always the canonical code (starter/growth/business/
          // enterprise), never the legacy 'pro' code.
          const selectedPlan = plans.find((p) => p.id === step3.plan);
          if (!selectedPlan || selectedPlan.monthlyPrice === 0) {
            toast.error('Please select a paid plan to subscribe.');
            return;
          }
          await saveTenantProgress({
            onboardingStep: 4,
            plan: step3.plan,
          });
          setStep3((s) => ({ ...s, startMode: 'pay' }));
          // Phase 9.8: Show the payment method chooser first (PayPal vs Card-via-Creem).
          // Previously this opened the PayPal dialog directly — now the user
          // can choose PayPal or Creem, giving a consistent billing UX.
          setChooserPlan({
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
    [createSubscription, saveTenantProgress, step3, goNext, plans],
  );

  // (was handleComplete) Now the 4th step — All Set!
  const handleComplete = useCallback(async () => {
    setSaving(true);
    try {
      await saveTenantProgress({
        onboardingStep: 4,
        onboardingCompleted: true,
      });
      toast.success('Welcome to Fieseros! 🎉');
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

  // Format a price using the live plan currency (DB-backed, defaults to
  // USD). `0` is rendered as 'Custom' for the Enterprise plan.
  const formatPrice = (amount: number) => {
    if (amount === 0) return 'Custom';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: planCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Percentage discount from an original price to a current price.
  // Returns 0 if either value is missing/zero (no badge shown).
  const discountPct = (original: number, current: number) => {
    if (!original || original <= 0 || current >= original) return 0;
    return Math.round(((original - current) / original) * 100);
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

      {/* Business Address — OSM Nominatim autocomplete with manual fallback */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Business Address</Label>
        <AddressAutocomplete
          value={{
            address: step1.address,
            city: step1.city,
            state: step1.state,
            pincode: step1.pincode,
            country: step1.country,
            countryCode: step1.countryCode,
            latitude: step1.latitude,
            longitude: step1.longitude,
          }}
          onChange={(v: AddressValue) =>
            setStep1((s) => ({
              ...s,
              address: v.address,
              city: v.city,
              state: v.state,
              pincode: v.pincode,
              country: v.country,
              countryCode: v.countryCode,
              latitude: v.latitude,
              longitude: v.longitude,
            }))
          }
        />
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // Render: Step 2 – Business Profile (phase-3)
  // Collects marketplace-eligibility fields: categories, coverage area,
  // business hours, marketplace opt-in, Stripe Connect.
  // -------------------------------------------------------------------------

  const renderStep2 = () => {
    // Toggle a business category on/off. When deselecting "others", clear
    // the free-text description too so we don't persist stale text.
    const toggleCategory = (industryId: string) => {
      setStep2((s) => {
        const isSelected = s.businessCategories.includes(industryId);
        const nextCategories = isSelected
          ? s.businessCategories.filter((id) => id !== industryId)
          : [...s.businessCategories, industryId];
        const nextDesc =
          industryId === 'others' && !isSelected
            ? s.otherCategoryDescription // selecting "others" — keep existing text
            : industryId === 'others' && isSelected
              ? '' // deselecting "others" — wipe description
              : s.otherCategoryDescription;
        return {
          ...s,
          businessCategories: nextCategories,
          otherCategoryDescription: nextDesc,
          errors: { ...s.errors, businessCategories: '' },
        };
      });
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
              Select all the service categories your business covers. Grouped by 11 verticals.
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

            {/* "Other (specify)" free-text — shown only when the user has
                selected the "others" industry. The description is stored in
                settingsJson.otherCategoryDescription on the tenant (no schema
                migration needed). */}
            {step2.businessCategories.includes('others') && (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="otherCategoryDescription" className="text-sm font-medium">
                  Please describe your business
                </Label>
                <Input
                  id="otherCategoryDescription"
                  placeholder="e.g. Mobile pet grooming, Drone photography, …"
                  value={step2.otherCategoryDescription}
                  onChange={(e) =>
                    setStep2((s) => ({ ...s, otherCategoryDescription: e.target.value }))
                  }
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Helps us route the right leads to you and improve future category coverage.
                </p>
              </div>
            )}
            <FieldError id="businessCategories" />
          </CardContent>
        </Card>

        {/* ── Coverage Area ───────────────────────────────────────────────── */}
        <Card id="step2-field-coverageAreas">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Coverage Area
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
            Save ~17% (2 months free)
          </Badge>
        )}
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {plans.map((plan) => {
          const PlanIcon = plan.icon;
          const isSelected = step3.plan === plan.id;
          const price =
            step3.billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
          // Per-plan discount % for the strikethrough badge.
          // Monthly: originalMonthlyPrice → monthlyPrice.
          // Yearly:  originalMonthlyPrice * 12 → yearlyPrice.
          const monthlySavePct = discountPct(plan.originalMonthlyPrice, plan.monthlyPrice);
          const yearlySavePct = discountPct(
            plan.originalMonthlyPrice * 12,
            plan.yearlyPrice,
          );

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
              {plan.popular && (
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
                      {/* Strikethrough original price + Save % badge.
                          Monthly: show ~~originalMonthlyPrice~~ then current price.
                          Yearly: show ~~originalMonthlyPrice*12~~ then yearlyPrice. */}
                      {step3.billing === 'monthly' && plan.originalMonthlyPrice > 0 && (
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs text-muted-foreground line-through">
                            {formatPrice(plan.originalMonthlyPrice)}/mo
                          </p>
                          {monthlySavePct > 0 && (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0 text-xs px-1.5 py-0">
                              Save {monthlySavePct}%
                            </Badge>
                          )}
                        </div>
                      )}
                      {step3.billing === 'yearly' && plan.originalMonthlyPrice > 0 && (
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs text-muted-foreground line-through">
                            {formatPrice(plan.originalMonthlyPrice * 12)}/yr
                          </p>
                          {yearlySavePct > 0 && (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0 text-xs px-1.5 py-0">
                              Save {yearlySavePct}%
                            </Badge>
                          )}
                        </div>
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
                          {formatPrice(Math.round(plan.yearlyPrice / 12))}/mo
                          {yearlySavePct > 0 ? ` · ${yearlySavePct}% off` : ''}
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
        14-day free trial on all plans · No credit card required for trial · Cancel anytime · Yearly plans save ~17% (2 months free) · Subscribe &amp; Pay Now lets you choose Card (via Creem) or PayPal
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
          <DialogTitle>Fieseros Onboarding</DialogTitle>
          <DialogDescription>Set up your Fieseros workspace</DialogDescription>
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

    {/* ── Phase 9.8: Payment method chooser (PayPal vs Card-via-Creem) ─────
        Opened FIRST when the user clicks "Subscribe & Pay Now". If they pick
        PayPal → we open the existing PayPalCheckoutDialog below. If they pick
        Creem → the chooser itself redirects to Creem's hosted checkout. */}
    <PaymentMethodChooserDialog
      plan={chooserPlan}
      billingCycle={step3.billing}
      onClose={() => {
        setChooserPlan(null);
        // If the user cancels the chooser, advance with the "payment pending" banner
        // (same behavior as canceling the PayPal dialog).
        goNext();
      }}
      onChoosePayPal={(p) => {
        setChooserPlan(null);
        setPayCheckoutPlan({
          id: p.id,
          name: p.name,
          monthlyPrice: p.monthlyPrice,
          yearlyPrice: p.yearlyPrice,
        });
      }}
    />

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
          toast.success('Subscription activated! Welcome to Fieseros 🎉');
          goNext();
        }}
      />
    )}
    </>
  );
}
