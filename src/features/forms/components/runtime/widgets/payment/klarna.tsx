'use client';

/**
 * Klarna — Gateway-dependent sub-method (via Stripe).
 *
 * Klarna is NOT a standalone payment gateway — it's a payment method type
 * that rides on top of a primary gateway (Stripe). This widget requires
 * the form owner to have a connected Stripe account.
 *
 * Calls /api/forms/[id]/charge with gatewayId='klarna'. The backend
 * resolves the user's Stripe credentials via resolveFormCredentials(),
 * creates a Stripe PaymentIntent with payment_method_types: ['klarna'],
 * and returns the client secret. The frontend uses Stripe.js to confirm
 * the Klarna payment.
 *
 * In testMode (or when Stripe credentials are not set), falls back to a
 * clearly marked simulated-payment UI.
 */
import React, { useState } from 'react';
import { Loader2, ShieldCheck, AlertCircle, Lock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface KlarnaValue {
  status: 'idle' | 'processing' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  simulated?: boolean;
  errorMessage?: string;
}

export function Klarna({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 99);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Klarna');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  // Klarna "Pay in 4" — 4 interest-free payments
  const installment = amount / 4;
  // Klarna requires a connected Stripe account (sub-method)
  const canGoLive = !testMode && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'klarna',
          transactionId: `sim_klarna_${Date.now()}`, simulated: true,
        } as KlarnaValue);
      }, 800);
      return;
    }

    try {
      // Call the charge endpoint with gatewayId='klarna'. The backend
      // resolves Stripe credentials via resolveFormCredentials() and creates
      // a PaymentIntent with payment_method_types: ['klarna'].
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'klarna', amount, currency,
          customer: { name: 'Customer' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success) {
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'klarna',
          transactionId: data.transactionId,
        } as KlarnaValue);
      } else {
        setErrorMsg(data.error || 'Klarna payment failed. Make sure you have a connected Stripe account.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="klarna"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {/* Stripe dependency notice */}
      <div className="rounded-lg border border-[#FFA8CD] bg-[#FFA8CD]/10 p-2 flex items-start gap-2">
        <AlertCircle className="size-3.5 text-[#FFA8CD] shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#171A20] dark:text-pink-100 leading-tight">
          <strong>Requires a connected Stripe account.</strong> Klarna is a
          payment method that rides on top of Stripe. Connect your Stripe
          account in the inspector or in Dashboard → Settings → Payments.
        </p>
      </div>

      {/* Klarna "Pay in 4" breakdown */}
      <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <Calendar className="size-3.5 text-[#FFA8CD]" /> Pay in 4
          </span>
          <span className="text-xs font-bold text-[#171A20] dark:text-pink-100">
            {currencySymbol}{installment.toFixed(2)} <span className="text-[10px] text-muted-foreground">× 4</span>
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          4 interest-free payments. No fees when paid on time.
        </p>
      </div>

      {errorMsg && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <AlertCircle className="size-3" /> {errorMsg}
        </p>
      )}

      <Button
        type="button"
        disabled={disabled || processing}
        onClick={handlePay}
        className="w-full h-10 bg-[#FFA8CD] hover:bg-[#FF90BF] text-[#171A20] font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pay {currencySymbol}{installment.toFixed(2)} now
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> BNPL Protected
        </span>
        <span className="font-mono">Klarna via Stripe</span>
      </div>
    </div>
  );
}

export default Klarna;
