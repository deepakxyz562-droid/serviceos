'use client';

import React from 'react';
import { Users, Check, X, Clock, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str } from '../widget-props';
import { cn } from '@/lib/utils';

type Status = 'present' | 'absent' | 'late' | 'excused';

interface AttendanceEntry {
  studentId: string;
  name: string;
  status: Status;
}
interface AttendanceValue {
  sessionDate: string;
  courseCode: string;
  entries: AttendanceEntry[];
  summary: { present: number; absent: number; late: number; excused: number };
  updatedAt?: string;
}

interface StudentCfg { id: string; name: string; }

const STATUS_META: Record<Status, { label: string; icon: typeof Check; cls: string; activeCls: string }> = {
  present: { label: 'Present', icon: Check, cls: 'text-emerald-600', activeCls: 'bg-emerald-500 text-white' },
  absent: { label: 'Absent', icon: X, cls: 'text-red-600', activeCls: 'bg-red-500 text-white' },
  late: { label: 'Late', icon: Clock, cls: 'text-amber-600', activeCls: 'bg-amber-500 text-white' },
  excused: { label: 'Excused', icon: CalendarCheck, cls: 'text-blue-600', activeCls: 'bg-blue-500 text-white' },
};

const STATUSES: Status[] = ['present', 'absent', 'late', 'excused'];

export function AttendanceTracker({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Attendance tracker');
  const roster = Array.isArray(config.roster) ? (config.roster as StudentCfg[]) : [];
  const defaultCourse = str(config.courseCode, '');
  const defaultDate = str(config.sessionDate, new Date().toISOString().slice(0, 10));

  const v: AttendanceValue = value && typeof value === 'object'
    ? (value as AttendanceValue)
    : (() => {
        const entries = roster.length
          ? roster.map((s) => ({ studentId: s.id, name: s.name, status: 'present' as Status }))
          : [{ studentId: '', name: '', status: 'present' as Status }];
        return {
          sessionDate: defaultDate, courseCode: defaultCourse, entries,
          summary: { present: entries.length, absent: 0, late: 0, excused: 0 },
        };
      })();

  const recompute = (entries: AttendanceEntry[]): AttendanceValue => {
    const summary = entries.reduce(
      (acc, e) => { acc[e.status]++; return acc; },
      { present: 0, absent: 0, late: 0, excused: 0 } as AttendanceValue['summary'],
    );
    return { ...v, entries, summary, updatedAt: new Date().toISOString() };
  };

  const setStatus = (idx: number, status: Status) => {
    onChange(recompute(v.entries.map((e, i) => i === idx ? { ...e, status } : e)));
  };

  const updateMeta = (idx: number, p: Partial<AttendanceEntry>) => {
    onChange(recompute(v.entries.map((e, i) => i === idx ? { ...e, ...p } : e)));
  };

  const markAll = (status: Status) => onChange(recompute(v.entries.map((e) => ({ ...e, status }))));

  const total = v.entries.length;
  const presentPct = total ? Math.round((v.summary.present / total) * 100) : 0;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className="size-3.5 text-primary" />
          <span className="text-xs font-semibold">Attendance</span>
        </div>
        <Badge variant="outline" className="text-[9px]">{presentPct}% present</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input value={v.courseCode} disabled={disabled}
          onChange={(e) => onChange({ ...v, courseCode: e.target.value, updatedAt: new Date().toISOString() })}
          aria-label="Course code" placeholder="CS 101" className="text-xs h-9" />
        <Input type="date" value={v.sessionDate} disabled={disabled}
          onChange={(e) => onChange({ ...v, sessionDate: e.target.value, updatedAt: new Date().toISOString() })}
          aria-label="Session date" className="text-xs h-9" />
      </div>

      <div className="grid grid-cols-4 gap-1">
        {STATUSES.map((s) => (
          <Button key={`mark-all-${s}`} type="button" variant="outline" size="sm"
            disabled={disabled || total === 0}
            onClick={() => markAll(s)}
            className={cn('text-[10px] h-7', STATUS_META[s].cls)}>
            All {STATUS_META[s].label}
          </Button>
        ))}
      </div>

      <div className="space-y-1.5">
        {v.entries.map((entry, idx) => (
          <div key={idx} className="rounded-md border border-border bg-background p-1.5">
            <div className="grid grid-cols-12 gap-1 items-center">
              <Input value={entry.studentId} disabled={disabled}
                onChange={(e) => updateMeta(idx, { studentId: e.target.value })}
                aria-label="Student ID" placeholder="ID" className="col-span-3 h-7 text-[10px] font-mono" />
              <Input value={entry.name} disabled={disabled}
                onChange={(e) => updateMeta(idx, { name: e.target.value })}
                aria-label="Student name" placeholder="Name" className="col-span-9 h-7 text-[10px]" />
            </div>
            <div className="grid grid-cols-4 gap-1 mt-1">
              {STATUSES.map((s) => {
                const Icon = STATUS_META[s].icon;
                const active = entry.status === s;
                return (
                  <button key={s} type="button" disabled={disabled}
                    onClick={() => setStatus(idx, s)}
                    aria-label={`Mark ${entry.name || 'student'} as ${STATUS_META[s].label}`}
                    className={cn(
                      'h-7 rounded text-[10px] flex items-center justify-center gap-1 border transition-colors',
                      active ? STATUS_META[s].activeCls + ' border-transparent'
                        : 'border-border text-muted-foreground hover:bg-muted',
                    )}>
                    <Icon className="size-3" />
                    {STATUS_META[s].label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/60 text-center">
        {STATUSES.map((s) => (
          <div key={s}>
            <p className={cn('text-sm font-bold', STATUS_META[s].cls)}>{v.summary[s]}</p>
            <p className="text-[9px] text-muted-foreground">{STATUS_META[s].label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AttendanceTracker;
