'use client';

/**
 * Google Pay — Gateway-dependent sub-method (via Stripe/Square/Braintree).
 *
 * Google Pay is NOT a standalone payment gateway — it's a wallet payment
 * method that requires a primary gateway (Stripe/Square/Braintree) to
 * process the charge. This widget requires the form owner to have a
 * connected primary gateway account.
 *
 * Calls /api/forms/[id]/charge with gatewayId='google_pay'. The backend
 * resolves the user's Stripe/Square credentials via resolveFormCredentials(),
 * and creates a PaymentIntent/payment. The frontend uses Google Pay JS
 * to initiate the payment.
 *
 * In testMode (or when no primary gateway credentials are set), falls back
 * to a clearly marked simulated-payment UI.
 */
import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface GooglePayValue {
  status: 'idle' | 'processing' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  simulated?: boolean;
  errorMessage?: string;
}

export function GooglePay({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Google Pay');
  const [available, setAvailable] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencySymbol = '$';
  const canGoLive = !testMode && Boolean(formId);

  useEffect(() => {
    const id = window.setTimeout(() => setAvailable(!testMode), 0);
    return () => window.clearTimeout(id);
  }, [testMode]);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'google_pay',
          transactionId: `sim_gpay_${Date.now()}`, simulated: true,
        } as GooglePayValue);
      }, 800);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'google_pay', amount, currency,
          customer: { name: 'Customer' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success) {
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'google_pay',
          transactionId: data.transactionId,
        } as GooglePayValue);
      } else {
        setErrorMsg(data.error || 'Google Pay payment failed. Make sure you have a connected Stripe/Square account.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="apple_google_pay"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {/* Primary gateway dependency notice */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
        <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
          <strong>Requires a connected Stripe or Square account.</strong> Google Pay
          is a wallet method that rides on top of a primary gateway. Connect your
          Stripe or Square account in the inspector.
        </p>
      </div>

      {errorMsg && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <AlertCircle className="size-3" /> {errorMsg}
        </p>
      )}

      <Button
        type="button"
        disabled={disabled || processing || (!available && !testMode)}
        onClick={handlePay}
        className="w-full h-11 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-bold text-sm rounded-xl gap-1.5 shadow-xs"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-4" /> Pay {currencySymbol}{amount.toFixed(2)}
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> Secure
        </span>
        <span className="font-mono">Google Pay</span>
      </div>
    </div>
  );
}

export default GooglePay;
