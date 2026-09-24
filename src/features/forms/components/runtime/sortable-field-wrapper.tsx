'use client';

/**
 * SortableFieldWrapper — Wraps a field in a @dnd-kit sortable container.
 *
 * Used ONLY in the editor canvas (not in preview/live). Each field becomes
 * draggable — the user can grab the drag handle and reorder fields by
 * dragging them up/down.
 *
 * Also provides a Jotform-style chevron (⋮) dropdown that appears on
 * hover/selection. The dropdown contains field actions:
 *   - Move to Left Column / Right Column
 *   - Move to Step X (submenu)
 *   - Duplicate
 *   - Delete
 *   - Settings (opens inspector)
 *
 * This replaces the old inline controls (👈 Left, 1C, 2C, Clone, Delete, etc.)
 * that polluted the canvas. Now the canvas stays clean — actions are in
 * a contextual dropdown, like Jotform.
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FormFieldRenderer } from './shared-field-renderer';
import { cn } from '@/lib/utils';
import type { FormField } from '@/lib/forms/form-schema-types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Copy, Trash2, Settings, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Layers } from 'lucide-react';

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

  /** Field action callbacks (for the chevron dropdown) */
  onDuplicate?: (field: FormField) => void;
  onDelete?: (fieldId: string) => void;
  onMoveUp?: (fieldId: string) => void;
  onMoveDown?: (fieldId: string) => void;
  onMoveToColumn?: (fieldId: string, column: 'left' | 'right') => void;
  onMoveToStep?: (fieldId: string, stepId: string) => void;
  onOpenSettings?: (fieldId: string) => void;

  /** Steps for the "Move to Step" submenu */
  steps?: Array<{ id: string; title: string }>;
  /** Whether this view supports column layout (split_media only) */
  hasColumns?: boolean;
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
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onMoveToColumn,
  onMoveToStep,
  onOpenSettings,
  steps = [],
  hasColumns = false,
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
  const hasActions = !!(onDuplicate || onDelete || onMoveUp || onMoveDown || onMoveToColumn || onMoveToStep || onOpenSettings);

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

      {/* Chevron Dropdown — appears on hover/selection (Jotform style) */}
      {hasActions && (
        <div
          className={cn(
            'absolute -top-3 right-0 z-30 transition-opacity',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="size-6 rounded-md flex items-center justify-center bg-white dark:bg-slate-900 border border-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                title="Field actions"
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75v.01M12 12.75v.01M12 18.75v.01" />
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs w-52">
              {/* Move actions */}
              {hasColumns && (
                <>
                  <DropdownMenuItem onClick={() => onMoveToColumn?.(field.id, 'left')} className="gap-2 cursor-pointer">
                    <ArrowLeft className="size-3.5" /> Move to Left Column
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMoveToColumn?.(field.id, 'right')} className="gap-2 cursor-pointer">
                    <ArrowRight className="size-3.5" /> Move to Right Column
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Move to Step submenu */}
              {steps.length > 1 && onMoveToStep && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
                    <Layers className="size-3.5" /> Move to Step
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="text-xs w-48">
                    {steps.map((step, idx) => (
                      <DropdownMenuItem
                        key={step.id}
                        onClick={() => onMoveToStep(field.id, step.id)}
                        className="gap-2 cursor-pointer"
                      >
                        <span className="size-4 rounded bg-muted flex items-center justify-center text-[9px] font-bold">
                          {idx + 1}
                        </span>
                        {step.title || `Step ${idx + 1}`}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Up / Down */}
              {onMoveUp && (
                <DropdownMenuItem onClick={() => onMoveUp(field.id)} className="gap-2 cursor-pointer">
                  <ArrowUp className="size-3.5" /> Move Up
                </DropdownMenuItem>
              )}
              {onMoveDown && (
                <DropdownMenuItem onClick={() => onMoveDown(field.id)} className="gap-2 cursor-pointer">
                  <ArrowDown className="size-3.5" /> Move Down
                </DropdownMenuItem>
              )}

              {(hasColumns || steps.length > 1 || onMoveUp || onMoveDown) && <DropdownMenuSeparator />}

              {/* Duplicate */}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(field)} className="gap-2 cursor-pointer">
                  <Copy className="size-3.5" /> Duplicate
                </DropdownMenuItem>
              )}

              {/* Settings */}
              {onOpenSettings && (
                <DropdownMenuItem onClick={() => onOpenSettings(field.id)} className="gap-2 cursor-pointer">
                  <Settings className="size-3.5" /> Settings
                </DropdownMenuItem>
              )}

              {/* Delete */}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(field.id)} className="gap-2 cursor-pointer text-rose-600">
                    <Trash2 className="size-3.5" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
