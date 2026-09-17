'use client';

import React from 'react';
import { Award, Trophy, Plus, Trash2, BookOpen, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num } from '../widget-props';

interface EssayEntry { id: string; prompt: string; response: string; wordCount: number; }
interface Achievement { id: string; title: string; date: string; description: string; }
interface ScholarshipValue {
  applicantName: string;
  applicantEmail: string;
  studentId: string;
  institution: string;
  gpa: number;
  major: string;
  essays: EssayEntry[];
  achievements: Achievement[];
  financialNeed: string;
  submittedAt?: string;
}

let _idCounter = 0;
const uid = (p: string) => `${p}-${++_idCounter}-${Math.random().toString(36).slice(2, 6)}`;

const countWords = (s: string) => s.trim() ? s.trim().split(/\s+/).length : 0;

export function ScholarshipApplication({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Scholarship application');
  const minWords = num(config.minWordsPerEssay, 100);
  const maxWords = num(config.maxWordsPerEssay, 500);
  const essayPrompts = Array.isArray(config.essayPrompts)
    ? (config.essayPrompts as string[])
    : [
        'Describe your academic and career goals.',
        'Explain how this scholarship would help you achieve them.',
        'Describe a challenge you have overcome.',
      ];

  const v: ScholarshipValue = value && typeof value === 'object'
    ? (value as ScholarshipValue)
    : {
        applicantName: '', applicantEmail: '', studentId: '', institution: '', gpa: 0, major: '',
        essays: essayPrompts.map((p) => ({ id: uid('essay'), prompt: p, response: '', wordCount: 0 })),
        achievements: [{ id: uid('ach'), title: '', date: '', description: '' }],
        financialNeed: '',
      };

  const patch = (p: Partial<ScholarshipValue>) => onChange({ ...v, ...p, submittedAt: new Date().toISOString() });

  const updateEssay = (id: string, response: string) => {
    patch({ essays: v.essays.map((e) => e.id === id ? { ...e, response, wordCount: countWords(response) } : e) });
  };

  const updateAchievement = (id: string, p: Partial<Achievement>) => {
    patch({ achievements: v.achievements.map((a) => a.id === id ? { ...a, ...p } : a) });
  };

  const addAchievement = () => patch({ achievements: [...v.achievements, { id: uid('ach'), title: '', date: '', description: '' }] });
  const removeAchievement = (id: string) => patch({ achievements: v.achievements.filter((a) => a.id !== id) });

  const allEssaysValid = v.essays.every((e) => e.wordCount >= minWords && e.wordCount <= maxWords);
  const requiredFilled = v.applicantName && v.applicantEmail && v.studentId && v.institution && v.major;
  const ready = !!requiredFilled && allEssaysValid;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Award className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">Scholarship application</span>
        {ready && <Badge variant="default" className="text-[9px] ml-auto gap-1"><CheckCircle2 className="size-2.5" /> Ready</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input value={v.applicantName} disabled={disabled}
          onChange={(e) => patch({ applicantName: e.target.value })}
          aria-label="Applicant name" placeholder="Full name" className="text-xs h-9 col-span-2" />
        <Input type="email" value={v.applicantEmail} disabled={disabled}
          onChange={(e) => patch({ applicantEmail: e.target.value })}
          aria-label="Applicant email" placeholder="Email" className="text-xs h-9" />
        <Input value={v.studentId} disabled={disabled}
          onChange={(e) => patch({ studentId: e.target.value })}
          aria-label="Student ID" placeholder="ID" className="text-xs h-9 font-mono" />
        <Input value={v.institution} disabled={disabled}
          onChange={(e) => patch({ institution: e.target.value })}
          aria-label="Institution" placeholder="Institution" className="text-xs h-9" />
        <Input value={v.major} disabled={disabled}
          onChange={(e) => patch({ major: e.target.value })}
          aria-label="Major" placeholder="Major" className="text-xs h-9" />
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 block">GPA (0–4)</Label>
          <Input type="number" min={0} max={4} step={0.01} value={v.gpa || ''}
            disabled={disabled}
            onChange={(e) => patch({ gpa: Math.min(4, Math.max(0, Number(e.target.value) || 0)) })}
            aria-label="GPA" className="text-xs h-9" />
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <BookOpen className="size-3.5 text-primary" /> Essays
        </div>
        {v.essays.map((essay, idx) => {
          const wordCls = essay.wordCount < minWords ? 'text-amber-600'
            : essay.wordCount > maxWords ? 'text-red-600' : 'text-emerald-600';
          return (
            <div key={essay.id} className="space-y-1">
              <p className="text-[11px] font-semibold text-foreground/90">{idx + 1}. {essay.prompt}</p>
              <Textarea value={essay.response} disabled={disabled}
                onChange={(e) => updateEssay(essay.id, e.target.value)}
                aria-label={`Essay ${idx + 1} response`}
                placeholder={`Min ${minWords} / max ${maxWords} words`}
                className="text-[11px] min-h-[80px]" />
              <p className={`text-[9px] font-mono ${wordCls}`}>{essay.wordCount} words (target {minWords}–{maxWords})</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Trophy className="size-3.5 text-primary" /> Achievements
          </div>
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={addAchievement} className="h-7 text-[10px] gap-1">
            <Plus className="size-3" /> Add
          </Button>
        </div>
        {v.achievements.map((a, idx) => (
          <div key={a.id} className="grid grid-cols-12 gap-1 items-start">
            <Input value={a.title} disabled={disabled}
              onChange={(e) => updateAchievement(a.id, { title: e.target.value })}
              aria-label="Achievement title" placeholder="Title" className="col-span-5 h-8 text-xs" />
            <Input type="date" value={a.date} disabled={disabled}
              onChange={(e) => updateAchievement(a.id, { date: e.target.value })}
              aria-label="Achievement date" className="col-span-3 h-8 text-xs" />
            <Input value={a.description} disabled={disabled}
              onChange={(e) => updateAchievement(a.id, { description: e.target.value })}
              aria-label="Achievement description" placeholder="Description" className="col-span-3 h-8 text-xs" />
            <Button type="button" variant="ghost" size="sm" disabled={disabled}
              onClick={() => removeAchievement(a.id)}
              className="col-span-1 h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
              aria-label="Remove achievement">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Financial need statement (optional)</Label>
        <Textarea value={v.financialNeed} disabled={disabled}
          onChange={(e) => patch({ financialNeed: e.target.value })}
          aria-label="Financial need statement"
          placeholder="Briefly describe your financial circumstances"
          className="text-[11px] min-h-[60px]" />
      </div>

      {v.submittedAt && (
        <p className="text-[9px] text-muted-foreground">Last updated {new Date(v.submittedAt).toLocaleString()}</p>
      )}
    </div>
  );
}

export default ScholarshipApplication;
