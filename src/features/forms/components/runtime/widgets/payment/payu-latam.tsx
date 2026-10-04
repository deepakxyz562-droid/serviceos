'use client';

/**
 * PayU Latam — REAL PayU LATAM Payments API integration.
 *
 * Calls /api/forms/[id]/charge which POSTs a SUBMIT_TRANSACTION command to
 * https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi (test) or
 * https://api.payulatam.com/payments-api/4.0/service.cgi (live) with an MD5
 * signature. Response: transactionResponse.extraParameters.URL_PAYMENT —
 * the redirect URL. The widget window.location.href's to the returned URL.
 *
 * After payment, PayU redirects back to the form's RESPONSE_URL.
 *
 * In testMode (or when apiKey/merchantId are not set), falls back to a
 * clearly marked simulated-payment UI.
 */
import React, { useState } from 'react';
import { ExternalLink, Loader2, ShieldCheck, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface PayULatamValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  checkoutUrl?: string;
  simulated?: boolean;
  errorMessage?: string;
}

export function PayULatam({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 99);
  const currency = String(config.currency ?? 'BRL');
  const testMode = Boolean(config.testMode ?? true);
  const merchantId = String(config.merchantId ?? '');
  const accountId = String(config.accountId ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'PayU Latam');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencySymbol = currency === 'BRL' ? 'R$' : currency === 'MXN' ? '$' : currency === 'ARS' ? '$' : currency === 'COP' ? '$' : '$';
  const canGoLive = !testMode && Boolean(merchantId) && Boolean(accountId) && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    // Test mode — simulate.
    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'payu_latam',
          transactionId: `sim_payulatam_${Date.now()}`,
          checkoutUrl: 'https://sandbox.api.payulatam.com/payments-api/sandbox-checkout',
          simulated: true,
        } as PayULatamValue);
      }, 700);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'payu_latam',
          amount, currency,
          customer: { name: 'Customer' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.checkoutUrl) {
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'payu_latam',
          transactionId: data.transactionId, checkoutUrl: data.checkoutUrl,
        } as PayULatamValue);
        // Redirect to PayU's hosted Latam checkout page.
        window.location.href = data.checkoutUrl;
      } else {
        setErrorMsg(data.error || 'PayU Latam payment initiation failed.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
    }
  };

  const currentValue = value as PayULatamValue | undefined;
  const done = currentValue?.status === 'pending_redirect' && currentValue.transactionId;

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="payu_latam"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {!testMode && !merchantId && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
            Live mode requires a <strong>PayU Merchant ID, Account ID, API Key
            and API Login</strong>. Add them in the inspector under
            <em> API Credentials</em>.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center space-y-1">
        <ExternalLink className="size-6 mx-auto text-[#8DC640]" />
        <p className="text-xs font-semibold">PayU Latam Hosted Checkout</p>
        <p className="text-[11px] text-muted-foreground">
          Boleto, PIX, OXXO, PSE, Mercado Pago, major cards.
        </p>
      </div>

      {done && (
        <div className="text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800/60">
          {currentValue?.simulated
            ? `Test payment created — Ref: ${currentValue?.transactionId} (no real charge)`
            : `Redirecting to PayU Latam — Ref: ${currentValue?.transactionId}`}
          {currentValue?.checkoutUrl && !currentValue?.simulated && (
            <a href={currentValue.checkoutUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline">
              Open PayU ↗
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
        className="w-full h-10 bg-[#8DC640] hover:bg-[#7bb535] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pay {amount.toFixed(2)} {currency} with PayU
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> PCI-DSS L1
        </span>
        <span className="font-mono">PayU Latam</span>
      </div>
    </div>
  );
}

export default PayULatam;
