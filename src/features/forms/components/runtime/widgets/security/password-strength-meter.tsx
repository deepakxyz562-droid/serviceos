'use client';

import React, { useMemo, useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface PasswordValue {
  password: string;
  score: number;
  level: 'weak' | 'fair' | 'good' | 'strong';
  passedChecks: string[];
}

const CHECKS = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'lower', label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { id: 'upper', label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'digit', label: 'Number', test: (p: string) => /\d/.test(p) },
  { id: 'symbol', label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function scorePassword(p: string): { score: number; level: PasswordValue['level'] } {
  if (!p) return { score: 0, level: 'weak' };
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (/(.)\1{2,}/.test(p)) score--; // sequences like aaa
  score = Math.max(0, Math.min(5, score));
  const level = score <= 1 ? 'weak' : score <= 2 ? 'fair' : score <= 3 ? 'good' : 'strong';
  return { score, level };
}

export function PasswordStrengthMeter({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Password');
  const minLength = Math.max(4, num(config.minLength, 8));
  const requireSpecial = bool(config.requireSpecial, true);
  const requireNumber = bool(config.requireNumber, true);
  const requireCase = bool(config.requireCase, true);
  const placeholder = str(config.placeholder, 'Enter password');

  const v: PasswordValue =
    value && typeof value === 'object' ? (value as PasswordValue) : { password: '', score: 0, level: 'weak', passedChecks: [] };

  const password = v.password ?? '';
  const [show, setShow] = useState(false);

  const activeChecks = useMemo(() => {
    return CHECKS.filter((c) => {
      if (c.id === 'symbol' && !requireSpecial) return false;
      if (c.id === 'digit' && !requireNumber) return false;
      if ((c.id === 'lower' || c.id === 'upper') && !requireCase) return false;
      if (c.id === 'length') return c.test(password) && password.length >= minLength;
      return c.test(password);
    });
  }, [password, minLength, requireSpecial, requireNumber, requireCase]);

  const { score, level } = scorePassword(password);
  const passedChecks = activeChecks.filter((c) => c.test(password)).map((c) => c.id);

  const commit = (pw: string) => {
    const { score: s, level: l } = scorePassword(pw);
    onChange({ password: pw, score: s, level: l, passedChecks: activeChecks.filter((c) => c.test(pw)).map((c) => c.id) });
  };

  const barColor =
    level === 'weak' ? 'bg-red-500' : level === 'fair' ? 'bg-amber-500' : level === 'good' ? 'bg-blue-500' : 'bg-emerald-500';

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="relative">
        <Lock className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
        <Input
          type={show ? 'text' : 'password'}
          value={password}
          onChange={(e) => commit(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="text-xs h-9 pl-8 pr-9"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
      </div>

      {password && (
        <>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i < score ? barColor : 'bg-muted',
                )}
                aria-hidden="true"
              />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Strength</span>
            <Badge
              variant="outline"
              className={cn(
                'text-[9px] gap-1',
                level === 'weak' && 'text-red-600',
                level === 'fair' && 'text-amber-600',
                level === 'good' && 'text-blue-600',
                level === 'strong' && 'text-emerald-600',
              )}
            >
              <ShieldCheck className="size-2.5" />
              {level.toUpperCase()}
            </Badge>
          </div>

          <ul className="grid grid-cols-1 gap-0.5 pt-1">
            {activeChecks.map((c) => {
              const passed = c.test(password);
              return (
                <li
                  key={c.id}
                  className={cn(
                    'flex items-center gap-1.5 text-[10px]',
                    passed ? 'text-emerald-600' : 'text-muted-foreground',
                  )}
                >
                  {passed ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <XCircle className="size-3 opacity-50" />
                  )}
                  {c.label}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export default PasswordStrengthMeter;
