'use client';

import React, { useEffect, useMemo } from 'react';
import { Calculator, Sparkles } from 'lucide-react';

interface FormCalculationProps {
  formula?: string; // e.g. "([q1] * [q2]) + 15"
  prefix?: string;
  suffix?: string;
  decimals?: number;
  allFormData?: Record<string, unknown>;
  value?: number;
  onChange: (calcValue: number) => void;
  disabled?: boolean;
}

export function FormCalculation({
  formula = '',
  prefix = '$',
  suffix = '',
  decimals = 2,
  allFormData = {},
  value = 0,
  onChange,
  disabled = false,
}: FormCalculationProps) {
  const calculatedResult = useMemo(() => {
    if (!formula.trim()) return 0;

    try {
      // Replace [field_id] with numerical value from allFormData
      let evalString = formula.replace(/\[([a-zA-Z0-9_-]+)\]/g, (_, fieldId) => {
        const val = allFormData[fieldId];
        const num = Number(val);
        return isNaN(num) ? '0' : String(num);
      });

      // Sanitize: allow only numbers, basic arithmetic operators, parentheses, whitespace
      evalString = evalString.replace(/[^0-9+\-*/().\s]/g, '');

      if (!evalString.trim()) return 0;

      // Safe mathematical evaluation
      const result = new Function(`return (${evalString});`)();
      const num = Number(result);
      return isNaN(num) || !isFinite(num) ? 0 : num;
    } catch {
      return 0;
    }
  }, [formula, allFormData]);

  useEffect(() => {
    if (calculatedResult !== value) {
      onChange(calculatedResult);
    }
  }, [calculatedResult, value, onChange]);

  return (
    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Calculator className="size-4 text-emerald-600" />
        <span>Calculated Total</span>
      </div>
      <div className="text-right">
        <span className="text-base font-black text-foreground">
          {prefix}
          {calculatedResult.toFixed(decimals)}
          {suffix}
        </span>
      </div>
    </div>
  );
}
