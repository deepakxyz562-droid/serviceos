'use client';

/**
 * SenangPay — REAL SenangPay redirect integration.
 *
 * Calls /api/forms/[id]/charge which computes the SenangPay HMAC-SHA256
 * signature and returns `{ checkoutUrl, formData }`. The widget builds a
 * hidden auto-submitting POST form and submits it to SenangPay's hosted
 * checkout page (SenangPay requires a POST, not a GET redirect).
 *
 * In testMode (or when credentials are not set), falls back to a clearly
 * marked simulated-payment UI — no fabricated transactionId reaches the
 * backend.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Lock, ShieldCheck, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface SenangPayValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  checkoutUrl?: string;
  simulated?: boolean;
  errorMessage?: string;
}

interface SenangPayFormData {
  detail: string;
  amount: string;
  order_id: string;
  hash: string;
  name: string;
  email: string;
  phone: string;
}

export function SenangPay({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 39);
  const currency = String(config.currency ?? 'MYR');
  const testMode = Boolean(config.testMode ?? true);
  const merchantId = String(config.merchantId ?? '');
  const secretKey = String(config.secretKey ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'SenangPay');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingFormData, setPendingFormData] =
    useState<{ url: string; data: SenangPayFormData } | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const currencySymbol = 'RM';
  const canGoLive = !testMode && Boolean(merchantId) && Boolean(secretKey) && Boolean(formId);

  // After we render the hidden form, submit it to trigger the SenangPay
  // redirect. Using an effect (rather than a setTimeout) guarantees the form
  // node is in the DOM by the time we call .submit().
  useEffect(() => {
    if (pendingFormData && formRef.current) {
      formRef.current.submit();
    }
  }, [pendingFormData]);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'senangpay',
          transactionId: `sim_sp_${Date.now()}`,
          checkoutUrl: 'https://sandbox.senangpay.my/payment/test',
          simulated: true,
        } as SenangPayValue);
      }, 700);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'senangpay', amount, currency,
          customer: { name: 'Customer', email: '', phone: '' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.checkoutUrl && data.formData) {
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'senangpay',
          transactionId: data.transactionId, checkoutUrl: data.checkoutUrl,
        } as SenangPayValue);
        // Stash signed params so the effect can POST-submit the hidden form.
        setPendingFormData({ url: data.checkoutUrl, data: data.formData as SenangPayFormData });
      } else {
        setErrorMsg(data.error || 'SenangPay payment initiation failed.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const currentValue = value as SenangPayValue | undefined;
  const done = currentValue?.status === 'pending_redirect' && currentValue.transactionId;

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="senangpay"
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
            Live mode requires <strong>SenangPay Merchant ID and Secret Key</strong>.
            Add them in the inspector under <em>API Credentials</em>.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center space-y-1">
        <ExternalLink className="size-6 mx-auto text-[#16a34a]" />
        <p className="text-xs font-semibold">SenangPay Hosted Checkout</p>
        <p className="text-[11px] text-muted-foreground">FPX, cards, Touch&apos;n Go, GrabPay</p>
      </div>

      {done && (
        <div className="text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800/60">
          {currentValue?.simulated
            ? `Test payment created — Ref: ${currentValue?.transactionId} (no real charge)`
            : `Payment created — Ref: ${currentValue?.transactionId}. Redirecting to SenangPay…`}
          {currentValue?.checkoutUrl && !currentValue?.simulated && (
            <a href={currentValue.checkoutUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline">
              Open SenangPay ↗
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
        className="w-full h-10 bg-[#16a34a] hover:bg-[#128a3e] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Bayar {currencySymbol}{amount.toFixed(2)} with SenangPay
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> MY gateway
        </span>
        <span className="font-mono">SenangPay</span>
      </div>

      {/* Hidden auto-submitting form for the SenangPay redirect (POST with
          signed params). Rendered only after the backend returns formData. */}
      {pendingFormData && (
        <form
          ref={formRef}
          method="POST"
          action={pendingFormData.url}
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', top: 0, width: 1, height: 1, overflow: 'hidden' }}
        >
          <input type="hidden" name="detail" value={pendingFormData.data.detail} readOnly />
          <input type="hidden" name="amount" value={pendingFormData.data.amount} readOnly />
          <input type="hidden" name="order_id" value={pendingFormData.data.order_id} readOnly />
          <input type="hidden" name="hash" value={pendingFormData.data.hash} readOnly />
          <input type="hidden" name="name" value={pendingFormData.data.name} readOnly />
          <input type="hidden" name="email" value={pendingFormData.data.email} readOnly />
          <input type="hidden" name="phone" value={pendingFormData.data.phone} readOnly />
        </form>
      )}
    </div>
  );
}

export default SenangPay;
