'use client';

/**
 * SortableFieldWrapper — Wraps a field in a @dnd-kit sortable container.
 *
 * Used ONLY in the editor canvas (not in preview/live). Each field becomes
 * draggable — the user can grab the drag handle and reorder fields by
 * dragging them up/down.
 *
 * In preview and live mode, this wrapper is NOT used — fields render
 * directly via FormFieldRenderer.
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FormFieldRenderer } from './shared-field-renderer';
import { cn } from '@/lib/utils';
import type { FormField } from '@/lib/forms/form-schema-types';

export interface SortableFieldWrapperProps {
  field: FormField;
  value: any;
  onChange: (val: any) => void;
  allFormData: Record<string, any>;
  selectedFieldId?: string | null;
  onSelectField?: (fieldId: string | null) => void;
  inputBorderRadius: string;
  defaultInputHeightCls: string;
  /** Show drag handle (default: true in edit mode) */
  showDragHandle?: boolean;
}

export const SortableFieldWrapper = React.memo(function SortableFieldWrapper({
  field,
  value,
  onChange,
  allFormData,
  selectedFieldId,
  onSelectField,
  inputBorderRadius,
  defaultInputHeightCls,
  showDragHandle = true,
}: SortableFieldWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isSelected = selectedFieldId === field.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'z-50 shadow-lg ring-2 ring-emerald-500 rounded-lg',
      )}
    >
      {/* Drag Handle — appears on hover (Jotform/Elementor style) */}
      {showDragHandle && (
        <button
          type="button"
          className={cn(
            'absolute -left-8 top-1/2 -translate-y-1/2 size-6 rounded-md flex items-center justify-center cursor-grab active:cursor-grabbing transition-all',
            'text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
          title="Drag to reorder"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <svg
            className="size-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="9" cy="6" r="1" fill="currentColor" />
            <circle cx="9" cy="12" r="1" fill="currentColor" />
            <circle cx="9" cy="18" r="1" fill="currentColor" />
            <circle cx="15" cy="6" r="1" fill="currentColor" />
            <circle cx="15" cy="12" r="1" fill="currentColor" />
            <circle cx="15" cy="18" r="1" fill="currentColor" />
          </svg>
        </button>
      )}

      {/* The actual field — rendered by the shared FormFieldRenderer */}
      <FormFieldRenderer
        field={field}
        value={value}
        onChange={onChange}
        allFormData={allFormData}
        mode="edit"
        selectedFieldId={selectedFieldId}
        onSelectField={onSelectField}
        inputBorderRadius={inputBorderRadius}
        defaultInputHeightCls={defaultInputHeightCls}
      />
    </div>
  );
});
