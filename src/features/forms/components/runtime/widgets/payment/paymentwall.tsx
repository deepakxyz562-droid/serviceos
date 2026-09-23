'use client';

/**
 * Paymentwall — REAL Widget redirect integration.
 * Calls /api/forms/[id]/charge which generates an HMAC-SHA1 signed URL.
 * Frontend redirects to Paymentwall's hosted widget page.
 */
import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface PaymentwallValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number; currency: string; gatewayId: string;
  transactionId?: string; checkoutUrl?: string; simulated?: boolean; errorMessage?: string;
}

export function Paymentwall({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const publicKey = String(config.publicKey ?? '');
  const privateKey = String(config.privateKey ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Paymentwall');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const canGoLive = !testMode && Boolean(publicKey) && Boolean(privateKey) && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true); setErrorMsg(null);
    if (testMode || !canGoLive) { setTimeout(() => { setProcessing(false); onChange({ status: 'pending_redirect', amount, currency, gatewayId: 'paymentwall', transactionId: `sim_pw_${Date.now()}`, checkoutUrl: 'https://wallapi.com/test', simulated: true } as PaymentwallValue); }, 700); return; }
    try {
      const res = await fetch(`/api/forms/${formId}/charge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gatewayId: 'paymentwall', amount, currency, customer: { name: 'Customer' } }) });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.checkoutUrl) { onChange({ status: 'pending_redirect', amount, currency, gatewayId: 'paymentwall', transactionId: data.transactionId, checkoutUrl: data.checkoutUrl } as PaymentwallValue); window.location.href = data.checkoutUrl; }
      else { setErrorMsg(data.error || 'Paymentwall payment initiation failed.'); }
    } catch (e: unknown) { setProcessing(false); setErrorMsg(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader gatewayId="paymentwall" amount={amount} currency={currency} currencySymbol={currencySymbol} testMode={testMode || !canGoLive} label={label} />
      {!testMode && !canGoLive && (<div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2"><AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" /><p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">Live mode requires <strong>Paymentwall Public Key and Private Key</strong>.</p></div>)}
      {errorMsg && <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1"><AlertCircle className="size-3" /> {errorMsg}</p>}
      <Button type="button" disabled={disabled || processing} onClick={handlePay} className="w-full h-10 bg-[#E74C3C] hover:bg-[#D43B2C] text-white font-bold text-xs rounded-xl gap-1.5">{processing ? <Loader2 className="size-4 animate-spin" /> : <><Lock className="size-3.5" /> Pay {amount.toFixed(2)} {currency}</>}</Button>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> 150+ APMs</span><span className="font-mono">Paymentwall</span></div>
    </div>
  );
}
export default Paymentwall;
