'use client';

import React, { useState } from 'react';
import { ClipboardCheck, Plus, Trash2, Hash, Users, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num } from '../widget-props';
import { cn } from '@/lib/utils';

interface GradeEntry {
  studentId: string;
  name: string;
  grade: number | null;
  letter?: string;
}
interface GradeInputValue {
  assignment: string;
  courseId: string;
  maxPoints: number;
  entries: GradeEntry[];
  average?: number;
  median?: number;
  graded: number;
  total: number;
  updatedAt?: string;
}

interface StudentCfg { id: string; name: string; }

const LETTER = (pct: number): string =>
  pct >= 0.9 ? 'A' : pct >= 0.8 ? 'B' : pct >= 0.7 ? 'C' : pct >= 0.6 ? 'D' : 'F';

export function GradeInput({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Grade input');
  const maxPoints = num(config.maxPoints, 100);
  const assignment = str(config.assignment, '');
  const courseId = str(config.courseId, '');
  const roster = Array.isArray(config.roster) ? (config.roster as StudentCfg[]) : [];

  const v: GradeInputValue = value && typeof value === 'object'
    ? (value as GradeInputValue)
    : (() => {
        const entries = roster.length
          ? roster.map((s) => ({ studentId: s.id, name: s.name, grade: null }))
          : [{ studentId: '', name: '', grade: null }];
        return { assignment, courseId, maxPoints, entries, graded: 0, total: entries.length };
      })();

  const recompute = (entries: GradeEntry[]): GradeInputValue => {
    const graded = entries.filter((e) => typeof e.grade === 'number' && e.grade >= 0);
    const grades = graded.map((e) => e.grade as number);
    const sorted = [...grades].sort((a, b) => a - b);
    const average = grades.length ? +(grades.reduce((s, g) => s + g, 0) / grades.length).toFixed(2) : undefined;
    const median = sorted.length
      ? +(sorted.length % 2
        ? sorted[Math.floor(sorted.length / 2)]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2).toFixed(2)
      : undefined;
    return {
      ...v, entries, graded: graded.length, total: entries.length,
      average, median, updatedAt: new Date().toISOString(),
    };
  };

  const patch = (entries: GradeEntry[]) => onChange(recompute(entries));

  const updateEntry = (idx: number, p: Partial<GradeEntry>) => {
    patch(v.entries.map((e, i) => i === idx ? { ...e, ...p } : e));
  };

  const updateGrade = (idx: number, raw: string) => {
    const n = raw === '' ? null : Math.max(0, Math.min(maxPoints, Number(raw)));
    const entry = v.entries[idx];
    const grade = n;
    const letter = grade != null ? LETTER(grade / maxPoints) : undefined;
    patch(v.entries.map((e, i) => i === idx ? { ...e, grade, letter } : e));
  };

  const addRow = () => patch([...v.entries, { studentId: '', name: '', grade: null }]);
  const removeRow = (idx: number) => patch(v.entries.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ClipboardCheck className="size-3.5 text-primary" />
          <span className="text-xs font-semibold">Grade input</span>
        </div>
        <Badge variant="outline" className="text-[9px] gap-1">
          <Hash className="size-2.5" /> {v.graded}/{v.total} graded
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input value={v.assignment} disabled={disabled}
          onChange={(e) => onChange({ ...v, assignment: e.target.value, updatedAt: new Date().toISOString() })}
          aria-label="Assignment name" placeholder="Assignment" className="text-xs h-9 col-span-2" />
        <Input value={v.courseId} disabled={disabled}
          onChange={(e) => onChange({ ...v, courseId: e.target.value, updatedAt: new Date().toISOString() })}
          aria-label="Course ID" placeholder="CS 101" className="text-xs h-9" />
        <div>
          <Label className="text-[10px] text-muted-foreground mb-1 block">Max points</Label>
          <Input type="number" min={1} value={v.maxPoints} disabled={disabled}
            onChange={(e) => onChange({ ...v, maxPoints: Math.max(1, Number(e.target.value) || 1), updatedAt: new Date().toISOString() })}
            aria-label="Max points" className="text-xs h-9" />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="grid grid-cols-12 gap-1 text-[10px] font-bold text-muted-foreground px-1">
          <div className="col-span-3">Student ID</div>
          <div className="col-span-5">Name</div>
          <div className="col-span-3 text-center">Grade / {v.maxPoints}</div>
          <div className="col-span-1"></div>
        </div>
        {v.entries.map((entry, idx) => {
          const pct = entry.grade != null ? entry.grade / v.maxPoints : 0;
          return (
            <div key={idx} className="grid grid-cols-12 gap-1 items-center">
              <Input value={entry.studentId} disabled={disabled}
                onChange={(e) => updateEntry(idx, { studentId: e.target.value })}
                aria-label="Student ID" className="col-span-3 h-8 text-xs font-mono" />
              <Input value={entry.name} disabled={disabled}
                onChange={(e) => updateEntry(idx, { name: e.target.value })}
                aria-label="Student name" className="col-span-5 h-8 text-xs" />
              <div className="col-span-3 relative">
                <Input type="number" min={0} max={v.maxPoints} step={0.5}
                  value={entry.grade ?? ''}
                  disabled={disabled}
                  onChange={(e) => updateGrade(idx, e.target.value)}
                  aria-label="Grade" className="h-8 text-xs text-center pr-8" />
                {entry.letter && (
                  <span className={cn(
                    'absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-bold',
                    pct >= 0.7 ? 'text-emerald-600' : pct >= 0.6 ? 'text-amber-600' : 'text-red-600',
                  )}>
                    {entry.letter}
                  </span>
                )}
              </div>
              <Button type="button" variant="ghost" size="sm" disabled={disabled}
                onClick={() => removeRow(idx)}
                className="col-span-1 h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                aria-label="Remove row">
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={disabled} className="text-xs gap-1 h-7">
        <Plus className="size-3" /> Add student
      </Button>

      {v.average != null && (
        <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border/60">
          <div>
            <p className="text-[9px] text-muted-foreground flex items-center justify-center gap-1">
              <Users className="size-2.5" /> Average
            </p>
            <p className="text-xs font-bold">{v.average.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground">Median</p>
            <p className="text-xs font-bold">{v.median?.toFixed(1) ?? '—'}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground flex items-center justify-center gap-1">
              <Award className="size-2.5" /> Max
            </p>
            <p className="text-xs font-bold">{v.maxPoints}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default GradeInput;
