'use client';

import React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import {
  CalendarCheck,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  XCircle,
  RotateCcw,
  CalendarX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str } from '../widget-props';
import { cn } from '@/lib/utils';

type Status = 'pending' | 'confirmed' | 'cancelled';

interface ConfirmationValue {
  date?: string;
  timeSlot?: string;
  resource?: string;
  attendeeName?: string;
  location?: string;
  status: Status;
  confirmedAt?: string;
  cancelledAt?: string;
}

export function AppointmentConfirmation({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Appointment confirmation');
  const summaryLabel = str(config.summaryLabel, 'Appointment summary');

  const v: ConfirmationValue = value && typeof value === 'object' ? (value as ConfirmationValue) : { status: 'pending' };
  const status: Status = v.status ?? 'pending';

  const startDate = v.date ? parseISO(v.date) : undefined;

  const setStatus = (next: Status) => {
    if (disabled) return;
    const patch: Partial<ConfirmationValue> = { status: next };
    if (next === 'confirmed') patch.confirmedAt = new Date().toISOString();
    if (next === 'cancelled') patch.cancelledAt = new Date().toISOString();
    onChange({ ...v, ...patch });
  };

  const isConfigured = v.date || v.timeSlot || v.resource || v.attendeeName;

  if (!isConfigured && status === 'pending') {
    return (
      <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground flex items-center gap-2" aria-label={ariaLabel}>
        <CalendarX className="size-4" />
        No appointment details to confirm yet.
      </div>
    );
  }

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className={cn(
        'rounded-lg border p-3 space-y-2',
        status === 'confirmed' && 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30',
        status === 'cancelled' && 'border-red-200 bg-red-50 dark:bg-red-950/30',
        status === 'pending' && 'border-amber-200 bg-amber-50 dark:bg-amber-950/30',
      )}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold flex items-center gap-1.5">
            <CalendarCheck className="size-4" /> {summaryLabel}
          </span>
          {status === 'confirmed' && (
            <Badge variant="default" className="bg-emerald-600 gap-1">
              <CheckCircle2 className="size-3" /> Confirmed
            </Badge>
          )}
          {status === 'cancelled' && (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="size-3" /> Cancelled
            </Badge>
          )}
          {status === 'pending' && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="size-3" /> Pending
            </Badge>
          )}
        </div>

        <dl className="space-y-1 text-[11px]">
          {v.date && (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground flex items-center gap-1"><CalendarCheck className="size-3" /> Date</dt>
              <dd className="font-semibold">{startDate && isValid(startDate) ? format(startDate, 'EEE, MMM d, yyyy') : v.date}</dd>
            </div>
          )}
          {v.timeSlot && (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground flex items-center gap-1"><Clock className="size-3" /> Time</dt>
              <dd className="font-semibold">{v.timeSlot}</dd>
            </div>
          )}
          {v.resource && (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground flex items-center gap-1"><MapPin className="size-3" /> Resource</dt>
              <dd className="font-semibold">{v.resource}</dd>
            </div>
          )}
          {v.location && (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground flex items-center gap-1"><MapPin className="size-3" /> Location</dt>
              <dd className="font-semibold">{v.location}</dd>
            </div>
          )}
          {v.attendeeName && (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground flex items-center gap-1"><User className="size-3" /> Attendee</dt>
              <dd className="font-semibold">{v.attendeeName}</dd>
            </div>
          )}
        </dl>

        {status === 'confirmed' && v.confirmedAt && (
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 pt-1 border-t border-emerald-200/50">
            <CheckCircle2 className="size-3" /> Confirmed at {new Date(v.confirmedAt).toLocaleString()}
          </p>
        )}
        {status === 'cancelled' && v.cancelledAt && (
          <p className="text-[10px] text-red-700 dark:text-red-400 flex items-center gap-1 pt-1 border-t border-red-200/50">
            <XCircle className="size-3" /> Cancelled at {new Date(v.cancelledAt).toLocaleString()}
          </p>
        )}
      </div>

      {status === 'pending' && !disabled && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setStatus('confirmed')}
          >
            <CheckCircle2 className="size-3.5" /> Confirm
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-xs h-9 gap-1.5 text-destructive hover:text-destructive"
            onClick={() => setStatus('cancelled')}
          >
            <XCircle className="size-3.5" /> Cancel
          </Button>
        </div>
      )}

      {status !== 'pending' && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs h-7 w-full gap-1.5"
          onClick={() => setStatus('pending')}
        >
          <RotateCcw className="size-3" /> Reset
        </Button>
      )}
    </div>
  );
}

export default AppointmentConfirmation;
