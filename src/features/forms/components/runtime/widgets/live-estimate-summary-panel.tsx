'use client';

import React, { useMemo } from 'react';
import { Calculator, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface LiveEstimateLineItem {
  id: string;
  label: string;
  fieldId?: string;
  format?: 'text' | 'currency' | 'number' | 'date_diff';
  unit?: string;
  fallback?: string;
}

export interface LiveEstimateSummaryPanelProps {
  headline?: string;
  subheadline?: string;
  badgeText?: string;
  formula?: string;
  currency?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  lineItems?: LiveEstimateLineItem[];
  allFormData?: Record<string, unknown>;
  fields?: Array<{ id: string; label: string; type?: string }>;
  onContinue?: () => void;
  continueText?: string;
  className?: string;
}

function resolveFieldDisplay(
  fieldId: string | undefined,
  format: LiveEstimateLineItem['format'],
  unit: string | undefined,
  fallback: string | undefined,
  allFormData: Record<string, unknown>,
  fields: Array<{ id: string; label: string }> = []
): string {
  if (!fieldId) return fallback || '—';
  const val = allFormData[fieldId];
  if (val === undefined || val === null || val === '') return fallback || 'Not selected';

  if (Array.isArray(val)) {
    if (val.length === 0) return fallback || 'None';
    return val
      .map((v) => (typeof v === 'object' && v !== null ? (v as any).label || (v as any).value : String(v)))
      .join(', ');
  }

  if (typeof val === 'boolean') {
    return val ? 'Yes' : 'No';
  }

  if (format === 'currency') {
    const num = Number(val);
    return isNaN(num) ? String(val) : `$${num.toLocaleString()}`;
  }

  if (unit) {
    return `${val} ${unit}`;
  }

  return String(val);
}

export function LiveEstimateSummaryPanel({
  headline = 'LIVE ESTIMATE',
  subheadline = 'Based on current answers',
  badgeText = 'Instant Quote',
  formula = '0',
  currency = '$',
  prefix = '$',
  suffix = '',
  decimals = 0,
  lineItems = [],
  allFormData = {},
  fields = [],
  onContinue,
  continueText = 'Continue to booking',
  className = '',
}: LiveEstimateSummaryPanelProps) {
  // Evaluate grand total formula
  const calculatedTotal = useMemo(() => {
    if (!formula.trim()) return 0;
    try {
      let evalString = formula.replace(/\[([a-zA-Z0-9_.-]+)\]|\{\{([a-zA-Z0-9_.-]+)\}\}/g, (_, id1, id2) => {
        const fieldId = id1 || id2;
        const val = allFormData[fieldId];
        if (val === undefined || val === null || val === '') return '0';
        if (typeof val === 'number') return String(val);
        if (Array.isArray(val)) {
          const sum = val.reduce((acc, item) => {
            const match = String(item).match(/\$([0-9]+(?:\.[0-9]+)?)/);
            return acc + (match ? parseFloat(match[1]) : parseFloat(String(item)) || 0);
          }, 0);
          return String(sum);
        }
        const match = String(val).match(/\$([0-9]+(?:\.[0-9]+)?)/);
        if (match) return match[1];
        const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? '0' : String(num);
      });

      const sanitized = evalString.replace(/[^0-9+\-*/().,\sMath.roundmaxinabslorceq]/g, '');
      if (!sanitized.trim()) return 0;
      const result = new Function(`return (${sanitized});`)();
      const num = Number(result);
      return isNaN(num) || !isFinite(num) ? 0 : num;
    } catch {
      return 0;
    }
  }, [formula, allFormData]);

  // Default fallback line items if none configured
  const effectiveLineItems: LiveEstimateLineItem[] = useMemo(() => {
    if (lineItems.length > 0) return lineItems;
    // Auto-generate from first 4 fields
    return fields.slice(0, 4).map((f) => ({
      id: f.id,
      label: f.label || 'Question',
      fieldId: f.id,
    }));
  }, [lineItems, fields]);

  return (
    <div
      className={`rounded-3xl bg-slate-950 text-white p-6 md:p-8 flex flex-col justify-between shadow-2xl border border-slate-800 ${className}`}
    >
      <div className="space-y-6">
        {/* Header Tag */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
            {headline}
          </span>
          {badgeText && (
            <Badge className="bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 shadow-sm">
              {badgeText}
            </Badge>
          )}
        </div>

        {/* Hero Number */}
        <div className="space-y-1">
          <div className="text-4xl md:text-5xl font-black tracking-tight text-white flex items-baseline gap-1">
            <span>{prefix || currency}</span>
            <span>{calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>
            {suffix && <span className="text-lg font-medium text-slate-400">{suffix}</span>}
          </div>
          <p className="text-xs text-slate-400">{subheadline}</p>
        </div>

        {/* Itemized Line Items Table */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          {effectiveLineItems.map((item) => {
            const displayValue = resolveFieldDisplay(
              item.fieldId,
              item.format,
              item.unit,
              item.fallback,
              allFormData,
              fields
            );

            return (
              <div key={item.id || item.label} className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">{item.label}</span>
                <span className="font-semibold text-slate-200 text-right truncate max-w-[180px]">
                  {displayValue}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA / Booking Button */}
      {onContinue && (
        <div className="pt-6 mt-6 border-t border-slate-800/80">
          <Button
            type="button"
            onClick={onContinue}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl gap-2 shadow-lg transition-all"
          >
            <span>{continueText}</span>
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
