'use client';

import React from 'react';
import { Mail, CheckCircle2, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

const FREE_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'proton.me', 'live.com'];

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function Email({ value, onChange, config, disabled, field }: WidgetProps) {
  const val = typeof value === 'string' ? value : '';
  const placeholder = str(config.placeholder, 'name@example.com');
  const requireConfirmation = bool(config.confirmation, false);
  const blockFreeDomains = bool(config.blockFreeDomains, false);
  const ariaLabel = str(field?.label, 'Email');
  const [confirmValue, setConfirmValue] = React.useState('');

  const domain = val.split('@')[1]?.toLowerCase() ?? '';
  const matchesFree = blockFreeDomains && domain && FREE_DOMAINS.includes(domain);
  const valid = !val || isEmail(val);
  const matches = !requireConfirmation || !val || !confirmValue || val === confirmValue;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          type="email"
          inputMode="email"
          value={val}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={!valid || !!matchesFree}
          className={cn('pl-9', !valid && 'border-red-500', matchesFree && 'border-amber-500')}
        />
        {val && (
          <span className="absolute right-3 top-2.5">
            {valid && !matchesFree ? (
              <CheckCircle2 className="size-4 text-emerald-500" />
            ) : !valid ? (
              <XCircle className="size-4 text-red-500" />
            ) : null}
          </span>
        )}
      </div>
      {requireConfirmation && (
        <Input
          type="email"
          value={confirmValue}
          onChange={(e) => setConfirmValue(e.target.value)}
          placeholder="Confirm email..."
          disabled={disabled}
          aria-label={`${ariaLabel} confirmation`}
          className={cn(!matches && confirmValue && 'border-red-500')}
        />
      )}
      {matchesFree && (
        <p className="text-[11px] text-amber-600">Free email domains are not accepted.</p>
      )}
      {!valid && val && (
        <p className="text-[11px] text-red-500">Please enter a valid email address.</p>
      )}
      {!matches && confirmValue && (
        <p className="text-[11px] text-red-500">Email addresses do not match.</p>
      )}
    </div>
  );
}

export default Email;
