'use client';

import React from 'react';
import { GraduationCap, IdCard, BookOpen, CalendarDays, Mail, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { WidgetProps, str } from '../widget-props';

interface StudentInfoValue {
  fullName: string;
  studentId: string;
  email: string;
  program: string;
  year: string;
  enrollmentStatus: string;
  advisor?: string;
  gpa?: number;
  updatedAt?: string;
}

export function StudentInfoCard({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Student info card');
  const programs = Array.isArray(config.programs)
    ? (config.programs as string[])
    : ['Computer Science', 'Mathematics', 'English Literature', 'Biology', 'Business Administration', 'Psychology'];
  const years = Array.isArray(config.years) ? (config.years as string[]) : ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'];
  const statuses = Array.isArray(config.statuses) ? (config.statuses as string[]) : ['Full-time', 'Part-time', 'Transfer', 'International'];

  const v: StudentInfoValue = value && typeof value === 'object'
    ? (value as StudentInfoValue)
    : { fullName: '', studentId: '', email: '', program: programs[0] ?? '', year: years[0] ?? '', enrollmentStatus: statuses[0] ?? '' };

  const patch = (p: Partial<StudentInfoValue>) => onChange({ ...v, ...p, updatedAt: new Date().toISOString() });

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <div className="rounded-md bg-primary/10 p-1.5">
          <GraduationCap className="size-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold">{v.fullName || 'New student'}</p>
          <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
            <IdCard className="size-2.5" /> {v.studentId || '— no ID —'}
          </p>
        </div>
        {v.enrollmentStatus && <Badge variant="secondary" className="text-[9px]">{v.enrollmentStatus}</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 block">Full name</Label>
          <Input value={v.fullName} disabled={disabled}
            onChange={(e) => patch({ fullName: e.target.value })}
            aria-label="Student full name" className="text-xs h-9" placeholder="Jane Doe" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Student ID</Label>
          <Input value={v.studentId} disabled={disabled}
            onChange={(e) => patch({ studentId: e.target.value })}
            aria-label="Student ID" className="text-xs h-9 font-mono" placeholder="000123456" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Email</Label>
          <Input type="email" value={v.email} disabled={disabled}
            onChange={(e) => patch({ email: e.target.value })}
            aria-label="Student email" className="text-xs h-9" placeholder="jane@uni.edu" />
        </div>
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <BookOpen className="size-3" /> Program
          </Label>
          <Select value={v.program} disabled={disabled} onValueChange={(val) => patch({ program: val })}>
            <SelectTrigger className="h-9 text-xs" aria-label="Program of study">
              <SelectValue placeholder="Select program" />
            </SelectTrigger>
            <SelectContent>
              {programs.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <CalendarDays className="size-3" /> Year
          </Label>
          <Select value={v.year} disabled={disabled} onValueChange={(val) => patch({ year: val })}>
            <SelectTrigger className="h-9 text-xs" aria-label="Class year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Status</Label>
          <Select value={v.enrollmentStatus} disabled={disabled} onValueChange={(val) => patch({ enrollmentStatus: val })}>
            <SelectTrigger className="h-9 text-xs" aria-label="Enrollment status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <Building2 className="size-3" /> Academic advisor
          </Label>
          <Input value={v.advisor ?? ''} disabled={disabled}
            onChange={(e) => patch({ advisor: e.target.value })}
            aria-label="Advisor name" className="text-xs h-9" placeholder="Dr. Smith" />
        </div>
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <Mail className="size-3" /> GPA (optional)
          </Label>
          <Input type="number" min={0} max={4} step={0.01} value={v.gpa ?? ''}
            disabled={disabled}
            onChange={(e) => patch({ gpa: e.target.value ? Number(e.target.value) : undefined })}
            aria-label="GPA" className="text-xs h-9" placeholder="3.85" />
        </div>
      </div>

      {v.updatedAt && (
        <p className="text-[9px] text-muted-foreground">Updated {new Date(v.updatedAt).toLocaleString()}</p>
      )}
    </div>
  );
}

export default StudentInfoCard;
