'use client';

import React, { useState } from 'react';
import { Mail, Newspaper, Gift, Sparkles, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

type Segment = 'newsletter' | 'promo' | 'both';

interface SignupValue {
  email: string;
  segment: Segment;
  subscribed: boolean;
  listId?: string;
  confirmedAt?: string;
  timestamp?: string;
}

const SEGMENTS: Array<{ id: Segment; label: string; description: string; icon: React.ReactNode }> = [
  { id: 'newsletter', label: 'Newsletter', description: 'Weekly product updates', icon: <Newspaper className="size-3.5" /> },
  { id: 'promo', label: 'Promos', description: 'Deals & discounts only', icon: <Gift className="size-3.5" /> },
  { id: 'both', label: 'Both', description: 'Everything — full inbox', icon: <Sparkles className="size-3.5" /> },
];

export function EmailSignupSegment({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Email signup');
  const listId = str(config.listId, 'list_main');
  const buttonLabel = str(config.buttonLabel, 'Subscribe');
  const placeholder = str(config.placeholder, 'you@example.com');
  const showSegmentHelp = bool(config.showSegmentHelp, true);

  const existing: SignupValue | undefined = value && typeof value === 'object' ? (value as SignupValue) : undefined;
  const [email, setEmail] = useState(existing?.email ?? '');
  const [segment, setSegment] = useState<Segment>(existing?.segment ?? 'newsletter');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState<boolean>(existing?.subscribed ?? false);
  const [error, setError] = useState('');

  const handleSignup = () => {
    if (disabled) return;
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setError('Enter a valid email.');
      return;
    }
    setError(''); setLoading(true);
    setTimeout(() => {
      const out: SignupValue = {
        email: e,
        segment,
        subscribed: true,
        listId,
        confirmedAt: undefined,
        timestamp: new Date().toISOString(),
      };
      setSubscribed(true);
      onChange(out);
      setLoading(false);
    }, 500);
  };

  const handleUnsubscribe = () => {
    if (disabled) return;
    setSubscribed(false);
    setEmail('');
    onChange({ email: '', segment, subscribed: false, listId });
  };

  if (subscribed && existing?.subscribed) {
    return (
      <div className="rounded-lg border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 p-3 space-y-1.5 text-xs" aria-label={ariaLabel}>
        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
          <CheckCircle2 className="size-4" /> You&apos;re subscribed!
        </div>
        <p className="text-muted-foreground">Email: <span className="font-mono">{existing.email}</span></p>
        <p className="text-muted-foreground">
          Segment: <strong className="capitalize">{existing.segment}</strong>
          {existing.listId && <span className="text-[10px]"> · list {existing.listId}</span>}
        </p>
        {!disabled && (
          <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] mt-1" onClick={handleUnsubscribe}>
            Unsubscribe
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Mail className="size-4 text-indigo-600" />
        <span className="text-xs font-bold">Subscribe</span>
        {showSegmentHelp && (
          <Badge variant="outline" className="ml-auto text-[9px]">Pick what you want</Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {SEGMENTS.map((s) => {
          const chosen = segment === s.id;
          return (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              onClick={() => setSegment(s.id)}
              aria-pressed={chosen}
              aria-label={`Segment: ${s.label} — ${s.description}`}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-md border text-center transition-colors',
                chosen ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300' : 'border-border hover:bg-muted',
              )}
            >
              <span className={cn(chosen ? 'text-indigo-600' : 'text-muted-foreground')}>{s.icon}</span>
              <span className="text-[11px] font-semibold">{s.label}</span>
              <span className="text-[9px] text-muted-foreground leading-tight">{s.description}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          disabled={disabled || loading}
          placeholder={placeholder}
          className="h-9 text-xs"
          aria-label="Email address"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSignup(); } }}
        />
        <Button type="button" disabled={disabled || loading || !email.trim()} onClick={handleSignup} size="sm" className="h-9 text-xs gap-1">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <><ArrowRight className="size-3.5" /> {buttonLabel}</>}
        </Button>
      </div>

      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

export default EmailSignupSegment;
