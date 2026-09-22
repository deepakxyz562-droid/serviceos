'use client';

/**
 * Authorize.Net — REAL Accept.js integration (PCI-compliant).
 *
 * Uses Authorize.Net's AcceptUI hosted card form. The user clicks "Pay" and
 * Authorize.Net opens a secure iframe where the customer enters their card
 * details. The card number never touches our form — Accept.js returns an
 * opaque data token (dataDescriptor + dataValue) that we send to the backend
 * /api/forms/[id]/charge endpoint.
 *
 * The backend uses the user's apiLoginId + transactionKey (from widgetConfig,
 * encrypted, OR from PaymentGatewayConfig for CRM users) to call Authorize.Net's
 * createTransactionRequest API with the opaque token.
 *
 * When testMode is on (or apiLoginId/clientKey are not set), shows a clear
 * warning banner explaining that real card fields will be hosted by Accept.js.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Lock, ShieldCheck, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface AuthorizeNetValue {
  status: 'idle' | 'processing' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  last4?: string;
  dataDescriptor?: string;
  dataValue?: string;
  simulated?: boolean;
  errorMessage?: string;
}

interface AcceptUIResponse {
  messages: {
    resultCode: 'Ok' | 'Error';
    message?: Array<{ code: string; text: string }>;
  };
  opaqueData?: {
    dataDescriptor: string;
    dataValue: string;
  };
}

// AcceptUI is loaded via a script tag and calls a global handler function
// when the user submits the card form. We register the handler on window.
declare global {
  interface Window {
    // The AcceptUI library triggers a global function whose name matches the
    // data-responseHandler attribute on the AcceptUI button container.
    // We set this dynamically in the useEffect below.
    [key: `__authnet_handler_${string}`]: (response: AcceptUIResponse) => void;
  }
}

export function AuthorizeNet({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const apiLoginId = String(config.apiLoginId ?? '');
  const clientKey = String(config.clientKey ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Authorize.Net');
  const [sdkReady, setSdkReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Unique handler id so multiple Authorize.Net widgets on the same page
  // don't collide.
  const [handlerId] = useState(() => `authnet_${Math.random().toString(36).slice(2, 10)}`);

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const canGoLive = !testMode && Boolean(apiLoginId) && Boolean(clientKey) && Boolean(formId);

  // Handler called by AcceptUI when the user submits the card form.
  // Receives the opaque data token and forwards it to the backend.
  // Declared BEFORE the useEffect that registers it on window so the
  // reference is stable.
  const handleAcceptResponse = useCallback(async (response: AcceptUIResponse) => {
    if (response.messages.resultCode !== 'Ok' || !response.opaqueData) {
      const msg = response.messages.message?.[0]?.text || 'Accept.js tokenization failed.';
      setErrorMsg(msg);
      setProcessing(false);
      onChange({
        status: 'error', amount, currency, gatewayId: 'authorize_net',
        errorMessage: msg,
      } as AuthorizeNetValue);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'authorize_net',
          amount, currency,
          paymentMethodId: `${response.opaqueData.dataDescriptor}:${response.opaqueData.dataValue}`,
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success) {
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'authorize_net',
          transactionId: data.transactionId,
          dataDescriptor: response.opaqueData.dataDescriptor,
          dataValue: response.opaqueData.dataValue,
        } as AuthorizeNetValue);
      } else {
        setErrorMsg(data.error || 'Payment failed.');
        onChange({
          status: 'error', amount, currency, gatewayId: 'authorize_net',
          errorMessage: data.error,
        } as AuthorizeNetValue);
      }
    } catch (e: unknown) {
      setProcessing(false);
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
    }
  }, [amount, currency, formId, onChange]);

  // Load Authorize.Net Accept.js SDK.
  useEffect(() => {
    if (!canGoLive || typeof window === 'undefined') return;

    // Register the response handler on window. AcceptUI calls this function
    // with the opaque data token after the user submits the card form.
    (window as unknown as Record<string, unknown>)[`__authnet_handler_${handlerId}`] = (
      response: AcceptUIResponse,
    ) => {
      void handleAcceptResponse(response);
    };

    if ((window as unknown as { Accept?: unknown }).Accept) {
      const id = window.setTimeout(() => setSdkReady(true), 0);
      return () => {
        window.clearTimeout(id);
        delete (window as unknown as Record<string, unknown>)[`__authnet_handler_${handlerId}`];
      };
    }
    const s = document.createElement('script');
    s.src = 'https://js.authorize.net/v1/Accept.js';
    s.async = true;
    s.onload = () => setSdkReady(true);
    s.onerror = () => setErrorMsg('Failed to load Authorize.Net Accept.js SDK.');
    document.body.appendChild(s);
    return () => {
      s.remove();
      delete (window as unknown as Record<string, unknown>)[`__authnet_handler_${handlerId}`];
    };
  }, [canGoLive, handlerId, handleAcceptResponse]);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    // Test mode — simulate.
    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'authorize_net',
          transactionId: `sim_authnet_${Date.now()}`,
          simulated: true,
        } as AuthorizeNetValue);
      }, 900);
      return;
    }

    if (!sdkReady) {
      setProcessing(false);
      setErrorMsg('Authorize.Net SDK not loaded yet. Please try again.');
      return;
    }

    // Trigger the AcceptUI form. AcceptUI looks for a button with the
    // AcceptUI class + data attributes. We simulate a click on it.
    const btn = document.querySelector<HTMLButtonElement>(`#authnet-btn-${handlerId}`);
    if (btn) {
      btn.click();
    } else {
      setProcessing(false);
      setErrorMsg('AcceptUI button not found.');
    }
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="authorize_net"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {/* PCI-DSS warning when in live mode without credentials */}
      {!testMode && (!apiLoginId || !clientKey) && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 p-2 flex items-start gap-2">
          <AlertTriangle className="size-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-rose-800 dark:text-rose-300 leading-tight">
            <strong>Live mode requires Authorize.Net API credentials</strong>
            (API Login ID + Client Key). Card details are NEVER collected by
            this form — they are tokenized directly by Authorize.Net&apos;s
            Accept.js SDK in the user&apos;s browser.
          </p>
        </div>
      )}

      {/* PCI-DSS reassurance */}
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-start gap-2">
        <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-tight">
          <strong>PCI-DSS Compliant.</strong> Card details are hosted by
          Authorize.Net&apos;s Accept.js in a secure iframe. The form and
          our backend never see the raw card number.
        </p>
      </div>

      {/* Test-mode or pre-SDK placeholder */}
      {(testMode || !canGoLive || !sdkReady) ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center space-y-1">
          <Lock className="size-5 mx-auto text-[#0C1E3C]" />
          <p className="text-xs font-semibold">
            {testMode
              ? 'Test mode: Accept.js hosted card form will load here when you switch to Live.'
              : !canGoLive
                ? 'Add Authorize.Net API credentials in the inspector to enable live payments.'
                : 'Loading Authorize.Net Accept.js…'}
          </p>
          <p className="text-[11px] text-muted-foreground">Amount: {amount.toFixed(2)} {currency}</p>
        </div>
      ) : (
        // AcceptUI hosted card form. The button is invisible — we trigger it
        // via .click() when the user clicks our visible "Pay" button below.
        // AcceptUI opens a secure iframe where the customer enters their card.
        <div className="rounded-xl border border-border bg-card p-3 min-h-[60px]">
          <button
            id={`authnet-btn-${handlerId}`}
            className="AcceptUI hidden"
            type="button"
            data-apiLoginID={apiLoginId}
            data-clientKey={clientKey}
            data-acceptUIFormBtnTxt="Pay"
            data-acceptUIFormHeaderTxt="Card Information"
            data-paymentOptions={`{"showCreditCard":true,"showBankAccount":false}`}
            data-responseHandler={`__authnet_handler_${handlerId}`}
            data-billingAddressOptions={`{"show":false,"required":false}`}
          >
            Pay
          </button>
          <p className="text-[10px] text-muted-foreground text-center">
            Click <strong>Pay {amount.toFixed(2)} {currency}</strong> below to open Authorize.Net&apos;s secure card form.
          </p>
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
        className="w-full h-10 bg-[#0C1E3C] hover:bg-[#08172b] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pay {amount.toFixed(2)} {currency}
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> Accept.js tokenized
        </span>
        <span className="font-mono">Authorize.Net</span>
      </div>
    </div>
  );
}

export default AuthorizeNet;
