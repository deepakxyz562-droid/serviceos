'use client';

import React from 'react';
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
  ArrowDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { EditorFormData, FormField } from '@/features/forms/types';

interface StudioPagesTreeProps {
  formData: EditorFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<EditorFormData>>;
  currentStepIndex: number;
  onSelectStep: (stepIndex: number) => void;
  selectedFieldId: string | null;
  onSelectField: (fieldId: string) => void;
  onOpenAddWidgetDialog: (stepIndex: number) => void;
  onClose: () => void;
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
  // Derive multi-step structure from formData (or default to 3 logical steps if schema has flat fields)
  const fields = formData.fields || [];

  // Partition fields into steps (or chunk if steps not explicitly set)
  const steps = React.useMemo(() => {
    if (fields.length === 0) {
      return [{ id: 'step-1', title: 'Step 1', fields: [] as FormField[] }];
    }
    // Partition fields by logical steps or 3 items per step
    const chunkSize = 3;
    const result: Array<{ id: string; title: string; fields: FormField[] }> = [];
    for (let i = 0; i < fields.length; i += chunkSize) {
      const stepIdx = Math.floor(i / chunkSize) + 1;
      result.push({
        id: `step-${stepIdx}`,
        title: stepIdx === 1 ? 'Contact Details' : stepIdx === 2 ? 'Service Requirements' : 'Confirmation & Signature',
        fields: fields.slice(i, i + chunkSize),
      });
    }
    return result;
  }, [fields]);

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
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    return letters[index % letters.length];
  };

  return (
    <aside
      className={`w-64 md:w-72 flex flex-col bg-slate-50/70 dark:bg-slate-950 border-r border-slate-200/80 dark:border-slate-800 shrink-0 h-full overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-purple-600 dark:text-purple-400" />
          <span className="font-bold text-xs text-foreground uppercase tracking-wider">Pages &amp; Steps</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {steps.length}
          </Badge>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Hide Pages Tree"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      {/* Pages List */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {/* Welcome Screen Card */}
        <div
          onClick={onToggleWelcomeScreen}
          className={`group rounded-xl border p-2.5 transition-all cursor-pointer flex items-center justify-between ${
            hasWelcomeScreen
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
              : 'bg-white dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Lightbulb className="size-4 text-amber-500" />
            <span>Welcome Screen</span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">
            {hasWelcomeScreen ? 'Active' : '+ Add'}
          </span>
        </div>

        {/* Step Cards */}
        {steps.map((step, sIdx) => {
          const isStepActive = currentStepIndex === sIdx;
          return (
            <div
              key={step.id}
              className={`rounded-xl border transition-all overflow-hidden bg-white dark:bg-slate-900 ${
                isStepActive
                  ? 'border-purple-600 dark:border-purple-400 shadow-sm ring-1 ring-purple-600/20'
                  : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              {/* Step Card Header */}
              <div
                onClick={() => onSelectStep(sIdx)}
                className={`p-2.5 flex items-center justify-between cursor-pointer border-b ${
                  isStepActive
                    ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/40 text-purple-950 dark:text-purple-200'
                    : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="size-4 rounded-full bg-purple-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {sIdx + 1}
                  </span>
                  <span className="text-xs font-bold truncate max-w-[130px]">{step.title}</span>
                </div>

                <Badge variant="outline" className="text-[9px] py-0 px-1 text-muted-foreground">
                  {step.fields.length} {step.fields.length === 1 ? 'field' : 'fields'}
                </Badge>
              </div>

              {/* Sub-Fields List with A, B, C Badges */}
              <div className="p-1.5 space-y-1">
                {step.fields.map((field, fIdx) => {
                  const Icon = getFieldIcon(field.type);
                  const isFieldSelected = selectedFieldId === field.id;
                  return (
                    <div
                      key={field.id}
                      onClick={() => {
                        onSelectStep(sIdx);
                        onSelectField(field.id);
                      }}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                        isFieldSelected
                          ? 'bg-purple-100/70 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-semibold'
                          : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="size-4 rounded bg-slate-200 dark:bg-slate-700 text-[9px] font-bold flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                          {getLetterBadge(fIdx)}
                        </span>
                        <Icon className="size-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span className="truncate text-[11px]">{field.label || 'Untitled Question'}</span>
                      </div>

                      {field.required && (
                        <span className="text-[9px] font-bold text-rose-500 shrink-0">*</span>
                      )}
                    </div>
                  );
                })}

                {/* Inline + Add Content Button */}
                <button
                  type="button"
                  onClick={() => onOpenAddWidgetDialog(sIdx)}
                  className="w-full flex items-center justify-center gap-1 p-1.5 rounded-md text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-dashed border-purple-200 dark:border-purple-800/60 mt-1 transition-colors"
                >
                  <Plus className="size-3" /> Add Content
                </button>
              </div>
            </div>
          );
        })}

        {/* Endings / Thank You Screen Card */}
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 hover:border-slate-400 cursor-pointer transition-all">
          <div className="flex items-center gap-2 font-semibold">
            <Flag className="size-4 text-emerald-500" />
            <span>Endings &amp; Thank You</span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">+ Add</span>
        </div>
      </div>

      {/* Add Step Bottom Trigger */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <button
          type="button"
          onClick={() => {
            const newField: FormField = {
              id: `field_${Date.now()}`,
              type: 'short_answer',
              label: 'New Question',
              placeholder: 'Type your answer here...',
              required: false,
              width: 'full',
            };
            onFormDataChange((prev) => ({
              ...prev,
              fields: [...prev.fields, newField],
            }));
          }}
          className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800 transition-colors"
        >
          <Plus className="size-4" /> Add Form Step
        </button>
      </div>
    </aside>
  );
}
