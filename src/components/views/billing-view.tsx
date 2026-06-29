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
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

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
  plan: 'starter' | 'growth' | 'pro' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'trial' | 'expired';
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
  currency: string;
  maxUsers: number;
  maxJobs: number;
  maxWorkflows: number;
  features: Record<string, boolean>;
  popular: boolean;
  sortOrder: number;
}

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: 'starter' | 'growth' | 'pro' | 'enterprise';
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  popular?: boolean;
  features: PlanFeature[];
}

interface PayPalConfig {
  configured: boolean;
  clientId?: string;
  isSandbox?: boolean;
  merchantEmail?: string;
  message?: string;
}

// ─── Plan Data ───────────────────────────────────────────────────────────────

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 29,
    yearlyPrice: 290,
    description: 'For solo entrepreneurs & freelancers',
    features: [
      { text: '1 user', included: true },
      { text: '100 jobs/month', included: true },
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
    name: 'Growth',
    monthlyPrice: 79,
    yearlyPrice: 790,
    description: 'For growing service businesses',
    popular: true,
    features: [
      { text: '5 users', included: true },
      { text: '1,000 jobs/month', included: true },
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
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 149,
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
      { text: 'Everything in Pro', included: true },
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
    case 'pro': return <Crown className="size-5 text-emerald-600 dark:text-emerald-400" />;
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

// ─── PayPal Checkout Dialog ──────────────────────────────────────────────────

function PayPalCheckoutDialog({
  plan,
  billingCycle,
  onClose,
  onSuccess,
  prorationPreview,
}: {
  plan: Plan;
  billingCycle: 'monthly' | 'yearly';
  onClose: () => void;
  onSuccess: () => void;
  prorationPreview?: {
    direction: string;
    proratedAmount: number;
    daysRemaining: number;
    newPlan: string;
  } | null;
}) {
  const { format } = useCompanyCurrency();
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/paypal/config');
        const config = await res.json();
        setPaypalConfig(config);
      } catch {
        setError('Failed to load PayPal configuration');
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleCreateOrder = async () => {
    try {
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, billingCycle }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create order');
      }
      return data.orderID;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PayPal order');
      throw err;
    }
  };

  const handleApprove = async (orderId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderID: orderId, plan: plan.id, billingCycle }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to capture payment');
      }
      toast.success(`Successfully upgraded to ${plan.name} plan!`, {
        description: `Payment of ${format(price)} processed via PayPal`,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      toast.error('Payment failed', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600" />
            Subscribe to {plan.name} Plan
          </DialogTitle>
          <DialogDescription>
            Complete your payment via PayPal to activate your {plan.name} plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Order Summary</h4>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{plan.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Billing Cycle</span>
              <span className="font-medium capitalize">{billingCycle}</span>
            </div>
            {/* Proration preview (Phase 3) — shown when upgrading mid-cycle */}
            {prorationPreview && prorationPreview.proratedAmount > 0 && (
              <>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Proration credit/debit</span>
                  <span className="font-medium text-amber-600">
                    +{format(prorationPreview.proratedAmount)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Prorated for {prorationPreview.daysRemaining} days remaining in your current cycle.
                </p>
              </>
            )}
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Total today</span>
              <span className="text-lg font-bold text-emerald-600">
                {format(prorationPreview && prorationPreview.proratedAmount > 0 ? price + prorationPreview.proratedAmount : price)}
                <span className="text-sm text-muted-foreground font-normal">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
              </span>
            </div>
          </div>

          {/* PayPal Info */}
          {paypalConfig?.isSandbox && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                PayPal Sandbox mode is active. Use your sandbox test account to complete payment.
              </p>
            </div>
          )}

          {!paypalConfig?.configured && !loading && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-700 dark:text-red-400">PayPal Not Configured</p>
                <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                  Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to your .env file to enable PayPal payments.
                  You can still upgrade plans for demo purposes.
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* PayPal Buttons */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              <span className="ml-2 text-sm text-muted-foreground">Loading PayPal...</span>
            </div>
          ) : paypalConfig?.configured && paypalConfig.clientId ? (
            <PayPalScriptProvider
              options={{
                clientId: paypalConfig.clientId,
                intent: 'capture',
                currency: 'USD',
              }}
            >
              <PayPalButtons
                style={{
                  layout: 'vertical',
                  color: 'gold',
                  shape: 'rect',
                  label: 'pay',
                  height: 45,
                }}
                createOrder={handleCreateOrder}
                onApprove={async (data) => {
                  await handleApprove(data.orderID);
                }}
                onError={(err) => {
                  console.error('PayPal button error:', err);
                  setError('PayPal encountered an error. Please try again.');
                }}
                onCancel={() => {
                  toast.info('Payment cancelled', {
                    description: 'Your subscription was not changed.',
                  });
                }}
                disabled={isProcessing}
              />
            </PayPalScriptProvider>
          ) : (
            /* Fallback: Demo upgrade when PayPal is not configured */
            <div className="space-y-3">
              <Button
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700 h-11"
                onClick={async () => {
                  setIsProcessing(true);
                  try {
                    const res = await fetch('/api/subscriptions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        plan: plan.id,
                        billingCycle,
                      }),
                    });
                    if (!res.ok) throw new Error('Failed');
                    toast.success(`Successfully upgraded to ${plan.name} plan!`);
                    onSuccess();
                  } catch {
                    toast.error('Failed to upgrade plan');
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Upgrade to {plan.name} (Demo)
                  </>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Demo mode — no payment required. Configure PayPal to enable real payments.
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              <span className="ml-2 text-xs text-muted-foreground">Processing payment...</span>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function BillingView() {
  const { currency, format, formatCompact, symbol } = useCompanyCurrency();
  const [data, setData] = useState<SubscriptionData>(FALLBACK_DATA);
  const [isYearly, setIsYearly] = useState(data.billingCycle === 'yearly');
  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);
  const [paypalCheckoutPlan, setPaypalCheckoutPlan] = useState<Plan | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [downgradeTarget, setDowngradeTarget] = useState<Plan | null>(null);
  const [isSchedulingDowngrade, setIsSchedulingDowngrade] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [prorationPreview, setProrationPreview] = useState<{
    direction: string;
    proratedAmount: number;
    daysRemaining: number;
    newPlan: string;
  } | null>(null);

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
      try {
        const res = await fetch('/api/subscriptions');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(mergeJson(json));
        setIsYearly((json.billingCycle || 'monthly') === 'yearly');
      } catch {
        setData(FALLBACK_DATA);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSubscription();
  }, [mergeJson]);

  // Compute the effective plan list: prefer DB-backed catalog from the API,
  // fall back to the hardcoded PLANS constant.
  const effectivePlans: Plan[] = (data.plans && data.plans.length > 0
    ? data.plans.map((cp) => {
        // Map DB catalog plan → local Plan interface
        const features: PlanFeature[] = [
          { text: `${cp.maxUsers === 999 ? 'Unlimited' : cp.maxUsers} user${cp.maxUsers === 1 ? '' : 's'}`, included: true },
          { text: `${cp.maxJobs === 99999 ? 'Unlimited' : cp.maxJobs.toLocaleString()} jobs/month`, included: true },
          { text: `${cp.maxWorkflows === 999 ? 'Unlimited' : cp.maxWorkflows} workflows`, included: true },
          { text: 'WhatsApp notifications', included: !!cp.features.whatsappIntegration },
          { text: 'Custom workflows', included: !!cp.features.customWorkflows },
          { text: 'API access', included: !!cp.features.apiAccess },
          { text: 'Priority support', included: !!cp.features.prioritySupport },
          { text: 'Lead pipeline', included: !!cp.features.leadPipeline },
          { text: 'White-label', included: !!cp.features.whiteLabel },
        ];
        return {
          id: cp.code as Plan['id'],
          name: cp.name,
          monthlyPrice: cp.monthlyPrice,
          yearlyPrice: cp.yearlyPrice,
          description: cp.description || '',
          popular: cp.popular,
          features,
        } as Plan;
      })
    : PLANS);

  const trialDays = data.daysRemainingInTrial ?? getTrialDaysRemaining(data.trialEndsAt);
  const isTrialExpired = data.isTrialExpired === true;
  const currentPlanData = effectivePlans.find((p) => p.id === data.plan) || PLANS[0];
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

    // Upgrade: fetch proration preview first, then open PayPal checkout.
    try {
      const res = await fetch(`/api/subscriptions/prorate?plan=${plan.id}`);
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

    setPaypalCheckoutPlan(plan);
    setConfirmPlan(null);
  }

  async function handleScheduleDowngrade() {
    if (!downgradeTarget) return;
    setIsSchedulingDowngrade(true);
    try {
      const res = await fetch('/api/subscriptions/downgrade', {
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
      const subRes = await fetch('/api/subscriptions');
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
      const res = await fetch('/api/subscriptions/downgrade', { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to cancel downgrade');
      toast.success('Downgrade cancelled', {
        description: json.message || 'You\'ll stay on your current plan.',
      });
      const subRes = await fetch('/api/subscriptions');
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
    fetch('/api/subscriptions')
      .then((res) => res.json())
      .then((json) => {
        setData(mergeJson(json));
        setIsYearly((json.billingCycle || 'monthly') === 'yearly');
      })
      .catch(() => {});
  }

  async function handleCancelSubscription() {
    setIsUpgrading(true);
    try {
      const res = await fetch('/api/paypal/cancel-subscription', {
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
        const freshRes = await fetch('/api/subscriptions');
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
                {currentPrice > 0 && <span className="font-semibold text-foreground"> · {format(currentPrice)}/{data.billingCycle === 'yearly' ? 'year' : 'month'}</span>}
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
                  const growthPlan = effectivePlans.find(p => p.id === 'growth');
                  if (growthPlan) handleUpgrade(growthPlan);
                }}
              >
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                Upgrade Now
              </Button>
            </div>
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
          Save 17%!
        </Badge>
      </div>

      {/* ── Plan Cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {effectivePlans.map((plan) => {
          const isCurrentPlan = plan.id === data.plan;
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
                  {plan.id === 'enterprise' ? (
                    <p className="text-3xl font-bold">Custom</p>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">{format(price)}</span>
                      <span className="text-sm text-muted-foreground">
                        /{isYearly ? 'year' : 'month'}
                      </span>
                      {isYearly && plan.monthlyPrice > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(Math.round(plan.yearlyPrice / 12))}/mo billed annually
                        </p>
                      )}
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
                  <Button
                    variant="outline"
                    className="w-full border-emerald-400 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                    disabled
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Current Plan
                  </Button>
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
                    const growthPlan = effectivePlans.find(p => p.id === 'growth');
                    if (growthPlan) handleUpgrade(growthPlan);
                  }}
                >
                  <Zap className="mr-1.5 h-3.5 w-3.5" />
                  Upgrade Plan
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
                      {format(record.amount)}
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
                  {format(isYearly ? (downgradeTarget?.yearlyPrice ?? 0) : (downgradeTarget?.monthlyPrice ?? 0))}
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
    </div>
  );
}
