'use client';

import React, { useMemo } from 'react';
import { GraduationCap, BookOpen, Hash, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { WidgetProps, str, num } from '../widget-props';
import { cn } from '@/lib/utils';

interface CourseOption {
  id: string;
  name: string;
  code: string;
  credits: number;
  sections: Array<{ id: string; label: string; schedule: string; seats: number; capacity: number }>;
}
interface RegistrationValue {
  courseId?: string;
  courseCode?: string;
  courseName?: string;
  sectionId?: string;
  sectionLabel?: string;
  schedule?: string;
  credits: number;
  studentName: string;
  studentId: string;
  totalCost?: number;
  pricePerCredit?: number;
  currency: string;
  registeredAt?: string;
}

const DEFAULT_COURSES: CourseOption[] = [
  {
    id: 'c1', name: 'Intro to Computer Science', code: 'CS 101', credits: 3,
    sections: [
      { id: 'c1-s1', label: 'Section A · MWF 9-10am', schedule: 'MWF 9-10am', seats: 5, capacity: 30 },
      { id: 'c1-s2', label: 'Section B · TTh 1-2:30pm', schedule: 'TTh 1-2:30pm', seats: 0, capacity: 25 },
    ],
  },
  {
    id: 'c2', name: 'Calculus I', code: 'MATH 121', credits: 4,
    sections: [{ id: 'c2-s1', label: 'Section A · MWF 11-12pm', schedule: 'MWF 11-12pm', seats: 8, capacity: 35 }],
  },
  {
    id: 'c3', name: 'English Composition', code: 'ENG 110', credits: 3,
    sections: [{ id: 'c3-s1', label: 'Section A · TTh 10-11:30am', schedule: 'TTh 10-11:30am', seats: 2, capacity: 20 }],
  },
];

export function CourseRegistration({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Course registration');
  const currency = str(config.currency, 'USD');
  const pricePerCredit = num(config.pricePerCredit, 0);
  const courses = useMemo<CourseOption[]>(() => {
    if (Array.isArray(config.courses) && config.courses.length) {
      return config.courses as CourseOption[];
    }
    return DEFAULT_COURSES;
  }, [config.courses]);

  const v: RegistrationValue = value && typeof value === 'object'
    ? (value as RegistrationValue)
    : { credits: 0, studentName: '', studentId: '', currency };

  const selectedCourse = courses.find((c) => c.id === v.courseId);
  const selectedSection = selectedCourse?.sections.find((s) => s.id === v.sectionId);
  const seatsAvailable = selectedSection ? Math.max(0, selectedSection.capacity - selectedSection.seats) : 0;
  const isFull = selectedSection ? seatsAvailable <= 0 : false;
  const totalCost = pricePerCredit > 0 ? (selectedCourse?.credits ?? 0) * pricePerCredit : 0;

  const patch = (p: Partial<RegistrationValue>) => {
    const next = { ...v, ...p, currency, pricePerCredit: pricePerCredit || undefined };
    if (p.courseId) {
      const course = courses.find((c) => c.id === p.courseId);
      if (course) {
        next.courseCode = course.code;
        next.courseName = course.name;
        next.credits = course.credits;
        next.sectionId = undefined;
        next.sectionLabel = undefined;
        next.schedule = undefined;
      }
    }
    if (p.sectionId && selectedCourse) {
      const sec = selectedCourse.sections.find((s) => s.id === p.sectionId);
      if (sec) {
        next.sectionLabel = sec.label;
        next.schedule = sec.schedule;
      }
    }
    if (pricePerCredit > 0) next.totalCost = (next.credits ?? 0) * pricePerCredit;
    next.registeredAt = new Date().toISOString();
    onChange(next);
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <GraduationCap className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">Course registration</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 block">Student name</Label>
          <Input value={v.studentName} disabled={disabled}
            onChange={(e) => patch({ studentName: e.target.value })}
            aria-label="Student name" className="text-xs h-9" placeholder="Jane Doe" />
        </div>
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 block">Student ID</Label>
          <Input value={v.studentId} disabled={disabled}
            onChange={(e) => patch({ studentId: e.target.value })}
            aria-label="Student ID" className="text-xs h-9 font-mono" placeholder="000123456" />
        </div>
      </div>

      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Course</Label>
        <Select value={v.courseId ?? ''} disabled={disabled} onValueChange={(val) => patch({ courseId: val })}>
          <SelectTrigger className="h-9 text-xs" aria-label="Select course">
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code} · {c.name} ({c.credits} cr)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCourse && (
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Section</Label>
          <div className="grid gap-1.5">
            {selectedCourse.sections.map((s) => {
              const remaining = Math.max(0, s.capacity - s.seats);
              const full = remaining <= 0;
              const chosen = v.sectionId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={disabled || full}
                  onClick={() => patch({ sectionId: s.id })}
                  aria-label={`Select section ${s.label}${full ? ' (full)' : ''}`}
                  className={cn(
                    'rounded-md border p-2 text-left transition-colors flex items-center gap-2',
                    chosen ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
                    full && 'opacity-60 cursor-not-allowed',
                  )}
                >
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground">{s.schedule}</p>
                  </div>
                  <Badge variant={full ? 'destructive' : remaining <= 5 ? 'secondary' : 'outline'} className="text-[9px] h-4">
                    {remaining}/{s.capacity}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedCourse && isFull && (
        <p className="text-[11px] text-amber-600 flex items-center gap-1">
          <AlertTriangle className="size-3" /> This section is full — choose another.
        </p>
      )}

      {selectedCourse && !isFull && selectedSection && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            <p className="text-[11px] font-semibold">Registration ready</p>
          </div>
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p className="flex items-center gap-1"><BookOpen className="size-2.5" /> {selectedCourse.code} — {selectedCourse.name}</p>
            <p className="flex items-center gap-1"><Calendar className="size-2.5" /> {selectedSection.schedule}</p>
            <p className="flex items-center gap-1"><Hash className="size-2.5" /> {selectedCourse.credits} credit(s)</p>
          </div>
          {totalCost > 0 && (
            <p className="text-[11px] font-bold pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
              Total: {totalCost.toLocaleString()} {currency}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default CourseRegistration;
