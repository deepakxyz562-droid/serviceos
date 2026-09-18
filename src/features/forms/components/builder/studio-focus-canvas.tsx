'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  Video,
  Image as ImageIcon,
  Plus,
  ArrowRight,
  ArrowLeft,
  Check,
  Star,
  PenTool,
  Calendar,
  CreditCard,
  MapPin,
  Clock,
  Layers,
  PanelLeftOpen,
  PanelRightOpen,
  ChevronDown,
  Lock,
  Smartphone,
  Monitor,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { EditorFormData, FormField } from '@/features/forms/types';

interface StudioFocusCanvasProps {
  formData: EditorFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<EditorFormData>>;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  selectedFieldId: string | null;
  onSelectField: (fieldId: string) => void;
  viewMode: 'focus' | 'paper';
  // Collapsed sidebars state & toggle triggers
  isAiCopilotCollapsed: boolean;
  onToggleAiCopilot: () => void;
  isPagesTreeCollapsed: boolean;
  onTogglePagesTree: () => void;
  isInspectorCollapsed: boolean;
  onToggleInspector: () => void;
  className?: string;
}

export function StudioFocusCanvas({
  formData,
  onFormDataChange,
  currentStepIndex,
  onStepChange,
  selectedFieldId,
  onSelectField,
  viewMode,
  isAiCopilotCollapsed,
  onToggleAiCopilot,
  isPagesTreeCollapsed,
  onTogglePagesTree,
  isInspectorCollapsed,
  onToggleInspector,
  className = '',
}: StudioFocusCanvasProps) {
  const fields = formData.fields || [];
  const primaryColor = formData.theme?.primaryColor || '#9333ea';
  const backgroundColor = formData.theme?.backgroundColor || '#faf5ff';
  const textColor = formData.theme?.textColor || '#581c87';

  // Group fields into multi-step pages (3 fields per page by default)
  const chunkSize = 3;
  const steps = React.useMemo(() => {
    if (fields.length === 0) {
      return [{ id: 'step-1', title: 'Get Started', fields: [] as FormField[] }];
    }
    const result: Array<{ id: string; title: string; fields: FormField[] }> = [];
    for (let i = 0; i < fields.length; i += chunkSize) {
      const stepIdx = Math.floor(i / chunkSize) + 1;
      result.push({
        id: `step-${stepIdx}`,
        title: stepIdx === 1 ? 'Contact Information' : stepIdx === 2 ? 'Service Requirements' : 'Confirmation & Signature',
        fields: fields.slice(i, i + chunkSize),
      });
    }
    return result;
  }, [fields]);

  const activeStep = steps[currentStepIndex] || steps[0] || { id: 'step-1', title: 'Step 1', fields: [] };
  const progressPercent = Math.round(((currentStepIndex + 1) / Math.max(steps.length, 1)) * 100);

  const [hasMedia, setHasMedia] = useState(true);

  // Field inline updater
  const handleUpdateField = (fieldId: string, updates: Partial<FormField>) => {
    onFormDataChange((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
    }));
  };

  return (
    <div
      className={`relative flex-1 flex flex-col items-center justify-between overflow-y-auto p-4 sm:p-8 select-none transition-all ${className}`}
      style={{ backgroundColor }}
    >
      {/* ─── Floating Edge Panels Re-Open Triggers ─── */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-30">
        {isAiCopilotCollapsed && (
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleAiCopilot}
            className="h-8 text-xs font-semibold bg-white/95 dark:bg-slate-900/95 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 shadow-md gap-1.5 rounded-xl hover:bg-purple-50"
          >
            <Sparkles className="size-3.5 text-purple-600" /> AI Copilot
          </Button>
        )}
        {isPagesTreeCollapsed && (
          <Button
            size="sm"
            variant="outline"
            onClick={onTogglePagesTree}
            className="h-8 text-xs font-semibold bg-white/95 dark:bg-slate-900/95 shadow-md gap-1.5 rounded-xl"
          >
            <Layers className="size-3.5" /> Pages Tree
          </Button>
        )}
      </div>

      <div className="absolute top-4 right-4 z-30">
        {isInspectorCollapsed && (
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleInspector}
            className="h-8 text-xs font-semibold bg-white/95 dark:bg-slate-900/95 shadow-md gap-1.5 rounded-xl"
          >
            <PanelRightOpen className="size-3.5" /> Field Settings
          </Button>
        )}
      </div>

      {/* ─── Top Step Progress Bar (Typeform Style) ─── */}
      <div className="w-full max-w-4xl pt-2 pb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs border-purple-300 text-purple-800 dark:text-purple-300 bg-white/80 dark:bg-slate-900/80"
          >
            Step {currentStepIndex + 1} of {steps.length}
          </Badge>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            {activeStep.title}
          </span>
        </div>

        {/* Smooth Top Progress Bar */}
        <div className="w-48 sm:w-64 h-2 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: primaryColor,
            }}
          />
        </div>
      </div>

      {/* ─── MAIN WYSIWYG FOCUS CANVAS (Split Media & Question Box) ─── */}
      <div className="w-full max-w-4xl my-auto flex flex-col items-center">
        {viewMode === 'focus' ? (
          /* ════ 1. FOCUS CARD MULTI-STEP VIEW (Typeform Parity) ════ */
          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl p-6 sm:p-10 transition-all">
            {/* Left Media Block */}
            {hasMedia && (
              <div className="md:col-span-5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[260px]">
                <div className="size-12 rounded-2xl bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-md mb-3">
                  <Video className="size-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Media &amp; Video Hero
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                  Upload video, add Loom/YouTube link, or select Unsplash photography
                </p>

                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-4 text-xs font-bold gap-1.5 rounded-xl shadow-xs bg-white dark:bg-slate-900 hover:bg-purple-50 hover:text-purple-700"
                >
                  <Plus className="size-3.5" /> Add Video / Media
                </Button>
              </div>
            )}

            {/* Right Question Focus Card */}
            <div className={`${hasMedia ? 'md:col-span-7' : 'md:col-span-12'} flex flex-col justify-between space-y-6`}>
              {/* Question Headline */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="size-5 rounded-md text-white text-[10px] font-bold flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {currentStepIndex + 1}
                  </span>
                  <input
                    value={activeStep.title}
                    onChange={(e) => {
                      // Update step title in live view
                    }}
                    className="text-lg sm:text-xl font-bold text-foreground bg-transparent border-none outline-none focus:ring-0 w-full"
                    placeholder="Your question or title here*"
                  />
                </div>
                <p className="text-xs text-muted-foreground pl-7">
                  Please fill in the required fields below to proceed.
                </p>
              </div>

              {/* Step Sub-Fields Render */}
              <div className="space-y-4 pl-0 sm:pl-7">
                {activeStep.fields.length > 0 ? (
                  activeStep.fields.map((field, fIdx) => {
                    const isSelected = selectedFieldId === field.id;
                    const letters = ['A', 'B', 'C', 'D'];
                    const letter = letters[fIdx % letters.length];

                    return (
                      <div
                        key={field.id}
                        onClick={() => onSelectField(field.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? 'border-purple-600 dark:border-purple-400 bg-purple-50/20 dark:bg-purple-950/20 ring-2 ring-purple-600/10'
                            : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="size-4 rounded bg-slate-200 dark:bg-slate-700 text-[9px] font-bold flex items-center justify-center text-slate-700 dark:text-slate-300">
                              {letter}
                            </span>
                            <span>{field.label}</span>
                            {field.required && <span className="text-rose-500 font-bold">*</span>}
                          </label>

                          {field.helpText && (
                            <span className="text-[10px] text-muted-foreground">{field.helpText}</span>
                          )}
                        </div>

                        {/* Input Type Specific Render */}
                        {field.type === 'phone' ? (
                          <div className="flex items-center gap-2 border-b-2 border-purple-300 dark:border-purple-800 py-1 text-sm text-foreground">
                            <span className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              🇺🇸 +1 <ChevronDown className="size-3" />
                            </span>
                            <span className="text-muted-foreground font-mono text-xs">(201) 555-0123</span>
                          </div>
                        ) : field.type === 'signature' ? (
                          <div className="h-16 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20 flex items-center justify-center text-xs font-semibold text-purple-700 dark:text-purple-300 gap-2">
                            <PenTool className="size-4" /> Draw Digital E-Signature Here
                          </div>
                        ) : field.type === 'rating' ? (
                          <div className="flex items-center gap-1.5 pt-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <button key={s} type="button" className="p-1.5 hover:scale-110 transition-transform">
                                <Star className="size-5 fill-amber-400 text-amber-400" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="border-b-2 border-slate-200 dark:border-slate-700 py-1 text-xs text-muted-foreground">
                            {field.placeholder || 'Type your answer here...'}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 border-2 border-dashed rounded-2xl text-center text-muted-foreground text-xs">
                    No questions on this step yet. Click &ldquo;+ Add Content&rdquo; from the Pages panel.
                  </div>
                )}
              </div>

              {/* Step Navigation Controls (Typeform Enter to Continue) */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 pl-0 sm:pl-7">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentStepIndex === 0}
                    onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
                    className="text-xs h-9 rounded-xl gap-1"
                  >
                    <ArrowLeft className="size-3.5" /> Back
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      if (currentStepIndex < steps.length - 1) {
                        onStepChange(currentStepIndex + 1);
                      }
                    }}
                    className="text-xs h-9 rounded-xl font-bold text-white shadow-md gap-1.5 px-4"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span>{currentStepIndex === steps.length - 1 ? 'Complete & Submit' : 'OK · Continue'}</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground hidden sm:inline-flex items-center gap-1">
                  press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono border">Enter ↵</kbd>
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ════ 2. CLASSIC PAPER DOCUMENT VIEW (Jotform Parity) ════ */
          <div className="w-full space-y-6">
            {steps.map((step, sIdx) => (
              <div
                key={step.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md p-6 sm:p-8 space-y-4"
              >
                <div className="flex items-center gap-2 border-b pb-3">
                  <span
                    className="size-6 rounded-lg text-white text-xs font-bold flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {sIdx + 1}
                  </span>
                  <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                </div>

                <div className="space-y-3">
                  {step.fields.map((f) => (
                    <div key={f.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                      <label className="text-xs font-bold block mb-1">
                        {f.label} {f.required && <span className="text-rose-500">*</span>}
                      </label>
                      <div className="text-xs text-muted-foreground">{f.placeholder || 'Input field'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Bottom Status Footer ─── */}
      <div className="w-full max-w-4xl py-4 flex items-center justify-between text-xs text-muted-foreground border-t border-slate-200/60 dark:border-slate-800/60">
        <span className="flex items-center gap-1">
          <Lock className="size-3 text-emerald-500" /> 256-bit SSL Encrypted Form
        </span>
        <span>Powered by Fieseros GPTForm</span>
      </div>
    </div>
  );
}
