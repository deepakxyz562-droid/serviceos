'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import type { WidgetProps } from '../widget-props';

/**
 * HIPAA PHI Field — encrypted Protected Health Information input.
 * UI-only: shows a Lock icon + "Encrypted" badge. Actual encryption is server-side.
 * Produces: string (the entered value; server encrypts on save).
 */
export function HipaaPhiField({ value, onChange, config, disabled, field }: WidgetProps) {
  const [show, setShow] = useState(false);
  const label = String(field?.label || 'PHI Field');
  const placeholder = String(config.placeholder ?? 'Enter sensitive health data...');
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold flex items-center gap-1">
          <Lock className="size-3 text-emerald-600" />
          {label}
        </Label>
        <Badge variant="outline" className="text-[9px] gap-0.5 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
          <ShieldCheck className="size-2.5" /> Encrypted
        </Badge>
      </div>
      <div className="relative">
        <Input
          type={show ? 'text' : 'password'}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={label}
          className="pr-9 text-xs font-mono"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={show ? 'Hide value' : 'Show value'}
        >
          {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        🔒 Protected Health Information — encrypted at rest per HIPAA §164.312(a)(2)(iv).
      </p>
    </div>
  );
}

export default HipaaPhiField;
