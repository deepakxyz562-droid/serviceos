'use client';

import React, { useMemo, useState } from 'react';
import { addDays, startOfWeek, format, isSameDay, parseISO, isValid } from 'date-fns';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Mood = 'great' | 'good' | 'ok' | 'low' | 'bad';

interface MoodValue {
  today?: Mood;
  history?: Record<string, Mood>; // yyyy-MM-dd -> mood
}

const MOODS: { id: Mood; emoji: string; label: string; color: string }[] = [
  { id: 'great', emoji: '🤩', label: 'Great', color: 'bg-emerald-500' },
  { id: 'good', emoji: '🙂', label: 'Good', color: 'bg-sky-500' },
  { id: 'ok', emoji: '😐', label: 'OK', color: 'bg-amber-500' },
  { id: 'low', emoji: '😔', label: 'Low', color: 'bg-orange-500' },
  { id: 'bad', emoji: '😢', label: 'Bad', color: 'bg-red-500' },
];

const MOOD_TO_VAL: Record<Mood, number> = { great: 5, good: 4, ok: 3, low: 2, bad: 1 };

export function MoodTracker({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Mood tracker');
  const showCalendar = bool(config.showCalendar, true);
  const weeksToShow = Math.max(1, Number(config.weeks) || 4);

  const v: MoodValue = value && typeof value === 'object' ? (value as MoodValue) : {};
  const history: Record<string, Mood> = v.history || {};
  const today = v.today;

  const [offsetWeeks, setOffsetWeeks] = useState(0);

  const weeks = useMemo(() => {
    const start = startOfWeek(addDays(new Date(), offsetWeeks * 7), { weekStartsOn: 1 });
    const out: Date[][] = [];
    for (let w = 0; w < weeksToShow; w++) {
      const ws = addDays(start, w * 7);
      out.push(Array.from({ length: 7 }, (_, i) => addDays(ws, i)));
    }
    return out;
  }, [offsetWeeks, weeksToShow]);

  const pick = (m: Mood) => {
    if (disabled) return;
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    onChange({
      today: m,
      history: { ...history, [todayKey]: m },
    });
  };

  const weekAvg = (days: Date[]) => {
    const vals = days
      .map((d) => history[format(d, 'yyyy-MM-dd')])
      .filter(Boolean)
      .map((m) => MOOD_TO_VAL[m]);
    if (!vals.length) return null;
    return vals.reduce((s, x) => s + x, 0) / vals.length;
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">How do you feel today?</span>
        {today && (
          <span className="text-[10px] text-muted-foreground">Logged: {MOODS.find((m) => m.id === today)?.label}</span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {MOODS.map((m) => {
          const isSel = today === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => pick(m.id)}
              aria-pressed={isSel}
              aria-label={`Mood: ${m.label}`}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border py-2 transition-all active:scale-95',
                isSel ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted',
              )}
            >
              <span className="text-xl leading-none">{m.emoji}</span>
              <span className="text-[10px] font-semibold text-muted-foreground">{m.label}</span>
            </button>
          );
        })}
      </div>

      {showCalendar && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" size="icon" className="size-6" onClick={() => setOffsetWeeks((o) => o - 1)} aria-label="Previous weeks">
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {format(weeks[0][0], 'MMM d')} – {format(weeks[weeksToShow - 1][6], 'MMM d')}
            </span>
            <Button type="button" variant="ghost" size="icon" className="size-6" onClick={() => setOffsetWeeks((o) => o + 1)} aria-label="Next weeks">
              <ChevronRight className="size-3.5" />
            </Button>
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-7 text-center text-[9px] font-bold text-muted-foreground">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            {weeks.map((week, wi) => {
              const avg = weekAvg(week);
              return (
                <div key={wi} className="grid grid-cols-7 gap-1">
                  {week.map((d) => {
                    const key = format(d, 'yyyy-MM-dd');
                    const m = history[key];
                    const mood = m ? MOODS.find((x) => x.id === m) : null;
                    const isToday = isSameDay(d, new Date());
                    return (
                      <div
                        key={key}
                        className={cn(
                          'aspect-square rounded-md flex items-center justify-center text-[10px] relative',
                          mood ? 'text-white' : 'bg-muted/40 text-muted-foreground',
                        )}
                        style={mood ? { backgroundColor: undefined } : undefined}
                        aria-label={`${key}: ${mood?.label ?? 'no entry'}`}
                      >
                        {mood ? (
                          <span className={cn('size-full rounded-md flex items-center justify-center', mood.color)}>
                            {mood.emoji}
                          </span>
                        ) : (
                          format(d, 'd')
                        )}
                        {isToday && !mood && (
                          <span className="absolute bottom-0.5 size-1 rounded-full bg-primary" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <div className="flex items-center justify-end gap-1.5 pt-1">
              <span className="text-[10px] text-muted-foreground">Week avg:</span>
              {(() => {
                const all = weeks.flat();
                const avg = weekAvg(all);
                return (
                  <span className="text-[10px] font-bold text-foreground">
                    {avg ? `${avg.toFixed(1)}/5` : '—'}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MoodTracker;
