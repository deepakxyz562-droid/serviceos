'use client';

/**
 * Dwolla — REAL Dwolla Checkout (ACH bank transfer) integration.
 *
 * Calls /api/forms/[id]/charge which creates a Dwolla Checkout via
 * api-sandbox.dwolla.com/checkout (sandbox) or api.dwolla.com/checkout (live).
 * If no `accessToken` is configured, the backend will fetch one via the
 * OAuth2 client_credentials grant using the provided clientId + clientSecret.
 * Returns a `checkoutUrl` — the customer is redirected to Dwolla's host flow.
 *
 * In testMode (or when credentials are not set), falls back to a clearly
 * marked simulated-payment UI so users can preview the form without charging.
 */
import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface DwollaValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  checkoutUrl?: string;
  simulated?: boolean;
  errorMessage?: string;
}

export function Dwolla({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 99);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const clientId = String(config.clientId ?? '');
  const clientSecret = String(config.clientSecret ?? '');
  const accessToken = String(config.accessToken ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Dwolla');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  // Can go live with either an accessToken alone, OR clientId+clientSecret
  // (backend will fetch the token via client_credentials grant).
  const hasCreds = Boolean(accessToken) || (Boolean(clientId) && Boolean(clientSecret));
  const canGoLive = !testMode && hasCreds && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'dwolla',
          transactionId: `sim_dwolla_${Date.now()}`,
          checkoutUrl: 'https://api-sandbox.dwolla.com/simulated_checkout',
          simulated: true,
        } as DwollaValue);
      }, 700);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'dwolla', amount, currency,
          customer: { name: 'Customer' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.checkoutUrl) {
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'dwolla',
          transactionId: data.transactionId, checkoutUrl: data.checkoutUrl,
        } as DwollaValue);
        window.location.href = data.checkoutUrl;
      } else {
        setErrorMsg(data.error || 'Dwolla payment initiation failed.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const currentValue = value as DwollaValue | undefined;
  const done = currentValue?.status === 'pending_redirect' && currentValue.transactionId;

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="dwolla"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {!testMode && !hasCreds && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
            Live mode requires <strong>Dwolla Client ID + Client Secret</strong>
            (or an Access Token). Add them in the inspector under <em>API Credentials</em>.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center space-y-1">
        <ExternalLink className="size-6 mx-auto text-[#ff7700]" />
        <p className="text-xs font-semibold">Dwolla ACH Checkout</p>
        <p className="text-[11px] text-muted-foreground">Pay directly from your bank account via ACH transfer</p>
      </div>

      {done && (
        <div className="text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800/60">
          {currentValue?.simulated
            ? `Test payment created — Ref: ${currentValue?.transactionId} (no real charge)`
            : `Payment created — Ref: ${currentValue?.transactionId}`}
          {currentValue?.checkoutUrl && !currentValue?.simulated && (
            <a href={currentValue.checkoutUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline">
              Open Dwolla ↗
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
        className="w-full h-10 bg-[#ff7700] hover:bg-[#e66e00] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pay {currencySymbol}{amount.toFixed(2)} with Dwolla
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> ACH / Bank Transfer
        </span>
        <span className="font-mono">Dwolla</span>
      </div>
    </div>
  );
}

export default Dwolla;
