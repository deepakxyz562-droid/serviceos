'use client';

/**
 * Cash App Pay — Gateway-dependent sub-method (via Square).
 *
 * Cash App Pay is NOT a standalone payment gateway — it's a wallet payment
 * method that rides on top of Square. This widget requires the form owner
 * to have a connected Square account.
 *
 * Calls /api/forms/[id]/charge with gatewayId='cash_app_pay'. The backend
 * resolves the user's Square credentials via resolveFormCredentials() and
 * creates a Square payment with the Cash App Pay funding source.
 *
 * In testMode (or when Square credentials are not set), falls back to a
 * clearly marked simulated-payment UI.
 */
import React, { useState } from 'react';
import { Loader2, ShieldCheck, AlertCircle, Lock, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface CashAppPayValue {
  status: 'idle' | 'processing' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  simulated?: boolean;
  errorMessage?: string;
}

export function CashAppPay({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Cash App Pay');
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
          status: 'succeeded', amount, currency, gatewayId: 'cash_app_pay',
          transactionId: `sim_cashapp_${Date.now()}`, simulated: true,
        } as CashAppPayValue);
      }, 800);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'cash_app_pay', amount, currency,
          customer: { name: 'Customer' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success) {
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'cash_app_pay',
          transactionId: data.transactionId,
        } as CashAppPayValue);
      } else {
        setErrorMsg(data.error || 'Cash App Pay payment failed. Make sure you have a connected Square account.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="cash_app_pay"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {/* Square dependency notice */}
      <div className="rounded-lg border border-[#00D632]/40 bg-[#00D632]/10 p-2 flex items-start gap-2">
        <AlertCircle className="size-3.5 text-[#00D632] shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#0a3d0a] dark:text-green-100 leading-tight">
          <strong>Requires a connected Square account.</strong> Cash App Pay
          is a wallet payment method that rides on top of Square. Connect
          your Square account in the inspector.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center space-y-1">
        <Smartphone className="size-6 mx-auto text-[#00D632]" />
        <p className="text-xs font-semibold">Cash App Pay</p>
        <p className="text-[11px] text-muted-foreground">QR & mobile deep-link payments</p>
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
        className="w-full h-10 bg-[#00D632] hover:bg-[#00B82C] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pay {currencySymbol}{amount.toFixed(2)} with Cash App
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> QR / Deep Link
        </span>
        <span className="font-mono">Cash App via Square</span>
      </div>
    </div>
  );
}

export default CashAppPay;
