'use client';

/**
 * Redsys — REAL Redsys hosted payment page integration (Spain).
 *
 * Calls /api/forms/[id]/charge which builds the Ds_MerchantParameters (base64
 * JSON) + Ds_Signature (HMAC-SHA256 of the merchant params, signed with the
 * base64-decoded merchant secret as the key) and returns a `redirect` object
 * with the action URL + form params. The widget builds a hidden auto-submitting
 * form and POSTs it to Redsys's `realizarPago` endpoint.
 *
 * After payment, Redsys redirects back to the form's URLOK / URLKO.
 *
 * In testMode (or when merchantCode/secretKey are not set), falls back to a
 * clearly marked simulated-payment UI.
 */
import React, { useState } from 'react';
import { ExternalLink, Loader2, ShieldCheck, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface RedsysValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  checkoutUrl?: string;
  simulated?: boolean;
  errorMessage?: string;
}

export function Redsys({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 59);
  const currency = String(config.currency ?? 'EUR');
  const testMode = Boolean(config.testMode ?? true);
  const merchantCode = String(config.merchantCode ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Redsys');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '€';
  const canGoLive = !testMode && Boolean(merchantCode) && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    // Test mode — simulate.
    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'redsys',
          transactionId: `sim_redsys_${Date.now()}`,
          checkoutUrl: 'https://sis-t.redsys.es:25443/sis/realizarPago',
          simulated: true,
        } as RedsysValue);
      }, 700);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'redsys',
          amount, currency,
          customer: { name: 'Customer' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.redirect) {
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'redsys',
          transactionId: data.transactionId,
          checkoutUrl: data.redirect.url,
        } as RedsysValue);
        // Build a hidden form and POST to Redsys's realizarPago endpoint.
        const form = document.createElement('form');
        form.method = (data.redirect.method || 'POST').toUpperCase();
        form.action = data.redirect.url;
        for (const [key, val] of Object.entries(data.redirect.params || {})) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(val);
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
      } else {
        setErrorMsg(data.error || 'Redsys payment initiation failed.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
    }
  };

  const currentValue = value as RedsysValue | undefined;
  const done = currentValue?.status === 'pending_redirect' && currentValue.transactionId;

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="redsys"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {!testMode && !merchantCode && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
            Live mode requires a <strong>Redsys Merchant Code</strong> and a
            Secret Key. Add them in the inspector under <em>API Credentials</em>.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center space-y-1">
        <ExternalLink className="size-6 mx-auto text-[#d50032]" />
        <p className="text-xs font-semibold">Redsys Hosted Payment</p>
        <p className="text-[11px] text-muted-foreground">
          Cards, Bizum, Mastercard, Visa, Verified by Visa.
        </p>
      </div>

      {done && (
        <div className="text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800/60">
          {currentValue?.simulated
            ? `Test payment created — Ref: ${currentValue?.transactionId} (no real charge)`
            : `Redirecting to Redsys — Ref: ${currentValue?.transactionId}`}
          {currentValue?.checkoutUrl && !currentValue?.simulated && (
            <a href={currentValue.checkoutUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline">
              Open Redsys ↗
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
        className="w-full h-10 bg-[#d50032] hover:bg-[#b8002b] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pagar {amount.toFixed(2)} {currency} con Redsys
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> 3-D Secure
        </span>
        <span className="font-mono">Redsys ES</span>
      </div>
    </div>
  );
}

export default Redsys;
