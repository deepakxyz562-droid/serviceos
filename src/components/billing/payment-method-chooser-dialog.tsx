'use client';

/**
 * Payment Method Chooser Dialog.
 *
 * Shown when a tenant clicks "Upgrade" on a plan in the billing page. Presents
 * two payment options side-by-side:
 *
 *   1. PayPal (primary, recommended) — opens the existing PayPalCheckoutDialog.
 *   2. Pay with Card (via Creem) — calls /api/creem/checkout and redirects to
 *      the Creem-hosted checkout URL via `window.location.href`.
 *
 * Each option is disabled (with a helpful note) when the corresponding payment
 * provider is not configured. PayPal is fetched from /api/paypal/config (which
 * reads PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET env vars). Creem is fetched from
 * /api/creem/config (which reads the RevenueFeatureToggle row set by the
 * superadmin).
 *
 * If neither is configured, the dialog shows a single "Contact admin" notice
 * and the Continue button is disabled.
 */
import { useEffect, useState } from 'react';
import {
  Wallet,
  CreditCard,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { authFetch } from '@/lib/client-auth';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Minimal plan shape required by the chooser. Mirrors the `Plan` interface in
 * billing-view.tsx so we don't need to import it (which would create a circular
 * dependency — the billing view imports this dialog).
 */
export interface ChooserPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
}

interface PaymentMethodChooserDialogProps {
  plan: ChooserPlan | null;
  billingCycle: 'monthly' | 'yearly';
  onClose: () => void;
  /** Called when the user picks PayPal — the parent opens the existing PayPalCheckoutDialog. */
  onChoosePayPal: (plan: ChooserPlan) => void;
}

type Method = 'paypal' | 'creem';

interface PayPalConfigResponse {
  configured: boolean;
  isSandbox?: boolean;
}

interface CreemConfigResponse {
  configured: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PaymentMethodChooserDialog({
  plan,
  billingCycle,
  onClose,
  onChoosePayPal,
}: PaymentMethodChooserDialogProps) {
  const [selected, setSelected] = useState<Method>('creem');
  const [paypalConfigured, setPaypalConfigured] = useState<boolean | null>(null);
  const [creemConfigured, setCreemConfigured] = useState<boolean | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  // ─── Load availability for both providers in parallel ─────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [paypalRes, creemRes] = await Promise.allSettled([
        fetch('/api/paypal/config').then((r) => r.json() as Promise<PayPalConfigResponse>),
        authFetch('/api/creem/config').then((r) =>
          r.ok ? (r.json() as Promise<CreemConfigResponse>) : { configured: false }
        ),
      ]);
      if (cancelled) return;

      const paypalOk =
        paypalRes.status === 'fulfilled' && paypalRes.value?.configured === true;
      const creemOk =
        creemRes.status === 'fulfilled' && creemRes.value?.configured === true;

      setPaypalConfigured(paypalOk);
      setCreemConfigured(creemOk);

      // Default to Creem (the platform's primary gateway). If Creem is
      // unavailable, fall back to PayPal (if configured).
      if (!creemOk && paypalOk) {
        setSelected('paypal');
      } else if (creemOk) {
        setSelected('creem');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset the redirect flag if the dialog re-opens for a different plan.
  useEffect(() => {
    setRedirecting(false);
  }, [plan?.id]);

  // ─── Early-out when there's no plan ─────────────────────────────────────
  if (!plan) return null;

  const loading = paypalConfigured === null || creemConfigured === null;
  const neitherConfigured =
    !loading && paypalConfigured === false && creemConfigured === false;
  const selectedAvailable =
    (selected === 'paypal' && paypalConfigured === true) ||
    (selected === 'creem' && creemConfigured === true);

  const displayPrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const cycleLabel = billingCycle === 'yearly' ? 'yearly' : 'monthly';

  // ─── Continue handler ───────────────────────────────────────────────────
  async function handleContinue() {
    if (!plan) return;

    if (selected === 'paypal') {
      if (!paypalConfigured) {
        toast.error('PayPal is not configured', {
          description: 'Please contact your platform admin or choose another method.',
        });
        return;
      }
      onChoosePayPal(plan);
      return;
    }

    // Creem path — call the checkout endpoint and redirect.
    if (!creemConfigured) {
      toast.error('Creem is not configured', {
        description: 'Please contact your platform admin or choose another method.',
      });
      return;
    }

    setRedirecting(true);
    try {
      const res = await authFetch('/api/creem/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: plan.id,
          billingCycle,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        checkoutUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || `Failed to start Creem checkout (HTTP ${res.status}).`);
      }
      // Hard-redirect to Creem's hosted checkout. This navigates away from the
      // app, so any local state cleanup is moot — the user returns via the
      // success_url we configured on the server (which points back to /billing).
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setRedirecting(false);
      toast.error('Could not start Creem checkout', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <Dialog open={!!plan} onOpenChange={(open) => { if (!open && !redirecting) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="size-5" />
            Choose a payment method
          </DialogTitle>
          <DialogDescription>
            You&apos;re upgrading to the <strong className="text-foreground">{plan.name}</strong>{' '}
            plan — ${displayPrice.toFixed(2)} USD / {cycleLabel}. Select how you&apos;d like to pay.
          </DialogDescription>
        </DialogHeader>

        {neitherConfigured && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium">No payment methods configured</p>
              <p className="text-xs mt-0.5 opacity-90">
                Neither PayPal nor Creem is available on this platform. Please
                contact your administrator to enable a payment provider.
              </p>
            </div>
          </div>
        )}

        <RadioGroup
          value={selected}
          onValueChange={(v) => setSelected(v as Method)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1"
        >
          {/* Creem option (primary / recommended — platform default) */}
          <label
            htmlFor="method-creem"
            className={`relative flex flex-col gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
              selected === 'creem'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40 hover:bg-muted/40'
            } ${creemConfigured === false ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem
                  id="method-creem"
                  value="creem"
                  disabled={creemConfigured === false}
                />
                <CreditCard className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                <Sparkles className="size-2.5 mr-1" />
                Recommended
              </Badge>
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="method-creem" className="text-sm font-semibold cursor-pointer">
                Pay with Card (Creem)
              </Label>
              <p className="text-xs text-muted-foreground">
                Visa, Mastercard, AMEX via Creem. Hosted, secure checkout. Subscription renews automatically.
              </p>
            </div>
            {creemConfigured === false && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="size-3" />
                Card payments not configured — contact admin
              </p>
            )}
            {creemConfigured === true && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="size-3 text-emerald-500" />
                Powered by Creem
              </p>
            )}
          </label>

          {/* PayPal option (secondary) */}
          <label
            htmlFor="method-paypal"
            className={`relative flex flex-col gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
              selected === 'paypal'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40 hover:bg-muted/40'
            } ${paypalConfigured === false ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem
                  id="method-paypal"
                  value="paypal"
                  disabled={paypalConfigured === false}
                />
                <Wallet className="size-5 text-[#003087] dark:text-blue-400" />
              </div>
              <Badge variant="outline" className="text-[10px]">
                PayPal
              </Badge>
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="method-paypal" className="text-sm font-semibold cursor-pointer">
                Pay with PayPal
              </Label>
              <p className="text-xs text-muted-foreground">
                PayPal balance, bank, or card.
              </p>
            </div>
            {paypalConfigured === false && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="size-3" />
                PayPal not configured — contact admin
              </p>
            )}
            {paypalConfigured === true && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="size-3 text-emerald-500" />
                Secured by PayPal
              </p>
            )}
          </label>
        </RadioGroup>

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading || redirecting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleContinue}
            disabled={loading || redirecting || neitherConfigured || !selectedAvailable}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {redirecting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Redirecting…
              </>
            ) : loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="size-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
