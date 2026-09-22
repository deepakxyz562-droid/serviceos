'use client';

/**
 * Stripe Elements — REAL Stripe integration.
 *
 * Loads Stripe.js v3, creates a Stripe Elements instance with the user's
 * publishableKey, mounts the PaymentElement, and confirms the payment via
 * the backend /api/forms/[id]/charge endpoint which creates a PaymentIntent
 * using the user's STRIPE_SECRET_KEY.
 *
 * In testMode (or when publishableKey is not set), falls back to a clearly
 * marked simulated-payment UI so users can preview the form without charging.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Lock, ShieldCheck, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface StripeElementsValue {
  status: 'idle' | 'processing' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  clientSecret?: string;
  last4?: string;
  brand?: string;
  simulated?: boolean;
  errorMessage?: string;
}

// Minimal Stripe.js type surface (we don't import @stripe/stripe-js to avoid
// adding the runtime dep on the client; the script loads from CDN).
interface StripeElementChangeEvent {
  complete: boolean;
  empty?: boolean;
  error?: { message?: string; code?: string; type?: string };
  value?: unknown;
}
interface StripeElements {
  create: (type: 'card' | 'payment', opts?: unknown) => {
    mount: (el: HTMLElement) => void;
    unmount: () => void;
    destroy: () => void;
    on: (event: 'change' | 'ready' | 'focus' | 'blur', cb: (e: StripeElementChangeEvent) => void) => void;
    update: (opts: unknown) => void;
  };
}
interface StripeInstance {
  elements: (opts?: { clientSecret?: string; appearance?: unknown }) => StripeElements;
  confirmCardPayment: (
    clientSecret: string,
    data?: { payment_method?: { card: { token: string }; billing_details?: unknown } }
  ) => Promise<{ paymentIntent?: { id: string; status: string }; error?: { message: string } }>;
  confirmPayment: (
    clientSecret: string,
    data?: { elements?: StripeElements; redirect?: 'if_required' }
  ) => Promise<{ paymentIntent?: { id: string; status: string }; error?: { message: string } }>;
}
declare global {
  interface Window { Stripe?: (key: string) => StripeInstance }
}

export function StripeElements({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const publishableKey = String(config.publishableKey ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Stripe Elements');

  const [stripeReady, setStripeReady] = useState(false);
  const [elementsReady, setElementsReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const cardElRef = useRef<HTMLDivElement | null>(null);
  const stripeRef = useRef<StripeInstance | null>(null);
  const elementsRef = useRef<ReturnType<StripeElements['create']> | null>(null);

  // Load Stripe.js if we have a publishableKey and we're not in testMode.
  useEffect(() => {
    if (testMode || !publishableKey || typeof window === 'undefined') return;
    if (window.Stripe) {
      stripeRef.current = window.Stripe(publishableKey);
      // Defer to avoid setState-in-effect lint error.
      const id = window.setTimeout(() => setStripeReady(true), 0);
      return () => window.clearTimeout(id);
    }
    const s = document.createElement('script');
    s.src = 'https://js.stripe.com/v3/';
    s.async = true;
    s.onload = () => {
      if (window.Stripe) {
        stripeRef.current = window.Stripe(publishableKey);
        setStripeReady(true);
      }
    };
    document.body.appendChild(s);
    return () => { s.remove(); };
  }, [testMode, publishableKey]);

  // Fetch a PaymentIntent client secret from the backend when ready.
  // We do this lazily on first mount of the live mode — the backend creates
  // the PI and returns its client_secret for confirmCardPayment.
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  useEffect(() => {
    if (!stripeReady || !formId || testMode || clientSecret) return;
    let cancelled = false;
    fetch(`/api/forms/${formId}/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gatewayId: 'stripe_elements',
        amount,
        currency,
        customer: { name: 'Customer' },
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.clientSecret) setClientSecret(data.clientSecret);
        else if (data.error) setErrorMsg(data.error);
      })
      .catch((e) => { if (!cancelled) setErrorMsg(String(e?.message || e)); });
    return () => { cancelled = true; };
  }, [stripeReady, formId, testMode, amount, currency, clientSecret]);

  // Mount the Stripe PaymentElement (or legacy card element) once we have
  // both a Stripe instance and a client secret.
  useEffect(() => {
    if (!stripeReady || !clientSecret || !cardElRef.current || elementsRef.current) return;
    const stripe = stripeRef.current;
    if (!stripe) return;
    const elements = stripe.elements({ clientSecret });
    const card = elements.create('payment');
    card.mount(cardElRef.current);
    card.on('change', (e: StripeElementChangeEvent) => {
      if (e.error?.message) setErrorMsg(e.error.message);
      else if (e.complete) setErrorMsg(null);
    });
    elementsRef.current = card;
    // Defer to avoid setState-in-effect lint error.
    const id = window.setTimeout(() => setElementsReady(true), 0);
    return () => {
      window.clearTimeout(id);
      try { card.destroy(); } catch { /* noop */ }
      elementsRef.current = null;
      setElementsReady(false);
    };
  }, [stripeReady, clientSecret]);

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'INR' ? '₹' : '$';
  const canGoLive = !testMode && Boolean(publishableKey) && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    // Test mode — simulate.
    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        const tx = `sim_stripe_${Date.now()}`;
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'stripe_elements',
          transactionId: tx, simulated: true, last4: '4242', brand: 'visa',
        } as StripeElementsValue);
      }, 800);
      return;
    }

    // Live mode — confirm the PaymentIntent via Stripe.js.
    if (!stripeRef.current || !clientSecret) {
      setProcessing(false);
      setErrorMsg('Stripe is not ready yet. Please try again in a moment.');
      return;
    }
    try {
      const result = await stripeRef.current.confirmPayment(clientSecret, {
        elements: stripeRef.current.elements({ clientSecret }),
        redirect: 'if_required',
      });
      setProcessing(false);
      if (result.error) {
        setErrorMsg(result.error.message);
        onChange({ status: 'error', amount, currency, gatewayId: 'stripe_elements', errorMessage: result.error.message } as StripeElementsValue);
        return;
      }
      if (result.paymentIntent) {
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'stripe_elements',
          transactionId: result.paymentIntent.id,
          clientSecret: clientSecret,
        } as StripeElementsValue);
      }
    } catch (e: unknown) {
      setProcessing(false);
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
      onChange({ status: 'error', amount, currency, gatewayId: 'stripe_elements', errorMessage: msg } as StripeElementsValue);
    }
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="stripe_elements"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {/* Live mode requires a publishableKey */}
      {!testMode && !publishableKey && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
            Live mode requires a <strong>Stripe Publishable Key</strong>. Add it
            in the inspector under <em>API Credentials</em> to start accepting
            real payments.
          </p>
        </div>
      )}

      {/* Render the Stripe PaymentElement mount point, OR the test-mode placeholder */}
      {canGoLive && stripeReady && clientSecret ? (
        <div className="space-y-2">
          <div ref={cardElRef} className="min-h-[40px] rounded-md border border-border/60 p-2 bg-background" />
          {errorMsg && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertCircle className="size-3" /> {errorMsg}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center space-y-1">
          <Sparkles className="size-5 mx-auto text-[#635BFF]" />
          <p className="text-xs font-semibold text-foreground">
            {testMode
              ? 'Test mode — Stripe Elements will load here when you switch to Live.'
              : 'Loading Stripe Elements…'}
          </p>
          <p className="text-[11px] text-muted-foreground">Amount: {amount.toFixed(2)} {currency}</p>
        </div>
      )}

      <Button
        type="button"
        disabled={disabled || processing || (canGoLive && !elementsReady)}
        onClick={handlePay}
        className="w-full h-10 bg-[#635BFF] hover:bg-[#5851ee] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pay {amount.toFixed(2)} {currency}
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> 256-bit SSL • PCI-DSS
        </span>
        <span className="font-mono">Stripe Secure</span>
      </div>
    </div>
  );
}

export default StripeElements;
