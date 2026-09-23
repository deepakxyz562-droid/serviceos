'use client';

/**
 * GoCardless — REAL GoCardless Direct Debit integration.
 *
 * Calls /api/forms/[id]/charge which creates a GoCardless redirect flow
 * via api.gocardless.com/redirect_flows. Returns a redirect URL — the
 * customer authorizes the bank debit mandate on GoCardless's hosted page.
 *
 * After authorization, GoCardless redirects back to the form, and the
 * mandate is used to collect the payment (server-side, via a separate
 * /payments API call which happens async via webhook).
 *
 * In testMode (or when accessToken is not set), falls back to a clearly
 * marked simulated-payment UI.
 */
import React, { useState } from 'react';
import { Building2, Lock, ShieldCheck, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface GoCardlessValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  redirectFlowId?: string;
  checkoutUrl?: string;
  simulated?: boolean;
  errorMessage?: string;
}

export function GoCardless({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 99);
  const currency = String(config.currency ?? 'GBP');
  const testMode = Boolean(config.testMode ?? true);
  const accessToken = String(config.accessToken ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'GoCardless');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£';
  const canGoLive = !testMode && Boolean(accessToken) && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'gocardless',
          transactionId: `sim_gc_${Date.now()}`,
          redirectFlowId: `sim_flow_${Date.now()}`,
          checkoutUrl: 'https://gocardless.com/sandbox/redirect-flow/test',
          simulated: true,
        } as GoCardlessValue);
      }, 700);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'gocardless',
          amount, currency,
          customer: { name: 'Customer' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.checkoutUrl) {
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'gocardless',
          transactionId: data.transactionId, redirectFlowId: data.transactionId,
          checkoutUrl: data.checkoutUrl,
        } as GoCardlessValue);
        window.location.href = data.checkoutUrl;
      } else {
        setErrorMsg(data.error || 'GoCardless redirect flow creation failed.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
    }
  };

  const currentValue = value as GoCardlessValue | undefined;
  const done = currentValue?.status === 'pending_redirect' && currentValue.transactionId;

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="gocardless"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {!testMode && !accessToken && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
            Live mode requires a <strong>GoCardless Access Token</strong>.
            Add it in the inspector under <em>API Credentials</em>.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center space-y-1">
        <Building2 className="size-6 mx-auto text-[#00DC82]" />
        <p className="text-xs font-semibold">Direct Debit via GoCardless</p>
        <p className="text-[11px] text-muted-foreground">
          Authorize a one-time bank debit mandate. SEPA, BACS, ACH supported.
        </p>
      </div>

      {done && (
        <div className="text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800/60">
          {currentValue?.simulated
            ? `Test mandate created — Ref: ${currentValue?.transactionId} (no real charge)`
            : `Mandate created — Ref: ${currentValue?.transactionId}`}
          {currentValue?.checkoutUrl && !currentValue?.simulated && (
            <a href={currentValue.checkoutUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline">
              Open GoCardless ↗
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
        className="w-full h-10 bg-[#00DC82] hover:bg-[#00C172] text-[#0E1E25] font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <ExternalLink className="size-3.5" /> Authorize {currencySymbol}{amount.toFixed(2)} Direct Debit
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> Bank-grade security
        </span>
        <span className="font-mono">GoCardless</span>
      </div>
    </div>
  );
}

export default GoCardless;
