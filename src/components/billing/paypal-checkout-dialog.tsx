'use client';

/**
 * Shared PayPal checkout dialog.
 *
 * Used by:
 *   - src/components/views/billing-view.tsx        (plan upgrade / trial→paid conversion)
 *   - src/components/onboarding/saas-onboarding.tsx (inline checkout when user picks
 *                                                    "Subscribe & Pay Now" in step 2)
 *
 * Flow:
 *   1. PayPalButtons.createSubscription → POST /api/paypal/create-subscription
 *      (creates a PayPal recurring Subscription + a local `pending_payment`
 *       Subscription row carrying the paypalSubscriptionId).
 *   2. User approves in the PayPal popup.
 *   3. onApprove → POST /api/paypal/activate-subscription
 *      (flips the local row to status='active').
 *   4. onSuccess() callback fires — caller refreshes its data / advances the
 *      onboarding step.
 *
 * If PayPal env vars are not configured, the dialog falls back to a "Demo"
 * button that POSTs to /api/subscriptions with startMode:'pay' so a
 * pending_payment record is created (NOT another trial — the previous demo
 * path silently created a trial, which was a bug).
 */

import { useEffect, useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { toast } from 'sonner';
import {
  Wallet,
  Shield,
  Info,
  AlertCircle,
  Loader2,
  Zap,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCompanyCurrency } from '@/hooks/use-company-currency';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Minimal plan shape required by the dialog. Both the billing view's `Plan`
 * interface and the onboarding wizard's `PLANS` array entries satisfy this.
 */
export interface PaypalCheckoutPlan {
  id: 'starter' | 'growth' | 'pro' | 'enterprise' | string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
}

interface PayPalConfig {
  configured: boolean;
  clientId?: string;
  isSandbox?: boolean;
  merchantEmail?: string;
  message?: string;
}

export interface ProrationPreview {
  direction: string;
  proratedAmount: number;
  daysRemaining: number;
  newPlan: string;
}

interface PayPalCheckoutDialogProps {
  plan: PaypalCheckoutPlan;
  billingCycle: 'monthly' | 'yearly';
  onClose: () => void;
  onSuccess: () => void;
  prorationPreview?: ProrationPreview | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PayPalCheckoutDialog({
  plan,
  billingCycle,
  onClose,
  onSuccess,
  prorationPreview,
}: PayPalCheckoutDialogProps) {
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

  // ─── Recurring subscription flow (PayPal Subscriptions API) ─────────
  // createSubscription → calls our backend which creates a PayPal recurring
  //   subscription + a local pending_payment record, returns the PayPal sub ID.
  // onApprove → calls /api/paypal/activate-subscription which fetches the
  //   sub details from PayPal and activates the local record.
  // PayPal then auto-charges the customer each cycle and sends
  //   PAYMENT.SALE.COMPLETED webhooks to /api/paypal/webhook, which extends
  //   the endDate and records each renewal payment automatically.
  const handleCreateSubscription = async () => {
    try {
      const res = await fetch('/api/paypal/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, billingCycle }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create subscription');
      }
      return data.subscriptionId as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PayPal subscription');
      throw err;
    }
  };

  const handleApproveSubscription = async (subscriptionId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/paypal/activate-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, plan: plan.id, billingCycle }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to activate subscription');
      }
      toast.success(`Successfully subscribed to ${plan.name} plan!`, {
        description: `Recurring payment of ${format(price)}/${billingCycle === 'yearly' ? 'yr' : 'mo'} activated via PayPal. You'll be auto-charged each cycle.`,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription activation failed');
      toast.error('Subscription activation failed', {
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
            Set up recurring billing via PayPal. You'll be automatically charged {format(price)}{' '}
            {billingCycle === 'yearly' ? 'per year' : 'per month'} until you cancel.
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
            {/* Proration preview — shown when upgrading mid-cycle */}
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
              <span className="font-semibold">Amount due today</span>
              <span className="text-lg font-bold text-emerald-600">
                {format(prorationPreview && prorationPreview.proratedAmount > 0 ? price + prorationPreview.proratedAmount : price)}
                <span className="text-sm text-muted-foreground font-normal">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              Auto-renews {billingCycle === 'yearly' ? 'annually' : 'monthly'} · Cancel anytime from Settings → Subscription
            </p>
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
                intent: 'subscription',
                vault: true,
                currency: 'USD',
              }}
            >
              <PayPalButtons
                style={{
                  layout: 'vertical',
                  color: 'gold',
                  shape: 'rect',
                  label: 'subscribe',
                  height: 45,
                }}
                createSubscription={handleCreateSubscription}
                onApprove={async (data) => {
                  // data.subscriptionID is the PayPal recurring subscription ID
                  if (data.subscriptionID) {
                    await handleApproveSubscription(data.subscriptionID);
                  }
                }}
                onError={(err) => {
                  console.error('PayPal button error:', err);
                  setError('PayPal encountered an error. Please try again.');
                }}
                onCancel={() => {
                  toast.info('Subscription cancelled', {
                    description: 'Your subscription was not changed.',
                  });
                }}
                disabled={isProcessing}
              />
            </PayPalScriptProvider>
          ) : (
            /* Fallback: Demo upgrade when PayPal is not configured.
               Sends startMode:'pay' so a pending_payment record is created
               (NOT another trial — the old demo path silently defaulted to
               trial, which was a bug). */
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
                        startMode: 'pay',
                      }),
                    });
                    if (!res.ok) throw new Error('Failed');
                    toast.success(`Successfully subscribed to ${plan.name} plan!`, {
                      description: 'Demo mode — subscription recorded as pending_payment. Configure PayPal to enable real payments.',
                    });
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
                    Subscribe to {plan.name} (Demo)
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
