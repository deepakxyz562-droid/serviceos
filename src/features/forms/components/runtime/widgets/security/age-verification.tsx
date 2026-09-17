'use client';

import React, { useState } from 'react';
import { format, parseISO, isValid, differenceInCalendarYears } from 'date-fns';
import { Calendar, Cake, ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface AgeValue {
  confirmed: boolean;
  dateOfBirth?: string;
  age?: number;
  meetsMinimum: boolean;
  minimumAge: number;
  timestamp?: string;
}

export function AgeVerification({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Age verification');
  const minAge = Math.max(1, num(config.minimumAge, 21));
  const requireDob = bool(config.requireDateOfBirth, true);
  const confirmationText = str(
    config.confirmationText,
    `I confirm that I am at least ${minAge} years of age.`,
  );

  const v: AgeValue = value && typeof value === 'object' ? (value as AgeValue) : { confirmed: false, meetsMinimum: false, minimumAge: minAge };
  const [open, setOpen] = useState(false);

  const dobDate = v.dateOfBirth ? parseISO(v.dateOfBirth) : undefined;
  const age = (() => {
    if (!dobDate || !isValid(dobDate)) return null;
    return differenceInCalendarYears(new Date(), dobDate);
  })();
  const meets = age != null && age >= minAge;

  const patch = (p: Partial<AgeValue>) => {
    const next: AgeValue = {
      ...v,
      minimumAge: minAge,
      ...p,
    };
    if (next.dateOfBirth) {
      const d = parseISO(next.dateOfBirth);
      if (isValid(d)) {
        const a = differenceInCalendarYears(new Date(), d);
        next.age = a;
        next.meetsMinimum = a >= minAge;
      }
    }
    if (p.confirmed === true) next.timestamp = new Date().toISOString();
    onChange(next);
  };

  const setConfirmed = (checked: boolean) => {
    if (!checked) {
      patch({ confirmed: false, timestamp: undefined });
      return;
    }
    if (requireDob && !meets) return; // cannot confirm without valid DOB
    patch({ confirmed: true });
  };

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <ShieldCheck className="size-3.5 text-primary" />
          Age verification — must be {minAge}+
        </div>

        {requireDob && (
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <Cake className="size-3" /> Date of birth
            </label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  className="w-full justify-start text-xs h-9"
                  aria-label="Date of birth"
                >
                  <Calendar className="size-3.5 mr-1.5" />
                  {dobDate && isValid(dobDate) ? format(dobDate, 'MMM d, yyyy') : 'Pick your birthdate'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarUI
                  mode="single"
                  selected={dobDate}
                  disabled={(d) => d > new Date()}
                  onSelect={(d) => {
                    if (d) patch({ dateOfBirth: format(d, 'yyyy-MM-dd') });
                    setOpen(false);
                  }}
                  initialFocus
                  captionLayout="dropdown-buttons"
                  fromYear={1900}
                  toYear={new Date().getFullYear() - 12}
                />
              </PopoverContent>
            </Popover>
            {age != null && (
              <p
                className={cn(
                  'text-[10px] mt-1 flex items-center gap-1',
                  meets ? 'text-emerald-600' : 'text-red-600',
                )}
              >
                {meets ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                {meets ? `Verified: ${age} years old` : `Too young — age ${age}, must be ${minAge}+`}
              </p>
            )}
          </div>
        )}

        <div className="flex items-start gap-2 pt-1 border-t border-border/60">
          <Checkbox
            id={`age-${str(field?.id, 'field')}`}
            checked={v.confirmed}
            disabled={disabled || (requireDob && !meets)}
            onCheckedChange={(c) => setConfirmed(c === true)}
            className="mt-0.5"
          />
          <label
            htmlFor={`age-${str(field?.id, 'field')}`}
            className="text-[11px] text-muted-foreground cursor-pointer"
          >
            {confirmationText}
          </label>
        </div>

        {v.confirmed ? (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            Age confirmed{v.timestamp ? ` at ${new Date(v.timestamp).toLocaleString()}` : ''}.
          </div>
        ) : requireDob && dobDate && !meets ? (
          <p className="text-[11px] text-amber-600 flex items-center gap-1">
            <AlertTriangle className="size-3.5" /> You must be {minAge} or older to continue.
          </p>
        ) : null}
      </div>

      <Badge variant="outline" className="text-[9px] gap-1">
        <ShieldCheck className="size-2.5" /> Min age: {minAge}+ {requireDob ? '· DOB required' : '· checkbox only'}
      </Badge>
    </div>
  );
}

export default AgeVerification;
