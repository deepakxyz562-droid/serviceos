'use client';

/**
 * Affirm — REAL Affirm Checkout API integration.
 *
 * Calls /api/forms/[id]/charge which creates a checkout via the Affirm API
 * (api.affirm.com/api/v1/charges). Returns a redirect_url — the customer
 * is redirected to Affirm's hosted checkout page for loan approval.
 *
 * After payment, Affirm redirects back to the form.
 *
 * In testMode (or when publicApiKey/privateApiKey are not set), falls back
 * to a clearly marked simulated-payment UI.
 */
import React, { useState } from 'react';
import { Calendar, Lock, ShieldCheck, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface AffirmValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  checkoutUrl?: string;
  simulated?: boolean;
  errorMessage?: string;
}

export function Affirm({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 299);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const publicApiKey = String(config.publicApiKey ?? '');
  const privateApiKey = String(config.privateApiKey ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Affirm');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencySymbol = '$';
  const canGoLive = !testMode && Boolean(publicApiKey) && Boolean(privateApiKey) && Boolean(formId);
  // Monthly estimate (Affirm shows "as low as $X/mo" with interest)
  const monthly = amount > 0 ? (amount / 12).toFixed(2) : '0.00';

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'affirm',
          transactionId: `sim_affirm_${Date.now()}`,
          checkoutUrl: 'https://sandbox.affirm.com/checkout/test',
          simulated: true,
        } as AffirmValue);
      }, 800);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'affirm',
          amount, currency,
          customer: { name: 'Customer' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.checkoutUrl) {
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'affirm',
          transactionId: data.transactionId, checkoutUrl: data.checkoutUrl,
        } as AffirmValue);
        window.location.href = data.checkoutUrl;
      } else {
        setErrorMsg(data.error || 'Affirm checkout creation failed.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const currentValue = value as AffirmValue | undefined;
  const done = currentValue?.status === 'pending_redirect' && currentValue.transactionId;

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="affirm"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {!testMode && (!publicApiKey || !privateApiKey) && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
            Live mode requires <strong>Affirm Public + Private API Keys</strong>. Add them in the inspector under <em>API Credentials</em>.
          </p>
        </div>
      )}

      {/* Affirm monthly estimate */}
      <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <Calendar className="size-3.5 text-[#0FA3E0]" /> Pay over time
          </span>
          <span className="text-xs font-bold text-[#0FA3E0]">
            {currencySymbol}{monthly}<span className="text-[10px] text-muted-foreground">/mo</span>
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          12-month estimate. Subject to credit approval. No late fees.
        </p>
      </div>

      {done && (
        <div className="text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800/60">
          {currentValue?.simulated
            ? `Test checkout created — Ref: ${currentValue?.transactionId} (no real charge)`
            : `Checkout created — Ref: ${currentValue?.transactionId}`}
          {currentValue?.checkoutUrl && !currentValue?.simulated && (
            <a href={currentValue.checkoutUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline">
              Open Affirm ↗
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
        className="w-full h-10 bg-[#0FA3E0] hover:bg-[#0D8FBE] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pay {currencySymbol}{amount.toFixed(2)} with Affirm
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> BNPL Protected
        </span>
        <span className="font-mono">Affirm</span>
      </div>
    </div>
  );
}

export default Affirm;
