'use client';

/**
 * PaymentGatewayHeader — shared header for dedicated payment widgets.
 *
 * Renders the gateway's real SVG logo (from the registry) + gateway name +
 * amount + test-mode banner. Replaces the "colored square with initial"
 * placeholder pattern in the dedicated widgets.
 */
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { getPaymentGatewayById } from '@/lib/forms/payments/payment-gateways-registry';

interface Props {
  gatewayId: string;
  amount: number;
  currency: string;
  currencySymbol: string;
  testMode: boolean;
  label?: string;
}

export function PaymentGatewayHeader({ gatewayId, amount, currency, currencySymbol, testMode, label }: Props) {
  const gateway = getPaymentGatewayById(gatewayId);
  const displayName = label || gateway?.name || gatewayId;

  return (
    <>
      {/* Test Mode honesty banner */}
      {testMode && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2 mb-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-800 dark:text-amber-300 font-medium leading-tight">
            <strong>Test Mode</strong> — simulated payment. No real charge will be made.
            Switch to Live mode in the inspector to accept real payments.
          </p>
        </div>
      )}

      {/* Header with real SVG logo */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          {gateway?.iconSvg ? (
            <div
              className="size-7 rounded-md flex items-center justify-center p-1 shrink-0 shadow-xs"
              style={{ backgroundColor: gateway.logoBg || '#334155' }}
              dangerouslySetInnerHTML={{ __html: gateway.iconSvg }}
            />
          ) : (
            <div
              className="size-7 rounded-md flex items-center justify-center shrink-0 text-white text-xs font-black"
              style={{ backgroundColor: gateway?.brandColor || '#334155' }}
            >
              {displayName.charAt(0)}
            </div>
          )}
          <div>
            <div className="text-xs font-bold text-foreground">{displayName}</div>
            {gateway?.description && (
              <div className="text-[10px] text-muted-foreground line-clamp-1">{gateway.description}</div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[9px] text-muted-foreground uppercase font-semibold">Total</span>
          <p className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
            {currencySymbol}{amount.toFixed(2)} <span className="text-[9px] text-muted-foreground font-normal">{currency}</span>
          </p>
        </div>
      </div>
    </>
  );
}

export default PaymentGatewayHeader;
