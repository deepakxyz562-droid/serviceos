'use client';

/**
 * eCheck.Net — Direct electronic check / ACH payment via Authorize.Net.
 *
 * Renders a routing + account number form. When testMode is off, calls the
 * /api/forms/[id]/charge endpoint which creates an Authorize.Net eCheck
 * transaction. When testMode is on (or no apiLoginId is set), simulates.
 *
 * The PCI-compliant path is for the form to send the bank details directly
 * to Authorize.Net's Accept.js SDK which returns a token; the form then
 * submits only the token. We currently fall back to passing raw details
 * through the backend charge API — this should be replaced with Accept.js
 * tokenization before going fully live.
 */
import React, { useState } from 'react';
import { Building2, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface EcheckValue {
  status: 'idle' | 'processing' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  simulated?: boolean;
  last4?: string;
  errorMessage?: string;
}

export function EcheckNet({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 99);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const apiLoginId = String(config.apiLoginId ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'eCheck.Net');

  const [accountName, setAccountName] = useState('');
  const [routing, setRouting] = useState('');
  const [account, setAccount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const canGoLive = !testMode && Boolean(apiLoginId) && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    // Basic validation
    const digits = routing.replace(/\D/g, '');
    if (digits.length !== 9) {
      setErrorMsg('Routing number must be 9 digits.');
      setProcessing(false);
      return;
    }
    if (account.replace(/\D/g, '').length < 4) {
      setErrorMsg('Please enter a valid account number.');
      setProcessing(false);
      return;
    }

    // Test mode — simulate.
    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        const tx = `sim_echeck_${Date.now()}`;
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'echeck_net',
          transactionId: tx, simulated: true, last4: account.replace(/\D/g, '').slice(-4),
        } as EcheckValue);
      }, 800);
      return;
    }

    // Live mode — call backend.
    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'echeck_net',
          amount, currency,
          customer: { name: accountName },
          paymentMethodId: `echeck:${routing}:${account.slice(-4)}`,
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success) {
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'echeck_net',
          transactionId: data.transactionId, last4: account.replace(/\D/g, '').slice(-4),
        } as EcheckValue);
      } else {
        setErrorMsg(data.error || 'Payment failed.');
        onChange({ status: 'error', amount, currency, gatewayId: 'echeck_net', errorMessage: data.error } as EcheckValue);
      }
    } catch (e: unknown) {
      setProcessing(false);
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
    }
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="echeck_net"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {!testMode && !apiLoginId && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
            Live mode requires an <strong>Authorize.Net API Login ID</strong>.
            Add it in the inspector under <em>API Credentials</em>.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Account Holder Name</Label>
        <Input
          placeholder="Full Legal Name"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          disabled={disabled}
          className="h-8 text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold">Routing Number</Label>
          <Input
            placeholder="9-digit routing"
            value={routing}
            onChange={(e) => setRouting(e.target.value.replace(/\D/g, '').slice(0, 9))}
            disabled={disabled}
            className="h-8 text-xs font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold">Account Number</Label>
          <Input
            placeholder="Checking account"
            value={account}
            onChange={(e) => setAccount(e.target.value.replace(/\D/g, '').slice(0, 17))}
            disabled={disabled}
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>

      {errorMsg && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <AlertCircle className="size-3" /> {errorMsg}
        </p>
      )}

      <Button
        type="button"
        disabled={disabled || processing || !routing || !account}
        onClick={handlePay}
        className="w-full h-10 bg-[#2C3E50] hover:bg-[#1F2B3A] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Building2 className="size-3.5" /> Authorize Direct Debit ({currencySymbol}{amount.toFixed(2)})
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> ACH / Direct Debit
        </span>
        <span className="font-mono">eCheck.Net Secure</span>
      </div>
    </div>
  );
}

export default EcheckNet;
