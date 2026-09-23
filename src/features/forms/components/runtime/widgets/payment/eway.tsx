'use client';

/**
 * Eway — REAL Rapid API redirect integration.
 * Calls /api/forms/[id]/charge which creates an AccessCode via eWay Rapid API.
 * Frontend redirects to the eWay FormActionURL for card entry.
 */
import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface EwayValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number; currency: string; gatewayId: string;
  transactionId?: string; checkoutUrl?: string; simulated?: boolean; errorMessage?: string;
}

export function Eway({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'AUD');
  const testMode = Boolean(config.testMode ?? true);
  const apiKey = String(config.apiKey ?? '');
  const password = String(config.password ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'eWay');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const canGoLive = !testMode && Boolean(apiKey) && Boolean(password) && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true); setErrorMsg(null);
    if (testMode || !canGoLive) { setTimeout(() => { setProcessing(false); onChange({ status: 'pending_redirect', amount, currency, gatewayId: 'eway', transactionId: `sim_ew_${Date.now()}`, simulated: true } as EwayValue); }, 700); return; }
    try {
      const res = await fetch(`/api/forms/${formId}/charge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gatewayId: 'eway', amount, currency, customer: { name: 'Customer' } }) });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.checkoutUrl) { onChange({ status: 'pending_redirect', amount, currency, gatewayId: 'eway', transactionId: data.transactionId, checkoutUrl: data.checkoutUrl } as EwayValue); window.location.href = data.checkoutUrl; }
      else { setErrorMsg(data.error || 'eWay payment initiation failed.'); }
    } catch (e: unknown) { setProcessing(false); setErrorMsg(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader gatewayId="eway" amount={amount} currency={currency} currencySymbol={currencySymbol} testMode={testMode || !canGoLive} label={label} />
      {!testMode && !canGoLive && (<div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2"><AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" /><p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">Live mode requires <strong>eWay API Key and Password</strong>.</p></div>)}
      {errorMsg && <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1"><AlertCircle className="size-3" /> {errorMsg}</p>}
      <Button type="button" disabled={disabled || processing} onClick={handlePay} className="w-full h-10 bg-[#FF6B00] hover:bg-[#E55F00] text-white font-bold text-xs rounded-xl gap-1.5">{processing ? <Loader2 className="size-4 animate-spin" /> : <><Lock className="size-3.5" /> Pay {amount.toFixed(2)} {currency}</>}</Button>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> Rapid API</span><span className="font-mono">eWay</span></div>
    </div>
  );
}
export default Eway;
