'use client';

// PayPal billing & subscription management view
import React, { useState, useEffect } from 'react';
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
  status: 'active' | 'trialing' | 'past_due' | 'cancelled';
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

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

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

// ─── Fallback Data ───────────────────────────────────────────────────────────

const FALLBACK_DATA: SubscriptionData = {
  plan: 'growth',
  status: 'trialing',
  billingCycle: 'monthly',
  trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  usage: {
    jobs: { used: 347, limit: 1000 },
    workflows: { used: 23, limit: 50 },
    users: { used: 3, limit: 5 },
  },
  paymentMethod: {
    brand: 'Visa',
    last4: '4242',
    expiryMonth: 12,
    expiryYear: 2027,
  },
  billingHistory: [
    {
      id: 'INV-001',
      date: '2025-02-01',
      description: 'Growth Plan - Monthly',
      amount: 79,
      status: 'Paid',
      invoiceUrl: '#',
    },
    {
      id: 'INV-002',
      date: '2025-01-01',
      description: 'Growth Plan - Monthly',
      amount: 79,
      status: 'Paid',
      invoiceUrl: '#',
    },
    {
      id: 'INV-003',
      date: '2024-12-01',
      description: 'Growth Plan - Monthly',
      amount: 79,
      status: 'Paid',
      invoiceUrl: '#',
    },
    {
      id: 'INV-004',
      date: '2024-11-01',
      description: 'Growth Plan - Monthly',
      amount: 79,
      status: 'Paid',
      invoiceUrl: '#',
    },
    {
      id: 'INV-005',
      date: '2024-10-01',
      description: 'Growth Plan - Monthly',
      amount: 79,
      status: 'Pending',
      invoiceUrl: '#',
    },
  ],
};

// ─── PayPal Checkout Dialog ──────────────────────────────────────────────────

function PayPalCheckoutDialog({
  plan,
  billingCycle,
  onClose,
  onSuccess,
  paypalConfig,
}: {
  plan: Plan;
  billingCycle: 'monthly' | 'yearly';
  onClose: () => void;
  onSuccess: () => void;
  paypalConfig: PayPalConfig | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

  const handleCreateOrder = async (): Promise<string> => {
    try {
      setError(null);
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, billingCycle }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error || data.details || 'Failed to create order';
        console.error('[PayPal] create-order failed:', errMsg);
        throw new Error(errMsg);
      }
      // Ensure we return a string order ID — PayPal requires this
      const orderId = String(data.orderID || data.id || '');
      if (!orderId) {
        throw new Error('No order ID returned from PayPal');
      }
      return orderId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create PayPal order';
      setError(msg);
      console.error('[PayPal] createOrder error:', msg);
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
        description: `Payment of ${formatUSD(price)} processed via PayPal`,
      });
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      setError(msg);
      toast.error('Payment failed', {
        description: msg,
      });
      console.error('[PayPal] capture error:', msg);
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
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold text-emerald-600">
                {formatUSD(price)}<span className="text-sm text-muted-foreground font-normal">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
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

          {!paypalConfig?.configured && (
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

          {/* PayPal Buttons — rendered inside existing PayPalScriptProvider from parent */}
          {paypalConfig?.configured && paypalConfig.clientId ? (
            <PayPalButtons
              key={`${plan.id}-${billingCycle}`}
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
                console.error('[PayPal] button error:', err);
                setError('PayPal encountered an error. Please try again.');
              }}
              onCancel={() => {
                toast.info('Payment cancelled', {
                  description: 'Your subscription was not changed.',
                });
              }}
              disabled={isProcessing}
            />
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
  const [data, setData] = useState<SubscriptionData>(FALLBACK_DATA);
  const [isYearly, setIsYearly] = useState(data.billingCycle === 'yearly');
  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);
  const [paypalCheckoutPlan, setPaypalCheckoutPlan] = useState<Plan | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfig | null>(null);

  // Fetch subscription data + PayPal config on mount
  useEffect(() => {
    async function fetchSubscription() {
      try {
        const res = await fetch('/api/subscriptions');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData({
          ...FALLBACK_DATA,
          ...json,
          usage: json.usage || FALLBACK_DATA.usage,
          paymentMethod: json.paymentMethod || FALLBACK_DATA.paymentMethod,
          billingHistory: json.billingHistory || FALLBACK_DATA.billingHistory,
          renewalDate: json.renewalDate || FALLBACK_DATA.renewalDate,
          paypalPayerEmail: json.paypalPayerEmail || null,
          paymentProvider: json.paymentProvider || 'none',
        });
        setIsYearly((json.billingCycle || 'monthly') === 'yearly');
      } catch {
        setData(FALLBACK_DATA);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSubscription();

    // Fetch PayPal config once at BillingView level — avoids re-mounting PayPalScriptProvider
    async function fetchPayPalConfig() {
      try {
        const res = await fetch('/api/paypal/config');
        const config = await res.json();
        setPaypalConfig(config);
      } catch {
        // PayPal will fall back to demo mode
      }
    }
    fetchPayPalConfig();
  }, []);

  const trialDays = getTrialDaysRemaining(data.trialEndsAt);
  const currentPlanData = PLANS.find((p) => p.id === data.plan);
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

  async function handleUpgrade(plan: Plan) {
    if (plan.id !== 'enterprise') {
      setPaypalCheckoutPlan(plan);
      setConfirmPlan(null);
      return;
    }
    toast.info('Contact Sales', {
      description: 'Our team will reach out to discuss Enterprise pricing.',
    });
    setConfirmPlan(null);
  }

  function handlePaymentSuccess() {
    setPaypalCheckoutPlan(null);
    fetch('/api/subscriptions')
      .then((res) => res.json())
      .then((json) => {
        setData((prev) => ({
          ...prev,
          ...json,
          usage: json.usage || prev.usage,
          paymentMethod: json.paymentMethod || prev.paymentMethod,
          billingHistory: json.billingHistory || prev.billingHistory,
          renewalDate: json.renewalDate || prev.renewalDate,
          paypalPayerEmail: json.paypalPayerEmail || null,
          paymentProvider: json.paymentProvider || 'none',
        }));
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
      if (!res.ok) throw new Error('Failed');
      toast.success('Subscription cancelled', {
        description: 'You can continue using the Starter plan.',
      });
      setData((prev) => ({
        ...prev,
        plan: 'starter',
        status: 'cancelled',
      }));
    } catch {
      toast.error('Failed to cancel subscription');
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
        <Badge
          variant="outline"
          className="w-fit border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
        >
          <Zap className="mr-1 h-3 w-3" />
          {currentPlanData?.name} Plan
        </Badge>
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
                {currentPrice > 0 && <span className="font-semibold text-foreground"> · {formatUSD(currentPrice)}/{data.billingCycle === 'yearly' ? 'year' : 'month'}</span>}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className="w-fit bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {data.status === 'trialing' ? 'Trial' : data.status === 'active' ? 'Active' : data.status === 'past_due' ? 'Past Due' : 'Cancelled'}
              </Badge>
              {data.paymentProvider === 'paypal' && (
                <Badge variant="outline" className="border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700 dark:bg-teal-900/20 dark:text-teal-400">
                  <Wallet className="mr-1 h-3 w-3" />
                  PayPal
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.status === 'trialing' && trialDays > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {trialDays} days remaining in your trial
              </span>
            </div>
          )}

          {/* Renewal date */}
          {data.renewalDate && data.status === 'active' && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/20">
              <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300">
                Next renewal: <span className="font-medium">{new Date(data.renewalDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
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
        {PLANS.map((plan) => {
          const isCurrentPlan = plan.id === data.plan;
          const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const isDowngrade =
            PLANS.findIndex((p) => p.id === plan.id) <
            PLANS.findIndex((p) => p.id === data.plan);

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col transition-all ${
                isCurrentPlan
                  ? 'border-emerald-400 shadow-lg ring-2 ring-emerald-400 dark:border-emerald-600 dark:ring-emerald-600 bg-gradient-to-b from-emerald-50/50 to-transparent dark:from-emerald-950/20'
                  : plan.popular
                  ? 'border-teal-300 shadow-sm hover:border-emerald-300 hover:shadow-md dark:border-teal-700 dark:hover:border-emerald-700'
                  : 'hover:border-emerald-300 hover:shadow-md dark:hover:border-emerald-700'
              }`}
            >
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-emerald-600 text-white shadow-sm">
                    <Check className="mr-1 h-3 w-3" />
                    Current Plan
                  </Badge>
                </div>
              )}
              {!isCurrentPlan && plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700">
                    <Star className="mr-1 h-3 w-3" />
                    Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-0">
                <div className="flex items-center gap-2">
                  <div className={`flex items-center justify-center size-8 rounded-lg ${isCurrentPlan ? 'bg-emerald-600' : 'bg-muted'}`}>
                    {isCurrentPlan ? React.cloneElement(getPlanIcon(plan.id), { className: 'size-4 text-white' }) : getPlanIcon(plan.id)}
                  </div>
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
                      <span className="text-3xl font-bold">{formatUSD(price)}</span>
                      <span className="text-sm text-muted-foreground">
                        /{isYearly ? 'year' : 'month'}
                      </span>
                      {isYearly && plan.monthlyPrice > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatUSD(Math.round(plan.yearlyPrice / 12))}/mo billed annually
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
          <CardDescription>Your default payment method on file</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-900/20">
                {data.paymentProvider === 'paypal' ? (
                  <Wallet className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                ) : (
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                {data.paymentProvider === 'paypal' ? (
                  <>
                    <p className="font-medium flex items-center gap-2">
                      PayPal
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-teal-300 text-teal-600">Active</Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {data.paypalPayerEmail || 'Connected'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">
                      {data.paymentMethod?.brand || 'Visa'} ending in {data.paymentMethod?.last4 || '4242'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expires {String(data.paymentMethod?.expiryMonth ?? 12).padStart(2, '0')}/{data.paymentMethod?.expiryYear ?? 2027}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {data.paymentProvider === 'paypal' && data.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/30"
                  onClick={handleCancelSubscription}
                  disabled={isUpgrading}
                >
                  {isUpgrading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                  Cancel Subscription
                </Button>
              )}
              {data.paymentProvider !== 'paypal' && (
                <Button
                  variant="outline"
                  className="hover:border-emerald-400 hover:text-emerald-700 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
                  onClick={() => toast.info('Payment method update is not available in demo mode.')}
                >
                  Update Payment Method
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
                      {new Date(record.date + 'T00:00:00').toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {record.description}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatUSD(record.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(record.status)}`}
                      >
                        {record.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                        onClick={() => toast.info('Invoice download is not available in demo mode.')}
                      >
                        <Download className="mr-1 h-3.5 w-3.5" />
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── PayPal Checkout Dialog ─────────────────────────────────────── */}
      {paypalCheckoutPlan && paypalConfig?.clientId ? (
        <PayPalScriptProvider
          options={{
            clientId: paypalConfig.clientId,
            intent: 'capture',
            currency: 'USD',
          }}
        >
          <PayPalCheckoutDialog
            plan={paypalCheckoutPlan}
            billingCycle={isYearly ? 'yearly' : 'monthly'}
            onClose={() => setPaypalCheckoutPlan(null)}
            onSuccess={handlePaymentSuccess}
            paypalConfig={paypalConfig}
          />
        </PayPalScriptProvider>
      ) : paypalCheckoutPlan ? (
        /* Fallback dialog when PayPal is not yet configured */
        <PayPalCheckoutDialog
          plan={paypalCheckoutPlan}
          billingCycle={isYearly ? 'yearly' : 'monthly'}
          onClose={() => setPaypalCheckoutPlan(null)}
          onSuccess={handlePaymentSuccess}
          paypalConfig={paypalConfig}
        />
      ) : null}
    </div>
  );
}
