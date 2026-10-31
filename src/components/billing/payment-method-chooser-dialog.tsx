'use client';

/**
 * Payment Method Chooser Dialog.
 *
 * Shown when a tenant clicks "Upgrade" on a plan in the billing page.
 * Supports:
 *   1. 🇮🇳 Razorpay (Recommended for Indian Users) — UPI, Netbanking, Cards (INR ₹)
 *   2. 🌐 Creem (Recommended for International Users) — Global Cards, Apple Pay, Google Pay (USD $)
 *   3. 🅿️ PayPal (Legacy fallback)
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
  Zap,
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
  onChoosePayPal: (plan: ChooserPlan) => void;
}

type Method = 'razorpay' | 'creem' | 'paypal';

interface PayPalConfigResponse {
  configured: boolean;
  isSandbox?: boolean;
}

interface CreemConfigResponse {
  configured: boolean;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PaymentMethodChooserDialog({
  plan,
  billingCycle,
  onClose,
  onChoosePayPal,
}: PaymentMethodChooserDialogProps) {
  const [selected, setSelected] = useState<Method>('razorpay');
  const [razorpayConfigured, setRazorpayConfigured] = useState<boolean>(true);
  const [paypalConfigured, setPaypalConfigured] = useState<boolean | null>(null);
  const [creemConfigured, setCreemConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  // ─── Load availability for providers in parallel ─────────────────────
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

      const paypalOk = paypalRes.status === 'fulfilled' && paypalRes.value?.configured === true;
      const creemOk = creemRes.status === 'fulfilled' && creemRes.value?.configured === true;

      setPaypalConfigured(paypalOk);
      setCreemConfigured(creemOk);

      // Default to Razorpay for Indian users / standard checkout
      setSelected('razorpay');
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setBusy(false);
  }, [plan?.id]);

  if (!plan) return null;

  const displayUsdPrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const inrMultiplier = 85;
  const inrPrice = Math.round(displayUsdPrice * inrMultiplier);
  const cycleLabel = billingCycle === 'yearly' ? 'yearly' : 'monthly';

  async function handleContinue() {
    if (!plan) return;

    // ── 1. Razorpay Checkout Flow (India) ──────────────────────────────────
    if (selected === 'razorpay') {
      setBusy(true);
      try {
        const scriptOk = await loadRazorpayScript();
        if (!scriptOk) throw new Error('Razorpay checkout script failed to load.');

        const amountPaise = inrPrice * 100;
        const res = await authFetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amountPaise,
            currency: 'INR',
            planCode: plan.id,
            notes: {
              planName: plan.name,
              billingCycle,
            },
          }),
        });

        const data = await res.json();
        if (!res.ok || !data?.order_id) {
          throw new Error(data?.error || 'Could not initiate Razorpay order.');
        }

        const options = {
          key: data.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TuLATkapPzzHZc',
          amount: data.amount,
          currency: 'INR',
          name: 'FieserOS / BOS',
          description: `${plan.name} (${billingCycle}) · ₹${inrPrice.toLocaleString('en-IN')}`,
          order_id: data.order_id,
          theme: { color: '#009F50' },
          modal: {
            ondismiss: () => {
              setBusy(false);
              toast.info('Razorpay payment window closed.');
            },
          },
          handler: async (resp: any) => {
            try {
              const verifyRes = await authFetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                  planCode: plan.id,
                }),
              });
              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                toast.success('Payment verified! Subscription activated.');
                onClose();
                window.location.reload();
              } else {
                toast.error(verifyData.error || 'Verification failed.');
              }
            } catch (err: any) {
              toast.error(err?.message || 'Verification error.');
            } finally {
              setBusy(false);
            }
          },
        };

        const razorpayInstance = new (window as any).Razorpay(options);
        razorpayInstance.open();
        return;
      } catch (err: any) {
        setBusy(false);
        toast.error(err?.message || 'Could not launch Razorpay checkout.');
        return;
      }
    }

    // ── 2. PayPal Flow ─────────────────────────────────────────────────────
    if (selected === 'paypal') {
      if (!paypalConfigured) {
        toast.error('PayPal is not configured', {
          description: 'Please contact platform admin or choose Razorpay.',
        });
        return;
      }
      onChoosePayPal(plan);
      return;
    }

    // ── 3. Creem Flow (International) ──────────────────────────────────────
    if (selected === 'creem') {
      if (!creemConfigured) {
        toast.error('Creem is not configured', {
          description: 'Please contact platform admin or choose Razorpay.',
        });
        return;
      }

      setBusy(true);
      try {
        const res = await authFetch('/api/creem/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: plan.id,
            billingCycle,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.checkoutUrl) {
          throw new Error(data.error || 'Failed to start Creem checkout.');
        }
        window.location.href = data.checkoutUrl;
      } catch (err: any) {
        setBusy(false);
        toast.error('Could not start Creem checkout', {
          description: err?.message || 'Please try again.',
        });
      }
    }
  }

  return (
    <Dialog open={!!plan} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="size-5" />
            Choose Payment Method
          </DialogTitle>
          <DialogDescription>
            Upgrading to <strong className="text-foreground">{plan.name}</strong> ({cycleLabel}) ·{' '}
            {selected === 'razorpay' ? `₹${inrPrice.toLocaleString('en-IN')} INR` : `$${displayUsdPrice.toFixed(2)} USD`}.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={selected}
          onValueChange={(v) => setSelected(v as Method)}
          className="grid grid-cols-1 gap-3 pt-1"
        >
          {/* Razorpay Option (India - UPI, Netbanking, Cards) */}
          <label
            htmlFor="method-razorpay"
            className={`relative flex flex-col gap-2 rounded-xl border-2 p-4 cursor-pointer transition-colors ${
              selected === 'razorpay'
                ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20'
                : 'border-border hover:border-emerald-500/40 hover:bg-muted/40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <RadioGroupItem id="method-razorpay" value="razorpay" />
                <Zap className="size-5 text-emerald-600 dark:text-emerald-400" />
                <Label htmlFor="method-razorpay" className="font-bold text-sm cursor-pointer">
                  🇮🇳 Razorpay (India · UPI / Cards / Netbanking)
                </Label>
              </div>
              <Badge className="bg-emerald-600 text-white border-none text-[10px] font-bold">
                Instant UPI
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Pay ₹{inrPrice.toLocaleString('en-IN')} via Google Pay, PhonePe, Paytm, BHIM UPI, Netbanking, or RuPay/Visa/Mastercard.
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 ml-6 flex items-center gap-1 font-medium">
              <ShieldCheck className="size-3 text-emerald-600" />
              Direct Standard Web Checkout · Instant Activation
            </p>
          </label>

          {/* Creem Option (International - Cards, Apple Pay, Google Pay) */}
          <label
            htmlFor="method-creem"
            className={`relative flex flex-col gap-2 rounded-xl border-2 p-4 cursor-pointer transition-colors ${
              selected === 'creem'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40 hover:bg-muted/40'
            } ${creemConfigured === false ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <RadioGroupItem id="method-creem" value="creem" />
                <CreditCard className="size-5 text-blue-600 dark:text-blue-400" />
                <Label htmlFor="method-creem" className="font-bold text-sm cursor-pointer">
                  🌐 Creem (International · Global Cards & Apple Pay)
                </Label>
              </div>
              <Badge variant="outline" className="text-[10px]">
                USD ($)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Pay ${displayUsdPrice.toFixed(2)} USD via international Visa, Mastercard, AMEX, Apple Pay, or Google Pay.
            </p>
            {creemConfigured === true ? (
              <p className="text-[11px] text-muted-foreground ml-6 flex items-center gap-1">
                <ShieldCheck className="size-3 text-emerald-500" />
                Powered by Creem Merchant of Record
              </p>
            ) : creemConfigured === false ? (
              <p className="text-[11px] text-amber-600 ml-6 flex items-center gap-1">
                <AlertCircle className="size-3" />
                Creem not configured on platform
              </p>
            ) : null}
          </label>

          {/* PayPal Option (Secondary fallback) */}
          {paypalConfigured && (
            <label
              htmlFor="method-paypal"
              className={`relative flex flex-col gap-2 rounded-xl border-2 p-4 cursor-pointer transition-colors ${
                selected === 'paypal'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <RadioGroupItem id="method-paypal" value="paypal" />
                  <Wallet className="size-5 text-[#003087]" />
                  <Label htmlFor="method-paypal" className="font-bold text-sm cursor-pointer">
                    PayPal (International Wallet & Bank)
                  </Label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Pay ${displayUsdPrice.toFixed(2)} USD using your PayPal account balance or linked bank.
              </p>
            </label>
          )}
        </RadioGroup>

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleContinue}
            disabled={busy}
            className="bg-[#009F50] text-white hover:bg-[#008A45] font-bold"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                Continue with {selected === 'razorpay' ? 'Razorpay' : selected === 'creem' ? 'Creem' : 'PayPal'}
                <ArrowRight className="size-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
