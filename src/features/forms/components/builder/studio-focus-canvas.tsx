'use client';

import React, { useState, useMemo } from 'react';
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
  Maximize2,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Columns,
  Sliders,
  MoveRight,
  Edit2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { EditorFormData, FormField } from '@/features/forms/types';

interface StudioFocusCanvasProps {
  formData: EditorFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<EditorFormData>>;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  selectedFieldId: string | null;
  onSelectField: (fieldId: string) => void;
  viewMode: 'focus' | 'paper' | 'split_media';
  // Collapsed sidebars state & toggle triggers
  isWidgetPaletteCollapsed?: boolean;
  onToggleWidgetPalette?: () => void;
  isAiCopilotCollapsed: boolean;
  onToggleAiCopilot: () => void;
  isPagesTreeCollapsed: boolean;
  onTogglePagesTree: () => void;
  isInspectorCollapsed: boolean;
  onToggleInspector: () => void;
  onOpenAddWidgetDialog?: (stepIndex: number, stepId?: string) => void;
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
  isWidgetPaletteCollapsed = false,
  onToggleWidgetPalette,
  isAiCopilotCollapsed,
  onToggleAiCopilot,
  isPagesTreeCollapsed,
  onTogglePagesTree,
  isInspectorCollapsed,
  onToggleInspector,
  onOpenAddWidgetDialog,
  className = '',
}: StudioFocusCanvasProps) {
  const fields = formData.fields || [];
  const isMultiStep = formData.isMultiStep ?? true;
  const primaryColor = formData.theme?.primaryColor || formData.primaryColor || '#059669';
  const backgroundColor = formData.theme?.backgroundColor || '#f8fafc';
  const textColor = formData.theme?.textColor || '#0f172a';
  const inputBorderRadius = formData.theme?.inputBorderRadius || '12px';
  const inputHeight = formData.theme?.inputHeight || 'medium';

  // Normalize steps
  const steps = useMemo(() => {
    if (!isMultiStep) {
      return [{ id: 'all_fields', title: formData.name || 'Form Questions', fields }];
    }
    const rawSteps = formData.steps && formData.steps.length > 0
      ? formData.steps
      : [{ id: 'step_1', title: 'Step 1: Contact Details' }];

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
  }, [formData.steps, formData.name, fields, isMultiStep]);

  const activeStep = steps[currentStepIndex] || steps[0] || { id: 'step_1', title: 'Step 1', fields: [] };
  const progressPercent = Math.round(((currentStepIndex + 1) / Math.max(steps.length, 1)) * 100);

  const [hasMedia, setHasMedia] = useState(false);

  // Field inline updater
  const handleUpdateField = (fieldId: string, updates: Partial<FormField>) => {
    onFormDataChange((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
    }));
  };

  // Field column width updater (1-col, 2-col, 3-col, 4-col)
  const handleSetFieldWidth = (fieldId: string, width: 'full' | 'half' | 'third' | 'quarter') => {
    handleUpdateField(fieldId, { width });
    const label = width === 'full' ? '100% (1 Col)' : width === 'half' ? '50% (2 Col)' : width === 'third' ? '33% (3 Col)' : '25% (4 Col)';
    toast.success(`Set field width to ${label}`);
  };

  // Move Field Up/Down within list
  const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
    const idx = fields.findIndex((f) => f.id === fieldId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= fields.length) return;

    onFormDataChange((prev) => {
      const copy = [...prev.fields];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return { ...prev, fields: copy };
    });
  };

  // Duplicate Field
  const handleDuplicateField = (field: FormField) => {
    const newField: FormField = {
      ...field,
      id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: `${field.label} (Copy)`,
    };
    onFormDataChange((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    onSelectField(newField.id);
    toast.success('Field duplicated');
  };

  // Delete Field
  const handleDeleteField = (fieldId: string) => {
    onFormDataChange((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== fieldId),
    }));
    toast.info('Field removed');
  };

  // Move Field to Another Step
  const handleMoveFieldToStep = (fieldId: string, targetStepId: string) => {
    handleUpdateField(fieldId, { stepId: targetStepId });
    toast.success('Question moved to new step');
  };

  // Width Class Resolver for CSS Grid / Flex
  const getWidthClasses = (width?: string) => {
    switch (width) {
      case 'half':
        return 'w-full md:w-[calc(50%-0.5rem)]';
      case 'third':
        return 'w-full md:w-[calc(33.333%-0.67rem)]';
      case 'quarter':
        return 'w-full md:w-[calc(25%-0.75rem)]';
      default:
        return 'w-full';
    }
  };

  return (
    <div
      className={`relative flex-1 flex flex-col items-center justify-between overflow-y-auto p-4 sm:p-6 lg:p-8 select-none transition-all ${className}`}
      style={{ backgroundColor }}
    >
      {/* ─── Floating Edge Panels Re-Open Triggers ─── */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-30">
        {isWidgetPaletteCollapsed && onToggleWidgetPalette && (
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleWidgetPalette}
            className="h-8 text-xs font-semibold bg-white/95 dark:bg-slate-900/95 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shadow-md gap-1.5 rounded-xl hover:bg-emerald-50 cursor-pointer"
          >
            <Plus className="size-3.5 text-emerald-600" /> Widgets Palette
          </Button>
        )}
        {isPagesTreeCollapsed && (
          <Button
            size="sm"
            variant="outline"
            onClick={onTogglePagesTree}
            className="h-8 text-xs font-semibold bg-white/95 dark:bg-slate-900/95 shadow-md gap-1.5 rounded-xl cursor-pointer"
          >
            <Layers className="size-3.5" /> Pages &amp; Stepper
          </Button>
        )}
        {isAiCopilotCollapsed && (
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleAiCopilot}
            className="h-8 text-xs font-semibold bg-white/95 dark:bg-slate-900/95 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shadow-md gap-1.5 rounded-xl hover:bg-emerald-50 cursor-pointer"
          >
            <Sparkles className="size-3.5 text-emerald-600" /> AI Copilot
          </Button>
        )}
      </div>

      <div className="absolute top-4 right-4 z-30">
        {isInspectorCollapsed && (
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleInspector}
            className="h-8 text-xs font-semibold bg-white/95 dark:bg-slate-900/95 shadow-md gap-1.5 rounded-xl cursor-pointer"
          >
            <PanelRightOpen className="size-3.5" /> Field Settings
          </Button>
        )}
      </div>

      {/* ─── Top Stepper Progress Bar (Shown in Multi-Step mode) ─── */}
      {isMultiStep && (
        <div className="w-full max-w-4xl pt-2 pb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs border-emerald-300 text-emerald-800 dark:text-emerald-300 bg-white/80 dark:bg-slate-900/80"
            >
              Step {currentStepIndex + 1} of {steps.length}
            </Badge>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-xs">
              {activeStep.title}
            </span>
          </div>

          {/* Stepper Progress Bar */}
          <div className="w-44 sm:w-64 h-2 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: primaryColor,
              }}
            />
          </div>
        </div>
      )}

      {/* ─── MAIN WYSIWYG CANVAS ─── */}
      <div className="w-full max-w-5xl my-auto flex flex-col items-center">
        {viewMode === 'split_media' ? (
          /* ════ 0. ELEMENTOR 2-PART SPLIT FORM VIEW (Left Hero Media, Right 5-6 Fields) ════ */
          <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden transition-all">
            {(() => {
              const panel = formData.mediaPanel || formData.theme?.mediaPanel || {
                enabled: true,
                position: 'left',
                splitRatio: '50-50',
                mediaType: 'image',
                mediaUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
                headline: formData.name || 'Fast & Reliable Professional Service',
                subtitle: 'Fill out the form below to receive upfront pricing and schedule top-rated pros.',
                badgeText: '⭐ 5-Star Rated Service Pro',
                benefitsList: [
                  'Guaranteed response within 15 minutes',
                  'Licensed, insured & background-checked',
                  '100% Price Match & Escrow Guarantee',
                ],
              };

              const isMediaSelected = selectedFieldId === '__media_panel__';
              const splitRatio = panel.splitRatio || '50-50';

              const leftWidthClass =
                splitRatio === '40-60'
                  ? 'lg:w-[40%]'
                  : splitRatio === '60-40'
                  ? 'lg:w-[60%]'
                  : splitRatio === '35-65'
                  ? 'lg:w-[35%]'
                  : 'lg:w-1/2';

              const rightWidthClass =
                splitRatio === '40-60'
                  ? 'lg:w-[60%]'
                  : splitRatio === '60-40'
                  ? 'lg:w-[40%]'
                  : splitRatio === '35-65'
                  ? 'lg:w-[65%]'
                  : 'lg:w-1/2';

              return (
                <div className={`flex flex-col ${panel.position === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'} min-h-[550px]`}>
                  {/* LEFT HERO MEDIA COLUMN */}
                  <div
                    onClick={() => onSelectField('__media_panel__')}
                    className={`relative p-6 sm:p-8 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white flex flex-col justify-between cursor-pointer group transition-all ${leftWidthClass} ${
                      isMediaSelected
                        ? 'ring-4 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900'
                        : 'hover:brightness-105'
                    }`}
                  >
                    {/* Top Edit Chip */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        {panel.badgeText && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold backdrop-blur">
                            <Star className="size-3 text-emerald-400 fill-emerald-400" />
                            <span>{panel.badgeText}</span>
                          </div>
                        )}
                      </div>

                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-bold gap-1 transition-opacity ${
                          isMediaSelected
                            ? 'bg-emerald-500 text-slate-950 opacity-100'
                            : 'bg-white/20 text-white opacity-0 group-hover:opacity-100 backdrop-blur'
                        }`}
                      >
                        <Edit2 className="size-2.5" />
                        <span>Left Hero (Click to Edit)</span>
                      </Badge>
                    </div>

                    {/* Media Display (Image or Video) */}
                    <div className="my-4 rounded-2xl overflow-hidden border border-white/10 bg-slate-950/80 shadow-2xl relative">
                      {panel.mediaType === 'video' && panel.mediaUrl ? (
                        panel.mediaUrl.includes('youtube.com') || panel.mediaUrl.includes('youtu.be') ? (
                          <div className="aspect-video w-full">
                            <iframe
                              src={
                                panel.mediaUrl.includes('watch?v=')
                                  ? panel.mediaUrl.replace('watch?v=', 'embed/').split('&')[0]
                                  : panel.mediaUrl.replace('youtu.be/', 'www.youtube.com/embed/')
                              }
                              title="Video Hero"
                              className="w-full h-full border-0 pointer-events-none"
                            />
                          </div>
                        ) : (
                          <video
                            src={panel.mediaUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-auto object-cover max-h-[280px]"
                          />
                        )
                      ) : (
                        <div className="relative w-full aspect-video overflow-hidden">
                          <img
                            src={panel.mediaUrl || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80'}
                            alt="Hero Media"
                            className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                        </div>
                      )}
                    </div>

                    {/* Headline, Subtitle & Value Benefits */}
                    <div className="space-y-3 mt-auto">
                      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-snug">
                        {panel.headline || formData.name || 'Fast & Reliable Professional Service'}
                      </h2>
                      {panel.subtitle && (
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {panel.subtitle}
                        </p>
                      )}

                      {panel.benefitsList && panel.benefitsList.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-white/10">
                          {panel.benefitsList.map((benefit, bIdx) => (
                            <div key={bIdx} className="flex items-center gap-2 text-xs text-slate-200">
                              <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                              <span>{benefit}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT FORM FIELDS COLUMN (5-6 Fields) */}
                  <div className={`p-6 sm:p-8 flex flex-col justify-between space-y-6 ${rightWidthClass} bg-card`}>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-foreground">
                          {formData.name || 'Request a Quote / Booking'}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {formData.description || 'Fill in the details below to receive your upfront estimate.'}
                        </p>
                      </div>

                      {/* Right Fields Grid */}
                      <div className="flex flex-wrap gap-3">
                        {fields.length > 0 ? (
                          fields.map((f, fIdx) => {
                            const isSelected = selectedFieldId === f.id;
                            const widthCls = getWidthClasses(f.width);

                            return (
                              <div
                                key={f.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectField(f.id);
                                }}
                                className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${widthCls} ${
                                  isSelected
                                    ? 'border-emerald-600 dark:border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 ring-2 ring-emerald-600/20 shadow-sm'
                                    : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5 truncate">
                                    <span className="truncate">{f.label || 'Question'}</span>
                                    {f.required && <span className="text-rose-500">*</span>}
                                  </label>

                                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 text-[9px] font-bold">
                                      <button
                                        type="button"
                                        onClick={() => handleSetFieldWidth(f.id, 'full')}
                                        className={`px-1.5 py-0.5 rounded ${
                                          !f.width || f.width === 'full'
                                            ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                      >
                                        1C
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSetFieldWidth(f.id, 'half')}
                                        className={`px-1.5 py-0.5 rounded ${
                                          f.width === 'half'
                                            ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                      >
                                        2C
                                      </button>
                                    </div>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="p-1 rounded text-muted-foreground hover:text-foreground">
                                          <Sliders className="size-3" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="text-xs w-44">
                                        <DropdownMenuItem onClick={() => handleDuplicateField(f)} className="gap-1.5">
                                          <Copy className="size-3.5" /> Duplicate Field
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleMoveField(f.id, 'up')} className="gap-1.5">
                                          <ArrowUp className="size-3.5" /> Move Up
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleMoveField(f.id, 'down')} className="gap-1.5">
                                          <ArrowDown className="size-3.5" /> Move Down
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleDeleteField(f.id)} className="gap-1.5 text-rose-600">
                                          <Trash2 className="size-3.5" /> Delete Field
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>

                                <div
                                  className="h-10 w-full border border-slate-200/90 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/70 px-3.5 py-2 text-muted-foreground flex items-center shadow-2xs text-xs rounded-xl"
                                >
                                  {f.placeholder || `Enter ${f.label || 'value'}...`}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="w-full p-8 border-2 border-dashed rounded-2xl text-center text-muted-foreground text-xs space-y-2">
                            <p>No fields added yet.</p>
                            {onOpenAddWidgetDialog && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenAddWidgetDialog(0)}
                                className="text-xs font-semibold gap-1"
                              >
                                <Plus className="size-3.5" /> Add Field
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Submit Button Preview */}
                    <div className="pt-2">
                      <Button
                        type="button"
                        className="w-full h-11 text-xs sm:text-sm font-bold text-white rounded-xl shadow-md gap-2"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <span>{formData.submitButtonText || 'Submit Request & Get Quote'}</span>
                        <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : viewMode === 'focus' ? (
          /* ════ 1. FOCUS CARD MULTI-STEP VIEW (Typeform Parity) ════ */
          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl p-6 sm:p-10 transition-all">
            {/* Left Media Block */}
            {hasMedia && (
              <div className="md:col-span-5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[260px]">
                <div className="size-12 rounded-2xl bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-md mb-3">
                  <Video className="size-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Media &amp; Video Hero
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                  Upload video or image hero for this step
                </p>

                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-4 text-xs font-bold gap-1.5 rounded-xl shadow-xs bg-white dark:bg-slate-900 hover:bg-emerald-50 hover:text-emerald-700"
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
                    className="size-6 rounded-lg text-white text-xs font-bold flex items-center justify-center shadow-xs shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isMultiStep ? currentStepIndex + 1 : '1'}
                  </span>
                  <input
                    value={activeStep.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      if (!isMultiStep) {
                        onFormDataChange((prev) => ({ ...prev, name: newTitle }));
                      } else {
                        onFormDataChange((prev) => ({
                          ...prev,
                          steps: (prev.steps || steps).map((s, idx) =>
                            idx === currentStepIndex ? { ...s, title: newTitle } : s
                          ),
                        }));
                      }
                    }}
                    className="text-lg sm:text-xl font-bold text-foreground bg-transparent border-none outline-none focus:ring-0 w-full"
                    placeholder="Step Title or Question..."
                  />
                </div>
                <p className="text-xs text-muted-foreground pl-8">
                  {isMultiStep ? 'Complete the questions in this step to proceed.' : 'Fill in the information below.'}
                </p>
              </div>

              {/* Step Sub-Fields Render with Multi-Column Flex Grid */}
              <div className="flex flex-wrap gap-3 pl-0 sm:pl-8">
                {activeStep.fields.length > 0 ? (
                  activeStep.fields.map((field, fIdx) => {
                    const isSelected = selectedFieldId === field.id;
                    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                    const letter = letters[fIdx % letters.length];
                    const widthCls = getWidthClasses(field.width);

                    return (
                      <div
                        key={field.id}
                        onClick={() => onSelectField(field.id)}
                        className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${widthCls} ${
                          isSelected
                            ? 'border-emerald-600 dark:border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 ring-2 ring-emerald-600/20 shadow-sm'
                            : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                        }`}
                      >
                        {/* Top Card Bar: Label + Width Pills + Actions */}
                        <div className="flex items-center justify-between gap-1">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 min-w-0">
                            <span className="size-4 rounded bg-slate-200 dark:bg-slate-700 text-[9px] font-bold flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                              {letter}
                            </span>
                            <span className="truncate">{field.label || 'Question'}</span>
                            {field.required && <span className="text-rose-500 font-bold">*</span>}
                          </label>

                          {/* Quick Column Width & Action Toolbar */}
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {/* Width Selector Pills */}
                            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 text-[9px] font-bold">
                              <button
                                type="button"
                                onClick={() => handleSetFieldWidth(field.id, 'full')}
                                className={`px-1.5 py-0.5 rounded ${
                                  !field.width || field.width === 'full'
                                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-2xs font-extrabold'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="100% Full Width (1 Column)"
                              >
                                1C
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetFieldWidth(field.id, 'half')}
                                className={`px-1.5 py-0.5 rounded ${
                                  field.width === 'half'
                                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-2xs font-extrabold'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="50% Width (2 Columns)"
                              >
                                2C
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetFieldWidth(field.id, 'third')}
                                className={`px-1.5 py-0.5 rounded ${
                                  field.width === 'third'
                                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-2xs font-extrabold'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="33% Width (3 Columns)"
                              >
                                3C
                              </button>
                            </div>

                            {/* More Actions Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800">
                                  <Sliders className="size-3" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs w-44">
                                <DropdownMenuItem onClick={() => handleDuplicateField(field)} className="gap-1.5">
                                  <Copy className="size-3.5" /> Duplicate Field
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMoveField(field.id, 'up')} className="gap-1.5">
                                  <ArrowUp className="size-3.5" /> Move Up
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMoveField(field.id, 'down')} className="gap-1.5">
                                  <ArrowDown className="size-3.5" /> Move Down
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteField(field.id)} className="gap-1.5 text-rose-600">
                                  <Trash2 className="size-3.5" /> Delete Field
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Input Type Preview */}
                        {(() => {
                          const fieldRadius = field.borderRadius && field.borderRadius !== 'inherit' ? field.borderRadius : inputBorderRadius;
                          const fieldHeightCls = (field.inputHeight && field.inputHeight !== 'inherit' ? field.inputHeight : inputHeight) === 'compact' ? 'h-9 text-xs' : (field.inputHeight && field.inputHeight !== 'inherit' ? field.inputHeight : inputHeight) === 'large' ? 'h-12 text-sm' : 'h-11 text-xs';
                          return (
                            <div
                              className={`${fieldHeightCls} w-full border border-slate-200/90 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/70 px-3.5 py-2 text-muted-foreground flex items-center shadow-2xs transition-all`}
                              style={{ borderRadius: fieldRadius }}
                            >
                              {field.placeholder || `Enter ${field.label || 'value'}...`}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full p-8 border-2 border-dashed rounded-2xl text-center text-muted-foreground text-xs space-y-2">
                    <p>No questions on this step yet.</p>
                    {onOpenAddWidgetDialog && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenAddWidgetDialog(currentStepIndex, activeStep.id)}
                        className="text-xs font-semibold gap-1"
                      >
                        <Plus className="size-3.5" /> Add Question / Widget
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Step Navigation Controls (Typeform Enter to Continue) */}
              {isMultiStep && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 pl-0 sm:pl-8">
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
                      className="text-xs h-9 rounded-xl font-bold text-white shadow-md gap-1.5 px-4 cursor-pointer"
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
              )}
            </div>
          </div>
        ) : (
          /* ════ 2. CLASSIC PAPER DOCUMENT VIEW (Jotform Parity with Multi-Column) ════ */
          <div className="w-full space-y-6">
            {steps.map((step, sIdx) => (
              <div
                key={step.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md p-6 sm:p-8 space-y-5"
              >
                {/* Step / Section Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-6 rounded-lg text-white text-xs font-bold flex items-center justify-center shadow-xs"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {sIdx + 1}
                    </span>
                    <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {step.fields.length} {step.fields.length === 1 ? 'question' : 'questions'}
                    </Badge>
                  </div>

                  {onOpenAddWidgetDialog && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenAddWidgetDialog(sIdx, step.id)}
                      className="h-7 text-[11px] font-semibold gap-1 text-emerald-600 border-emerald-200 dark:border-emerald-800"
                    >
                      <Plus className="size-3" /> Add Widget
                    </Button>
                  )}
                </div>

                {/* Multi-Column Field Grid */}
                <div className="flex flex-wrap gap-4 items-start">
                  {step.fields.map((f, fIdx) => {
                    const isSelected = selectedFieldId === f.id;
                    const widthCls = getWidthClasses(f.width);

                    return (
                      <div
                        key={f.id}
                        onClick={() => onSelectField(f.id)}
                        className={`group relative p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${widthCls} ${
                          isSelected
                            ? 'border-emerald-600 dark:border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 ring-2 ring-emerald-600/20 shadow-sm'
                            : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300'
                        }`}
                      >
                        {/* Header & Column Selector */}
                        <div className="flex items-center justify-between gap-1">
                          <label className="text-xs font-bold text-foreground flex items-center gap-1.5 truncate">
                            <span className="truncate">{f.label || 'Question'}</span>
                            {f.required && <span className="text-rose-500">*</span>}
                          </label>

                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {/* Width Selector Pills */}
                            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-0.5 text-[9px] font-bold">
                              <button
                                type="button"
                                onClick={() => handleSetFieldWidth(f.id, 'full')}
                                className={`px-1.5 py-0.5 rounded ${
                                  !f.width || f.width === 'full'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="100% Full Width (1 Column)"
                              >
                                100%
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetFieldWidth(f.id, 'half')}
                                className={`px-1.5 py-0.5 rounded ${
                                  f.width === 'half'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="50% Half Width (2 Columns)"
                              >
                                50%
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetFieldWidth(f.id, 'third')}
                                className={`px-1.5 py-0.5 rounded ${
                                  f.width === 'third'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="33% Third Width (3 Columns)"
                              >
                                33%
                              </button>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded text-muted-foreground hover:text-foreground">
                                  <Sliders className="size-3" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs w-44">
                                <DropdownMenuItem onClick={() => handleDuplicateField(f)} className="gap-1.5">
                                  <Copy className="size-3.5" /> Duplicate Field
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMoveField(f.id, 'up')} className="gap-1.5">
                                  <ArrowUp className="size-3.5" /> Move Up
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMoveField(f.id, 'down')} className="gap-1.5">
                                  <ArrowDown className="size-3.5" /> Move Down
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteField(f.id)} className="gap-1.5 text-rose-600">
                                  <Trash2 className="size-3.5" /> Delete Field
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Input Preview */}
                        {(() => {
                          const fieldRadius = f.borderRadius && f.borderRadius !== 'inherit' ? f.borderRadius : inputBorderRadius;
                          const fieldHeightCls = (f.inputHeight && f.inputHeight !== 'inherit' ? f.inputHeight : inputHeight) === 'compact' ? 'h-9 text-xs' : (f.inputHeight && f.inputHeight !== 'inherit' ? f.inputHeight : inputHeight) === 'large' ? 'h-12 text-sm' : 'h-11 text-xs';
                          return (
                            <div
                              className={`${fieldHeightCls} w-full border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-muted-foreground flex items-center shadow-2xs transition-all`}
                              style={{ borderRadius: fieldRadius }}
                            >
                              {f.placeholder || `Enter ${f.label || 'value'}...`}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Bottom Status Footer ─── */}
      <div className="w-full max-w-4xl py-4 flex items-center justify-between text-xs text-muted-foreground border-t border-slate-200/60 dark:border-slate-800/60 mt-6">
        <span className="flex items-center gap-1">
          <Lock className="size-3 text-emerald-500" /> 256-bit SSL Encrypted Form
        </span>
        <span>Powered by Fieseros GPTForm Studio</span>
      </div>
    </div>
  );
}
