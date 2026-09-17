'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num } from '../widget-props';

interface TimeValue {
  hour?: number;
  minute?: number;
  period?: 'AM' | 'PM';
}

function parse24(time: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { hour: h, minute: min };
}

function to24(v: TimeValue): string {
  if (v.hour == null || v.minute == null) return '';
  let h = v.hour;
  if (v.period === 'PM' && h < 12) h += 12;
  if (v.period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(v.minute).padStart(2, '0')}`;
}

function from24(time: string, use12: boolean): TimeValue {
  const parsed = parse24(time);
  if (!parsed) return {};
  if (!use12) return parsed;
  const period: 'AM' | 'PM' = parsed.hour >= 12 ? 'PM' : 'AM';
  const h12 = parsed.hour % 12 || 12;
  return { hour: h12, minute: parsed.minute, period };
}

export function TimePicker({ value, onChange, config, disabled, field }: WidgetProps) {
  const use12 = str(config.format, '24h') === '12h';
  const step = Math.max(1, Math.min(60, num(config.step, 15)));
  const min = str(config.min, '');
  const max = str(config.max, '');
  const ariaLabel = str(field?.label, 'Time');

  const valStr = typeof value === 'string' ? value : '';
  const tv = from24(valStr, use12);

  const update = (next: TimeValue) => onChange(to24(next));

  // Generate option lists
  const hours = use12
    ? Array.from({ length: 12 }, (_, i) => i + 1)
    : Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 / step }, (_, i) => i * step);

  const isOutsideRange = (t: string) => {
    if (!t) return false;
    if (min && t < min.slice(0, 5)) return true;
    if (max && t > max.slice(0, 5)) return true;
    return false;
  };

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={tv.hour ?? ''}
        disabled={disabled}
        onChange={(e) => update({ ...tv, hour: Number(e.target.value) })}
        aria-label={`${ariaLabel} hour`}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs"
      >
        <option value="">HH</option>
        {hours.map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, '0')}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground font-bold">:</span>
      <select
        value={tv.minute ?? ''}
        disabled={disabled}
        onChange={(e) => update({ ...tv, minute: Number(e.target.value) })}
        aria-label={`${ariaLabel} minute`}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs"
      >
        <option value="">MM</option>
        {minutes.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, '0')}
          </option>
        ))}
      </select>
      {use12 && (
        <select
          value={tv.period ?? ''}
          disabled={disabled}
          onChange={(e) => update({ ...tv, period: e.target.value as 'AM' | 'PM' })}
          aria-label={`${ariaLabel} AM/PM`}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs"
        >
          <option value="">--</option>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      )}
      {isOutsideRange(valStr) && <span className="text-xs text-red-500">Out of range</span>}
    </div>
  );
}

export default TimePicker;

// Allow free-typed input as alternative — exported for inspector preview
export function TimeInput(props: WidgetProps) {
  const { value, onChange, disabled, field, config } = props;
  const ariaLabel = str(field?.label, 'Time');
  const val = typeof value === 'string' ? value : '';
  return (
    <Input
      type="time"
      value={val}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
      step={num(config.step, 15) * 60}
    />
  );
}
