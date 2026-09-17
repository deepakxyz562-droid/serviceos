'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num } from '../widget-props';

interface Rule {
  label: string;
  test: (v: string) => boolean;
  weight: number;
}

const RULES: Rule[] = [
  { label: '8+ characters', test: (v) => v.length >= 8, weight: 1 },
  { label: 'Uppercase letter', test: (v) => /[A-Z]/.test(v), weight: 1 },
  { label: 'Lowercase letter', test: (v) => /[a-z]/.test(v), weight: 1 },
  { label: 'Number', test: (v) => /\d/.test(v), weight: 1 },
  { label: 'Special character', test: (v) => /[^A-Za-z0-9]/.test(v), weight: 1 },
];

export function Password({ value, onChange, config, disabled, field }: WidgetProps) {
  const val = str(value, '');
  const placeholder = str(config.placeholder, '••••••••');
  const minLength = Math.max(1, num(config.minLength, 8));
  const showStrength = config.showStrength !== false;
  const ariaLabel = str(field?.label, 'Password');
  const [show, setShow] = React.useState(false);

  const passed = RULES.filter((r) => r.test(val));
  const score = val.length === 0 ? 0 : Math.min(100, (passed.length / RULES.length) * 100 + (val.length >= minLength ? 0 : -25));
  const strengthLabel =
    score >= 90 ? 'Strong' : score >= 60 ? 'Good' : score >= 30 ? 'Fair' : val.length > 0 ? 'Weak' : '';
  const strengthColor =
    score >= 90 ? 'bg-emerald-500' : score >= 60 ? 'bg-blue-500' : score >= 30 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          type={show ? 'text' : 'password'}
          value={val}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          minLength={minLength}
          aria-label={ariaLabel}
          autoComplete="new-password"
          className="pr-12"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? 'HIDE' : 'SHOW'}
        </button>
      </div>
      {showStrength && val && (
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className={`h-full transition-all ${strengthColor}`} style={{ width: `${Math.max(8, score)}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{strengthLabel}</span>
            <span>{val.length} chars</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Password;
