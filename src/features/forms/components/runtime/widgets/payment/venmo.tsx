'use client';

/**
 * Venmo — Gateway-dependent sub-method (via PayPal).
 *
 * Venmo is NOT a standalone payment gateway — it's a social wallet payment
 * method that rides on top of PayPal. This widget requires the form owner
 * to have a connected PayPal account.
 *
 * Calls /api/forms/[id]/charge with gatewayId='venmo'. The backend resolves
 * the user's PayPal credentials via resolveFormCredentials() and creates a
 * PayPal order with the Venmo funding source enabled.
 *
 * In testMode (or when PayPal credentials are not set), falls back to a
 * clearly marked simulated-payment UI.
 */
import React, { useState } from 'react';
import { Loader2, ShieldCheck, AlertCircle, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface VenmoValue {
  status: 'idle' | 'processing' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  simulated?: boolean;
  errorMessage?: string;
}

export function Venmo({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Venmo');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencySymbol = '$';
  const canGoLive = !testMode && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'venmo',
          transactionId: `sim_venmo_${Date.now()}`, simulated: true,
        } as VenmoValue);
      }, 800);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'venmo', amount, currency,
          customer: { name: 'Customer' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success) {
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'venmo',
          transactionId: data.transactionId,
        } as VenmoValue);
      } else {
        setErrorMsg(data.error || 'Venmo payment failed. Make sure you have a connected PayPal account.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="venmo"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {/* PayPal dependency notice */}
      <div className="rounded-lg border border-[#008CFF]/40 bg-[#008CFF]/10 p-2 flex items-start gap-2">
        <AlertCircle className="size-3.5 text-[#008CFF] shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#003087] dark:text-blue-100 leading-tight">
          <strong>Requires a connected PayPal account.</strong> Venmo is a
          social wallet payment method that rides on top of PayPal. Connect
          your PayPal account in the inspector.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center space-y-1">
        <Users className="size-6 mx-auto text-[#008CFF]" />
        <p className="text-xs font-semibold">Pay with Venmo</p>
        <p className="text-[11px] text-muted-foreground">Social wallet — US only</p>
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
        className="w-full h-10 bg-[#008CFF] hover:bg-[#0077DB] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pay {currencySymbol}{amount.toFixed(2)} with Venmo
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> Social Payment
        </span>
        <span className="font-mono">Venmo via PayPal</span>
      </div>
    </div>
  );
}

export default Venmo;
