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
  X,
  Wand2,
  Calculator,
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
import { WidgetRuntimeDispatcher } from '../runtime/widgets/widget-runtime-dispatcher';
import { FormFieldRenderer, getFieldWidthClass } from '../runtime/shared-field-renderer';
import { evaluateFormulaSafe } from '../runtime/form-runtime-renderer';
import { getFieldById } from '@/lib/forms/field-registry';
import { resolveIcon } from '@/lib/forms/icon-resolver';

export function getFieldWidgetMeta(field: FormField) {
  const def = getFieldById(field.widgetType || field.type);
  if (def) {
    return { name: def.name, iconName: def.iconName, category: def.category };
  }
  const cleanType = String(field.widgetType || field.type || 'Field')
    .replace(/_widget$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { name: cleanType, iconName: 'HelpCircle', category: 'custom' };
}

interface StudioFocusCanvasProps {
  formData: EditorFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<EditorFormData>>;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  selectedFieldId: string | null;
  onSelectField: (fieldId: string) => void;
  selectedColumn?: 'left' | 'right';
  onSelectColumn?: (col: 'left' | 'right') => void;
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
  selectedColumn = 'right',
  onSelectColumn,
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
  const isMultiStep = formData.isMultiStep ?? false;
  const primaryColor = formData.theme?.primaryColor || formData.primaryColor || '#059669';
  const backgroundColor = formData.theme?.backgroundColor || '#ffffff';
  const textColor = formData.theme?.textColor || '#0f172a';
  const buttonColor = formData.theme?.buttonColor || primaryColor;
  const buttonTextColor = formData.theme?.buttonTextColor || '#ffffff';
  const borderRadius = formData.theme?.borderRadius || '16px';
  const fontFamily = formData.theme?.fontFamily || 'Inter, sans-serif';
  // ─── Theme props needed by FormFieldRenderer for per-field styling parity ──
  // These MUST match the runtime renderer's values so the editor canvas
  // applies the same per-field styling (borderRadius, inputHeight, etc.)
  const inputBorderRadius = formData.theme?.inputBorderRadius || '12px';
  const inputHeightMode = formData.theme?.inputHeight || 'medium';
  const defaultInputHeightCls =
    inputHeightMode === 'compact'
      ? 'h-9 text-xs'
      : inputHeightMode === 'large'
      ? 'h-12 text-sm'
      : 'h-11 text-xs';

  // Interactive canvas overrides for live testing in builder
  const [canvasOverrides, setCanvasOverrides] = useState<Record<string, any>>({});
  const handleCanvasFieldChange = (fieldId: string, val: any) => {
    setCanvasOverrides((prev) => ({ ...prev, [fieldId]: val }));
  };

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

  // Canvas preview values for calculation fields and widgets
  const canvasFormData = useMemo(() => {
    const data: Record<string, any> = {};
    for (const f of fields) {
      if (f.defaultValue !== undefined) {
        data[f.id] = f.defaultValue;
      } else if (f.widgetConfig?.defaultValue !== undefined) {
        data[f.id] = f.widgetConfig.defaultValue;
      } else if (f.options && Array.isArray(f.options) && f.options.length > 0) {
        const first = f.options[0];
        data[f.id] = typeof first === 'object' && first !== null ? (first as any).value ?? (first as any).label : first;
      } else {
        // ─── Seed input fields with sensible defaults so formulas evaluate ──
        // Without this, slider/numerical fields have `undefined` in
        // canvasFormData → FormCalculation evaluates `0 * rate = 0` →
        // the editor canvas shows "$0.00" for all formula blocks.
        const cfg = (f.widgetConfig as Record<string, any>) || {};
        const wt = f.widgetType || f.type;
        if (wt === 'slider' || f.type === 'slider') {
          // Match the runtime's seed: use cfg.min, default to 0 (NOT 2400).
          // Previously this defaulted to 2400, causing the editor to show
          // different calculation values than the live form.
          const min = typeof cfg.min === 'number' ? cfg.min : 0;
          data[f.id] = min;
        } else if (f.type === 'numerical' || wt === 'numerical') {
          data[f.id] = 0;
        } else if (f.type === 'switch' || f.type === 'toggle' || wt === 'switch' || wt === 'toggle') {
          data[f.id] = false;
        }
      }
    }

    // ─── Evaluate form_calculation fields using the seeded values ──────────
    // This gives the editor a live (read-only) preview of what the formula
    // produces. Previously, the FormCalculation widget would show "$0.00"
    // because allFormData had no seeded input values.
    for (const f of fields) {
      if (f.widgetType === 'form_calculation' || f.type === 'calculation') {
        const cfg = (f.widgetConfig as Record<string, any>) || {};
        const formula = String(cfg.formula || '');
        if (formula) {
          const result = evaluateFormulaSafe(formula, data, fields as any);
          if (result !== null && !isNaN(result)) {
            data[f.id] = result;
          }
        }
      }
    }

    return data;
  }, [fields]);

  const effectiveCanvasFormData = useMemo(() => {
    return { ...canvasFormData, ...canvasOverrides };
  }, [canvasFormData, canvasOverrides]);

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

  // Add Step handler
  const handleAddStep = () => {
    const currentSteps = formData.steps && formData.steps.length > 0
      ? formData.steps
      : [{ id: 'step_1', title: 'Step 1: Contact Details' }];
    const nextStepNum = currentSteps.length + 1;
    const newStep = {
      id: `step_${Date.now()}`,
      title: `Step ${nextStepNum}: Details`,
    };
    const updatedSteps = [...currentSteps, newStep];
    onFormDataChange((prev) => ({
      ...prev,
      isMultiStep: true,
      steps: updatedSteps,
    }));
    onStepChange(updatedSteps.length - 1);
    toast.success(`Added Step ${nextStepNum}`);
  };

  // Width Class Resolver — matches the runtime renderer's width classes EXACTLY.
  // Previously the editor used `md:w-[calc(50%-0.5rem)]` while the runtime used
  // `sm:w-[48.5%]`. Now both use the same classes via getFieldWidthClass.
  const getWidthClasses = (width?: string) => getFieldWidthClass(width);

/**
 * StudioFieldPreview — Thin wrapper around the shared FormFieldRenderer.
 *
 * Uses mode="edit" so fields get click-to-select + selection ring + toolbar.
 * The actual field rendering (label, widget, per-field styling, width
 * classes) is handled by FormFieldRenderer — the SAME component used by
 * the runtime renderer. This ensures pixel-perfect parity between
 * editor, preview, and live form.
 *
 * Previously, this was a bespoke component that rendered a bare
 * `<div className="w-full">` with ZERO per-field styling — causing
 * the editor to look different from preview/live.
 */
const StudioFieldPreview = React.memo(function StudioFieldPreview({
  field,
  canvasFormData,
  onCanvasFieldChange,
  selectedFieldId,
  onSelectField,
  inputBorderRadius,
  defaultInputHeightCls,
}: {
  field: FormField;
  canvasFormData: Record<string, any>;
  onCanvasFieldChange?: (fieldId: string, val: any) => void;
  selectedFieldId?: string | null;
  onSelectField?: (fieldId: string) => void;
  inputBorderRadius: string;
  defaultInputHeightCls: string;
}) {
  return (
    <FormFieldRenderer
      field={field}
      value={canvasFormData[field.id]}
      onChange={(val) => onCanvasFieldChange?.(field.id, val)}
      allFormData={canvasFormData}
      mode="edit"
      selectedFieldId={selectedFieldId}
      onSelectField={onSelectField}
      inputBorderRadius={inputBorderRadius}
      defaultInputHeightCls={defaultInputHeightCls}
    />
  );
});

  return (
    <div
      className={`relative flex-1 flex flex-col items-center justify-between overflow-y-auto p-4 sm:p-6 lg:p-8 select-none transition-all ${className}`}
      style={{
        backgroundColor,
        fontFamily,
        color: textColor,
        // ─── Apply theme borderRadius to the canvas container ─────────────
        // Previously the editor declared `borderRadius` but never used it,
        // while the runtime applied it. This caused card corners to differ.
        // We apply it as a CSS variable so child elements can inherit it.
        ['--form-radius' as any]: borderRadius,
      }}
    >
      {/* ─── Outer Canvas Background Image Backdrop (if set in theme) ─── */}
      {formData.theme?.backgroundImageUrl && (
        <>
          <div
            className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none transition-all duration-500"
            style={{
              backgroundImage: `url(${formData.theme.backgroundImageUrl})`,
              filter:
                formData.theme.backgroundBlur === 'lg'
                  ? 'blur(16px)'
                  : formData.theme.backgroundBlur === 'md'
                  ? 'blur(8px)'
                  : formData.theme.backgroundBlur === 'sm'
                  ? 'blur(4px)'
                  : 'none',
              transform: formData.theme.backgroundBlur && formData.theme.backgroundBlur !== 'none' ? 'scale(1.05)' : 'none',
            }}
          />
          <div
            className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300"
            style={{
              backgroundColor: '#000000',
              opacity: (formData.theme.backgroundOverlayOpacity ?? 40) / 100,
            }}
          />
        </>
      )}

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

      {/* ─── Top Stepper Progress Bar (Shown in Multi-Step mode for focus & paper views) ─── */}
      {isMultiStep && viewMode !== 'split_media' && (
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
      <div className="relative z-10 w-full max-w-5xl my-auto flex flex-col items-center">
        {viewMode === 'split_media' ? (
          /* ════ 0. 2-PART SPLIT HERO FORM VIEW (Multi-Media Hero + Multi-Step Fields) ════ */
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
                showBadge: true,
                showHeadline: true,
                showSubtitle: true,
                showMedia: true,
                showBenefits: true,
                backgroundColor: '#0f172a',
                benefitsList: [
                  'Guaranteed response within 15 minutes',
                  'Licensed, insured & background-checked',
                  '100% Price Match & Escrow Guarantee',
                ],
              };

              const updatePanel = (updates: Partial<typeof panel>) => {
                const updated = { ...panel, ...updates };
                onFormDataChange((prev) => ({
                  ...prev,
                  mediaPanel: updated,
                  theme: {
                    ...(prev.theme || {}),
                    mediaPanel: updated,
                  } as any,
                }));
              };

              const isMediaSelected = selectedFieldId === '__media_panel__';
              const splitRatio = panel.splitRatio || '50-50';

              // ─── Grid col-span classes — match the runtime EXACTLY ───────
              // Previously the editor used flex with `lg:w-[40%]` while the
              // runtime used grid with `lg:col-span-5` (≈41.67%). This caused
              // visible width differences. Now both use the same grid approach.
              const leftWidthClass =
                splitRatio === '40-60'
                  ? 'lg:col-span-5'
                  : splitRatio === '60-40'
                  ? 'lg:col-span-7'
                  : splitRatio === '35-65'
                  ? 'lg:col-span-4'
                  : splitRatio === '30-70'
                  ? 'lg:col-span-3'
                  : 'lg:col-span-6';

              const rightWidthClass =
                splitRatio === '40-60'
                  ? 'lg:col-span-7'
                  : splitRatio === '60-40'
                  ? 'lg:col-span-5'
                  : splitRatio === '35-65'
                  ? 'lg:col-span-8'
                  : splitRatio === '30-70'
                  ? 'lg:col-span-9'
                  : 'lg:col-span-6';

              const activeStepFields = steps.length > 1 ? activeStep.fields : fields;
              const leftColumnFields = activeStepFields.filter((f) => f.layoutColumn === 'left');
              const rightColumnFields = activeStepFields.filter((f) => f.layoutColumn !== 'left');
              const isLeftColumnActive = selectedColumn === 'left';
              const isRightColumnActive = selectedColumn === 'right';

              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[550px]">
                  {/* LEFT HERO MEDIA COLUMN — rendered first if position !== 'right' */}
                  {panel.position !== 'right' && (
                  <div
                    onClick={() => {
                      onSelectColumn?.('left');
                      onSelectField('__media_panel__');
                    }}
                    className={`relative p-6 sm:p-8 text-white flex flex-col justify-between cursor-pointer group transition-all overflow-hidden ${leftWidthClass} ${
                      isLeftColumnActive || isMediaSelected
                        ? 'ring-4 ring-emerald-500/80 ring-offset-2 dark:ring-offset-slate-900 shadow-xl'
                        : 'hover:brightness-105'
                    }`}
                    style={{ backgroundColor: panel.backgroundColor || '#0f172a' }}
                  >
                    {/* Column Background Photo Layer (if set) */}
                    {panel.backgroundImageUrl && (
                      <>
                        <div
                          className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none transition-transform duration-500 group-hover:scale-105"
                          style={{
                            backgroundImage: `url(${panel.backgroundImageUrl})`,
                            filter: panel.backgroundBlur === 'lg' ? 'blur(12px)' : panel.backgroundBlur === 'md' ? 'blur(6px)' : panel.backgroundBlur === 'sm' ? 'blur(3px)' : 'none',
                          }}
                        />
                        <div
                          className="absolute inset-0 z-0 pointer-events-none"
                          style={{
                            backgroundColor: '#000000',
                            opacity: (panel.overlayOpacity ?? 70) / 100,
                          }}
                        />
                      </>
                    )}

                    {/* Top Action Toolbar (Edit Left Panel / Hide Left Panel) */}
                    <div className="relative z-10 flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Column Status Badge */}
                        <Badge
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectColumn?.('left');
                            onSelectField('__media_panel__');
                          }}
                          className={`text-[10px] font-bold gap-1 cursor-pointer transition-all ${
                            isLeftColumnActive
                              ? 'bg-emerald-500 text-white shadow-md font-black'
                              : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur'
                          }`}
                        >
                          👈 Left Hero Column {isLeftColumnActive && '✓ (Active Target)'}
                        </Badge>

                        {/* 1. Trust Badge Widget */}
                        {(panel.showBadge ?? Boolean(panel.badgeText)) && panel.badgeText && (
                          <div className="group/badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur transition-all">
                            <Star className="size-3 text-amber-400 fill-amber-400" />
                            <span>{panel.badgeText}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePanel({ showBadge: false });
                                toast.success('Removed badge from left column');
                              }}
                              className="opacity-0 group-hover/badge:opacity-100 hover:text-rose-400 p-0.5 ml-0.5 rounded transition-opacity"
                              title="Delete Badge"
                            >
                              <X className="size-2.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold gap-1 transition-opacity ${
                            isMediaSelected
                              ? 'bg-emerald-600 text-white opacity-100 shadow-xs'
                              : 'bg-white/20 text-white opacity-0 group-hover:opacity-100 backdrop-blur'
                          }`}
                        >
                          <Edit2 className="size-2.5" />
                          <span>Edit Column Settings</span>
                        </Badge>
                      </div>
                    </div>

                    {/* 2. Visual Media Block (Photo, Video, Map, or Gradient) */}
                    {(panel.showMedia ?? true) && (
                      <div className="relative z-10 my-4 rounded-2xl overflow-hidden border border-white/10 bg-slate-950/80 shadow-2xl group/media">
                        {/* Hover Quick Action to Delete/Change Media */}
                        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover/media:opacity-100 flex items-center gap-1 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updatePanel({ showMedia: false });
                              toast.success('Removed media widget from left column');
                            }}
                            className="p-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[10px] flex items-center gap-1 shadow-md"
                            title="Delete Media Block"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>

                        {panel.mediaType === 'map' ? (
                          <div className="relative w-full aspect-video min-h-[220px] bg-slate-950 overflow-hidden flex flex-col justify-between p-4">
                            <iframe
                              src={`https://maps.google.com/maps?q=${encodeURIComponent(panel.mapAddress || 'Austin, TX')}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                              title="Location Map"
                              className="absolute inset-0 w-full h-full border-0 pointer-events-none opacity-60 mix-blend-luminosity"
                            />
                            <div className="relative z-10 flex items-center justify-between">
                              <Badge className="bg-rose-600 text-white text-[10px] gap-1 shadow-md">
                                <MapPin className="size-3" /> Live Dispatch Area
                              </Badge>
                            </div>
                            <div className="relative z-10 bg-slate-900/90 backdrop-blur border border-white/10 p-2.5 rounded-xl">
                              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                <MapPin className="size-3 text-rose-400" />
                                {panel.mapAddress || 'Austin, TX Metro Area'}
                              </p>
                              {panel.mapServiceRadius && (
                                <p className="text-[10px] text-slate-300 mt-0.5">
                                  {panel.mapServiceRadius}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : panel.mediaType === 'gradient' ? (
                          <div className="relative w-full aspect-video min-h-[220px] overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 p-6 flex flex-col justify-center items-center text-center">
                            <div className="size-32 rounded-full bg-primary/30 blur-2xl absolute -top-4 -left-4" />
                            <div className="size-32 rounded-full bg-indigo-500/20 blur-2xl absolute -bottom-4 -right-4" />
                            <div className="relative z-10 space-y-2">
                              <div className="size-10 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center mx-auto text-primary">
                                <Sparkles className="size-5" />
                              </div>
                              <p className="text-sm font-black text-white">2026 Luminous Canvas</p>
                              <p className="text-[11px] text-slate-300 max-w-xs">Atmospheric glow with instant response guarantees.</p>
                            </div>
                          </div>
                        ) : panel.mediaType === 'video' && panel.mediaUrl ? (
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
                    )}

                    {/* 3. Headline, Subtitle & Value Benefits */}
                    <div className="relative z-10 space-y-3 mt-auto">
                      {(panel.showHeadline ?? true) && (
                        <div className="group/head relative">
                          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-snug">
                            {panel.headline || formData.name || 'Fast & Reliable Professional Service'}
                          </h2>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updatePanel({ showHeadline: false });
                              toast.success('Removed headline');
                            }}
                            className="absolute top-0 -right-5 opacity-0 group-hover/head:opacity-100 hover:text-rose-400 p-0.5 rounded transition-opacity"
                            title="Delete Headline"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      )}

                      {(panel.showSubtitle ?? true) && panel.subtitle && (
                        <div className="group/sub relative">
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {panel.subtitle}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updatePanel({ showSubtitle: false });
                              toast.success('Removed subtitle');
                            }}
                            className="absolute top-0 -right-5 opacity-0 group-hover/sub:opacity-100 hover:text-rose-400 p-0.5 rounded transition-opacity"
                            title="Delete Subtitle"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      )}

                      {(panel.showBenefits ?? true) && panel.benefitsList && panel.benefitsList.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-white/10 group/benefits relative">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Benefits</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePanel({ showBenefits: false });
                                toast.success('Removed benefits list');
                              }}
                              className="opacity-0 group-hover/benefits:opacity-100 hover:text-rose-400 text-[10px] font-semibold transition-opacity"
                            >
                              Delete List
                            </button>
                          </div>
                          {panel.benefitsList.map((benefit, bIdx) => (
                            <div key={bIdx} className="flex items-center justify-between gap-2 text-xs text-slate-200 group/item">
                              <div className="flex items-center gap-2 min-w-0">
                                <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                                <span className="truncate">{benefit}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const list = [...(panel.benefitsList || [])];
                                  list.splice(bIdx, 1);
                                  updatePanel({ benefitsList: list });
                                }}
                                className="opacity-0 group-hover/item:opacity-100 hover:text-rose-400 p-0.5 shrink-0"
                                title="Delete Point"
                              >
                                <Trash2 className="size-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 4. Left Column Widgets (Added directly to Left Hero) */}
                      {leftColumnFields.length > 0 && (
                        <div className="space-y-3 pt-3 border-t border-white/10">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                              <span>Left Column Widgets</span>
                              <Badge className="bg-emerald-500 text-white text-[9px] py-0 px-1 font-extrabold">{leftColumnFields.length}</Badge>
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2.5">
                            {leftColumnFields.map((f) => {
                              const isSelected = selectedFieldId === f.id;
                              const widthCls = getWidthClasses(f.width);

                              return (
                                <div
                                  key={f.id}
                                  id={`field-card-${f.id}`}
                                  data-field-id={f.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectColumn?.('left');
                                    onSelectField(f.id);
                                  }}
                                  className={`group/card relative p-3 rounded-xl border transition-all cursor-pointer space-y-2 text-slate-900 dark:text-slate-100 ${widthCls} ${
                                    isSelected
                                      ? 'border-emerald-400 bg-white dark:bg-slate-900 ring-2 ring-emerald-400/30 shadow-md'
                                      : 'border-white/20 bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-900 shadow-sm'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <label className="text-xs font-bold truncate flex items-center gap-1 text-slate-900 dark:text-slate-100">
                                      <span className="truncate">{f.label || 'Question'}</span>
                                      {f.required && <span className="text-rose-500">*</span>}
                                    </label>
                                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                      {((f.widgetType && f.widgetType.includes('calculation')) || f.type === 'calculation') && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onSelectColumn?.('left');
                                            onSelectField(f.id);
                                            toast.info('Opening Formula Pad...');
                                          }}
                                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 flex items-center gap-1 transition-colors border border-blue-200/60"
                                          title="Open Formula Pad 🪄"
                                        >
                                          <Wand2 className="size-2.5" /> Formula
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateField(f.id, { layoutColumn: 'right' })}
                                        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 text-slate-700 dark:text-slate-300 hover:text-emerald-700 transition-colors"
                                        title="Move to Right Column"
                                      >
                                        Right 👉
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDuplicateField(f)}
                                        className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                                        title="Duplicate"
                                      >
                                        <Copy className="size-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteField(f.id)}
                                        className="p-1 rounded text-rose-500 hover:text-rose-700 transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 className="size-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <StudioFieldPreview
                                    field={f}
                                    canvasFormData={effectiveCanvasFormData}
                                    onCanvasFieldChange={handleCanvasFieldChange}
                                    selectedFieldId={selectedFieldId}
                                    onSelectField={onSelectField}
                                    inputBorderRadius={inputBorderRadius}
                                    defaultInputHeightCls={defaultInputHeightCls}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 5. Add Widget to Left Column Action Button */}
                      {onOpenAddWidgetDialog && (
                        <div className="pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectColumn?.('left');
                              onOpenAddWidgetDialog(currentStepIndex, activeStep.id);
                            }}
                            className="w-full h-8 bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold gap-1.5 rounded-xl shadow-xs"
                          >
                            <Plus className="size-3" /> Add Widget to Left Column
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  )}

                  {/* RIGHT FORM FIELDS COLUMN (Stepped / Single Page) */}
                  <div
                    onClick={() => onSelectColumn?.('right')}
                    className={`p-6 sm:p-8 flex flex-col justify-between space-y-6 ${rightWidthClass} bg-white dark:bg-slate-900 transition-all ${
                      isRightColumnActive
                        ? 'ring-2 ring-primary/40'
                        : ''
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Top Action & Column Status Header */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                            {steps.length > 1 ? activeStep.title || `Step ${currentStepIndex + 1}` : formData.name || 'Request a Quote / Booking'}
                          </h3>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {steps.length > 1
                              ? `Step ${currentStepIndex + 1} of ${steps.length} • ${progressPercent}% Complete`
                              : formData.description || 'Fill in the details below to receive your upfront estimate.'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectColumn?.('right');
                            }}
                            className={`text-[10px] font-bold gap-1 cursor-pointer transition-all ${
                              isRightColumnActive
                                ? 'bg-primary text-primary-foreground shadow-xs font-black'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            👉 Right Form Column {isRightColumnActive && '✓ (Active Target)'}
                          </Badge>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddStep();
                            }}
                            className="h-6.5 text-[10px] font-semibold gap-1 px-2 border-dashed rounded-lg shadow-2xs cursor-pointer shrink-0"
                          >
                            <Plus className="size-2.5" /> Step
                          </Button>
                        </div>
                      </div>

                      {/* Stepper Carousel / Steps Indicator (Multi-Step only) */}
                      {steps.length > 1 && (
                        <div className="space-y-2 pb-2 border-b border-border/40">
                          {/* Progress Line */}
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${progressPercent}%`,
                                backgroundColor: primaryColor,
                              }}
                            />
                          </div>

                          {/* Horizontal Step Navigation Chips (Never wraps into multiple vertical rows) */}
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
                            {steps.map((step, sIdx) => {
                              const isCurrent = sIdx === currentStepIndex;
                              return (
                                <button
                                  key={step.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onStepChange(sIdx);
                                  }}
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                    isCurrent
                                      ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                                      : 'bg-muted/80 text-muted-foreground hover:text-foreground hover:bg-muted'
                                  }`}
                                  title={`Go to Step ${sIdx + 1}: ${step.title}`}
                                >
                                  <span
                                    className={`size-3.5 rounded-full text-[9px] flex items-center justify-center font-extrabold ${
                                      isCurrent
                                        ? 'bg-black/20 dark:bg-white/20 text-white'
                                        : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {sIdx + 1}
                                  </span>
                                  <span className="truncate max-w-[100px] sm:max-w-[130px]">
                                    {step.title}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Right Fields Grid */}
                      <div className="flex flex-wrap gap-3">
                        {rightColumnFields.length > 0 ? (
                          rightColumnFields.map((f) => {
                            const isSelected = selectedFieldId === f.id;
                            const widthCls = getWidthClasses(f.width);

                            return (
                              <div
                                key={f.id}
                                id={`field-card-${f.id}`}
                                data-field-id={f.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectColumn?.('right');
                                  onSelectField(f.id);
                                }}
                                className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${widthCls} ${
                                  isSelected
                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                                    : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5 truncate">
                                    <span className="truncate">{f.label || 'Question'}</span>
                                    {f.required && <span className="text-rose-500">*</span>}
                                  </label>

                                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    {/* Move to Left Column Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateField(f.id, { layoutColumn: 'left' })}
                                      className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 text-slate-700 dark:text-slate-300 hover:text-emerald-700 transition-colors"
                                      title="Move to Left Hero Column"
                                    >
                                      👈 Left
                                    </button>

                                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 text-[9px] font-bold">
                                      <button
                                        type="button"
                                        onClick={() => handleSetFieldWidth(f.id, 'full')}
                                        className={`px-1.5 py-0.5 rounded ${
                                          !f.width || f.width === 'full'
                                            ? 'bg-primary text-primary-foreground shadow-2xs font-extrabold'
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
                                            ? 'bg-primary text-primary-foreground shadow-2xs font-extrabold'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                      >
                                        2C
                                      </button>
                                    </div>

                                    {((f.widgetType && f.widgetType.includes('calculation')) || f.type === 'calculation') && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onSelectColumn?.('right');
                                          onSelectField(f.id);
                                          toast.info('Opening Formula Pad...');
                                        }}
                                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 flex items-center gap-1 transition-colors border border-blue-200/60"
                                        title="Open Formula Pad 🪄"
                                      >
                                        <Wand2 className="size-2.5" /> Formula
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateField(f)}
                                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                      title="Duplicate Block"
                                    >
                                      <Copy className="size-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteField(f.id)}
                                      className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                      title="Delete Block"
                                    >
                                      <Trash2 className="size-3" />
                                    </button>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="p-1 rounded text-muted-foreground hover:text-foreground" title="More Options">
                                          <Sliders className="size-3" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="text-xs w-48">
                                        <DropdownMenuItem onClick={() => handleUpdateField(f.id, { layoutColumn: 'left' })} className="gap-1.5">
                                          👈 Move to Left Column
                                        </DropdownMenuItem>
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

                                <StudioFieldPreview
                                  field={f}
                                  canvasFormData={effectiveCanvasFormData}
                                  onCanvasFieldChange={handleCanvasFieldChange}
                                  selectedFieldId={selectedFieldId}
                                  onSelectField={onSelectField}
                                  inputBorderRadius={inputBorderRadius}
                                  defaultInputHeightCls={defaultInputHeightCls}
                                />
                              </div>
                            );
                          })
                        ) : (
                          <div className="w-full p-8 border-2 border-dashed rounded-2xl text-center text-muted-foreground text-xs space-y-2">
                            <p>No fields in this right column step yet.</p>
                            {onOpenAddWidgetDialog && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  onSelectColumn?.('right');
                                  onOpenAddWidgetDialog(currentStepIndex, activeStep.id);
                                }}
                                className="h-8 text-xs gap-1.5"
                              >
                                <Plus className="size-3" /> Add Question to Right Column
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Add Field Button inside split canvas */}
                      {onOpenAddWidgetDialog && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            onSelectColumn?.('right');
                            onOpenAddWidgetDialog(currentStepIndex, activeStep.id);
                          }}
                          className="w-full h-9 border border-dashed border-border text-xs text-muted-foreground hover:text-primary hover:border-primary/50 gap-1.5 rounded-xl"
                        >
                          <Plus className="size-3.5" /> Add Widget to Right Column
                        </Button>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                      {steps.length > 1 && currentStepIndex > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
                          className="h-9 text-xs gap-1"
                        >
                          <ArrowLeft className="size-3" /> Previous Step
                        </Button>
                      ) : (
                        <span />
                      )}

                      {steps.length > 1 && currentStepIndex < steps.length - 1 ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onStepChange(currentStepIndex + 1)}
                          className="h-9 text-xs gap-1.5 px-4 font-bold"
                          style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                        >
                          Next Step <ArrowRight className="size-3" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 text-xs gap-1.5 px-5 font-bold shadow-md"
                          style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                        >
                          {formData.settings?.submitButtonText || 'Submit Form ⚡'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* RIGHT-SIDE MEDIA COLUMN — rendered last if position === 'right' */}
                  {panel.position === 'right' && (
                    <div
                      onClick={() => {
                        onSelectColumn?.('left');
                        onSelectField('__media_panel__');
                      }}
                      className={`relative p-6 sm:p-8 text-white flex flex-col justify-between cursor-pointer group transition-all overflow-hidden ${leftWidthClass} ${
                        isLeftColumnActive || isMediaSelected
                          ? 'ring-4 ring-emerald-500/80 ring-offset-2 dark:ring-offset-slate-900 shadow-xl'
                          : 'hover:brightness-105'
                      }`}
                      style={{ backgroundColor: panel.backgroundColor || '#0f172a' }}
                    >
                      <div className="text-center py-8 text-white/70 text-xs">
                        <Monitor className="size-8 mx-auto mb-2 opacity-50" />
                        Media panel appears here on the right side.
                      </div>
                    </div>
                  )}
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
                        id={`field-card-${field.id}`}
                        data-field-id={field.id}
                        onClick={() => onSelectField(field.id)}
                        className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${widthCls} ${
                          isSelected
                            ? 'border-emerald-600 dark:border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 ring-2 ring-emerald-600/20 shadow-sm'
                            : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                        }`}
                      >
                        {/* Top Card Bar: Label + Widget Type Badge + Width Pills + Actions */}
                        <div className="flex items-center justify-between gap-1">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 min-w-0">
                            <span className="size-4 rounded bg-slate-200 dark:bg-slate-700 text-[9px] font-bold flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                              {letter}
                            </span>
                            <span className="truncate">{field.label || 'Question'}</span>
                            <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-slate-700/80 shrink-0 select-none">
                              {getFieldWidgetMeta(field).name}
                            </span>
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

                            {((field.widgetType && field.widgetType.includes('calculation')) || field.type === 'calculation') && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectField(field.id);
                                  toast.info('Opening Formula Pad...');
                                }}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 flex items-center gap-1 transition-colors border border-blue-200/60"
                                title="Open Formula Pad 🪄"
                              >
                                <Wand2 className="size-2.5" /> Formula
                              </button>
                            )}

                            {/* Direct Duplicate & Delete Action Buttons */}
                            <button
                              type="button"
                              onClick={() => handleDuplicateField(field)}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Duplicate Block"
                            >
                              <Copy className="size-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteField(field.id)}
                              className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="Delete Block"
                            >
                              <Trash2 className="size-3" />
                            </button>

                            {/* More Actions Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800" title="More Options">
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
                        <StudioFieldPreview
                          field={field}
                          canvasFormData={effectiveCanvasFormData}
                          onCanvasFieldChange={handleCanvasFieldChange}
                          selectedFieldId={selectedFieldId}
                          onSelectField={onSelectField}
                          inputBorderRadius={inputBorderRadius}
                          defaultInputHeightCls={defaultInputHeightCls}
                        />
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
                      style={{ backgroundColor: buttonColor, color: buttonTextColor }}
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
                        id={`field-card-${f.id}`}
                        data-field-id={f.id}
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
                            <span className="text-[9px] font-semibold text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded border border-border/80 shrink-0 select-none">
                              {getFieldWidgetMeta(f).name}
                            </span>
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

                            {((f.widgetType && f.widgetType.includes('calculation')) || f.type === 'calculation') && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectField(f.id);
                                  toast.info('Opening Formula Pad...');
                                }}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 flex items-center gap-1 transition-colors border border-blue-200/60"
                                title="Open Formula Pad 🪄"
                              >
                                <Wand2 className="size-2.5" /> Formula
                              </button>
                            )}

                            {/* Direct Duplicate & Delete Action Buttons */}
                            <button
                              type="button"
                              onClick={() => handleDuplicateField(f)}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Duplicate Block"
                            >
                              <Copy className="size-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteField(f.id)}
                              className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="Delete Block"
                            >
                              <Trash2 className="size-3" />
                            </button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded text-muted-foreground hover:text-foreground" title="More Options">
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
                        <StudioFieldPreview
                          field={f}
                          canvasFormData={effectiveCanvasFormData}
                          onCanvasFieldChange={handleCanvasFieldChange}
                          selectedFieldId={selectedFieldId}
                          onSelectField={onSelectField}
                          inputBorderRadius={inputBorderRadius}
                          defaultInputHeightCls={defaultInputHeightCls}
                        />
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
