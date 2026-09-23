'use client';

/**
 * CardPointe — REAL CardConnect iframe + auth flow.
 * Calls /api/forms/[id]/charge which returns an iframe URL for card
 * tokenization, or authorizes the charge if a token is provided.
 */
import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface CardPointeValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number; currency: string; gatewayId: string;
  transactionId?: string; simulated?: boolean; errorMessage?: string;
}

export function CardPointe({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const merchantId = String(config.merchantId ?? '');
  const username = String(config.username ?? '');
  const password = String(config.password ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'CardPointe');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const currencySymbol = '$';
  const canGoLive = !testMode && Boolean(merchantId) && Boolean(username) && Boolean(password) && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true); setErrorMsg(null);
    if (testMode || !canGoLive) { setTimeout(() => { setProcessing(false); onChange({ status: 'succeeded', amount, currency, gatewayId: 'cardpointe', transactionId: `sim_cp_${Date.now()}`, simulated: true } as CardPointeValue); }, 700); return; }
    try {
      const res = await fetch(`/api/forms/${formId}/charge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gatewayId: 'cardpointe', amount, currency, customer: { name: 'Customer' } }) });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.iframeUrl) {
        // Redirect to the CardPointe iframe for card tokenization.
        onChange({ status: 'pending_redirect', amount, currency, gatewayId: 'cardpointe', transactionId: data.transactionId } as CardPointeValue);
        window.location.href = data.iframeUrl;
      } else if (data.success) {
        onChange({ status: 'succeeded', amount, currency, gatewayId: 'cardpointe', transactionId: data.transactionId } as CardPointeValue);
      } else { setErrorMsg(data.error || 'CardPointe payment failed.'); }
    } catch (e: unknown) { setProcessing(false); setErrorMsg(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader gatewayId="cardpointe" amount={amount} currency={currency} currencySymbol={currencySymbol} testMode={testMode || !canGoLive} label={label} />
      {!testMode && !canGoLive && (<div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2"><AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" /><p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">Live mode requires <strong>CardPointe Merchant ID, Username, and Password</strong>.</p></div>)}
      {errorMsg && <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1"><AlertCircle className="size-3" /> {errorMsg}</p>}
      <Button type="button" disabled={disabled || processing} onClick={handlePay} className="w-full h-10 bg-[#0070BA] hover:bg-[#0060A0] text-white font-bold text-xs rounded-xl gap-1.5">{processing ? <Loader2 className="size-4 animate-spin" /> : <><Lock className="size-3.5" /> Pay {amount.toFixed(2)} {currency}</>}</Button>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> P2PE Encrypted</span><span className="font-mono">CardPointe</span></div>
    </div>
  );
}
export default CardPointe;
