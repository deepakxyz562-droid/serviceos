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

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Plus, Trash2, MoreVertical, GripVertical, RefreshCw,
  Type, AlignLeft, ChevronDown, CheckSquare, Hash, Pencil, Eye,
  Monitor, Smartphone, Save, X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────

export type QuestionType =
  | 'short_answer'
  | 'long_answer'
  | 'dropdown'
  | 'checkbox'
  | 'numerical';

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
  autoAttachJobs: boolean;
  autoAttachAssessments: boolean;
  sections: ChecklistSection[];
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
  initial,
  onCancel,
  onSaved,
}: {
  initial: ChecklistData | null;
  onCancel: () => void;
  onSaved: (saved: ChecklistData) => void;
}) {
  const [title, setTitle] = useState(initial?.title || 'New checklist');
  const [autoAttachJobs, setAutoAttachJobs] = useState(initial?.autoAttachJobs ?? false);
  const [autoAttachAssessments, setAutoAttachAssessments] = useState(initial?.autoAttachAssessments ?? false);
  const [sections, setSections] = useState<ChecklistSection[]>(
    initial?.sections && initial.sections.length > 0 ? initial.sections : [makeSection('Section 1')],
  );
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [saving, setSaving] = useState(false);

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
      const payload = {
        title: title.trim(),
        autoAttachJobs,
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
        autoAttachJobs: saved.autoAttachJobs,
        autoAttachAssessments: saved.autoAttachAssessments,
        sections,
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
      <div className="flex items-center justify-between gap-3 sticky top-0 z-10 -mx-4 px-4 py-3 bg-background/80 backdrop-blur border-b">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1 shrink-0">
            <ArrowLeft className="size-4" /> Back
          </Button>
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight truncate">
              {initial?.id ? 'Edit checklist' : 'New checklist'}
            </h2>
            <p className="text-xs text-muted-foreground">Build a reusable on-site checklist</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Preview / Edit toggle */}
          <div className="flex items-center rounded-md border p-0.5">
            <Button
              size="sm"
              variant={mode === 'preview' ? 'default' : 'ghost'}
              className="h-7 text-xs"
              onClick={() => setMode('preview')}
            >
              <Eye className="size-3 mr-1" /> Preview
            </Button>
            <Button
              size="sm"
              variant={mode === 'edit' ? 'default' : 'ghost'}
              className="h-7 text-xs"
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
              className="h-7 w-7 p-0"
              onClick={() => setDevice('mobile')}
              title="Mobile preview"
            >
              <Smartphone className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant={device === 'desktop' ? 'default' : 'ghost'}
              className="h-7 w-7 p-0"
              onClick={() => setDevice('desktop')}
              title="Desktop preview"
            >
              <Monitor className="size-3.5" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" onClick={onCancel}>
            <X className="size-4 mr-1" /> Cancel
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
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
              <div className="grid gap-2">
                <Label htmlFor="cl-title">Form title</Label>
                <Input
                  id="cl-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="New checklist"
                />
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
          No checklists yet. <button type="button" className="text-emerald-700 font-medium hover:underline" onClick={onCreateNew}>Create your first checklist →</button>
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
      <Button type="button" variant="outline" size="sm" onClick={onCreateNew} className="w-full border-dashed">
        <Plus className="size-4 mr-1" /> Create a new checklist
      </Button>
    </div>
  );
}
