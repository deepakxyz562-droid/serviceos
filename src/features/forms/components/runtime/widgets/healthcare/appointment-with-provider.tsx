'use client';

import React, { useMemo, useState } from 'react';
import { addDays, format, startOfWeek, isSameDay, parseISO, isValid } from 'date-fns';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Stethoscope, Lock } from 'lucide-react';

interface ApptValue {
  providerId?: string;
  providerName?: string;
  date?: string; // yyyy-MM-dd
  time?: string;
  modality?: 'in-person' | 'telehealth';
}

const DEFAULT_PROVIDERS: { id: string; name: string; specialty?: string }[] = [
  { id: 'dr-lee', name: 'Dr. Sarah Lee', specialty: 'Family medicine' },
  { id: 'dr-patel', name: 'Dr. Raj Patel', specialty: 'Internal medicine' },
  { id: 'np-chen', name: 'NP Mia Chen', specialty: 'Nurse practitioner' },
  { id: 'dr-okoye', name: 'Dr. Adaeze Okoye', specialty: 'Pediatrics' },
];

const DEFAULT_TIMES = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];

export function AppointmentWithProvider({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Appointment with provider');
  const providers = Array.isArray(config.providers) && config.providers.length
    ? (config.providers as { id: string; name: string; specialty?: string }[])
    : DEFAULT_PROVIDERS;
  const times: string[] = Array.isArray(config.times) && config.times.length
    ? (config.times as string[])
    : DEFAULT_TIMES;
  const allowTelehealth = bool(config.allowTelehealth, true);
  const weeks = Math.max(1, num(config.weeks, 2));

  const v: ApptValue = value && typeof value === 'object' ? (value as ApptValue) : {};
  const [offset, setOffset] = useState(0);

  const days = useMemo(() => {
    const start = startOfWeek(addDays(new Date(), offset * 7), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let i = 0; i < weeks * 7; i++) out.push(addDays(start, i));
    return out;
  }, [offset, weeks]);

  const selectedDate = v.date && isValid(parseISO(v.date)) ? parseISO(v.date) : undefined;

  const pickProvider = (id: string) => {
    const p = providers.find((x) => x.id === id);
    onChange({ ...v, providerId: id, providerName: p?.name });
  };

  const pickDate = (d: Date) => {
    if (disabled) return;
    onChange({ ...v, date: format(d, 'yyyy-MM-dd'), time: '' });
  };

  const pickTime = (t: string) => {
    if (disabled) return;
    onChange({ ...v, time: t });
  };

  const setModality = (m: 'in-person' | 'telehealth') => onChange({ ...v, modality: m });

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Lock className="size-3 text-amber-600" />
        <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold uppercase tracking-wider">Encrypted PHI</span>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <Stethoscope className="size-3" /> Provider
        </label>
        <div className="space-y-1">
          {providers.map((p) => {
            const sel = v.providerId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => pickProvider(p.id)}
                aria-pressed={sel}
                className={cn(
                  'w-full flex items-center justify-between rounded-md border px-2 py-1.5 transition-colors',
                  sel ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted',
                )}
              >
                <div className="text-left">
                  <div className="text-xs font-semibold text-foreground">{p.name}</div>
                  {p.specialty && <div className="text-[10px] text-muted-foreground">{p.specialty}</div>}
                </div>
                {sel && <Badge variant="secondary" className="text-[9px] h-4">Selected</Badge>}
              </button>
            );
          })}
        </div>
      </div>

      {allowTelehealth && (
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground">Modality</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(['in-person', 'telehealth'] as const).map((m) => {
              const sel = (v.modality || 'in-person') === m;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={disabled}
                  onClick={() => setModality(m)}
                  aria-pressed={sel}
                  className={cn(
                    'rounded-md border px-2 py-1.5 text-xs font-semibold capitalize transition-colors',
                    sel ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted',
                  )}
                >
                  {m === 'in-person' ? 'In-person' : 'Telehealth'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-muted-foreground">Date</label>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="size-6" disabled={disabled} onClick={() => setOffset((o) => o - 1)} aria-label="Previous weeks">
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="size-6" disabled={disabled} onClick={() => setOffset((o) => o + 1)} aria-label="Next weeks">
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className="text-[9px] font-bold text-muted-foreground py-0.5">{d}</span>
          ))}
          {days.map((d) => {
            const sel = selectedDate && isSameDay(d, selectedDate);
            const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));
            return (
              <button
                key={d.toISOString()}
                type="button"
                disabled={disabled || isPast}
                onClick={() => pickDate(d)}
                aria-label={format(d, 'EEE, MMM d yyyy')}
                className={cn(
                  'aspect-square rounded-md text-[11px] flex items-center justify-center transition-colors',
                  sel ? 'bg-primary text-primary-foreground' : isPast ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted',
                )}
              >
                {format(d, 'd')}
              </button>
            );
          })}
        </div>
      </div>

      {v.date && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground">Available time</label>
          <div className="grid grid-cols-4 gap-1">
            {times.map((t) => {
              const sel = v.time === t;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickTime(t)}
                  aria-pressed={sel}
                  className={cn(
                    'rounded-md border px-1 py-1 text-[11px] font-mono transition-colors',
                    sel ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-muted',
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {v.providerId && v.date && v.time && (
        <Badge variant="secondary" className="text-[10px] gap-1">
          {v.providerName} · {format(selectedDate!, 'MMM d')} · {v.time}
        </Badge>
      )}
    </div>
  );
}

export default AppointmentWithProvider;
