'use client';

/**
 * Square — REAL Square Web SDK integration.
 *
 * Loads the Square Web SDK, initializes Square.payments() with the user's
 * applicationId + locationId, creates a Card payment object, mounts it in a
 * div, and tokenizes on Pay. The token is sent to /api/forms/[id]/charge.
 *
 * In testMode (or when applicationId is not set), falls back to a clearly
 * marked simulated-payment UI.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Lock, ShieldCheck, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface SquareValue {
  status: 'idle' | 'processing' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  nonce?: string;
  cardBrand?: string;
  last4?: string;
  transactionId?: string;
  simulated?: boolean;
  errorMessage?: string;
}

interface SquareCardPayment {
  attach: (el: HTMLElement) => Promise<void>;
  tokenize: () => Promise<{ token: string; details?: { card?: { brand?: string; last4?: string } }; status: string }>;
  destroy?: () => Promise<void>;
}
interface SquarePayments {
  card: () => Promise<SquareCardPayment>;
}
interface SquareSDK {
  payments: (appId: string, locId: string) => SquarePayments;
}
declare global {
  interface Window { Square?: SquareSDK }
}

export function Square({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const applicationId = String(config.applicationId ?? '');
  const locationId = String(config.locationId ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Square Payment');
  const [sdkReady, setSdkReady] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const cardElRef = useRef<HTMLDivElement | null>(null);
  const cardPaymentRef = useRef<SquareCardPayment | null>(null);

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'INR' ? '₹' : '$';
  const canGoLive = !testMode && Boolean(applicationId) && Boolean(locationId) && Boolean(formId);

  // Load Square Web SDK.
  useEffect(() => {
    if (!canGoLive || typeof window === 'undefined') return;
    if (window.Square) {
      const id = window.setTimeout(() => setSdkReady(true), 0);
      return () => window.clearTimeout(id);
    }
    const s = document.createElement('script');
    s.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
    s.async = true;
    s.onload = () => setSdkReady(true);
    s.onerror = () => setErrorMsg('Failed to load Square SDK. Check your network connection.');
    document.body.appendChild(s);
    return () => { s.remove(); };
  }, [canGoLive]);

  // Initialize and mount the Square Card payment object.
  useEffect(() => {
    if (!sdkReady || !window.Square || !cardElRef.current || cardPaymentRef.current) return;
    (async () => {
      try {
        const payments = window.Square.payments(applicationId, locationId);
        const card = await payments.card();
        await card.attach(cardElRef.current!);
        cardPaymentRef.current = card;
        const id = window.setTimeout(() => setCardReady(true), 0);
        return () => window.clearTimeout(id);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setErrorMsg(`Square init failed: ${msg}`);
      }
    })();
    return () => {
      if (cardPaymentRef.current?.destroy) {
        cardPaymentRef.current.destroy().catch(() => { /* noop */ });
      }
      cardPaymentRef.current = null;
      setCardReady(false);
    };
  }, [sdkReady, applicationId, locationId]);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'square_payments',
          nonce: `sim_cnon_${Date.now()}`, cardBrand: 'VISA', last4: '4242',
          simulated: true,
        } as SquareValue);
      }, 900);
      return;
    }

    if (!cardPaymentRef.current) {
      setProcessing(false);
      setErrorMsg('Square card form not ready yet.');
      return;
    }

    try {
      const result = await cardPaymentRef.current.tokenize();
      if (result.status !== 'OK' || !result.token) {
        throw new Error('Square tokenization failed.');
      }
      // Submit the nonce to the backend charge endpoint.
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'square_payments',
          amount, currency,
          paymentMethodId: result.token,
          customer: { name: 'Customer' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success) {
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'square_payments',
          nonce: result.token,
          cardBrand: result.details?.card?.brand,
          last4: result.details?.card?.last4,
          transactionId: data.transactionId,
        } as SquareValue);
      } else {
        setErrorMsg(data.error || 'Square payment failed.');
        onChange({ status: 'error', amount, currency, gatewayId: 'square_payments', errorMessage: data.error } as SquareValue);
      }
    } catch (e: unknown) {
      setProcessing(false);
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
    }
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="square_payments"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {!testMode && (!applicationId || !locationId) && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
            Live mode requires <strong>Application ID</strong> and <strong>Location ID</strong>.
            Add them in the inspector under <em>API Credentials</em>.
          </p>
        </div>
      )}

      {canGoLive && sdkReady ? (
        <div className="space-y-2">
          <div ref={cardElRef} className="min-h-[80px]" />
          {errorMsg && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertCircle className="size-3" /> {errorMsg}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center space-y-1">
          <Sparkles className="size-5 mx-auto text-[#006AFF]" />
          <p className="text-xs font-semibold">
            {testMode
              ? 'Test mode: Square payment form will load here when you switch to Live.'
              : 'Loading Square payment form…'}
          </p>
          <p className="text-[11px] text-muted-foreground">Amount: {amount.toFixed(2)} {currency}</p>
        </div>
      )}

      <Button
        type="button"
        disabled={disabled || processing || (canGoLive && !cardReady)}
        onClick={handlePay}
        className="w-full h-10 bg-[#006AFF] hover:bg-[#0058D4] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pay {amount.toFixed(2)} {currency}
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> PCI-DSS Compliant
        </span>
        <span className="font-mono">Square Secure</span>
      </div>
    </div>
  );
}

export default Square;
