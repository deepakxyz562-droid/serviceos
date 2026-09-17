'use client';

import React, { useState } from 'react';
import { ShoppingCart, Mail, CheckCircle2, Clock, AlertCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';

interface RecoveryValue {
  email: string;
  cartId: string;
  itemCount: number;
  cartValue: number;
  status: 'captured' | 'reminder_scheduled' | 'completed';
  reminderScheduledAt?: string;
  timestamp: string;
}

export function AbandonedCartRecovery({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Abandoned cart recovery');
  const cartId = str(config.cartId, `cart_${Math.random().toString(36).slice(2, 10)}`);
  const itemCount = num(config.itemCount, 0);
  const cartValue = num(config.cartValue, 0);
  const reminderDelayHours = num(config.reminderDelayHours, 2);
  const currency = str(config.currency, 'USD');
  const requireOptIn = bool(config.requireOptIn, true);
  const showCartPreview = bool(config.showCartPreview, true);

  const existing: RecoveryValue | undefined = value && typeof value === 'object' ? (value as RecoveryValue) : undefined;
  const [email, setEmail] = useState(existing?.email ?? '');
  const [optIn, setOptIn] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSave = () => {
    if (disabled) return;
    setError('');
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setError('Enter a valid email address.');
      return;
    }
    if (requireOptIn && !optIn) {
      setError('Please opt in to receive cart reminders.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const when = new Date(Date.now() + reminderDelayHours * 3600_000);
      const out: RecoveryValue = {
        email: e,
        cartId,
        itemCount,
        cartValue,
        status: 'reminder_scheduled',
        reminderScheduledAt: when.toISOString(),
        timestamp: new Date().toISOString(),
      };
      onChange(out);
      setSubmitting(false);
    }, 450);
  };

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <ShoppingCart className="size-4 text-orange-600" />
        <span className="text-xs font-bold">Don&apos;t lose your cart</span>
        {itemCount > 0 && (
          <Badge variant="outline" className="ml-auto text-[9px] gap-1">
            {itemCount} item{itemCount !== 1 ? 's' : ''} · {cartValue.toFixed(2)} {currency}
          </Badge>
        )}
      </div>

      {showCartPreview && existing?.status === 'reminder_scheduled' ? (
        <div className="rounded-lg border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="size-3.5" /> Cart saved
          </div>
          <p className="text-muted-foreground">
            Reminder scheduled for <span className="font-mono">
              {existing.reminderScheduledAt ? new Date(existing.reminderScheduledAt).toLocaleString() : 'soon'}
            </span>.
          </p>
          <p className="text-[10px] text-muted-foreground">Cart ID: <span className="font-mono">{existing.cartId}</span></p>
        </div>
      ) : (
        <>
          <div className="rounded-md border border-orange-200 dark:border-orange-900/60 bg-orange-50/60 dark:bg-orange-950/20 p-2 text-[11px] text-orange-800 dark:text-orange-300 flex items-start gap-1.5">
            <Clock className="size-3.5 mt-0.5 shrink-0" />
            <span>Enter your email and we&apos;ll send you a reminder link to complete your purchase.</span>
          </div>

          <Input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            disabled={disabled || submitting}
            placeholder="you@example.com"
            className="h-9 text-xs"
            aria-label="Email address for cart reminder"
          />

          {requireOptIn && (
            <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={optIn}
                onChange={(e) => { setOptIn(e.target.checked); setError(''); }}
                disabled={disabled || submitting}
                className="mt-0.5"
              />
              <span>Send me a reminder and a one-time recovery discount code.</span>
            </label>
          )}

          {error && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="size-3" /> {error}</p>}

          <Button
            type="button"
            disabled={disabled || submitting || !email.trim()}
            onClick={handleSave}
            className="w-full h-9 text-xs gap-1 bg-orange-600 hover:bg-orange-700"
          >
            {submitting ? 'Saving…' : <><Send className="size-3" /> Save my cart</>}
          </Button>
        </>
      )}
    </div>
  );
}

export default AbandonedCartRecovery;
