'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Check,
  Zap,
  ArrowRight,
  Download,
  Shield,
  Clock,
  Calendar,
  Users,
  Briefcase,
  GitBranch,
  Star,
  Building2,
  Loader2,
  Wallet,
  AlertCircle,
  Info,
  Crown,
  Sparkles,
  History,
  TrendingDown,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { WhatsAppCreditBanner } from '@/components/whatsapp-credit-banner';
import { PayPalCheckoutDialog } from '@/components/billing/paypal-checkout-dialog';
import { PaymentMethodChooserDialog, type ChooserPlan } from '@/components/billing/payment-method-chooser-dialog';
import { authFetch } from '@/lib/client-auth';
import { formatCurrency } from '@/lib/currency';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UsageStat {
  used: number;
  limit: number;
  label: string;
  icon: React.ReactNode;
}

interface BillingRecord {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  invoiceUrl: string;
}

interface SubscriptionData {
  plan: 'starter' | 'growth' | 'business' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'trial' | 'expired' | 'pending_payment';
  billingCycle: 'monthly' | 'yearly';
  trialEndsAt: string | null;
  renewalDate: string | null;
  usage: {
    jobs: { used: number; limit: number };
    workflows: { used: number; limit: number };
    users: { used: number; limit: number };
  };
  paymentMethod: {
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  };
  billingHistory: BillingRecord[];
  paypalPayerEmail?: string | null;
  paymentProvider?: string;
  // Phase 2 + 3 additions:
  isTrialExpired?: boolean;
  daysRemainingInTrial?: number | null;
  pendingDowngrade?: {
    plan: string;
    effectiveAt: string | null;
    billingCycle: string | null;
  } | null;
  billingEvents?: BillingEventRecord[];
  plans?: CatalogPlan[];
}

interface BillingEventRecord {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  paymentProvider: string;
  payerEmail: string | null;
  invoiceNumber: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

interface CatalogPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  /** Strikethrough "original" price (0 = no discount shown). */
  originalMonthlyPrice?: number;
  /** Strikethrough "original" yearly price (0 = no discount shown). */
  originalYearlyPrice?: number;
  /** Optional override text like "Launch offer" — when set, used instead of the auto-computed %. */
  discountBadge?: string | null;
  currency: string;
  maxUsers: number;
  maxJobs: number;
  maxWorkflows: number;
  features: Record<string, boolean>;
  popular: boolean;
  /** True for add-on plans (ai_pro_addon, marketplace_featured, etc.) — filtered out of the main plan grid. */
  isAddon?: boolean;
  sortOrder: number;
}

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: 'starter' | 'growth' | 'business' | 'enterprise';
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  /** Original monthly price before the promotional discount (null/0 for Enterprise/Custom). */
  originalMonthlyPrice?: number | null;
  /** Original yearly price before the promotional discount (null/0 = no discount shown). */
  originalYearlyPrice?: number | null;
  /** Optional override text like "Launch offer" — when set, used instead of the auto-computed %. */
  discountBadge?: string | null;
  description: string;
  popular?: boolean;
  features: PlanFeature[];
}

// ─── Add-on catalog (static metadata; price/active come from DB) ─────────────
// These three add-ons are rendered in the dedicated "Add-ons" section below
// the main plan grid. The `code` matches the Plan.code in the DB so the
// /api/addon-subscriptions POST can look up the live price.
interface AddonCatalogEntry {
  code: string;
  name: string;
  description: string;
  /** Fallback monthly price shown while loading or if the plan isn't seeded yet. */
  fallbackMonthlyPrice: number;
  icon: React.ReactNode;
}

const ADDON_CATALOG: AddonCatalogEntry[] = [
  {
    code: 'ai_pro_addon',
    name: 'AI Pro Add-on',
    description: 'More AI usage — additional monthly AI credits for power users.',
    fallbackMonthlyPrice: 19,
    icon: <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
  },
  {
    code: 'marketplace_featured',
    name: 'Marketplace Featured Listing',
    description:
      'Stand out in the marketplace with a featured badge and priority placement.',
    fallbackMonthlyPrice: 19,
    icon: <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
  },
  {
    code: 'marketplace_premium',
    name: 'Marketplace Premium Featured',
    description: 'Top placement + premium badge + instant booking eligibility.',
    fallbackMonthlyPrice: 49,
    icon: <Crown className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
  },
];

interface AddonSubscriptionRecord {
  id: string;
  addonCode: string;
  displayName: string;
  status: string;
  amount: number;
  currency: string;
  billingCycle: string;
  paymentProvider: string;
  startDate: string;
  endDate: string | null;
  nextBillingAt: string | null;
  cancelledAt: string | null;
}

// ─── Plan Data ───────────────────────────────────────────────────────────────

// FALLBACK_PLANS is only used when /api/subscriptions doesn't return a DB-backed
// plan catalog (e.g. network/seed failure). The DB-backed catalog is the source
// of truth — superadmins edit prices via the Plan Catalog UI and the new values
// flow back through /api/subscriptions → data.plans.
const FALLBACK_PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 29,
    originalMonthlyPrice: 49,
    originalYearlyPrice: 490,
    yearlyPrice: 290,
    description: 'For solo entrepreneurs & freelancers',
    features: [
      { text: '1 user', included: true },
      { text: '200 jobs/month', included: true },
      { text: '10 workflows', included: true },
      { text: 'WhatsApp notifications', included: true },
      { text: 'Basic CRM', included: true },
      { text: 'Email support', included: true },
      { text: 'Invoice management', included: true },
      { text: 'Lead pipeline', included: false },
      { text: 'API access', included: false },
      { text: 'Custom workflows', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    id: 'growth',
    name: 'Professional',
    monthlyPrice: 79,
    originalMonthlyPrice: 129,
    originalYearlyPrice: 1290,
    yearlyPrice: 790,
    description: 'For growing service businesses',
    popular: true,
    features: [
      { text: '5 users', included: true },
      { text: 'Unlimited jobs/month', included: true },
      { text: '50 workflows', included: true },
      { text: 'WhatsApp notifications', included: true },
      { text: 'Advanced CRM', included: true },
      { text: 'Email support', included: true },
      { text: 'Invoice management', included: true },
      { text: 'Lead pipeline', included: true },
      { text: 'Priority support', included: true },
      { text: 'API access', included: true },
      { text: 'Custom workflows', included: false },
      { text: 'White-label', included: false },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 149,
    originalMonthlyPrice: 249,
    originalYearlyPrice: 2490,
    yearlyPrice: 1490,
    description: 'For scaling organizations',
    features: [
      { text: 'Unlimited users', included: true },
      { text: 'Unlimited jobs', included: true },
      { text: 'Unlimited workflows', included: true },
      { text: 'WhatsApp notifications', included: true },
      { text: 'Advanced CRM', included: true },
      { text: 'Invoice management', included: true },
      { text: 'Lead pipeline', included: true },
      { text: 'Priority support', included: true },
      { text: 'API access', included: true },
      { text: 'Custom workflows', included: true },
      { text: 'Dedicated support', included: true },
      { text: 'White-label', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'For large enterprises & franchises',
    features: [
      { text: 'Unlimited users', included: true },
      { text: 'Unlimited jobs', included: true },
      { text: 'Unlimited workflows', included: true },
      { text: 'Everything in Business', included: true },
      { text: 'White-label branding', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'SLA guarantee', included: true },
      { text: 'On-premise option', included: true },
      { text: 'Dedicated account manager', included: true },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTrialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const end = new Date(trialEndsAt);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Paid':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'Pending':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'Overdue':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getPlanIcon(planId: string) {
  switch (planId) {
    case 'starter': return <Zap className="size-5 text-emerald-600 dark:text-emerald-400" />;
    case 'growth': return <Sparkles className="size-5 text-emerald-600 dark:text-emerald-400" />;
    case 'business': return <Crown className="size-5 text-emerald-600 dark:text-emerald-400" />;
    case 'enterprise': return <Building2 className="size-5 text-emerald-600 dark:text-emerald-400" />;
    default: return <Zap className="size-5 text-emerald-600 dark:text-emerald-400" />;
  }
}

// ─── Billing Event helpers (Phase 2) ─────────────────────────────────────────

function getBillingEventIcon(type: string, status: string) {
  // Capture / subscription_created / renewal → emerald check
  // Cancel → red X
  // Fail → red alert
  // trial_reminder / trial_expired → amber clock
  // downgrade_scheduled / downgrade_applied → TrendingDown
  // proration → TrendingUp-ish (use Zap)
  // payment_method_added → Wallet
  if (status === 'failed') return <AlertCircle className="h-4 w-4 text-red-500" />;
  switch (type) {
    case 'capture':
    case 'subscription_created':
    case 'renewal':
      return <Check className="h-4 w-4 text-emerald-600" />;
    case 'cancel':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'fail':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'trial_reminder':
    case 'trial_expired':
      return <Clock className="h-4 w-4 text-amber-500" />;
    case 'downgrade_scheduled':
    case 'downgrade_applied':
      return <TrendingDown className="h-4 w-4 text-blue-500" />;
    case 'proration':
      return <Zap className="h-4 w-4 text-emerald-600" />;
    case 'payment_method_added':
      return <Wallet className="h-4 w-4 text-blue-500" />;
    case 'refund':
      return <TrendingDown className="h-4 w-4 text-purple-500" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

function getBillingEventBadge(type: string, status: string) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium';
  if (status === 'failed') return `${base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`;
  if (status === 'pending') return `${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`;
  switch (type) {
    case 'capture':
    case 'subscription_created':
    case 'renewal':
      return `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400`;
    case 'cancel':
      return `${base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`;
    case 'trial_reminder':
    case 'trial_expired':
      return `${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`;
    case 'downgrade_scheduled':
    case 'downgrade_applied':
      return `${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`;
    default:
      return `${base} bg-muted text-muted-foreground`;
  }
}

function formatBillingEventLabel(type: string): string {
  const labels: Record<string, string> = {
    capture: 'Payment',
    refund: 'Refund',
    cancel: 'Cancellation',
    fail: 'Failure',
    trial_reminder: 'Trial Reminder',
    trial_expired: 'Trial Expired',
    plan_change: 'Plan Change',
    proration: 'Proration',
    downgrade_scheduled: 'Downgrade Scheduled',
    downgrade_applied: 'Downgrade Applied',
    renewal: 'Renewal',
    payment_method_added: 'Payment Method',
    subscription_created: 'Subscription',
  };
  return labels[type] || type;
}

// ─── Fallback Data ───────────────────────────────────────────────────────────

const FALLBACK_DATA: SubscriptionData = {
  plan: 'starter',
  status: 'trial',
  billingCycle: 'monthly',
  trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  renewalDate: null,
  usage: {
    jobs: { used: 0, limit: 100 },
    workflows: { used: 0, limit: 10 },
    users: { used: 1, limit: 1 },
  },
  paymentMethod: null,
  billingHistory: [],
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function BillingView() {
  const { currency, format, formatCompact, symbol } = useCompanyCurrency();
  const [data, setData] = useState<SubscriptionData>(FALLBACK_DATA);
  const [isYearly, setIsYearly] = useState(data.billingCycle === 'yearly');
  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);
  const [paypalCheckoutPlan, setPaypalCheckoutPlan] = useState<Plan | null>(null);
  const [chooserPlan, setChooserPlan] = useState<Plan | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [downgradeTarget, setDowngradeTarget] = useState<Plan | null>(null);
  const [isSchedulingDowngrade, setIsSchedulingDowngrade] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [prorationPreview, setProrationPreview] = useState<{
    direction: string;
    proratedAmount: number;
    daysRemaining: number;
    newPlan: string;
  } | null>(null);
  // ── Add-on subscriptions state (Phase 5) ─────────────────────────────────
  const [addonSubscriptions, setAddonSubscriptions] = useState<AddonSubscriptionRecord[]>([]);
  const [subscribingAddonCode, setSubscribingAddonCode] = useState<string | null>(null);
  const [cancellingAddon, setCancellingAddon] = useState<AddonSubscriptionRecord | null>(null);
  const [isCancellingAddon, setIsCancellingAddon] = useState(false);

  // Merge the /api/subscriptions JSON response into our SubscriptionData
  // shape. Shared between initial fetch + post-payment refetch.
  const mergeJson = useCallback((json: Record<string, unknown>): SubscriptionData => {
    return {
      ...FALLBACK_DATA,
      ...json,
      usage: (json.usage as SubscriptionData['usage']) || FALLBACK_DATA.usage,
      // Only use paymentMethod from the API — never fall back to fake data.
      // A trial/new user with no card on file should see null, not a phantom Visa.
      paymentMethod: (json.paymentMethod as SubscriptionData['paymentMethod']) ?? null,
      billingHistory: (json.billingHistory as BillingRecord[]) ?? [],
      renewalDate: (json.renewalDate as string) ?? null,
      paypalPayerEmail: (json.paypalPayerEmail as string | null) ?? null,
      paymentProvider: (json.paymentProvider as string) || 'none',
      isTrialExpired: (json.isTrialExpired as boolean) || false,
      daysRemainingInTrial: (json.daysRemainingInTrial as number | null) ?? null,
      pendingDowngrade: (json.pendingDowngrade as SubscriptionData['pendingDowngrade']) ?? null,
      billingEvents: (json.billingEvents as BillingEventRecord[]) ?? [],
      plans: (json.plans as CatalogPlan[]) ?? [],
    } as SubscriptionData;
  }, []);

  useEffect(() => {
    async function fetchSubscription() {
      setIsLoading(true);
      setFetchError(null);
      try {
        const res = await authFetch('/api/subscriptions');
        if (res.status === 401) {
          // Session expired — surface a clear error rather than silently
          // showing fake "Starter · Trial · 14 days" fallback data.
          setFetchError('Your session has expired. Please refresh the page and sign in again.');
          setData(FALLBACK_DATA);
          return;
        }
        if (!res.ok) {
          setFetchError(`Failed to load subscription data (HTTP ${res.status}). Please try again.`);
          setData(FALLBACK_DATA);
          return;
        }
        const json = await res.json();
        setData(mergeJson(json));
        setIsYearly((json.billingCycle || 'monthly') === 'yearly');
      } catch (err) {
        // Network/abort error — show a clear message instead of silently
        // falling back to FALLBACK_DATA (which previously made the page
        // look "fine" while showing completely fake trial data).
        const msg = err instanceof Error ? err.message : 'Network error';
        setFetchError(`Unable to reach the server: ${msg}. Please check your connection and retry.`);
        setData(FALLBACK_DATA);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSubscription();
  }, [mergeJson]);

  // Compute the effective plan list: prefer DB-backed catalog from the API,
  // fall back to the hardcoded FALLBACK_PLANS constant.
  const effectivePlans: Plan[] = (data.plans && data.plans.length > 0
    ? data.plans
        // Filter out add-on plans (ai_pro_addon, marketplace_*, etc.) — they
        // are rendered in the dedicated Add-ons section below.
        .filter((cp) => !cp.isAddon)
        .map((cp) => {
          // Map DB catalog plan → local Plan interface
          const features: PlanFeature[] = [
            { text: `${cp.maxUsers >= 999999 ? 'Unlimited' : cp.maxUsers} user${cp.maxUsers === 1 ? '' : 's'}`, included: true },
            { text: `${cp.maxJobs >= 999999 ? 'Unlimited' : cp.maxJobs.toLocaleString()} jobs/month`, included: true },
            { text: `${cp.maxWorkflows >= 999 ? 'Unlimited' : cp.maxWorkflows} workflows`, included: true },
            { text: 'WhatsApp notifications', included: !!cp.features.whatsappIntegration },
            { text: 'Custom workflows', included: !!cp.features.customWorkflows },
            { text: 'API access', included: !!cp.features.apiAccess },
            { text: 'Priority support', included: !!cp.features.prioritySupport },
            { text: 'Lead pipeline', included: !!cp.features.salesPipeline },
            { text: 'White-label', included: !!cp.features.whiteLabel },
          ];
          return {
            id: cp.code as Plan['id'],
            name: cp.name,
            monthlyPrice: cp.monthlyPrice,
            yearlyPrice: cp.yearlyPrice,
            originalMonthlyPrice: cp.originalMonthlyPrice ?? null,
            originalYearlyPrice: cp.originalYearlyPrice ?? null,
            discountBadge: cp.discountBadge ?? null,
            description: cp.description || '',
            popular: cp.popular,
            features,
          } as Plan;
        })
    : FALLBACK_PLANS);

  // Add-on plans (DB-backed) — used to look up live prices for the Add-ons
  // section. Falls back to ADDON_CATALOG's fallbackMonthlyPrice when a plan
  // isn't seeded yet.
  const addonPlansFromDb: CatalogPlan[] = (data.plans || []).filter(
    (cp) => cp.isAddon
  );

  const trialDays = data.daysRemainingInTrial ?? getTrialDaysRemaining(data.trialEndsAt);
  const isTrialExpired = data.isTrialExpired === true;
  const currentPlanData = effectivePlans.find((p) => p.id === data.plan) || FALLBACK_PLANS[0];
  const currentPrice = isYearly ? (currentPlanData?.yearlyPrice || 0) : (currentPlanData?.monthlyPrice || 0);

  const usageStats: UsageStat[] = [
    {
      label: 'Jobs',
      used: data.usage?.jobs?.used ?? 0,
      limit: data.usage?.jobs?.limit ?? 100,
      icon: <Briefcase className="h-4 w-4" />,
    },
    {
      label: 'Workflows',
      used: data.usage?.workflows?.used ?? 0,
      limit: data.usage?.workflows?.limit ?? 10,
      icon: <GitBranch className="h-4 w-4" />,
    },
    {
      label: 'Users',
      used: data.usage?.users?.used ?? 0,
      limit: data.usage?.users?.limit ?? 1,
      icon: <Users className="h-4 w-4" />,
    },
  ];

  // Determine whether clicking a plan card is an upgrade or a downgrade.
  // Upgrades → PayPal checkout (immediate). Downgrades → schedule for next
  // renewal (Phase 3). Same plan → disabled.
  function getPlanDirection(plan: Plan): 'upgrade' | 'downgrade' | 'current' {
    if (plan.id === data.plan) return 'current';
    const currentIdx = effectivePlans.findIndex((p) => p.id === data.plan);
    const targetIdx = effectivePlans.findIndex((p) => p.id === plan.id);
    if (targetIdx < 0 || currentIdx < 0) return 'upgrade';
    return targetIdx > currentIdx ? 'upgrade' : 'downgrade';
  }

  async function handleUpgrade(plan: Plan) {
    if (plan.id === 'enterprise') {
      toast.info('Contact Sales', {
        description: 'Our team will reach out to discuss Enterprise pricing.',
      });
      setConfirmPlan(null);
      return;
    }

    const direction = getPlanDirection(plan);
    if (direction === 'downgrade') {
      // Phase 3: schedule the downgrade for the next renewal date.
      setDowngradeTarget(plan);
      setConfirmPlan(null);
      return;
    }

    // 'current' direction: only proceed if the user is in a trial or
    // pending_payment state (i.e. converting to paid). An already-active
    // subscription for the same plan has nothing to pay for.
    if (
      direction === 'current' &&
      data.status !== 'trial' &&
      data.status !== 'trialing' &&
      data.status !== 'pending_payment'
    ) {
      setConfirmPlan(null);
      return;
    }

    // Clear any stale proration preview from a previous upgrade attempt.
    setProrationPreview(null);

    // Upgrade / trial→paid conversion: fetch proration preview first, then
    // open the Payment Method Chooser so the user can pick PayPal (primary)
    // or Creem (card fallback). The chooser handles routing to the existing
    // PayPalCheckoutDialog (via onChoosePayPal) or to /api/creem/checkout.
    try {
      const res = await authFetch(`/api/subscriptions/prorate?plan=${plan.id}`);
      if (res.ok) {
        const prorate = await res.json();
        if (prorate.direction === 'upgrade' && prorate.proratedAmount > 0) {
          setProrationPreview({
            direction: prorate.direction,
            proratedAmount: prorate.proratedAmount,
            daysRemaining: prorate.daysRemaining,
            newPlan: plan.name,
          });
        }
      }
    } catch {
      // Proration preview is best-effort; don't block checkout on failure.
    }

    setChooserPlan(plan);
    setConfirmPlan(null);
  }

  async function handleScheduleDowngrade() {
    if (!downgradeTarget) return;
    setIsSchedulingDowngrade(true);
    try {
      const res = await authFetch('/api/subscriptions/downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: downgradeTarget.id,
          billingCycle: isYearly ? 'yearly' : 'monthly',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to schedule downgrade');
      toast.success('Downgrade scheduled', {
        description: json.message || `Your plan will change to ${downgradeTarget.name} at your next renewal date.`,
      });
      // Refetch to update the pendingDowngrade banner
      const subRes = await authFetch('/api/subscriptions');
      if (subRes.ok) {
        const subJson = await subRes.json();
        setData(mergeJson(subJson));
      }
      setDowngradeTarget(null);
    } catch (err) {
      toast.error('Failed to schedule downgrade', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsSchedulingDowngrade(false);
    }
  }

  async function handleCancelDowngrade() {
    setIsSchedulingDowngrade(true);
    try {
      const res = await authFetch('/api/subscriptions/downgrade', { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to cancel downgrade');
      toast.success('Downgrade cancelled', {
        description: json.message || 'You\'ll stay on your current plan.',
      });
      const subRes = await authFetch('/api/subscriptions');
      if (subRes.ok) {
        const subJson = await subRes.json();
        setData(mergeJson(subJson));
      }
    } catch (err) {
      toast.error('Failed to cancel downgrade', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsSchedulingDowngrade(false);
    }
  }

  function handlePaymentSuccess() {
    setPaypalCheckoutPlan(null);
    setProrationPreview(null);
    authFetch('/api/subscriptions')
      .then((res) => res.json())
      .then((json) => {
        setData(mergeJson(json));
        setIsYearly((json.billingCycle || 'monthly') === 'yearly');
      })
      .catch(() => {});
  }

  // ── Add-on subscriptions: fetch + subscribe + cancel ──────────────────────
  const refreshAddonSubscriptions = useCallback(async () => {
    try {
      const res = await authFetch('/api/addon-subscriptions');
      if (!res.ok) return;
      const json = await res.json();
      setAddonSubscriptions((json.addons as AddonSubscriptionRecord[]) || []);
    } catch {
      // Non-fatal — the Add-ons section will just show Subscribe buttons.
    }
  }, []);

  useEffect(() => {
    refreshAddonSubscriptions();
  }, [refreshAddonSubscriptions]);

  async function handleSubscribeAddon(addonCode: string) {
    setSubscribingAddonCode(addonCode);
    try {
      const res = await authFetch('/api/addon-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addonCode,
          billingCycle: isYearly ? 'yearly' : 'monthly',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to subscribe');
      // If the API returned a checkout URL (real Creem/PayPal flow), redirect.
      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
        return;
      }
      toast.success('Add-on activated', {
        description:
          json.message ||
          'Your add-on is now active. The charge will appear on your next invoice.',
      });
      await refreshAddonSubscriptions();
    } catch (err) {
      toast.error('Failed to activate add-on', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSubscribingAddonCode(null);
    }
  }

  async function handleCancelAddon() {
    if (!cancellingAddon) return;
    setIsCancellingAddon(true);
    try {
      const res = await authFetch(
        `/api/addon-subscriptions/${cancellingAddon.id}`,
        { method: 'DELETE' }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to cancel');
      toast.success('Add-on cancelled', {
        description:
          json.message ||
          `Your ${cancellingAddon.displayName} add-on has been cancelled.`,
      });
      setCancellingAddon(null);
      await refreshAddonSubscriptions();
    } catch (err) {
      toast.error('Failed to cancel add-on', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsCancellingAddon(false);
    }
  }

  async function handleCancelSubscription() {
    setIsUpgrading(true);
    try {
      const res = await authFetch('/api/paypal/cancel-subscription', {
        method: 'POST',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed');
      toast.success('Subscription cancelled', {
        description: json.message || 'You can continue using the Starter plan.',
      });
      setShowCancelConfirm(false);
      // Refresh data from the server so the UI reflects the new status
      try {
        const freshRes = await authFetch('/api/subscriptions');
        const freshJson = await freshRes.json();
        setData(mergeJson(freshJson));
        setIsYearly((freshJson.billingCycle || 'monthly') === 'yearly');
      } catch {
        setData((prev) => ({
          ...prev,
          plan: 'starter',
          status: 'cancelled',
          paymentProvider: 'none',
          pendingDowngrade: null,
        }));
      }
    } catch (err) {
      toast.error('Failed to cancel subscription', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsUpgrading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm text-muted-foreground">Loading subscription details…</p>
        </div>
      </div>
    );
  }

  // If the initial fetch failed (401 session expired, 500, network error),
  // surface a clear error banner with a retry button instead of silently
  // rendering fake FALLBACK_DATA that looks like a real "Starter · Trial"
  // subscription. This previously masked prod issues (cookie not forwarded
  // → 401 → silent fallback → user thought they had a trial they didn't).
  if (fetchError) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col items-start gap-4 rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/30">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
              Couldn&apos;t load your subscription
            </h2>
          </div>
          <p className="text-sm text-red-600 dark:text-red-500">{fetchError}</p>
          <Button
            variant="outline"
            onClick={() => {
              setFetchError(null);
              setIsLoading(true);
              // Re-trigger the fetch effect by toggling state.
              setTimeout(() => window.location.reload(), 100);
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Subscription &amp; Billing</h1>
            <p className="text-sm text-muted-foreground">Manage your plan and billing preferences</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="w-fit border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
          >
            <Zap className="mr-1 h-3 w-3" />
            {currentPlanData?.name} Plan
          </Badge>
        </div>
      </div>

      {/* ── Current Plan Card ──────────────────────────────────────────── */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 dark:border-emerald-800 dark:from-emerald-950/30 dark:to-teal-950/20">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="size-5 text-emerald-600" />
                Current Plan
              </CardTitle>
              <CardDescription className="mt-1">
                {currentPlanData?.name} · {data.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} billing
                {currentPrice > 0 && <span className="font-semibold text-foreground"> · {formatCurrency(currentPrice, 'USD')}/{data.billingCycle === 'yearly' ? 'year' : 'month'}</span>}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={`w-fit ${
                  isTrialExpired || data.status === 'expired'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : data.status === 'trial' || data.status === 'trialing'
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : data.status === 'active'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : data.status === 'past_due'
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isTrialExpired || data.status === 'expired'
                  ? 'Trial Expired'
                  : data.status === 'trial' || data.status === 'trialing'
                  ? 'Trial'
                  : data.status === 'active'
                  ? 'Active'
                  : data.status === 'past_due'
                  ? 'Past Due'
                  : data.status === 'cancelled'
                  ? 'Cancelled'
                  : data.status}
              </Badge>
              {data.paymentProvider === 'paypal' && (
                <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                  <Wallet className="mr-1 h-3 w-3" />
                  PayPal
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trial-expired banner (Phase 1) */}
          {isTrialExpired && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                  Your trial has expired
                </p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                  Access to your dashboard, leads, jobs, and workflows is paused.
                  Choose a plan below to restore full access. Your data is
                  preserved for 30 days.
                </p>
              </div>
            </div>
          )}

          {/* Trial-days-remaining banner with upgrade CTA */}
          {!isTrialExpired && (data.status === 'trial' || data.status === 'trialing') && trialDays > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex items-center gap-2 flex-1">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {trialDays} {trialDays === 1 ? 'day' : 'days'} remaining in your free trial
                </span>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700 h-8 text-xs"
                onClick={() => {
                  // Convert the user's current trial plan to paid (handles
                  // all tiers — Starter/Growth/Pro — instead of hardcoding Growth).
                  const currentPlanObj = effectivePlans.find(p => p.id === data.plan);
                  if (currentPlanObj) handleUpgrade(currentPlanObj);
                }}
              >
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                Subscribe Now
              </Button>
            </div>
          )}

          {/* WhatsApp Credit Banner for trial users */}
          {(data.status === 'trial' || data.status === 'trialing') && (
            <WhatsAppCreditBanner
              onUpgradeClick={() => {
                const currentPlanObj = effectivePlans.find(p => p.id === data.plan);
                if (currentPlanObj) handleUpgrade(currentPlanObj);
              }}
              onConnectMetaClick={() => {
                const event = new CustomEvent('navigate', { detail: 'integrations' })
                window.dispatchEvent(event)
              }}
            />
          )}

          {/* Pending downgrade banner (Phase 3) */}
          {data.pendingDowngrade && (
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/30">
              <TrendingDown className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  Downgrade scheduled to {data.pendingDowngrade.plan} plan
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                  Effective on your next renewal date
                  {data.pendingDowngrade.effectiveAt
                    ? ` (${new Date(data.pendingDowngrade.effectiveAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})`
                    : ''}. Your current plan remains active until then.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/40"
                  onClick={handleCancelDowngrade}
                  disabled={isSchedulingDowngrade}
                >
                  {isSchedulingDowngrade ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  Cancel downgrade
                </Button>
              </div>
            </div>
          )}

          {/* Renewal date */}
          {data.renewalDate && data.status === 'active' && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/20">
              <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300">
                Next renewal: <span className="font-medium">{new Date(data.renewalDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </span>
            </div>
          )}

          {/* Usage */}
          <div className="grid gap-4 sm:grid-cols-3">
            {usageStats.map((stat) => {
              const pct = stat.limit === 0 ? 100 : Math.min(100, Math.round((stat.used / stat.limit) * 100));
              const isNearLimit = pct >= 80;
              return (
                <div key={stat.label} className="space-y-2 rounded-lg border bg-card p-4 dark:bg-card/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {stat.icon}
                      {stat.label}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {stat.used.toLocaleString('en-US')}/{stat.limit === 0 ? '∞' : stat.limit.toLocaleString('en-US')}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className={`h-2 ${isNearLimit ? '[&>[data-slot=progress-indicator]]:bg-amber-500' : '[&>[data-slot=progress-indicator]]:bg-emerald-500'}`}
                  />
                  {isNearLimit && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Approaching limit
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Billing Cycle Toggle ───────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3">
        <Label
          htmlFor="billing-toggle"
          className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          Monthly
        </Label>
        <Switch
          id="billing-toggle"
          checked={isYearly}
          onCheckedChange={setIsYearly}
        />
        <Label
          htmlFor="billing-toggle"
          className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          Yearly
        </Label>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          Save 50%!
        </Badge>
      </div>

      {/* ── Plan Cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {effectivePlans.map((plan) => {
          const isCurrentPlan = plan.id === data.plan;
          const isTrialOrPending =
            data.status === 'trial' ||
            data.status === 'trialing' ||
            data.status === 'pending_payment';
          const showSubscribeForCurrent = isCurrentPlan && isTrialOrPending;
          const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const direction = getPlanDirection(plan);
          const isDowngrade = direction === 'downgrade';

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col transition-all ${
                isCurrentPlan
                  ? 'border-emerald-400 shadow-md ring-1 ring-emerald-400 dark:border-emerald-600 dark:ring-emerald-600'
                  : plan.popular
                  ? 'border-teal-300 shadow-sm hover:border-emerald-300 hover:shadow-md dark:border-teal-700 dark:hover:border-emerald-700'
                  : 'hover:border-emerald-300 hover:shadow-md dark:hover:border-emerald-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700">
                    <Star className="mr-1 h-3 w-3" />
                    Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-0">
                <div className="flex items-center gap-2">
                  {getPlanIcon(plan.id)}
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div>
                  {plan.id === 'enterprise' || plan.monthlyPrice === 0 ? (
                    <p className="text-3xl font-bold">Custom</p>
                  ) : (
                    <>
                      {/* Monthly mode: show DB-fetched original monthly price struck through */}
                      {!isYearly &&
                        plan.originalMonthlyPrice &&
                        plan.originalMonthlyPrice > plan.monthlyPrice &&
                        plan.monthlyPrice > 0 && (
                          <p className="text-sm text-muted-foreground line-through mb-0.5">
                            {formatCurrency(plan.originalMonthlyPrice, 'USD')}
                            <span className="text-xs">/mo</span>
                          </p>
                        )}
                      {/* Yearly mode: show DB-fetched original yearly price struck through
                          (fall back to originalMonthlyPrice*12 if originalYearlyPrice missing) */}
                      {isYearly && plan.yearlyPrice > 0 && (() => {
                        const origYearly =
                          plan.originalYearlyPrice && plan.originalYearlyPrice > 0
                            ? plan.originalYearlyPrice
                            : plan.originalMonthlyPrice && plan.originalMonthlyPrice > 0
                              ? plan.originalMonthlyPrice * 12
                              : 0;
                        if (origYearly > plan.yearlyPrice) {
                          return (
                            <p className="text-sm text-muted-foreground line-through mb-0.5">
                              {formatCurrency(origYearly, 'USD')}
                              <span className="text-xs">/yr</span>
                            </p>
                          );
                        }
                        return null;
                      })()}
                      <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(price, 'USD')}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        /{isYearly ? 'year' : 'month'}
                      </span>
                      {/* Monthly discount badge — DB discountBadge OR auto-computed % */}
                      {!isYearly &&
                        plan.originalMonthlyPrice &&
                        plan.originalMonthlyPrice > plan.monthlyPrice &&
                        plan.monthlyPrice > 0 && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                            {plan.discountBadge && plan.discountBadge.trim().length > 0
                              ? plan.discountBadge
                              : `Save ${Math.round(
                                  ((plan.originalMonthlyPrice - plan.monthlyPrice) /
                                    plan.originalMonthlyPrice) *
                                    100
                                )}%`}
                          </p>
                        )}
                      {/* Yearly discount badge — DB discountBadge OR auto-computed % */}
                      {isYearly && plan.yearlyPrice > 0 && (() => {
                        const origYearly =
                          plan.originalYearlyPrice && plan.originalYearlyPrice > 0
                            ? plan.originalYearlyPrice
                            : plan.originalMonthlyPrice && plan.originalMonthlyPrice > 0
                              ? plan.originalMonthlyPrice * 12
                              : 0;
                        if (origYearly > plan.yearlyPrice) {
                          const pct = Math.round(
                            ((origYearly - plan.yearlyPrice) / origYearly) * 100
                          );
                          return (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                              {plan.discountBadge && plan.discountBadge.trim().length > 0
                                ? plan.discountBadge
                                : `${formatCurrency(Math.round(plan.yearlyPrice / 12), 'USD')}/mo · ${pct}% off`}
                            </p>
                          );
                        }
                        return (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                            {formatCurrency(Math.round(plan.yearlyPrice / 12), 'USD')}/mo
                          </p>
                        );
                      })()}
                    </>
                  )}
                </div>

                <Separator />

                <ul className="space-y-2.5">
                  {plan.features.map(
                    (feature) =>
                      feature.included && (
                        <li key={feature.text} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span>{feature.text}</span>
                        </li>
                      )
                  )}
                  {plan.features.filter((f) => !f.included).map(
                    (feature) => (
                      <li key={feature.text} className="flex items-start gap-2 text-sm text-muted-foreground/50">
                        <span className="mt-0.5 h-4 w-4 shrink-0 text-center text-xs leading-4">—</span>
                        <span className="line-through">{feature.text}</span>
                      </li>
                    )
                  )}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrentPlan ? (
                  showSubscribeForCurrent ? (
                    <Button
                      className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => handleUpgrade(plan)}
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Subscribe & Pay Now
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full border-emerald-400 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                      disabled
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Current Plan
                    </Button>
                  )
                ) : plan.id === 'enterprise' ? (
                  <Button
                    variant="outline"
                    className="w-full hover:border-emerald-400 hover:text-emerald-700 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
                    onClick={() =>
                      toast.info('Contact Sales', {
                        description: 'Our team will reach out to discuss Enterprise pricing.',
                      })
                    }
                  >
                    Contact Sales
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${
                      isDowngrade
                        ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                    onClick={() => handleUpgrade(plan)}
                  >
                    {isDowngrade ? (
                      <>
                        <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                        Downgrade
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Upgrade to {plan.name}
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* ── Add-ons ──────────────────────────────────────────────────────── */}
      {/* Optional paid add-ons (AI credits, marketplace featured placement).
          Prices come from the DB-backed Plan catalog (addonPlansFromDb). The
          Subscribe button POSTs to /api/addon-subscriptions, which creates an
          AddonSubscription row. Active add-ons show a Cancel button. */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-lg font-semibold">Add-ons</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Boost your plan with optional add-ons. Cancel anytime — billing is
          prorated on your next invoice.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ADDON_CATALOG.map((addon) => {
            const dbPlan = addonPlansFromDb.find((p) => p.code === addon.code);
            const monthlyPrice = dbPlan?.monthlyPrice ?? addon.fallbackMonthlyPrice;
            const yearlyPrice = dbPlan?.yearlyPrice ?? monthlyPrice * 10;
            const activeSub = addonSubscriptions.find(
              (s) => s.addonCode === addon.code && s.status === 'active'
            );
            const isSubscribing = subscribingAddonCode === addon.code;
            return (
              <Card
                key={addon.code}
                className={`flex flex-col ${
                  activeSub
                    ? 'border-emerald-300 dark:border-emerald-700'
                    : 'hover:border-emerald-300 hover:shadow-md dark:hover:border-emerald-700'
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {addon.icon}
                      <CardTitle className="text-base">{addon.name}</CardTitle>
                    </div>
                    {activeSub && (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Active
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mt-1">{addon.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(isYearly ? yearlyPrice : monthlyPrice, 'USD')}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      /{isYearly ? 'year' : 'month'}
                    </span>
                  </div>
                  {isYearly && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatCurrency(Math.round(yearlyPrice / 12), 'USD')}/mo billed yearly
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  {activeSub ? (
                    <Button
                      variant="outline"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/30"
                      onClick={() => setCancellingAddon(activeSub)}
                    >
                      Cancel Add-on
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => handleSubscribeAddon(addon.code)}
                      disabled={isSubscribing}
                    >
                      {isSubscribing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Activating…
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Subscribe
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
        {addonSubscriptions.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {addonSubscriptions.length} active add-on
            {addonSubscriptions.length === 1 ? '' : 's'} · manage cancellations
            from each card above.
          </p>
        )}
      </div>

      {/* ── Payment Method ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Payment Method
          </CardTitle>
          <CardDescription>
            {data.paymentProvider === 'paypal' || data.paymentMethod
              ? 'Your default payment method on file'
              : 'No payment method on file'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {data.paymentProvider === 'paypal' ? (
              /* PayPal connected */
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium flex items-center gap-2">
                    PayPal
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 text-blue-600">Active</Badge>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.paypalPayerEmail || 'Connected'}
                  </p>
                </div>
              </div>
            ) : data.paymentMethod ? (
              /* Credit/debit card on file */
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">
                    {data.paymentMethod.brand} ending in {data.paymentMethod.last4}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Expires {String(data.paymentMethod.expiryMonth).padStart(2, '0')}/{data.paymentMethod.expiryYear}
                  </p>
                </div>
              </div>
            ) : (
              /* No payment method — trial or new user */
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted/50 dark:bg-muted/20">
                  <CreditCard className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">No payment method added</p>
                  <p className="text-sm text-muted-foreground/70">
                    {(data.status === 'trial' || data.status === 'trialing')
                      ? 'Add a payment method to upgrade your plan'
                      : 'Add a payment method to subscribe'}
                  </p>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              {/* Cancel Subscription / Cancel Trial button
                  Visible for: active, trial, trialing statuses (NOT for cancelled/expired)
                  Handles both PayPal and trial cancellations via the same API */}
              {(data.status === 'active' ||
                data.status === 'trial' ||
                data.status === 'trialing' ||
                data.status === 'past_due') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/30"
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={isUpgrading}
                >
                  {data.status === 'trial' || data.status === 'trialing'
                    ? 'Cancel Trial'
                    : 'Cancel Subscription'}
                </Button>
              )}
              {/* Upgrade CTA for trial users with no payment method */}
              {!data.paymentMethod && data.paymentProvider !== 'paypal' &&
                (data.status === 'trial' || data.status === 'trialing') && (
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => {
                    const currentPlanObj = effectivePlans.find(p => p.id === data.plan);
                    if (currentPlanObj) handleUpgrade(currentPlanObj);
                  }}
                >
                  <Zap className="mr-1.5 h-3.5 w-3.5" />
                  Subscribe & Pay Now
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Billing History ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing History</CardTitle>
          <CardDescription>Your recent transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.billingHistory || []).map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-sm">
                      {new Date(record.date).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {record.description}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(record.amount, 'USD')}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(record.status)}`}
                      >
                        {record.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {record.invoiceUrl && record.invoiceUrl !== '#' ? (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                        >
                          <a href={record.invoiceUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-1 h-3.5 w-3.5" />
                            Receipt
                          </a>
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                          onClick={() => toast.info('Receipt is not available for this entry.')}
                        >
                          <Download className="mr-1 h-3.5 w-3.5" />
                          PDF
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Billing Activity (Audit Log) ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Billing Activity
          </CardTitle>
          <CardDescription>
            Audit log of every billing event — payments, trial reminders, plan changes, and more
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.billingEvents && data.billingEvents.length > 0 ? (
            <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
              <ul className="space-y-2">
                {data.billingEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-start gap-3 rounded-lg border bg-card p-3 dark:bg-card/50"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {getBillingEventIcon(event.type, event.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getBillingEventBadge(event.type, event.status)}`}>
                          {formatBillingEventLabel(event.type)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1 truncate">
                        {event.description || formatBillingEventLabel(event.type)}
                      </p>
                      {event.amount > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {event.currency} {event.amount.toFixed(2)}
                          {event.invoiceNumber ? ` · Invoice ${event.invoiceNumber}` : ''}
                        </p>
                      )}
                      {event.payerEmail && event.type !== 'trial_reminder' && (
                        <p className="text-xs text-muted-foreground mt-0.5">{event.payerEmail}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <History className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No billing activity yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Events will appear here as you upgrade, renew, or receive trial reminders.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Downgrade Confirmation Dialog (Phase 3) ────────────────────── */}
      <Dialog open={!!downgradeTarget} onOpenChange={(open) => !open && setDowngradeTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-blue-600" />
              Schedule Downgrade to {downgradeTarget?.name}
            </DialogTitle>
            <DialogDescription>
              Your downgrade will take effect at your next renewal date. Your
              current plan remains active (with all its features) until then —
              you will not be charged again until the downgrade applies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current plan</span>
                <span className="font-medium">{currentPlanData?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New plan (at renewal)</span>
                <span className="font-medium">{downgradeTarget?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective date</span>
                <span className="font-medium">
                  {data.renewalDate
                    ? new Date(data.renewalDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    : 'Next renewal'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">New price</span>
                <span className="font-medium">
                  {formatCurrency(isYearly ? (downgradeTarget?.yearlyPrice ?? 0) : (downgradeTarget?.monthlyPrice ?? 0), 'USD')}
                  /{isYearly ? 'year' : 'month'}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-400">
                You can cancel this scheduled downgrade anytime before the
                renewal date from the Subscription page.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDowngradeTarget(null)} disabled={isSchedulingDowngrade}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleScheduleDowngrade}
              disabled={isSchedulingDowngrade}
            >
              {isSchedulingDowngrade ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <TrendingDown className="mr-2 h-4 w-4" />
                  Schedule Downgrade
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Payment Method Chooser Dialog ─────────────────────────────────── */}
      {/* Opens first when the user clicks "Upgrade". Routes to either PayPal
          (existing dialog below) or Creem (server-side redirect to hosted
          checkout). PayPal remains the primary/recommended option. */}
      <PaymentMethodChooserDialog
        plan={chooserPlan as ChooserPlan | null}
        billingCycle={isYearly ? 'yearly' : 'monthly'}
        onClose={() => setChooserPlan(null)}
        onChoosePayPal={(p) => {
          setChooserPlan(null);
          setPaypalCheckoutPlan(p as Plan);
        }}
      />

      {/* ── PayPal Checkout Dialog ─────────────────────────────────────── */}
      {paypalCheckoutPlan && (
        <PayPalCheckoutDialog
          plan={paypalCheckoutPlan}
          billingCycle={isYearly ? 'yearly' : 'monthly'}
          onClose={() => setPaypalCheckoutPlan(null)}
          onSuccess={handlePaymentSuccess}
          prorationPreview={prorationPreview}
        />
      )}

      {/* ── Cancel Subscription Confirmation Dialog ─────────────────────── */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              {data.status === 'trial' || data.status === 'trialing'
                ? 'Cancel Trial?'
                : 'Cancel Subscription?'}
            </DialogTitle>
            <DialogDescription className="text-left">
              {data.status === 'trial' || data.status === 'trialing' ? (
                <>
                  Your trial will end immediately and your account will be
                  downgraded to the <strong>Starter</strong> plan. You can
                  resubscribe anytime from the Subscription page.
                </>
              ) : (
                <>
                  Your <strong>{currentPlanData?.name}</strong> plan
                  subscription will be cancelled immediately and your account
                  will be downgraded to the <strong>Starter</strong> plan. Any
                  pending downgrade will also be cleared. You can resubscribe
                  anytime.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Your data (leads, jobs, workflows, customers) is preserved and
              will remain accessible under the Starter plan limits.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelConfirm(false)}
              disabled={isUpgrading}
            >
              Keep Plan
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isUpgrading}
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  {data.status === 'trial' || data.status === 'trialing'
                    ? 'Yes, Cancel Trial'
                    : 'Yes, Cancel Subscription'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Add-on Confirmation Dialog (Phase 5) ─────────────────── */}
      <Dialog
        open={!!cancellingAddon}
        onOpenChange={(open) => !open && setCancellingAddon(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Cancel {cancellingAddon?.displayName}?
            </DialogTitle>
            <DialogDescription className="text-left">
              This add-on will be cancelled immediately. You will keep access
              until the end of your current billing period, and the cancellation
              will be reflected on your next invoice. You can re-subscribe
              anytime from the Add-ons section.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Your main subscription and data are unaffected — only this add-on
              is cancelled.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setCancellingAddon(null)}
              disabled={isCancellingAddon}
            >
              Keep Add-on
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelAddon}
              disabled={isCancellingAddon}
            >
              {isCancellingAddon ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Add-on'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
