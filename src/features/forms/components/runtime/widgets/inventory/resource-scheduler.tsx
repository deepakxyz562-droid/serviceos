'use client';

import React, { useMemo, useState } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { CalendarDays, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface ScheduleEntry {
  resource: string;
  day: string; // yyyy-MM-dd
  slot: string; // e.g. "09:00-11:00"
}

interface SchedulerValue {
  resource?: string;
  day?: string;
  slot?: string;
  entries?: ScheduleEntry[];
}

interface ResourceCfg {
  name?: string;
  capacity?: number;
}

const SLOTS = [
  { id: 'am', label: '09:00–12:00' },
  { id: 'pm', label: '13:00–16:00' },
  { id: 'eve', label: '17:00–20:00' },
];

export function ResourceScheduler({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Resource scheduler');
  const resources = useMemo<ResourceCfg[]>(() => {
    const raw = config.resources;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((r, i) => ({
        name: str((r as Record<string, unknown>).name, `Resource ${i + 1}`),
        capacity: num((r as Record<string, unknown>).capacity, 1),
      }));
    }
    return [
      { name: 'Room A', capacity: 1 },
      { name: 'Room B', capacity: 1 },
      { name: 'Equipment X', capacity: 2 },
    ];
  }, [config.resources]);

  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const allowMulti = bool(config.allowMulti, false);

  const [picked, setPicked] = useState<ScheduleEntry[]>(() => {
    const v = value as SchedulerValue | undefined;
    if (v?.entries && Array.isArray(v.entries)) return v.entries;
    if (v?.resource && v.day && v.slot) return [{ resource: v.resource, day: v.day, slot: v.slot }];
    return [];
  });

  const isTaken = (resource: string, day: string, slot: string) => {
    // Mock: deterministic "already booked" lookup for 30% of cells
    const hash = (resource.length * 31 + day.length * 7 + slot.length * 13) % 10;
    return hash < 3;
  };

  const hasMine = (resource: string, day: string, slot: string) =>
    picked.some((p) => p.resource === resource && p.day === day && p.slot === slot);

  const toggle = (resource: string, day: string, slot: string) => {
    if (disabled) return;
    if (isTaken(resource, day, slot)) return;
    const existing = picked.find((p) => p.resource === resource && p.day === day && p.slot === slot);
    let next: ScheduleEntry[];
    if (existing) {
      next = picked.filter((p) => p !== existing);
    } else if (allowMulti) {
      next = [...picked, { resource, day, slot }];
    } else {
      next = [{ resource, day, slot }];
    }
    setPicked(next);
    if (allowMulti) {
      onChange({ entries: next });
    } else {
      const first = next[0];
      onChange({ resource: first?.resource, day: first?.day, slot: first?.slot, entries: next });
    }
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <CalendarDays className="size-3.5" /> Week of {format(weekStart, 'MMM d')}
      </div>
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-[10px] border-separate" style={{ borderSpacing: '2px' }}>
          <thead>
            <tr>
              <th className="text-left text-muted-foreground font-semibold p-1 sticky left-0 bg-background">Resource</th>
              {days.map((d) => (
                <th key={d.toISOString()} className="text-center font-semibold p-1">
                  {format(d, 'EEE')}
                  <span className="block text-[9px] text-muted-foreground">{format(d, 'd')}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resources.map((r, ri) =>
              SLOTS.map((slot, si) => (
                <tr key={`${ri}-${si}`}>
                  <td className="text-left p-1 whitespace-nowrap sticky left-0 bg-background">
                    {si === 0 ? <span className="font-semibold text-foreground">{r.name}</span> : <span className="text-muted-foreground">{slot.label}</span>}
                    {si === 0 && <span className="block text-[9px] text-muted-foreground">Cap. {r.capacity}</span>}
                  </td>
                  {days.map((d) => {
                    const day = format(d, 'yyyy-MM-dd');
                    const taken = isTaken(r.name, day, slot.id);
                    const mine = hasMine(r.name, day, slot.id);
                    return (
                      <td key={day} className="p-0">
                        <button
                          type="button"
                          disabled={disabled || taken}
                          onClick={() => toggle(r.name, day, slot.id)}
                          aria-label={`${r.name} on ${format(d, 'EEE MMM d')} ${slot.label}${taken ? ' (taken)' : ''}`}
                          className={cn(
                            'w-full h-7 rounded text-[9px] flex items-center justify-center transition-colors',
                            mine
                              ? 'bg-primary text-primary-foreground'
                              : taken
                                ? 'bg-red-100 text-red-500 dark:bg-red-950/40'
                                : 'bg-muted/40 hover:bg-muted',
                          )}
                        >
                          {mine ? <CheckCircle2 className="size-3" /> : taken ? <X className="size-3" /> : ''}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
      {picked.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {picked.map((p, i) => (
            <Badge key={i} variant="secondary" className="text-[10px]">
              {p.resource} · {format(parseDay(p.day), 'EEE')} · {SLOTS.find((s) => s.id === p.slot)?.label ?? p.slot}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function parseDay(day: string): Date {
  const parts = day.split('-').map(Number);
  if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
  return new Date();
}

export default ResourceScheduler;
