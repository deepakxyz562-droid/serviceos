'use client';

import React, { useMemo, useState } from 'react';
import { Clock, Mail, UserPlus, Send, Loader2, CheckCircle2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num } from '../widget-props';

interface WaitlistValue {
  classId?: string;
  position?: number;
  signedUp?: boolean;
  signedUpAt?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export function WaitlistSignup({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Waitlist signup');
  const className = str(config.className, 'This class');
  const classId = str(config.classId, 'default-class');
  const ahead = num(config.alreadyOnWaitlist, 7);

  const v: WaitlistValue = value && typeof value === 'object' ? (value as WaitlistValue) : {};
  const [submitting, setSubmitting] = useState(false);

  const position = useMemo(() => (v.position ?? ahead + 1), [v.position, ahead]);

  const submit = () => {
    if (disabled || submitting) return;
    if (!v.name || !v.email) return;
    setSubmitting(true);
    // Mock: never makes a real network call in Phase 2.
    setTimeout(() => {
      setSubmitting(false);
      onChange({
        classId,
        position,
        signedUp: true,
        signedUpAt: new Date().toISOString(),
        name: v.name,
        email: v.email,
        phone: v.phone,
      });
    }, 600);
  };

  const patch = (p: Partial<WaitlistValue>) => onChange({ ...v, classId: v.classId ?? classId, ...p });

  if (v.signedUp) {
    return (
      <div className="space-y-2" aria-label={ariaLabel}>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-4" />
            You're on the waitlist!
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
            <Users className="size-3 inline mr-1" />
            Your position: <span className="font-black">#{position}</span>
            {v.signedUpAt && (
              <span className="ml-2 inline-flex items-center gap-1 opacity-75">
                <Clock className="size-3" /> {new Date(v.signedUpAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => onChange({})}
          >
            Remove me from waitlist
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-2 text-xs text-amber-800 dark:text-amber-300">
        <p className="font-semibold">{className} is currently full.</p>
        <p className="text-[10px] mt-0.5 opacity-80">
          Join the waitlist — {ahead} {ahead === 1 ? 'person is' : 'people are'} ahead of you.
        </p>
      </div>
      <Input
        placeholder="Full name"
        value={v.name ?? ''}
        onChange={(e) => patch({ name: e.target.value })}
        disabled={disabled || submitting}
        aria-label="Your name"
        className="text-xs h-9"
      />
      <div className="relative">
        <Mail className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
        <Input
          type="email"
          placeholder="Email address"
          value={v.email ?? ''}
          onChange={(e) => patch({ email: e.target.value })}
          disabled={disabled || submitting}
          aria-label="Email address"
          className="text-xs h-9 pl-8"
        />
      </div>
      <Input
        type="tel"
        placeholder="Phone (optional)"
        value={v.phone ?? ''}
        onChange={(e) => patch({ phone: e.target.value })}
        disabled={disabled || submitting}
        aria-label="Phone number"
        className="text-xs h-9"
      />
      <Button
        type="button"
        size="sm"
        className="w-full text-xs h-9 gap-1.5"
        onClick={submit}
        disabled={disabled || submitting || !v.name || !v.email}
      >
        {submitting ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <UserPlus className="size-3.5" />
        )}
        {submitting ? 'Adding…' : 'Add me to waitlist'}
      </Button>
      <Badge variant="outline" className="text-[9px] w-fit">
        <Send className="size-2.5 mr-1" /> We'll notify you if a seat opens up.
      </Badge>
    </div>
  );
}

export default WaitlistSignup;
