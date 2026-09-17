'use client';

import React, { useState } from 'react';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Activity, CheckCircle2, Bed, Utensils, Droplet, Dumbbell } from 'lucide-react';

type Mood = 'great' | 'good' | 'ok' | 'low' | 'bad';

interface CheckInValue {
  date: string;
  mood?: Mood;
  sleepHours?: number;
  waterGlasses?: number;
  meals?: number;
  exercised?: boolean;
  notes?: string;
}

const MOODS: { id: Mood; emoji: string; label: string }[] = [
  { id: 'great', emoji: '🤩', label: 'Great' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'ok', emoji: '😐', label: 'OK' },
  { id: 'low', emoji: '😔', label: 'Low' },
  { id: 'bad', emoji: '😢', label: 'Bad' },
];

export function DailyCheckIn({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Daily wellness check-in');
  const showNotes = bool(config.showNotes, true);

  const v: CheckInValue = value && typeof value === 'object' ? (value as CheckInValue) : { date: format(new Date(), 'yyyy-MM-dd') };
  const date = str(v.date, format(new Date(), 'yyyy-MM-dd'));
  const mood = v.mood as Mood | undefined;
  const sleep = typeof v.sleepHours === 'number' ? v.sleepHours : 0;
  const water = typeof v.waterGlasses === 'number' ? v.waterGlasses : 0;
  const meals = typeof v.meals === 'number' ? v.meals : 0;
  const exercised = !!v.exercised;
  const notes = str(v.notes, '');

  const patch = (p: Partial<CheckInValue>) => onChange({ ...v, ...p, date });

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Activity className="size-3.5 text-primary" />
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Check-in · {date}
        </span>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">How are you feeling?</label>
        <div className="grid grid-cols-5 gap-1">
          {MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => patch({ mood: mood === m.id ? undefined : m.id })}
              aria-pressed={mood === m.id}
              aria-label={`Mood: ${m.label}`}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-md border py-1.5 transition-all active:scale-95',
                mood === m.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted',
              )}
            >
              <span className="text-base leading-none">{m.emoji}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stepper
          icon={<Bed className="size-3" />}
          label="Sleep (h)"
          value={sleep}
          min={0}
          max={14}
          step={0.5}
          disabled={disabled}
          onChange={(n) => patch({ sleepHours: n })}
        />
        <Stepper
          icon={<Droplet className="size-3" />}
          label="Water (glasses)"
          value={water}
          min={0}
          max={16}
          step={1}
          disabled={disabled}
          onChange={(n) => patch({ waterGlasses: n })}
        />
        <Stepper
          icon={<Utensils className="size-3" />}
          label="Meals"
          value={meals}
          min={0}
          max={6}
          step={1}
          disabled={disabled}
          onChange={(n) => patch({ meals: n })}
        />
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => patch({ exercised: !exercised })}
        aria-pressed={exercised}
        className={cn(
          'w-full flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs transition-colors',
          exercised ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30' : 'border-border bg-card hover:bg-muted',
        )}
      >
        <span className="flex items-center gap-1.5 font-semibold">
          <Dumbbell className="size-3.5" /> Exercised today?
        </span>
        {exercised ? (
          <Badge variant="secondary" className="text-[10px] h-5 gap-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-3" /> Yes
          </Badge>
        ) : (
          <span className="text-[10px] text-muted-foreground">Not yet</span>
        )}
      </button>

      {showNotes && (
        <div className="space-y-1">
          <Textarea
            value={notes}
            disabled={disabled}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Anything else on your mind?"
            className="text-xs min-h-[60px]"
            aria-label="Notes"
          />
        </div>
      )}
    </div>
  );
}

interface StepperProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (n: number) => void;
}

function Stepper({ icon, label, value, min, max, step, disabled, onChange }: StepperProps) {
  const set = (delta: number) => {
    if (disabled) return;
    const next = Math.max(min, Math.min(max, Number((value + delta).toFixed(2))));
    onChange(next);
  };
  return (
    <div className="rounded-md border border-border bg-card p-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">{icon} {label}</span>
      </div>
      <div className="flex items-center justify-between">
        <button type="button" disabled={disabled} onClick={() => set(-step)} className="size-6 rounded-md border border-border text-xs hover:bg-muted active:scale-95" aria-label={`Decrease ${label}`}>−</button>
        <span className="text-sm font-bold tabular-nums">{value}</span>
        <button type="button" disabled={disabled} onClick={() => set(step)} className="size-6 rounded-md border border-border text-xs hover:bg-muted active:scale-95" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}

export default DailyCheckIn;
