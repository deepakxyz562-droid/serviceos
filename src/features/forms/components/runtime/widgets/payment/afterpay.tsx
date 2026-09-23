'use client';

/**
 * Afterpay / Clearpay — REAL Afterpay Checkout API integration.
 *
 * Calls /api/forms/[id]/charge which creates an Afterpay checkout via
 * {api.us.afterpay.com|api.clearpay.co.uk}/v2/checkouts. Returns a
 * redirect URL — the customer pays on Afterpay's hosted page.
 *
 * After payment, Afterpay redirects back to the form.
 *
 * In testMode (or when merchantId/secretKey are not set), falls back
 * to a clearly marked simulated-payment UI.
 */
import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface AfterpayValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  token?: string;
  checkoutUrl?: string;
  simulated?: boolean;
  errorMessage?: string;
}

export function Afterpay({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 99);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const merchantId = String(config.merchantId ?? '');
  const secretKey = String(config.secretKey ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Afterpay / Clearpay');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const canGoLive = !testMode && Boolean(merchantId) && Boolean(secretKey) && Boolean(formId);

  // Determine if this is Afterpay (US/AU/NZ/CA) or Clearpay (UK/EU) based on currency.
  const isClearpay = currency === 'GBP' || currency === 'EUR';
  const gatewayId = isClearpay ? 'clearpay' : 'afterpay';

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId,
          transactionId: `sim_afterpay_${Date.now()}`,
          token: `sim_token_${Date.now()}`,
          checkoutUrl: 'https://sandbox.afterpay.com/checkout/test',
          simulated: true,
        } as AfterpayValue);
      }, 700);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId,
          amount, currency,
          customer: { name: 'Customer' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.checkoutUrl) {
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId,
          transactionId: data.transactionId, token: data.transactionId,
          checkoutUrl: data.checkoutUrl,
        } as AfterpayValue);
        window.location.href = data.checkoutUrl;
      } else {
        setErrorMsg(data.error || `${isClearpay ? 'Clearpay' : 'Afterpay'} checkout creation failed.`);
      }
    } catch (e: unknown) {
      setProcessing(false);
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
    }
  };

  const currentValue = value as AfterpayValue | undefined;
  const done = currentValue?.status === 'pending_redirect' && currentValue.transactionId;
  const installment = amount / 4;

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId={gatewayId}
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {!testMode && (!merchantId || !secretKey) && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
            Live mode requires <strong>{isClearpay ? 'Clearpay' : 'Afterpay'} Merchant ID + Secret Key</strong>.
            Add them in the inspector under <em>API Credentials</em>.
          </p>
        </div>
      )}

      {/* BNPL installment breakdown */}
      <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">4 interest-free payments</span>
          <span className="text-xs font-bold text-emerald-600">
            {currencySymbol}{installment.toFixed(2)} <span className="text-[10px] text-muted-foreground">× 4</span>
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Pay every 2 weeks. No interest, no fees when paid on time.
        </p>
      </div>

      {done && (
        <div className="text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800/60">
          {currentValue?.simulated
            ? `Test checkout created — Ref: ${currentValue?.transactionId} (no real charge)`
            : `Checkout created — Ref: ${currentValue?.transactionId}`}
          {currentValue?.checkoutUrl && !currentValue?.simulated && (
            <a href={currentValue.checkoutUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline">
              Open {isClearpay ? 'Clearpay' : 'Afterpay'} ↗
            </a>
          )}
        </div>
      )}

      {errorMsg && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <AlertCircle className="size-3" /> {errorMsg}
        </p>
      )}

      <Button
        type="button"
        disabled={disabled || processing}
        onClick={handlePay}
        className="w-full h-10 bg-[#111827] hover:bg-black text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pay {currencySymbol}{installment.toFixed(2)} now, {currencySymbol}{installment.toFixed(2)} in 2 weeks
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> BNPL Protected
        </span>
        <span className="font-mono">{isClearpay ? 'Clearpay' : 'Afterpay'}</span>
      </div>
    </div>
  );
}

export default Afterpay;
