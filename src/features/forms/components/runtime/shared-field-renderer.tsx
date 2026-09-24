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
    return (
      <div
        className={cn('w-full', isSelected && 'ring-2 ring-emerald-500 rounded-lg')}
        onClick={isEditMode ? (e) => { e.stopPropagation(); onSelectField?.(field.id); } : undefined}
      >
        <h3 className="text-lg font-bold text-foreground">{field.label}</h3>
      </div>
    );
  }

  if (field.type === 'paragraph') {
    const text = field.helpText || field.label || '';
    return (
      <div
        className={cn('w-full', isSelected && 'ring-2 ring-emerald-500 rounded-lg')}
        onClick={isEditMode ? (e) => { e.stopPropagation(); onSelectField?.(field.id); } : undefined}
      >
        {field.label?.includes('<') ? (
          <div className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: field.label }} />
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">{text || field.label}</p>
        )}
      </div>
    );
  }

  if (field.type === 'divider') {
    return (
      <div
        className={cn('w-full', isSelected && 'ring-2 ring-emerald-500 rounded-lg')}
        onClick={isEditMode ? (e) => { e.stopPropagation(); onSelectField?.(field.id); } : undefined}
      >
        <hr className="my-3 border-border/60" />
      </div>
    );
  }

  // Standard field rendering — used for ALL non-decorative fields
  return (
    <div
      className={cn(
        'space-y-1.5 relative group',
        widthClass,
        isSelected && 'ring-2 ring-emerald-500 ring-offset-2 rounded-xl p-1',
        isEditMode && 'cursor-pointer',
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

      {/* Edit-mode toolbar — shown when field is selected */}
      {isEditMode && isSelected && (
        <div className="absolute -top-7 right-0 flex items-center gap-0.5 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-md px-1 py-0.5 z-20">
          {onMoveField && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onMoveField(field.id, 'up'); }}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground"
              title="Move up"
            >
              ↑
            </button>
          )}
          {onMoveField && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onMoveField(field.id, 'down'); }}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground"
              title="Move down"
            >
              ↓
            </button>
          )}
          {onDuplicateField && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDuplicateField(field.id); }}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground text-xs"
              title="Duplicate"
            >
              ⧉
            </button>
          )}
          {onDeleteField && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDeleteField(field.id); }}
              className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 text-xs"
              title="Delete"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
});
