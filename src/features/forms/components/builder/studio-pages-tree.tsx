'use client';

import React, { useState } from 'react';
import {
  Layers,
  Plus,
  PanelLeftClose,
  MoreVertical,
  Trash2,
  Copy,
  Sparkles,
  FileText,
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  PenTool,
  CheckSquare,
  ShieldCheck,
  MapPin,
  Star,
  Clock,
  Briefcase,
  HelpCircle,
  Lightbulb,
  Flag,
  ArrowUp,
  ArrowDown,
  Edit2,
  Check,
  X,
  SlidersHorizontal,
  ChevronRight,
  MoveRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { getFieldById } from '@/lib/forms/field-registry';
import { resolveIcon } from '@/lib/forms/icon-resolver';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { EditorFormData, FormField } from '@/features/forms/types';

interface StudioPagesTreeProps {
  formData: EditorFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<EditorFormData>>;
  currentStepIndex: number;
  onSelectStep: (stepIndex: number) => void;
  selectedFieldId: string | null;
  onSelectField: (fieldId: string) => void;
  onOpenAddWidgetDialog: (stepIndex: number, stepId?: string) => void;
  onClose?: () => void;
  hasWelcomeScreen?: boolean;
  onToggleWelcomeScreen?: () => void;
  className?: string;
}

export function StudioPagesTree({
  formData,
  onFormDataChange,
  currentStepIndex,
  onSelectStep,
  selectedFieldId,
  onSelectField,
  onOpenAddWidgetDialog,
  onClose,
  hasWelcomeScreen = false,
  onToggleWelcomeScreen,
  className = '',
}: StudioPagesTreeProps) {
  const fields = formData.fields || [];
  const isMultiStep = formData.isMultiStep ?? true;

  // Normalized Steps from formData or sensible fallback
  const rawSteps = formData.steps && formData.steps.length > 0
    ? formData.steps
    : [{ id: 'step_1', title: 'Step 1: General Details' }];

  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepTitle, setEditingStepTitle] = useState('');

  // Group fields by explicit stepId
  const stepsWithFields = React.useMemo(() => {
    return rawSteps.map((step, idx) => {
      const stepFields = fields.filter((f) => {
        if (!f.stepId) return idx === 0;
        return f.stepId === step.id;
      });
      return {
        ...step,
        fields: stepFields,
      };
    });
  }, [rawSteps, fields]);

  // Toggle multi-step vs single-page
  const handleToggleMultiStep = (enabled: boolean) => {
    onFormDataChange((prev) => ({
      ...prev,
      isMultiStep: enabled,
      steps: enabled && (!prev.steps || prev.steps.length === 0)
        ? [{ id: 'step_1', title: 'Step 1: Contact Details' }, { id: 'step_2', title: 'Step 2: Requirements' }]
        : prev.steps,
    }));
    toast.success(enabled ? 'Enabled Multi-Step Stepper' : 'Switched to Single Page Form');
  };

  // Add Step
  const handleAddStep = () => {
    const nextIdx = rawSteps.length + 1;
    const newStepId = `step_${Date.now()}`;
    const newStep = {
      id: newStepId,
      title: `Step ${nextIdx}: Details`,
    };

    onFormDataChange((prev) => {
      const currentSteps = prev.steps && prev.steps.length > 0 ? prev.steps : [{ id: 'step_1', title: 'Step 1: Details' }];
      return {
        ...prev,
        isMultiStep: true,
        steps: [...currentSteps, newStep],
      };
    });

    onSelectStep(rawSteps.length);
    toast.success(`Created ${newStep.title}`);
  };

  // Delete Step
  const handleDeleteStep = (stepIdToDelete: string, sIdx: number) => {
    if (rawSteps.length <= 1) {
      toast.error('A form must have at least one step');
      return;
    }

    onFormDataChange((prev) => {
      const remainingSteps = (prev.steps || []).filter((s) => s.id !== stepIdToDelete);
      const fallbackStepId = remainingSteps[Math.max(0, sIdx - 1)]?.id || remainingSteps[0]?.id || 'step_1';

      // Reassign orphan fields to fallback step
      const updatedFields = prev.fields.map((f) =>
        f.stepId === stepIdToDelete ? { ...f, stepId: fallbackStepId } : f
      );

      return {
        ...prev,
        steps: remainingSteps,
        fields: updatedFields,
      };
    });

    onSelectStep(Math.max(0, sIdx - 1));
    toast.info('Step removed (fields moved to previous step)');
  };

  // Move Step Up/Down
  const handleMoveStep = (sIdx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? sIdx - 1 : sIdx + 1;
    if (targetIdx < 0 || targetIdx >= rawSteps.length) return;

    onFormDataChange((prev) => {
      const copy = [...(prev.steps || rawSteps)];
      const temp = copy[sIdx];
      copy[sIdx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return {
        ...prev,
        steps: copy,
      };
    });

    onSelectStep(targetIdx);
  };

  // Save Inline Step Rename
  const handleSaveStepTitle = (stepId: string) => {
    if (!editingStepTitle.trim()) {
      setEditingStepId(null);
      return;
    }
    onFormDataChange((prev) => ({
      ...prev,
      steps: (prev.steps || rawSteps).map((s) =>
        s.id === stepId ? { ...s, title: editingStepTitle.trim() } : s
      ),
    }));
    setEditingStepId(null);
    toast.success('Step renamed');
  };

  // Move Field to Another Step
  const handleMoveFieldToStep = (fieldId: string, targetStepId: string) => {
    onFormDataChange((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, stepId: targetStepId } : f)),
    }));
    toast.success('Field moved to new step');
  };

  const getFieldMeta = (field: FormField) => {
    const rawType = (field as any).widgetType || field.type;
    const def = getFieldById(rawType);
    const Icon = def?.iconName ? resolveIcon(def.iconName) : getFieldIcon(field.type);
    const widgetName = def?.name || field.type?.replace(/_/g, ' ');
    return { Icon, widgetName };
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'name':
      case 'short_answer':
        return User;
      case 'email':
        return Mail;
      case 'phone':
        return Phone;
      case 'date':
        return Calendar;
      case 'signature':
        return PenTool;
      case 'payment':
      case 'stripe_card':
        return CreditCard;
      case 'address':
        return MapPin;
      case 'rating':
        return Star;
      default:
        return FileText;
    }
  };

  const getLetterBadge = (index: number) => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    return letters[index % letters.length];
  };

  return (
    <aside
      className={`w-72 md:w-80 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 shrink-0 h-full overflow-hidden select-none z-20 shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <Layers className="size-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-foreground leading-tight">Pages &amp; Stepper</h3>
            <p className="text-[10px] text-muted-foreground">
              {isMultiStep ? `${stepsWithFields.length} Steps` : 'Single Page Mode'} • {fields.length} Questions
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Hide Pages Tree"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      {/* Multi-Step Switch Toolbar */}
      <div className="p-2.5 px-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30 flex items-center justify-between shrink-0">
        <span className="text-[11px] font-semibold text-foreground">Multi-Step Flow (Stepper)</span>
        <Switch
          checked={isMultiStep}
          onCheckedChange={handleToggleMultiStep}
          className="scale-75 origin-right"
        />
      </div>

      {/* Pages & Steps List */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {/* Welcome Screen Card */}
        <div
          onClick={onToggleWelcomeScreen}
          className={`group rounded-xl border p-2.5 transition-all cursor-pointer flex items-center justify-between ${
            hasWelcomeScreen
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-2xs'
              : 'bg-white dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Lightbulb className="size-3.5 text-amber-500" />
            <span>Welcome Screen</span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">
            {hasWelcomeScreen ? 'Active' : '+ Add'}
          </span>
        </div>

        {/* Steps List */}
        {isMultiStep ? (
          stepsWithFields.map((step, sIdx) => {
            const isStepActive = currentStepIndex === sIdx;
            const isEditing = editingStepId === step.id;

            return (
              <div
                key={step.id}
                className={`rounded-xl border transition-all overflow-hidden bg-white dark:bg-slate-900 shadow-2xs ${
                  isStepActive
                    ? 'border-emerald-600 dark:border-emerald-400 ring-1 ring-emerald-600/30'
                    : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {/* Step Header */}
                <div
                  onClick={() => onSelectStep(sIdx)}
                  className={`p-2.5 flex items-center justify-between cursor-pointer border-b transition-colors ${
                    isStepActive
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-200'
                      : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="size-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                      {sIdx + 1}
                    </span>

                    {isEditing ? (
                      <div className="flex items-center gap-1 flex-1 mr-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="text"
                          value={editingStepTitle}
                          onChange={(e) => setEditingStepTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveStepTitle(step.id)}
                          autoFocus
                          className="h-6 text-xs py-0 px-1.5"
                        />
                        <button
                          onClick={() => handleSaveStepTitle(step.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <Check className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-bold truncate max-w-[120px]">{step.title}</span>
                    )}
                  </div>

                  {/* Step Action Dropdown */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal bg-transparent text-muted-foreground">
                      {step.fields.length}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800">
                          <MoreVertical className="size-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs w-44">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingStepId(step.id);
                            setEditingStepTitle(step.title);
                          }}
                          className="gap-1.5"
                        >
                          <Edit2 className="size-3.5" /> Rename Step
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={sIdx === 0}
                          onClick={() => handleMoveStep(sIdx, 'up')}
                          className="gap-1.5"
                        >
                          <ArrowUp className="size-3.5" /> Move Step Up
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={sIdx === stepsWithFields.length - 1}
                          onClick={() => handleMoveStep(sIdx, 'down')}
                          className="gap-1.5"
                        >
                          <ArrowDown className="size-3.5" /> Move Step Down
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={stepsWithFields.length <= 1}
                          onClick={() => handleDeleteStep(step.id, sIdx)}
                          className="gap-1.5 text-rose-600 dark:text-rose-400 focus:text-rose-600"
                        >
                          <Trash2 className="size-3.5" /> Delete Step
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Sub-Fields List */}
                <div className="p-1.5 space-y-1">
                  {step.fields.map((field, fIdx) => {
                    const { Icon, widgetName } = getFieldMeta(field);
                    const isFieldSelected = selectedFieldId === field.id;

                    return (
                      <div
                        key={field.id}
                        onClick={() => {
                          onSelectStep(sIdx);
                          onSelectField(field.id);
                        }}
                        className={`group flex items-center justify-between p-1.5 px-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                          isFieldSelected
                            ? 'bg-emerald-100/80 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 font-semibold'
                            : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="size-4 rounded bg-slate-200 dark:bg-slate-700 text-[9px] font-bold flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                            {getLetterBadge(fIdx)}
                          </span>
                          <Icon className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="truncate text-[11px] block text-foreground">{field.label || 'Question'}</span>
                            <span className="text-[9px] text-muted-foreground truncate block font-normal">{widgetName}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {field.required && (
                            <span className="text-[9px] font-bold text-rose-500">*</span>
                          )}

                          {/* Quick Step Route Dropdown on Hover */}
                          {stepsWithFields.length > 1 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-opacity"
                                  title="Move to another step"
                                >
                                  <MoveRight className="size-3 text-emerald-600" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs w-48">
                                <p className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                                  Move Question To:
                                </p>
                                {stepsWithFields.map((s, targetIdx) => (
                                  <DropdownMenuItem
                                    key={s.id}
                                    disabled={s.id === step.id}
                                    onClick={() => handleMoveFieldToStep(field.id, s.id)}
                                    className="text-xs"
                                  >
                                    Step {targetIdx + 1}: {s.title}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Content to Step Button */}
                  <button
                    type="button"
                    onClick={() => onOpenAddWidgetDialog(sIdx, step.id)}
                    className="w-full flex items-center justify-center gap-1 p-1.5 rounded-md text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-dashed border-emerald-200 dark:border-emerald-800/60 mt-1 transition-colors"
                  >
                    <Plus className="size-3" /> Add Question / Widget
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          /* Single Page Mode Question List */
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 space-y-1">
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-100 dark:border-slate-800 px-1">
              <span className="text-xs font-bold text-foreground">All Questions ({fields.length})</span>
              <Badge variant="outline" className="text-[9px]">Single Page</Badge>
            </div>

            {fields.map((field, fIdx) => {
              const { Icon, widgetName } = getFieldMeta(field);
              const isFieldSelected = selectedFieldId === field.id;

              return (
                <div
                  key={field.id}
                  onClick={() => onSelectField(field.id)}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    isFieldSelected
                      ? 'bg-emerald-100/80 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 font-semibold'
                      : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="size-4 rounded bg-slate-200 dark:bg-slate-700 text-[9px] font-bold flex items-center justify-center shrink-0">
                      {fIdx + 1}
                    </span>
                    <Icon className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="truncate text-[11px] block text-foreground">{field.label || 'Untitled Question'}</span>
                      <span className="text-[9px] text-muted-foreground truncate block font-normal">{widgetName}</span>
                    </div>
                  </div>
                  {field.required && <span className="text-[9px] font-bold text-rose-500">*</span>}
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => onOpenAddWidgetDialog(0)}
              className="w-full flex items-center justify-center gap-1 p-2 rounded-md text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-dashed border-emerald-200 dark:border-emerald-800/60 mt-2 transition-colors"
            >
              <Plus className="size-3" /> Add Question / Widget
            </button>
          </div>
        )}

        {/* Endings / Thank You Screen Card */}
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 hover:border-slate-400 cursor-pointer transition-all">
          <div className="flex items-center gap-2 font-semibold">
            <Flag className="size-3.5 text-emerald-500" />
            <span>Endings &amp; Thank You</span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">+ Add</span>
        </div>
      </div>

      {/* Add Step Bottom Trigger */}
      {isMultiStep && (
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddStep}
            className="w-full text-xs font-semibold border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5 h-8 rounded-xl"
          >
            <Plus className="size-3.5 text-emerald-600" /> Add New Step
          </Button>
        </div>
      )}
    </aside>
  );
}
