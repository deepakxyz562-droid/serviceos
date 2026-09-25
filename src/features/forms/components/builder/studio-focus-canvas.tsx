'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
import { SortableFieldWrapper } from '../runtime/sortable-field-wrapper';
import { evaluateFormulaSafe } from '../runtime/form-runtime-renderer';
import { FormShell } from '../runtime/form-shell';
import { FormRenderer } from '../runtime/form-renderer';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
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
  onSelectField: (fieldId: string | null) => void;
  selectedColumn?: 'left' | 'right';
  onSelectColumn?: (col: 'left' | 'right') => void;
  viewMode: 'classic' | 'card' | 'split_media';
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

  // ─── Drag-and-Drop (Jotform/Elementor parity) ────────────────────────
  // @dnd-kit sensors: pointer (mouse/touch) + keyboard (accessibility)
  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // 5px before drag starts (allows clicks)
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle drag end: reorder the field in formData.fields
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      onFormDataChange((prev) => {
        const newFields = arrayMove(prev.fields, oldIndex, newIndex);
        return { ...prev, fields: newFields };
      });
    },
    [fields, onFormDataChange],
  );



  // Move Field to Another Step
  const handleMoveFieldToStep = (fieldId: string, targetStepId: string) => {
    handleUpdateField(fieldId, { stepId: targetStepId });
    toast.success('Field moved to new step');
  };

  // Move Field to Another Column (left/right)
  const handleMoveFieldToColumn = (fieldId: string, column: 'left' | 'right') => {
    handleUpdateField(fieldId, { layoutColumn: column });
    toast.success(`Field moved to ${column === 'left' ? 'left hero' : 'right form'} column`);
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
      onClick={() => onSelectField(null)}
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
                    layout: 'split_media',
                    mediaPanel: updated,
                  } as any,
                  settings: {
                    ...(prev.settings || {}),
                    formLayout: 'split_media',
                  },
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

              // ─── Left/Right Column: Generic Widget Container (Phase 4) ──────
              // NO FormMediaHeroPanel — renders leftColumnFields directly
              // (including mediaPanel-migrated content widgets from Phase 2)
              // The column background (color, image, overlay) is applied via
              // inline style — controlled via Inspector, not hardcoded content.
              const renderHeroMediaPanel = () => (
                <div
                  className={`${leftWidthClass} relative ${isMediaSelected ? 'outline outline-2 outline-emerald-500 outline-offset-2 rounded-lg' : 'hover:outline hover:outline-1 hover:outline-emerald-400/40 hover:rounded-lg'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectColumn?.('left');
                    onSelectField('__media_panel__');
                  }}
                  style={{
                    backgroundColor: panel.backgroundColor || '#0f172a',
                    backgroundImage: panel.backgroundImageUrl ? `url(${panel.backgroundImageUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {/* Background overlay */}
                  {panel.backgroundImageUrl && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ backgroundColor: '#000', opacity: (panel.overlayOpacity ?? 70) / 100 }}
                    />
                  )}

                  {/* Generic widgets — rendered directly (no FormMediaHeroPanel) */}
                  <div className="relative z-10 p-6 sm:p-8 text-white space-y-3">
                    <DndContext
                      sensors={dndSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext items={leftColumnFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                          {leftColumnFields.length > 0 ? (
                            leftColumnFields.map((f) => (
                              <SortableFieldWrapper
                                key={f.id}
                                field={f}
                                value={effectiveCanvasFormData[f.id]}
                                onChange={(val) => handleCanvasFieldChange(f.id, val)}
                                allFormData={effectiveCanvasFormData}
                                selectedFieldId={selectedFieldId}
                                onSelectField={(id) => { onSelectColumn?.('left'); onSelectField(id); }}
                                inputBorderRadius={inputBorderRadius}
                                defaultInputHeightCls={defaultInputHeightCls}
                                onDuplicate={handleDuplicateField}
                                onDelete={handleDeleteField}
                                onMoveUp={(id) => handleMoveField(id, 'up')}
                                onMoveDown={(id) => handleMoveField(id, 'down')}
                                onMoveToColumn={handleMoveFieldToColumn}
                                onMoveToStep={handleMoveFieldToStep}
                                onOpenSettings={(id) => { onSelectColumn?.('left'); onSelectField(id); }}
                                steps={steps}
                                hasColumns={true}
                              />
                            ))
                          ) : (
                            <div className="w-full p-4 text-center rounded-xl border border-dashed border-white/20 bg-white/5 text-slate-300 text-xs">
                              <p>Add widgets here — heading, image, paragraph, etc.</p>
                            </div>
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>
              );


              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[550px]">
                  {/* LEFT HERO MEDIA COLUMN */}
                  {panel.position !== 'right' && renderHeroMediaPanel()}

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
                      {/* Form Header — matches runtime (name + description, no step progress) */}
                      <div className="pb-3 border-b border-border/60">
                        <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                          {formData.name || 'Untitled Form'}
                        </h3>
                        {formData.description && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {formData.description}
                          </p>
                        )}
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

                      {/* Right Fields Grid — WYSIWYG + Drag-and-Drop */}
                      <DndContext
                        sensors={dndSensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext items={rightColumnFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                          <div className="flex flex-wrap gap-y-4 gap-x-3">
                            {rightColumnFields.length > 0 ? (
                               rightColumnFields.map((f) => (
                                <SortableFieldWrapper
                                  key={f.id}
                                  field={f}
                                  value={effectiveCanvasFormData[f.id]}
                                  onChange={(val) => handleCanvasFieldChange(f.id, val)}
                                  allFormData={effectiveCanvasFormData}
                                  selectedFieldId={selectedFieldId}
                                  onSelectField={onSelectField}
                                  inputBorderRadius={inputBorderRadius}
                                  defaultInputHeightCls={defaultInputHeightCls}
                                  onSetWidth={handleSetFieldWidth}
                                  onDuplicate={handleDuplicateField}
                                  onDelete={handleDeleteField}
                                  onMoveUp={(id) => handleMoveField(id, 'up')}
                                  onMoveDown={(id) => handleMoveField(id, 'down')}
                                  onMoveToColumn={handleMoveFieldToColumn}
                                  onMoveToStep={handleMoveFieldToStep}
                                  onOpenSettings={(id) => { onSelectField(id); }}
                                  steps={steps}
                                  hasColumns={viewMode === 'split_media'}
                                />
                              ))
                            ) : (
                              <div className="w-full p-8 text-center text-muted-foreground text-xs">
                                <p>No fields yet. Click "+ Add field" below to add one.</p>
                              </div>
                            )}
                          </div>
                        </SortableContext>
                      </DndContext>

                      {/* Add Field Button — subtle, appears as a dashed divider */}
                      {onOpenAddWidgetDialog && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectColumn?.('right');
                            onOpenAddWidgetDialog(currentStepIndex, activeStep.id);
                          }}
                          className="w-full h-10 border border-dashed border-border/60 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="size-3.5" /> Add field
                        </button>
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
                          className="h-9 text-xs gap-1.5 px-4 font-bold cursor-pointer"
                          style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                        >
                          Next Step <ArrowRight className="size-3" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 text-xs gap-1.5 px-5 font-bold shadow-md cursor-pointer"
                          style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                        >
                          {formData.settings?.submitButtonText || 'Submit Form ⚡'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* RIGHT-SIDE MEDIA COLUMN */}
                  {panel.position === 'right' && renderHeroMediaPanel()}
                </div>
              );
            })()}
          </div>
        ) : viewMode === 'card' ? (
          /* ════ 1. FOCUS CARD MULTI-STEP VIEW (Typeform / Card Swipe Parity) ════ */
          <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl p-6 sm:p-10 transition-all">
            <div className="flex flex-col justify-between space-y-6">
              {/* Question Headline */}
              <div className="space-y-1.5 pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <span
                    className="size-6 rounded-lg text-white text-xs font-bold flex items-center justify-center shadow-xs shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isMultiStep ? currentStepIndex + 1 : '1'}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">
                    {activeStep.title || (isMultiStep ? `Step ${currentStepIndex + 1}` : formData.name || 'Untitled Form')}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground pl-8">
                  {isMultiStep ? 'Complete the questions in this step to proceed.' : 'Fill in the information below.'}
                </p>
              </div>

              {/* Step Fields Render — WYSIWYG + Drag-and-Drop */}
              <DndContext
                sensors={dndSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={activeStep.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-wrap gap-y-4 gap-x-3 items-start justify-between">
                    {activeStep.fields.length > 0 ? (
                      activeStep.fields.map((field) => (
                        <SortableFieldWrapper
                          key={field.id}
                          field={field}
                          value={effectiveCanvasFormData[field.id]}
                          onChange={(val) => handleCanvasFieldChange(field.id, val)}
                          allFormData={effectiveCanvasFormData}
                          selectedFieldId={selectedFieldId}
                          onSelectField={onSelectField}
                          inputBorderRadius={inputBorderRadius}
                          defaultInputHeightCls={defaultInputHeightCls}
                          onSetWidth={handleSetFieldWidth}
                          onDuplicate={handleDuplicateField}
                          onDelete={handleDeleteField}
                          onMoveUp={(id) => handleMoveField(id, 'up')}
                          onMoveDown={(id) => handleMoveField(id, 'down')}
                          onMoveToStep={handleMoveFieldToStep}
                          onOpenSettings={(id) => { onSelectField(id); }}
                          steps={steps}
                          hasColumns={false}
                        />
                      ))
                    ) : (
                      <div className="w-full p-8 text-center text-muted-foreground text-xs">
                        <p>No questions yet.</p>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>

              {onOpenAddWidgetDialog && (
                <button
                  type="button"
                  onClick={() => onOpenAddWidgetDialog(currentStepIndex, activeStep.id)}
                  className="w-full h-10 border border-dashed border-border/60 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="size-3.5" /> Add field
                </button>
              )}

              {/* Step Navigation Controls (Typeform Enter to Continue) */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {isMultiStep && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentStepIndex === 0}
                      onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
                      className="text-xs h-9 rounded-xl gap-1"
                    >
                      <ArrowLeft className="size-3.5" /> Back
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={() => {
                      if (isMultiStep && currentStepIndex < steps.length - 1) {
                        onStepChange(currentStepIndex + 1);
                      }
                    }}
                    className="text-xs h-9 rounded-xl font-bold text-white shadow-md gap-1.5 px-4 cursor-pointer"
                    style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                  >
                    <span>{isMultiStep && currentStepIndex === steps.length - 1 ? (formData.settings?.submitButtonText || 'Submit Form') : 'OK · Continue'}</span>
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
          /* ════ 2. CLASSIC DOCUMENT VIEW (Jotform Parity with Multi-Column) ════ */
          <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6 transition-all">
            {/* Form Header — matches live runtime */}
            <div className="pb-4 border-b border-border/40">
              <h1 className="text-xl sm:text-2xl font-black text-foreground">
                {formData.name || 'Untitled Form'}
              </h1>
              {formData.description && (
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-lg">
                  {formData.description}
                </p>
              )}
            </div>

            {/* Top Multi-Step Tabs if multi-step form */}
            {isMultiStep && steps.length > 1 && (
              <div
                className="grid gap-2 sm:gap-3 mb-2 w-full"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(steps.length, 6)}, minmax(0, 1fr))`,
                }}
              >
                {steps.map((step, idx) => {
                  const isActive = idx === currentStepIndex;
                  return (
                    <button
                      key={step.id || idx}
                      type="button"
                      onClick={() => onStepChange(idx)}
                      className={`flex items-center gap-2 p-2.5 rounded-2xl text-left transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/20'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-border/60 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`size-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                        style={isActive ? { backgroundColor: primaryColor } : undefined}
                      >
                        0{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate text-foreground">
                          {step.title}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Multi-Column Field Grid — WYSIWYG + Drag-and-Drop */}
            <DndContext
              sensors={dndSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={(isMultiStep ? activeStep.fields : fields).map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-wrap gap-y-4 gap-x-3 items-start justify-between">
                  {(isMultiStep ? activeStep.fields : fields).length > 0 ? (
                    (isMultiStep ? activeStep.fields : fields).map((f) => (
                      <SortableFieldWrapper
                        key={f.id}
                        field={f}
                        value={effectiveCanvasFormData[f.id]}
                        onChange={(val) => handleCanvasFieldChange(f.id, val)}
                        allFormData={effectiveCanvasFormData}
                        selectedFieldId={selectedFieldId}
                        onSelectField={onSelectField}
                        inputBorderRadius={inputBorderRadius}
                        defaultInputHeightCls={defaultInputHeightCls}
                        onSetWidth={handleSetFieldWidth}
                        onDuplicate={handleDuplicateField}
                        onDelete={handleDeleteField}
                        onMoveUp={(id) => handleMoveField(id, 'up')}
                        onMoveDown={(id) => handleMoveField(id, 'down')}
                        onMoveToStep={handleMoveFieldToStep}
                        onOpenSettings={(id) => { onSelectField(id); }}
                        steps={steps}
                        hasColumns={false}
                      />
                    ))
                  ) : (
                    <div className="w-full p-8 text-center text-muted-foreground text-xs">
                      <p>No fields yet in this section.</p>
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add Field Button */}
            {onOpenAddWidgetDialog && (
              <button
                type="button"
                onClick={() => onOpenAddWidgetDialog(currentStepIndex, activeStep.id)}
                className="w-full h-10 border border-dashed border-border/60 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="size-3.5" /> Add field
              </button>
            )}

            {/* Bottom Action Footer */}
            <div className="pt-4 border-t border-border/40 flex items-center justify-between">
              {isMultiStep && currentStepIndex > 0 ? (
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

              {isMultiStep && currentStepIndex < steps.length - 1 ? (
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
        )}
      </div>
    </div>
  );
}
