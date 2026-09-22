'use client';

import React, { useEffect, useMemo } from 'react';
import { Calculator } from 'lucide-react';

interface FormCalculationProps {
  formula?: string; // e.g. "([checkout] - [checkin]) * ([optionals] + 50)"
  prefix?: string;
  suffix?: string;
  decimals?: number;
  allFormData?: Record<string, unknown>;
  value?: number;
  onChange: (calcValue: number) => void;
  disabled?: boolean;
}

/**
 * Parses a value into a numerical score.
 * Handles:
 *  - Raw numbers: 45 -> 45
 *  - Date strings: "2021-08-19" -> timestamp in days
 *  - Checkbox arrays: ['Parking - $10', 'Breakfast - $20'] -> 30
 *  - Price strings: "$50", "120 sq ft" -> 50, 120
 */
function parseFieldToNumber(val: unknown): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'boolean') return val ? 1 : 0;

  // 1. Array of values (e.g. Multi-select Checkboxes)
  if (Array.isArray(val)) {
    return val.reduce((acc, item) => acc + parseFieldToNumber(item), 0);
  }

  const str = String(val).trim();
  if (str.toLowerCase() === 'true') return 1;
  if (str.toLowerCase() === 'false') return 0;

  // 2. Date String (YYYY-MM-DD or MM/DD/YYYY)
  const isDatePattern = /^\d{4}-\d{2}-\d{2}$|^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str);
  if (isDatePattern) {
    const timestamp = Date.parse(str);
    if (!isNaN(timestamp)) {
      // Return total whole days from epoch
      return Math.floor(timestamp / (1000 * 60 * 60 * 24));
    }
  }

  // 3. String containing dollar/currency amount e.g. "Parking - $10" or "Premium ($50.00)"
  const priceMatch = str.match(/[\$£€]([0-9]+(?:\.[0-9]+)?)/);
  if (priceMatch && priceMatch[1]) {
    const num = parseFloat(priceMatch[1]);
    if (!isNaN(num)) return num;
  }

  // 4. Standard string number e.g. "45.5" or "120 sq ft"
  const rawNum = parseFloat(str.replace(/[^0-9.-]/g, ''));
  return isNaN(rawNum) ? 0 : rawNum;
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
      // 1. Replace [field_id] and {{field_id}} tokens with resolved numerical values
      let evalString = formula.replace(/\[([a-zA-Z0-9_.-]+)\]|\{\{([a-zA-Z0-9_.-]+)\}\}/g, (_, id1, id2) => {
        const fieldId = id1 || id2;
        const val = allFormData[fieldId];
        const num = parseFieldToNumber(val);
        return String(num);
      });

      // 2. Allow standard Math functions: Math.round, Math.max, Math.min, Math.abs, Math.floor, Math.ceil, Math.sqrt
      evalString = evalString
        .replace(/round\(/g, 'Math.round(')
        .replace(/max\(/g, 'Math.max(')
        .replace(/min\(/g, 'Math.min(')
        .replace(/abs\(/g, 'Math.abs(')
        .replace(/floor\(/g, 'Math.floor(')
        .replace(/ceil\(/g, 'Math.ceil(')
        .replace(/sqrt\(/g, 'Math.sqrt(');

      // 3. Sanitize: allow numbers, operators, parentheses, commas, ternary, comparison, and Math.*
      const sanitized = evalString.replace(/[^0-9+\-*/%().,\s?:!=><&|Math.roundmaxinabslorceq]/g, '');

      if (!sanitized.trim()) return 0;

      // 4. Safe mathematical evaluation
      const result = new Function(`"use strict"; return (${sanitized});`)();
      const num = Number(result);
      return isNaN(num) || !isFinite(num) ? 0 : num;
    } catch {
      return 0;
    }
  }, [formula, allFormData]);

  const lastEmittedRef = React.useRef<number | undefined>(undefined);
  const onChangeRef = React.useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (lastEmittedRef.current !== calculatedResult) {
      lastEmittedRef.current = calculatedResult;
      if (typeof onChangeRef.current === 'function') {
        onChangeRef.current(calculatedResult);
      }
    }
  }, [calculatedResult]);

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
