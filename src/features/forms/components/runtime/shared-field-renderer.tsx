'use client';

/**
 * FormFieldRenderer — The SINGLE source of truth for field rendering.
 *
 * This component is used by:
 *   - The EDITOR canvas (StudioFocusCanvas) with mode="edit"
 *   - The RUNTIME renderer (FormRuntimeRenderer) with mode="live"
 *   - The PREVIEW pane (FormRuntimeRenderer with previewMode=true) with mode="live"
 *
 * This ensures that a field renders IDENTICALLY in all three contexts.
 * The ONLY difference is the `mode` prop:
 *   - mode="edit": adds click-to-select, selection ring, and field toolbar
 *   - mode="live": renders the field as-is (interactive or read-only)
 *
 * This is the Elementor/Jotform pattern: ONE renderer, with an overlay
 * for edit chrome. Previously, the editor had its own bespoke field
 * rendering that diverged from the runtime in 18+ ways (different width
 * classes, missing per-field styling, different submit button colors,
 * different split-media column math, etc.).
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { WidgetRuntimeDispatcher } from './widgets/widget-runtime-dispatcher';
import type { FormField } from '@/lib/forms/form-schema-types';
import { cn } from '@/lib/utils';

export interface FormFieldRendererProps {
  field: FormField;
  value: any;
  onChange: (val: any) => void;
  allFormData: Record<string, any>;
  formId?: string;

  /** "edit" = editor canvas (adds selection chrome); "live" = runtime/preview */
  mode?: 'edit' | 'live';

  /** Edit-mode props */
  selectedFieldId?: string | null;
  onSelectField?: (fieldId: string) => void;
  onDuplicateField?: (fieldId: string) => void;
  onDeleteField?: (fieldId: string) => void;
  onMoveField?: (fieldId: string, direction: 'up' | 'down') => void;

  /** Runtime props */
  errors?: Record<string, string>;
  disabled?: boolean;

  /** Theme context (from the renderer/canvas) */
  inputBorderRadius: string;
  defaultInputHeightCls: string;
}

/**
 * Width class resolver — matches the runtime renderer's width classes EXACTLY.
 * Previously, the editor used `md:w-[calc(50%-0.5rem)]` while the runtime used
 * `sm:w-[48.5%]`. Now both use the same classes.
 */
export function getFieldWidthClass(width?: string): string {
  switch (width) {
    case 'half':
      return 'w-full sm:w-[48.5%]';
    case 'third':
      return 'w-full sm:w-[31.5%]';
    case 'quarter':
      return 'w-full sm:w-[23.5%]';
    default:
      return 'w-full';
  }
}

/**
 * Compute the per-field style object. This is the SAME logic used by the
 * runtime renderer. Previously, the editor's StudioFieldPreview rendered
 * a bare `<div className="w-full">` with ZERO per-field styling — so
 * any inspector change to borderRadius, padding, fontSize, etc. was
 * invisible in the editor and only appeared in preview/live.
 */
export function getFieldStyle(field: FormField): React.CSSProperties {
  const fieldStyle: React.CSSProperties = {
    ...(field.widthPx ? { maxWidth: `${field.widthPx}px` } : {}),
  };
  return fieldStyle;
}

export function getFieldInputStyle(
  field: FormField,
  inputBorderRadius: string,
): React.CSSProperties {
  const fieldRadius =
    field.borderRadius && field.borderRadius !== 'inherit'
      ? field.borderRadius
      : inputBorderRadius;

  return {
    ...(field.heightPx ? { height: `${field.heightPx}px` } : {}),
    ...(field.align ? { textAlign: field.align } : {}),
    borderRadius: fieldRadius,
    ...(field.padding ? { padding: field.padding } : {}),
    ...(field.fontSize && field.fontSize !== 'inherit' ? { fontSize: field.fontSize } : {}),
    ...(field.backgroundColor ? { backgroundColor: field.backgroundColor } : {}),
    ...(field.borderStyle && field.borderStyle !== 'inherit'
      ? { borderStyle: field.borderStyle, borderWidth: '1px' }
      : {}),
    ...(field.borderColor ? { borderColor: field.borderColor } : {}),
    ...(field.textColor ? { color: field.textColor } : {}),
  };
}

export function getFieldInputHeightClass(
  field: FormField,
  defaultCls: string,
): string {
  return field.inputHeight === 'compact'
    ? 'h-9'
    : field.inputHeight === 'medium'
    ? 'h-11'
    : field.inputHeight === 'large'
    ? 'h-13'
    : defaultCls;
}

export function isLabelHidden(field: FormField): boolean {
  return (
    field.labelEnabled === false ||
    field.labelAlign === 'hidden' ||
    ['heading', 'paragraph', 'divider'].includes(field.type)
  );
}

export function getLabelAlignClass(field: FormField): string {
  return field.labelAlign === 'left'
    ? 'flex items-center gap-2'
    : field.labelAlign === 'right'
    ? 'flex items-center justify-end gap-2'
    : '';
}

/**
 * The main FormFieldRenderer component.
 *
 * In `mode="edit"`:
 *   - The outer div is clickable (calls onSelectField)
 *   - When selected, shows a ring outline
 *   - Shows a small toolbar (duplicate/delete/move) when selected
 *   - The widget inside is still interactive (pointer-events: auto)
 *
 * In `mode="live"`:
 *   - No click handler, no selection ring, no toolbar
 *   - The widget is fully interactive
 */
export const FormFieldRenderer = React.memo(function FormFieldRenderer({
  field,
  value,
  onChange,
  allFormData,
  formId,
  mode = 'live',
  selectedFieldId,
  onSelectField,
  onDuplicateField,
  onDeleteField,
  onMoveField,
  errors,
  disabled = false,
  inputBorderRadius,
  defaultInputHeightCls,
}: FormFieldRendererProps) {
  const isEditMode = mode === 'edit';
  const isSelected = isEditMode && selectedFieldId === field.id;
  const widthClass = getFieldWidthClass(field.width);
  const labelHidden = isLabelHidden(field);
  const labelAlignClass = getLabelAlignClass(field);
  const fieldStyle = getFieldStyle(field);
  const hasError = errors?.[field.id];

  // For heading/paragraph/divider fields, render without the standard wrapper
  if (field.type === 'heading') {
    const cfg = (field.widgetConfig as Record<string, any>) || {};
    const level = cfg.level || 'h3';
    const align = cfg.align || 'left';
    const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
    const sizeClass = level === 'h1' ? 'text-2xl' : level === 'h2' ? 'text-xl' : level === 'h4' ? 'text-sm' : 'text-base';
    const Tag = level as keyof JSX.IntrinsicElements;
    return (
      <div
        className={cn('w-full', isEditMode && isSelected && 'outline outline-2 outline-emerald-500 outline-offset-2 rounded-lg', isEditMode && 'cursor-pointer')}
        onClick={isEditMode ? (e) => { e.stopPropagation(); onSelectField?.(field.id); } : undefined}
      >
        <Tag className={`${sizeClass} font-bold text-foreground pt-2 border-b border-border/60 pb-1 w-full ${alignClass}`}>{field.label}</Tag>
      </div>
    );
  }

  if (field.type === 'paragraph') {
    const cfg = (field.widgetConfig as Record<string, any>) || {};
    const text = cfg.text || field.helpText || field.label || '';
    const allowHTML = cfg.allowHTML || false;
    return (
      <div
        className={cn('w-full', isEditMode && isSelected && 'outline outline-2 outline-emerald-500 outline-offset-2 rounded-lg', isEditMode && 'cursor-pointer')}
        onClick={isEditMode ? (e) => { e.stopPropagation(); onSelectField?.(field.id); } : undefined}
      >
        {allowHTML ? (
          <div className="text-xs text-muted-foreground leading-relaxed w-full" dangerouslySetInnerHTML={{ __html: text }} />
        ) : (
          <p className="text-xs text-muted-foreground leading-relaxed w-full">{text}</p>
        )}
      </div>
    );
  }

  if (field.type === 'divider') {
    return (
      <div
        className={cn('w-full', isEditMode && isSelected && 'outline outline-2 outline-emerald-500 outline-offset-2 rounded-lg', isEditMode && 'cursor-pointer')}
        onClick={isEditMode ? (e) => { e.stopPropagation(); onSelectField?.(field.id); } : undefined}
      >
        <hr className="my-2 border-border/60 w-full" />
      </div>
    );
  }

  // Standard field rendering — used for ALL non-decorative fields
  // Selection uses outline (non-layout-changing) instead of ring-offset + p-1
  // so the editor field dimensions match the runtime dimensions exactly.
  return (
    <div
      className={cn(
        'space-y-1.5 relative group',
        widthClass,
        isEditMode && 'cursor-pointer',
        // ─── Selection: outline, NOT padding/ring-offset ───────────────
        // Previously: 'ring-2 ring-emerald-500 ring-offset-2 rounded-xl p-1'
        // This changed the field's geometry → editor ≠ runtime.
        // Now: outline + outline-offset (doesn't affect layout box).
        isEditMode && isSelected && 'outline outline-2 outline-emerald-500 outline-offset-2 rounded-lg',
        // ─── Hover: subtle outline (not a full card) ──────────────────
        isEditMode && !isSelected && 'hover:outline hover:outline-1 hover:outline-emerald-400/40 hover:outline-offset-2 rounded-lg',
      )}
      style={fieldStyle}
      onClick={isEditMode ? (e) => { e.stopPropagation(); onSelectField?.(field.id); } : undefined}
    >
      {/* Label */}
      {!labelHidden && (
        <Label
          htmlFor={field.id}
          className={cn('text-xs font-bold text-foreground', labelAlignClass)}
        >
          <span>
            {field.label} {field.required && <span className="text-rose-500">*</span>}
          </span>
        </Label>
      )}

      {/* Help text */}
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
      )}

      {/* Error message */}
      {hasError && (
        <p className="text-[11px] text-rose-500 font-medium">{hasError}</p>
      )}

      {/* The actual widget — SAME in both modes */}
      <div className="w-full pointer-events-auto">
        <WidgetRuntimeDispatcher
          field={field as any}
          value={value}
          onChange={onChange}
          allFormData={allFormData}
          formId={formId}
          disabled={disabled}
        />
      </div>

      {/* NOTE: Editor toolbar moved to EditorFieldOverlay (Phase 5).
          FormFieldRenderer is now PURE visual — no editor chrome. */}
    </div>
  );
});
