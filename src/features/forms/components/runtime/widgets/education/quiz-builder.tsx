'use client';

import React, { useState } from 'react';
import { ListChecks, Plus, Trash2, CheckCircle2, Award, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { WidgetProps, str, num } from '../widget-props';
import { cn } from '@/lib/utils';

interface QuizOption {
  id: string;
  label: string;
}
interface QuizQuestion {
  id: string;
  text: string;
  type: 'single' | 'multiple' | 'text';
  options: QuizOption[];
  correctOptionIds: string[];
  points: number;
}
interface QuizValue {
  title: string;
  questions: QuizQuestion[];
  totalPoints: number;
  updatedAt?: string;
}

let _idCounter = 0;
const uid = (p: string) => `${p}-${++_idCounter}-${Math.random().toString(36).slice(2, 6)}`;

export function QuizBuilder({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Quiz builder');
  const defaultQuestions = num(config.defaultQuestions, 1);

  const v: QuizValue = value && typeof value === 'object'
    ? (value as QuizValue)
    : {
        title: str(config.title, 'Untitled Quiz'),
        questions: [{
          id: uid('q'),
          text: '',
          type: 'single',
          options: [
            { id: uid('o'), label: '' },
            { id: uid('o'), label: '' },
          ],
          correctOptionIds: [],
          points: 1,
        }],
        totalPoints: 1,
      };

  void defaultQuestions;
  const [expanded, setExpanded] = useState<string | null>(v.questions[0]?.id ?? null);

  const recompute = (questions: QuizQuestion[]): QuizValue => ({
    ...v,
    questions,
    totalPoints: questions.reduce((s, q) => s + (q.points || 0), 0),
    updatedAt: new Date().toISOString(),
  });

  const patch = (questions: QuizQuestion[]) => onChange(recompute(questions));

  const updateQuestion = (id: string, p: Partial<QuizQuestion>) => {
    patch(v.questions.map((q) => q.id === id ? { ...q, ...p } : q));
  };

  const addQuestion = () => {
    const newQ: QuizQuestion = {
      id: uid('q'), text: '', type: 'single',
      options: [{ id: uid('o'), label: '' }, { id: uid('o'), label: '' }],
      correctOptionIds: [], points: 1,
    };
    patch([...v.questions, newQ]);
    setExpanded(newQ.id);
  };

  const removeQuestion = (id: string) => {
    const next = v.questions.filter((q) => q.id !== id);
    patch(next.length ? next : [{
      id: uid('q'), text: '', type: 'single',
      options: [{ id: uid('o'), label: '' }, { id: uid('o'), label: '' }],
      correctOptionIds: [], points: 1,
    }]);
  };

  const addOption = (qid: string) => {
    patch(v.questions.map((q) => q.id === qid
      ? { ...q, options: [...q.options, { id: uid('o'), label: '' }] }
      : q));
  };

  const updateOption = (qid: string, oid: string, label: string) => {
    patch(v.questions.map((q) => q.id === qid
      ? { ...q, options: q.options.map((o) => o.id === oid ? { ...o, label } : o) }
      : q));
  };

  const removeOption = (qid: string, oid: string) => {
    patch(v.questions.map((q) => q.id === qid
      ? { ...q, options: q.options.filter((o) => o.id !== oid), correctOptionIds: q.correctOptionIds.filter((id) => id !== oid) }
      : q));
  };

  const toggleCorrect = (qid: string, oid: string) => {
    patch(v.questions.map((q) => {
      if (q.id !== qid) return q;
      if (q.type === 'single') {
        return { ...q, correctOptionIds: q.correctOptionIds.includes(oid) ? [] : [oid] };
      }
      return {
        ...q,
        correctOptionIds: q.correctOptionIds.includes(oid)
          ? q.correctOptionIds.filter((id) => id !== oid)
          : [...q.correctOptionIds, oid],
      };
    }));
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ListChecks className="size-3.5 text-primary" />
          <span className="text-xs font-semibold">Quiz builder</span>
        </div>
        <Badge variant="outline" className="text-[9px]">{v.totalPoints} pts</Badge>
      </div>

      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Quiz title</Label>
        <Input value={v.title} disabled={disabled}
          onChange={(e) => onChange({ ...v, title: e.target.value, updatedAt: new Date().toISOString() })}
          aria-label="Quiz title" className="text-xs h-9" />
      </div>

      <div className="space-y-2">
        {v.questions.map((q, qi) => {
          const isOpen = expanded === q.id;
          return (
            <div key={q.id} className="rounded-md border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/40">
                <button type="button" disabled={disabled}
                  onClick={() => setExpanded(isOpen ? null : q.id)}
                  className="text-xs font-semibold flex-1 text-left flex items-center gap-1.5"
                  aria-label={`Toggle question ${qi + 1}`}>
                  <Pencil className="size-3 text-muted-foreground" />
                  Question {qi + 1}
                </button>
                <Badge variant="outline" className="text-[9px] h-4">{q.points} pt</Badge>
                <Button type="button" variant="ghost" size="sm" disabled={disabled}
                  onClick={() => removeQuestion(q.id)}
                  className="size-6 p-0 text-muted-foreground hover:text-red-500"
                  aria-label="Remove question">
                  <Trash2 className="size-3" />
                </Button>
              </div>
              {isOpen && (
                <div className="p-2 space-y-2">
                  <Input value={q.text} disabled={disabled}
                    onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                    aria-label="Question text" placeholder="Question text"
                    className="text-xs h-9" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground mb-1 block">Type</Label>
                      <Select value={q.type} disabled={disabled}
                        onValueChange={(val) => updateQuestion(q.id, { type: val as QuizQuestion['type'], correctOptionIds: [] })}>
                        <SelectTrigger className="h-8 text-xs" aria-label="Question type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single choice</SelectItem>
                          <SelectItem value="multiple">Multiple choice</SelectItem>
                          <SelectItem value="text">Text answer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground mb-1 block">Points</Label>
                      <Input type="number" min={1} value={q.points} disabled={disabled}
                        onChange={(e) => updateQuestion(q.id, { points: Math.max(1, Number(e.target.value) || 1) })}
                        aria-label="Points" className="h-8 text-xs" />
                    </div>
                  </div>

                  {q.type !== 'text' && (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Options (click ✓ to mark correct)</Label>
                      {q.options.map((o, oi) => {
                        const correct = q.correctOptionIds.includes(o.id);
                        return (
                          <div key={o.id} className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => toggleCorrect(q.id, o.id)}
                              aria-label={correct ? 'Mark as incorrect' : 'Mark as correct'}
                              className={cn(
                                'size-7 shrink-0 rounded-md border flex items-center justify-center',
                                correct ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
                                  : 'border-border text-muted-foreground hover:border-emerald-400',
                              )}>
                              <CheckCircle2 className="size-3.5" />
                            </button>
                            <Input value={o.label} disabled={disabled}
                              onChange={(e) => updateOption(q.id, o.id, e.target.value)}
                              aria-label={`Option ${oi + 1}`} placeholder={`Option ${oi + 1}`}
                              className="text-xs h-8 flex-1" />
                            <Button type="button" variant="ghost" size="sm" disabled={disabled}
                              onClick={() => removeOption(q.id, o.id)}
                              className="size-6 p-0 text-muted-foreground hover:text-red-500"
                              aria-label="Remove option">
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        );
                      })}
                      <Button type="button" variant="ghost" size="sm" disabled={disabled}
                        onClick={() => addOption(q.id)} className="h-7 text-[10px] gap-1">
                        <Plus className="size-3" /> Add option
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addQuestion} disabled={disabled} className="text-xs gap-1 h-8 w-full">
        <Plus className="size-3.5" /> Add question
      </Button>

      {v.totalPoints > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
          <Award className="size-3.5" /> Quiz total: {v.totalPoints} points
        </div>
      )}
    </div>
  );
}

export default QuizBuilder;
