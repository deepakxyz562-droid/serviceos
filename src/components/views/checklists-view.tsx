'use client';

/**
 * ChecklistBuilder — Jobber-style full-page checklist editor.
 *
 * Layout (matches the "New checklist" screenshot):
 *  • Top bar: title, Preview/Edit toggle, Mobile/Desktop icons, Cancel/Save
 *  • Left panel: sections, each with its questions and an "+ Add Question" button
 *  • Right panel "Manage checklist":
 *      - Form title input
 *      - Auto-attach to new jobs / new assessments toggles
 *      - "Add section" button
 *      - Custom questions palette (click to add a question of that type):
 *          Short answer, Long answer, Dropdown (single choice), Checkbox, Numerical answer
 *
 * The builder is opened from the Job form ("Create a Checklist" link) and from
 * a top-level "Checklists" affordance. On Save it POSTs/PUTs to /api/checklists.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Plus, Trash2, MoreVertical, GripVertical, RefreshCw,
  Type, AlignLeft, ChevronDown, CheckSquare, Hash, Pencil, Eye,
  Monitor, Smartphone, Save, X, ShieldCheck, Sparkles,
  ClipboardCheck, HardHat, Search, Copy, Check, FileCheck, Info, Tag,
  Clock, Loader2, Wrench, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TRADE_SAFETY_PRESETS, type TradeSafetyPreset } from '@/lib/checklists/trade-safety-presets';

// ─── Types ────────────────────────────────────────────────────────────────

export type QuestionType =
  | 'short_answer'
  | 'long_answer'
  | 'dropdown'
  | 'checkbox'
  | 'numerical';

export type ChecklistScope = 'job' | 'pre_start';

export interface ChecklistQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options: string[]; // for dropdown
}

export interface ChecklistSection {
  id: string;
  title: string;
  questions: ChecklistQuestion[];
}

export interface ChecklistData {
  id?: string;
  title: string;
  category?: string;
  autoAttachJobs: boolean;
  autoAttachAssessments: boolean;
  sections: ChecklistSection[];
  scope?: ChecklistScope;
  updatedAt?: string;
}

export function isPrestartChecklist(c: { title?: string; category?: string }): boolean {
  const cat = (c.category || '').toLowerCase();
  const title = (c.title || '').toLowerCase();
  return (
    cat.includes('safety') ||
    cat.includes('pre-start') ||
    cat.includes('prestart') ||
    cat.includes('swms') ||
    title.includes('pre-start') ||
    title.includes('prestart') ||
    title.includes('start time') ||
    title.includes('start-time') ||
    title.includes('clock-in') ||
    title.includes('safety inspection')
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const QUESTION_TYPE_META: Record<
  QuestionType,
  { label: string; icon: typeof Type; hint: string }
> = {
  short_answer: { label: 'Short answer', icon: Type, hint: 'Single-line text' },
  long_answer: { label: 'Long answer', icon: AlignLeft, hint: 'Multi-line text' },
  dropdown: { label: 'Dropdown (single choice)', icon: ChevronDown, hint: 'Pick one from a list' },
  checkbox: { label: 'Checkbox', icon: CheckSquare, hint: 'Yes/No toggle' },
  numerical: { label: 'Numerical answer', icon: Hash, hint: 'Numbers only' },
};

const QUESTION_ORDER: QuestionType[] = [
  'short_answer',
  'long_answer',
  'dropdown',
  'checkbox',
  'numerical',
];

function makeQuestion(type: QuestionType): ChecklistQuestion {
  return {
    id: newId(),
    type,
    label: '',
    required: false,
    options: type === 'dropdown' ? ['Option 1', 'Option 2'] : [],
  };
}

function makeSection(title = 'Untitled section'): ChecklistSection {
  return { id: newId(), title, questions: [] };
}

export function parseChecklistSections(json: string | null | undefined): ChecklistSection[] {
  try {
    const parsed = json ? JSON.parse(json) : []
    if (!Array.isArray(parsed)) return []
    return parsed as ChecklistSection[]
  } catch {
    return []
  }
}

// ─── Builder component ────────────────────────────────────────────────────

export function ChecklistBuilder({
  initial = null,
  initialScope = 'job',
  onCancel = () => {},
  onSaved = () => {},
}: {
  initial?: ChecklistData | null;
  initialScope?: ChecklistScope;
  onCancel?: () => void;
  onSaved?: (saved: ChecklistData) => void;
} = {}) {
  const detectedScope: ChecklistScope = initial
    ? (isPrestartChecklist(initial) ? 'pre_start' : 'job')
    : initialScope;
  const [scope, setScope] = useState<ChecklistScope>(detectedScope);
  const [title, setTitle] = useState(
    initial?.title || (detectedScope === 'pre_start' ? 'Daily Pre-Start Safety & Vehicle Checklist' : 'New checklist')
  );
  const [category, setCategory] = useState(
    initial?.category || (detectedScope === 'pre_start' ? 'Safety' : 'General')
  );
  const [autoAttachJobs, setAutoAttachJobs] = useState(initial?.autoAttachJobs ?? false);
  const [autoAttachAssessments, setAutoAttachAssessments] = useState(initial?.autoAttachAssessments ?? false);
  const [sections, setSections] = useState<ChecklistSection[]>(
    initial?.sections && initial.sections.length > 0 ? initial.sections : [makeSection('Section 1')],
  );
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [saving, setSaving] = useState(false);

  const loadPreset = (preset: TradeSafetyPreset) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setAutoAttachJobs(preset.autoAttachJobs);
    const hydrated: ChecklistSection[] = preset.sections.map((sec) => ({
      id: newId(),
      title: sec.title,
      questions: sec.questions.map((q) => ({
        id: newId(),
        type: q.type,
        label: q.label,
        required: q.required,
        options: [...q.options],
      })),
    }));
    setSections(hydrated);
    toast.success(`Loaded "${preset.title}" template`);
  };

  const loadDailyPrestartPreset = () => {
    setScope('pre_start');
    setTitle('Daily Pre-Start Safety & Vehicle Checklist');
    setCategory('Safety');
    setAutoAttachJobs(false);
    setAutoAttachAssessments(false);
    setSections([
      {
        id: newId(),
        title: '1. Personal Protective Equipment (PPE)',
        questions: [
          { id: newId(), type: 'checkbox', label: 'Steel-cap safety work boots inspected and worn', required: true, options: [] },
          { id: newId(), type: 'checkbox', label: 'Eye protection and trade-specific safety gloves equipped', required: true, options: [] },
          { id: newId(), type: 'checkbox', label: 'High-visibility vest or compliant branded uniform worn', required: true, options: [] },
        ],
      },
      {
        id: newId(),
        title: '2. Vehicle & Tool Roadworthiness',
        questions: [
          { id: newId(), type: 'checkbox', label: 'Vehicle safety check complete (Tires, mirrors, fluids & lights)', required: true, options: [] },
          { id: newId(), type: 'checkbox', label: 'Ladders & heavy cargo securely strapped and locked down', required: true, options: [] },
          { id: newId(), type: 'checkbox', label: 'Power tools, test instruments & leads inspected (Undamaged & tagged)', required: true, options: [] },
        ],
      },
      {
        id: newId(),
        title: '3. Site Safety & Emergency Readiness',
        questions: [
          { id: newId(), type: 'checkbox', label: 'First aid kit stocked and easily accessible in vehicle', required: true, options: [] },
          { id: newId(), type: 'checkbox', label: 'Supervisor contact & local emergency numbers confirmed', required: true, options: [] },
          { id: newId(), type: 'checkbox', label: 'Fit for work (Well-rested, alert, zero impairment/medication risks)', required: true, options: [] },
        ],
      },
    ]);
    toast.success('Loaded Standard Mobile Pre-Start Template');
  };

  // ── Section / question mutations ─────────────────────────────────────
  const addSection = () => {
    setSections((prev) => [...prev, makeSection(`Section ${prev.length + 1}`)]);
  };

  const updateSectionTitle = (secId: string, t: string) => {
    setSections((prev) => prev.map((s) => (s.id === secId ? { ...s, title: t } : s)));
  };

  const removeSection = (secId: string) => {
    setSections((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== secId)));
  };

  const addQuestion = (secId: string, type: QuestionType) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === secId ? { ...s, questions: [...s.questions, makeQuestion(type)] } : s,
      ),
    );
  };

  const updateQuestion = (secId: string, qId: string, patch: Partial<ChecklistQuestion>) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === secId
          ? { ...s, questions: s.questions.map((q) => (q.id === qId ? { ...q, ...patch } : q)) }
          : s,
      ),
    );
  };

  const removeQuestion = (secId: string, qId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === secId ? { ...s, questions: s.questions.filter((q) => q.id !== qId) } : s,
      ),
    );
  };

  const addOption = (secId: string, qId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === secId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === qId ? { ...q, options: [...q.options, `Option ${q.options.length + 1}`] } : q,
              ),
            }
          : s,
      ),
    );
  };

  const updateOption = (secId: string, qId: string, optIdx: number, value: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === secId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === qId
                  ? { ...q, options: q.options.map((o, i) => (i === optIdx ? value : o)) }
                  : q,
              ),
            }
          : s,
      ),
    );
  };

  const removeOption = (secId: string, qId: string, optIdx: number) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === secId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === qId
                  ? { ...q, options: q.options.filter((_, i) => i !== optIdx) }
                  : q,
              ),
            }
          : s,
      ),
    );
  };

  // ── Save ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Checklist title is required');
      return;
    }
    setSaving(true);
    try {
      const resolvedCategory = scope === 'pre_start' && category === 'General' ? 'Safety' : (category.trim() || 'General');
      const payload = {
        title: title.trim(),
        category: resolvedCategory,
        autoAttachJobs: scope === 'pre_start' ? false : autoAttachJobs,
        autoAttachAssessments,
        sectionsJson: JSON.stringify(sections),
      };
      let res: Response;
      if (initial?.id) {
        res = await fetch(`/api/checklists/${initial.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/checklists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save checklist');
      }
      const saved = await res.json();
      toast.success(initial?.id ? 'Checklist updated' : 'Checklist created');
      onSaved({
        id: saved.id,
        title: saved.title,
        category: saved.category,
        autoAttachJobs: saved.autoAttachJobs,
        autoAttachAssessments: saved.autoAttachAssessments,
        sections,
        scope,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* ─── Top bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 sticky top-0 z-10 -mx-3 px-3 sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6 py-3 bg-background border-b flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1 shrink-0 min-h-[44px]">
            <ArrowLeft className="size-4" /> Back
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold leading-tight truncate">
                {initial?.id ? 'Edit checklist' : 'New checklist'}
              </h2>
              <Badge
                variant="outline"
                className={cn(
                  "text-[11px] px-2 py-0.5 font-medium hidden sm:inline-flex",
                  scope === 'pre_start'
                    ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                    : "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                )}
              >
                {scope === 'pre_start' ? (
                  <>
                    <HardHat className="size-3 mr-1 text-amber-600" /> Mobile Start-Time
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="size-3 mr-1 text-blue-600" /> Job Checklist
                  </>
                )}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {scope === 'pre_start'
                ? 'Mobile app daily clock-in safety and vehicle readiness verification'
                : 'Reusable on-site job completion and quality control checklist'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {/* Preview / Edit toggle */}
          <div className="flex items-center rounded-md border p-0.5">
            <Button
              size="sm"
              variant={mode === 'preview' ? 'default' : 'ghost'}
              className="h-9 text-xs"
              onClick={() => setMode('preview')}
            >
              <Eye className="size-3 mr-1" /> Preview
            </Button>
            <Button
              size="sm"
              variant={mode === 'edit' ? 'default' : 'ghost'}
              className="h-9 text-xs"
              onClick={() => setMode('edit')}
            >
              <Pencil className="size-3 mr-1" /> Edit
            </Button>
          </div>
          {/* Device toggle */}
          <div className="hidden sm:flex items-center rounded-md border p-0.5">
            <Button
              size="sm"
              variant={device === 'mobile' ? 'default' : 'ghost'}
              className="h-9 w-9 p-0"
              onClick={() => setDevice('mobile')}
              title="Mobile preview"
            >
              <Smartphone className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant={device === 'desktop' ? 'default' : 'ghost'}
              className="h-9 w-9 p-0"
              onClick={() => setDevice('desktop')}
              title="Desktop preview"
            >
              <Monitor className="size-3.5" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <Button variant="outline" onClick={onCancel} className="min-h-[44px]">
            <X className="size-4 mr-1" /> Cancel
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]" onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw className="size-4 mr-1 animate-spin" /> : <Save className="size-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      {/* ─── Two-panel layout ───────────────────────────────────────── */}
      <div className={cn('grid gap-4', 'lg:grid-cols-[1fr_320px]')}>
        {/* ── Left: section editor / preview ─────────────────────────── */}
        <div className={cn(device === 'mobile' && 'max-w-md mx-auto w-full')}>
          {mode === 'edit' ? (
            <div className="space-y-4">
              {sections.map((sec, secIdx) => (
                <Card key={sec.id}>
                  <CardContent className="p-5 space-y-4">
                    {/* Section header */}
                    <div className="flex items-center gap-2">
                      <GripVertical className="size-4 text-muted-foreground/50" />
                      <Input
                        value={sec.title}
                        onChange={(e) => updateSectionTitle(sec.id, e.target.value)}
                        className="font-semibold border-0 px-0 h-auto py-0 focus-visible:ring-0 text-base"
                        placeholder={`Section ${secIdx + 1}`}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 shrink-0">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-700 focus:bg-red-50"
                            disabled={sections.length <= 1}
                            onClick={() => removeSection(sec.id)}
                          >
                            <Trash2 className="size-4 mr-2" /> Delete section
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Questions */}
                    <div className="space-y-3 pl-6">
                      {sec.questions.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">
                          No questions yet. Click a question type on the right, or use the button below.
                        </p>
                      )}
                      {sec.questions.map((q, qIdx) => {
                        const meta = QUESTION_TYPE_META[q.type];
                        const Icon = meta.icon;
                        return (
                          <div key={q.id} className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                            <div className="flex items-center gap-2">
                              <Icon className="size-4 text-emerald-600 shrink-0" />
                              <Input
                                value={q.label}
                                onChange={(e) => updateQuestion(sec.id, q.id, { label: e.target.value })}
                                placeholder={`Question ${qIdx + 1} — ${meta.label}`}
                                className="h-8 text-sm"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 shrink-0 text-red-500 hover:text-red-600"
                                onClick={() => removeQuestion(sec.id, q.id)}
                                title="Remove question"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>

                            {/* Type-specific preview / options editor */}
                            {q.type === 'short_answer' && (
                              <Input disabled placeholder="Short answer text" className="h-8 text-xs bg-background" />
                            )}
                            {q.type === 'long_answer' && (
                              <Textarea disabled placeholder="Long answer text" rows={2} className="text-xs bg-background" />
                            )}
                            {q.type === 'numerical' && (
                              <Input disabled type="number" placeholder="0" className="h-8 text-xs bg-background" />
                            )}
                            {q.type === 'checkbox' && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <CheckSquare className="size-3.5" /> Yes / No toggle
                              </div>
                            )}
                            {q.type === 'dropdown' && (
                              <div className="space-y-1.5 pl-1">
                                {q.options.map((opt, optIdx) => (
                                  <div key={optIdx} className="flex items-center gap-2">
                                    <span className="size-2 rounded-full bg-muted-foreground/40 shrink-0" />
                                    <Input
                                      value={opt}
                                      onChange={(e) => updateOption(sec.id, q.id, optIdx, e.target.value)}
                                      className="h-7 text-xs bg-background"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-6 shrink-0 text-red-500 hover:text-red-600"
                                      onClick={() => removeOption(sec.id, q.id, optIdx)}
                                      disabled={q.options.length <= 1}
                                    >
                                      <X className="size-3" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-emerald-700 hover:text-emerald-800 px-2"
                                  onClick={() => addOption(sec.id, q.id)}
                                >
                                  <Plus className="size-3 mr-1" /> Add option
                                </Button>
                              </div>
                            )}

                            {/* Required toggle */}
                            <label className="flex items-center gap-2 text-xs text-muted-foreground pl-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={q.required}
                                onChange={(e) => updateQuestion(sec.id, q.id, { required: e.target.checked })}
                                className="size-3.5 rounded border-muted-foreground/40"
                              />
                              Required
                            </label>
                          </div>
                        );
                      })}

                      {/* Add question dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full border-dashed text-muted-foreground">
                            <Plus className="size-4 mr-1" /> Add Question
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-60">
                          {QUESTION_ORDER.map((t) => {
                            const m = QUESTION_TYPE_META[t];
                            const Icon = m.icon;
                            return (
                              <DropdownMenuItem key={t} onClick={() => addQuestion(sec.id, t)}>
                                <Icon className="size-4 mr-2 text-emerald-600" />
                                <div className="flex flex-col">
                                  <span className="text-sm">{m.label}</span>
                                  <span className="text-[10px] text-muted-foreground">{m.hint}</span>
                                </div>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {sections.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    No sections yet. Click <span className="font-medium text-foreground">Add section</span> on the right to begin.
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            /* ── Preview mode ── */
            <Card>
              <CardContent className="p-6 space-y-5">
                <h2 className="text-xl font-bold">{title || 'Untitled checklist'}</h2>
                <Separator />
                {sections.map((sec) => (
                  <div key={sec.id} className="space-y-3">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{sec.title}</h3>
                    {sec.questions.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No questions in this section.</p>
                    )}
                    {sec.questions.map((q) => (
                      <div key={q.id} className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          {q.label || <span className="text-muted-foreground italic">Untitled question</span>}
                          {q.required && <span className="text-red-500 ml-0.5">*</span>}
                        </Label>
                        {q.type === 'short_answer' && <Input disabled placeholder="Short answer" className="bg-muted/30" />}
                        {q.type === 'long_answer' && <Textarea disabled placeholder="Long answer" rows={2} className="bg-muted/30" />}
                        {q.type === 'numerical' && <Input disabled type="number" placeholder="0" className="bg-muted/30" />}
                        {q.type === 'checkbox' && (
                          <label className="flex items-center gap-2 text-sm text-muted-foreground">
                            <input type="checkbox" disabled className="size-4 rounded" /> Yes
                          </label>
                        )}
                        {q.type === 'dropdown' && (
                          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground flex items-center justify-between">
                            <span>Select an option...</span>
                            <ChevronDown className="size-4" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right: Manage checklist ────────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold">Manage checklist</h3>
              <Separator />

              {/* ── Checklist Scope Selector: Job vs Start-Time ── */}
              <div className="space-y-2 p-3 rounded-lg border bg-muted/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Checklist Scope</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] uppercase font-bold",
                      scope === 'pre_start'
                        ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300"
                    )}
                  >
                    {scope === 'pre_start' ? 'Mobile Start-Time' : 'Job Checklist'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-background rounded-md border text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setScope('job');
                      if (category === 'Safety') setCategory('General');
                    }}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1.5 rounded font-medium transition-all",
                      scope === 'job'
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <ClipboardCheck className="size-3.5" /> Job Checklist
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScope('pre_start');
                      if (category === 'General') setCategory('Safety');
                    }}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1.5 rounded font-medium transition-all",
                      scope === 'pre_start'
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <HardHat className="size-3.5" /> Mobile Pre-Start
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  {scope === 'job'
                    ? 'Completed on-site during a customer work order (quality check, photos, sign-off).'
                    : 'Prompted once daily on mobile app clock-in to verify PPE, vehicle, and tool safety.'}
                </p>
              </div>

              {/* ── 1-Click Standard Pre-Start Template ── */}
              {scope === 'pre_start' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadDailyPrestartPreset}
                  className="w-full text-xs border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-300 justify-start"
                >
                  <HardHat className="size-3.5 mr-2 text-amber-600" />
                  Load Standard Pre-Start (PPE & Vehicle)
                </Button>
              )}

              {/* ── Trade Safety (SWMS) Presets 1-Click Loader ── */}
              <div className="space-y-1.5 p-3 rounded-lg border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-600" /> Trade Safety (SWMS)
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">1-Click Templates</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between text-xs h-8 bg-background border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/50"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Sparkles className="size-3 text-emerald-600 shrink-0" />
                        Load Safety Template...
                      </span>
                      <ChevronDown className="size-3 opacity-60 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    {TRADE_SAFETY_PRESETS.map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        onClick={() => loadPreset(p)}
                        className="flex flex-col items-start py-2 cursor-pointer gap-0.5"
                      >
                        <div className="font-medium text-xs text-foreground flex items-center gap-1.5">
                          <ShieldCheck className="size-3 text-emerald-600 shrink-0" />
                          {p.title}
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">
                          {p.description}
                        </p>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cl-title">Form title</Label>
                <Input
                  id="cl-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="New checklist"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cl-category">Category</Label>
                <Input
                  id="cl-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. AC Service, Generator Maintenance, General"
                  list="cl-category-suggestions"
                />
                <datalist id="cl-category-suggestions">
                  <option value="General" />
                  <option value="AC Service" />
                  <option value="Generator Maintenance" />
                  <option value="Plumbing" />
                  <option value="Electrical" />
                  <option value="Solar" />
                  <option value="Water Purifier" />
                </datalist>
                <p className="text-[11px] text-muted-foreground">
                  Group templates by service type for easy lookup.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="cl-auto-jobs" className="text-xs font-normal cursor-pointer leading-tight">
                    Automatically attach to new jobs
                  </Label>
                  <Switch id="cl-auto-jobs" checked={autoAttachJobs} onCheckedChange={setAutoAttachJobs} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="cl-auto-asmt" className="text-xs font-normal cursor-pointer leading-tight">
                    Automatically attach to new assessments
                  </Label>
                  <Switch id="cl-auto-asmt" checked={autoAttachAssessments} onCheckedChange={setAutoAttachAssessments} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Auto-attach commonly used checklists to save time
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold">Checklist contents</h3>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Layout options</Label>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={addSection}>
                  <Plus className="size-4 mr-2" /> Add section
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Custom questions</Label>
                <p className="text-[11px] text-muted-foreground -mt-1">
                  Select the type of question you'd like to ask
                </p>
                <div className="space-y-1.5">
                  {QUESTION_ORDER.map((t) => {
                    const m = QUESTION_TYPE_META[t];
                    const Icon = m.icon;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          // Add to the last section (create one if none)
                          if (sections.length === 0) {
                            const s = makeSection('Section 1');
                            setSections([s]);
                            setTimeout(() => addQuestion(s.id, t), 0);
                          } else {
                            addQuestion(sections[sections.length - 1].id, t);
                          }
                        }}
                        className="w-full flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted/40 transition-colors text-left"
                      >
                        <Icon className="size-4 text-emerald-600 shrink-0" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Compact "attach existing checklist" picker (used in job form) ────────

export function ChecklistAttachPicker({
  checklists,
  selectedIds,
  onChange,
  onCreateNew,
}: {
  checklists: { id: string; title: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreateNew: () => void;
}) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-2">
      {checklists.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          No checklist attached yet.
        </div>
      ) : (
        <div className="space-y-1.5">
          {checklists.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(c.id)}
                onChange={() => toggle(c.id)}
                className="size-4 rounded border-muted-foreground/40"
              />
              <span className="truncate">{c.title}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Checklists Management View ───────────────────────────────────────────
// Comprehensive management view with clear distinction between Job Checklists
// and Mobile App Start-Time Checklists.

export function ChecklistsView() {
  const [checklists, setChecklists] = useState<ChecklistData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'job' | 'pre_start'>('all');
  const [search, setSearch] = useState('');
  const [editingChecklist, setEditingChecklist] = useState<ChecklistData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createScope, setCreateScope] = useState<ChecklistScope>('job');

  const fetchChecklists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checklists');
      if (!res.ok) throw new Error('Failed to fetch checklists');
      const data = await res.json();
      const mapped: ChecklistData[] = (Array.isArray(data) ? data : []).map((item: any) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        autoAttachJobs: item.autoAttachJobs,
        autoAttachAssessments: item.autoAttachAssessments,
        sections: parseChecklistSections(item.sectionsJson),
        updatedAt: item.updatedAt,
      }));
      setChecklists(mapped);
    } catch (err) {
      toast.error('Failed to load checklists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChecklists();
  }, [fetchChecklists]);

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/checklists/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete checklist');
      toast.success('Checklist deleted');
      fetchChecklists();
    } catch {
      toast.error('Failed to delete checklist');
    }
  };

  const handleDuplicate = async (item: ChecklistData, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${item.title} (Copy)`,
          category: item.category || 'General',
          autoAttachJobs: false,
          autoAttachAssessments: false,
          sectionsJson: JSON.stringify(item.sections),
        }),
      });
      if (!res.ok) throw new Error('Failed to duplicate checklist');
      toast.success('Checklist duplicated');
      fetchChecklists();
    } catch {
      toast.error('Failed to duplicate checklist');
    }
  };

  const filtered = useMemo(() => {
    return checklists.filter((c) => {
      const isPrestart = isPrestartChecklist(c);
      if (activeTab === 'job' && isPrestart) return false;
      if (activeTab === 'pre_start' && !isPrestart) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesCat = (c.category || '').toLowerCase().includes(q);
        return matchesTitle || matchesCat;
      }
      return true;
    });
  }, [checklists, activeTab, search]);

  const jobCount = useMemo(() => checklists.filter((c) => !isPrestartChecklist(c)).length, [checklists]);
  const prestartCount = useMemo(() => checklists.filter((c) => isPrestartChecklist(c)).length, [checklists]);

  if (isCreating || editingChecklist) {
    return (
      <ChecklistBuilder
        initial={editingChecklist}
        initialScope={createScope}
        onCancel={() => {
          setIsCreating(false);
          setEditingChecklist(null);
        }}
        onSaved={() => {
          setIsCreating(false);
          setEditingChecklist(null);
          fetchChecklists();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Checklists & Procedures</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Differentiate between job execution checklists and morning start-time safety routines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setEditingChecklist(null);
              setCreateScope('job');
              setIsCreating(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            size="sm"
          >
            <ClipboardCheck className="size-4" /> New Job Checklist
          </Button>
          <Button
            onClick={() => {
              setEditingChecklist(null);
              setCreateScope('pre_start');
              setIsCreating(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            size="sm"
          >
            <HardHat className="size-4" /> New Start-Time Checklist
          </Button>
        </div>
      </div>

      {/* ─── Clear Differentiation Banner (Job vs Mobile Pre-Start) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 p-4">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              <ClipboardCheck className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Job Checklists (Work Orders)</h3>
              <span className="text-[11px] text-blue-700/80 dark:text-blue-300/80">Completed during on-site customer visits</span>
            </div>
          </div>
          <p className="text-xs text-blue-800/90 dark:text-blue-300/90 leading-relaxed">
            Attach to specific job types or work orders. Technicians follow step-by-step service tasks, record numerical readings, upload verification photos, and obtain customer sign-offs.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
              <HardHat className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Mobile Start-Time Checklist</h3>
              <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80">Prompted once daily on employee app startup</span>
            </div>
          </div>
          <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
            Field technicians must verify PPE readiness, vehicle fluid/tire roadworthiness, and tool tagging every morning before commencing their shift on the Fieseros mobile app.
          </p>
        </div>
      </div>

      {/* ─── Filters & Search ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Scope Tabs */}
        <div className="flex items-center rounded-lg border bg-muted/40 p-1 text-xs gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-3 py-1.5 rounded-md font-medium transition-colors",
              activeTab === 'all'
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All Checklists ({checklists.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('job')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors",
              activeTab === 'job'
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ClipboardCheck className="size-3.5" /> Job ({jobCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pre_start')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors",
              activeTab === 'pre_start'
                ? "bg-amber-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <HardHat className="size-3.5" /> Mobile Start-Time ({prestartCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative sm:w-64">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search checklists..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* ─── List of Checklists ──────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading checklists…</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <ClipboardCheck className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No checklists found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
              {search
                ? `No templates match "${search}". Try clearing your search.`
                : activeTab === 'pre_start'
                ? 'Create a morning safety checklist to verify PPE and vehicles when technicians clock in.'
                : 'Create job checklists to standardize quality and steps across work orders.'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingChecklist(null);
                  setCreateScope('job');
                  setIsCreating(true);
                }}
              >
                + New Job Checklist
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => {
                  setEditingChecklist(null);
                  setCreateScope('pre_start');
                  setIsCreating(true);
                }}
              >
                + New Start-Time Checklist
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const isPrestart = isPrestartChecklist(item);
            const totalQuestions = item.sections.reduce((acc, s) => acc + s.questions.length, 0);

            return (
              <Card
                key={item.id}
                onClick={() => setEditingChecklist(item)}
                className="cursor-pointer hover:shadow-md transition-all border border-border group flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5",
                        isPrestart
                          ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300"
                      )}
                    >
                      {isPrestart ? (
                        <span className="flex items-center gap-1">
                          <HardHat className="size-3" /> Mobile Start-Time
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <ClipboardCheck className="size-3" /> Job Checklist
                        </span>
                      )}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {item.category || 'General'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-blue-600 transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isPrestart
                        ? 'Prompts technicians on mobile app start'
                        : item.autoAttachJobs
                        ? 'Auto-attaches to all new jobs'
                        : 'Manual attachment on work orders'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <span>{item.sections.length} {item.sections.length === 1 ? 'section' : 'sections'}</span>
                    <span>•</span>
                    <span>{totalQuestions} {totalQuestions === 1 ? 'question' : 'questions'}</span>
                  </div>
                </CardContent>

                <div className="px-5 py-3 bg-muted/20 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Click to edit</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      onClick={(e) => handleDuplicate(item, e)}
                      title="Duplicate checklist"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-red-600"
                      onClick={(e) => handleDelete(item.id!, item.title, e)}
                      title="Delete checklist"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ChecklistsView;
