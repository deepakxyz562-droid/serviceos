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
import { FormFieldRenderer, getFieldWidthClass } from './shared-field-renderer';
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
import { Copy, Trash2, Settings, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Layers, Columns, Check } from 'lucide-react';

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
  onSetWidth?: (fieldId: string, width: 'full' | 'half' | 'third' | 'quarter') => void;
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
  onSetWidth,
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
  const widthClass = getFieldWidthClass(field.width);
  const currentWidth = field.width || 'full';
  const hasActions = !!(onDuplicate || onDelete || onMoveUp || onMoveDown || onSetWidth || onMoveToColumn || onMoveToStep || onOpenSettings);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        widthClass,
        isDragging && 'z-50 shadow-lg ring-2 ring-emerald-500 rounded-lg',
      )}
    >
      {/* Drag Handle — appears on hover / selection (Jotform style) */}
      {showDragHandle && (
        <button
          type="button"
          className={cn(
            'absolute -left-7 top-1/2 -translate-y-1/2 size-6 rounded-md flex items-center justify-center cursor-grab active:cursor-grabbing transition-all z-20',
            'text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs bg-white/90 dark:bg-slate-900/90 border border-border/60',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
          title="Drag to reorder"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <svg
            className="size-3.5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="9" cy="6" r="1.2" fill="currentColor" />
            <circle cx="9" cy="12" r="1.2" fill="currentColor" />
            <circle cx="9" cy="18" r="1.2" fill="currentColor" />
            <circle cx="15" cy="6" r="1.2" fill="currentColor" />
            <circle cx="15" cy="12" r="1.2" fill="currentColor" />
            <circle cx="15" cy="18" r="1.2" fill="currentColor" />
          </svg>
        </button>
      )}

      {/* Chevron / 3-Dots Dropdown — appears on hover / selection (Jotform style) */}
      {hasActions && (
        <div
          className={cn(
            'absolute -top-3.5 right-1 z-30 transition-opacity',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="size-6 rounded-md flex items-center justify-center bg-white dark:bg-slate-900 border border-border shadow-xs text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                title="Field properties & actions"
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75v.01M12 12.75v.01M12 18.75v.01" />
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs w-56 font-medium">
              {/* Width / Column setting */}
              {onSetWidth && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
                    <Columns className="size-3.5 text-blue-500" />
                    <span>Column Width</span>
                    <span className="ml-auto text-[10px] text-muted-foreground uppercase font-bold">
                      {currentWidth === 'half' ? '2C (50%)' : currentWidth === 'third' ? '3C (33%)' : currentWidth === 'quarter' ? '4C (25%)' : '1C (100%)'}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="text-xs w-48">
                    <DropdownMenuItem onClick={() => onSetWidth(field.id, 'full')} className="gap-2 cursor-pointer">
                      <span className="w-5 text-center font-bold text-[10px]">1C</span>
                      <span>1 Column (100%)</span>
                      {(!field.width || field.width === 'full') && <Check className="size-3.5 ml-auto text-emerald-600" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSetWidth(field.id, 'half')} className="gap-2 cursor-pointer">
                      <span className="w-5 text-center font-bold text-[10px]">2C</span>
                      <span>2 Columns (50%)</span>
                      {field.width === 'half' && <Check className="size-3.5 ml-auto text-emerald-600" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSetWidth(field.id, 'third')} className="gap-2 cursor-pointer">
                      <span className="w-5 text-center font-bold text-[10px]">3C</span>
                      <span>3 Columns (33%)</span>
                      {field.width === 'third' && <Check className="size-3.5 ml-auto text-emerald-600" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSetWidth(field.id, 'quarter')} className="gap-2 cursor-pointer">
                      <span className="w-5 text-center font-bold text-[10px]">4C</span>
                      <span>4 Columns (25%)</span>
                      {field.width === 'quarter' && <Check className="size-3.5 ml-auto text-emerald-600" />}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Move to Left / Right Hero Column (Split Hero layout) */}
              {hasColumns && onMoveToColumn && (
                <>
                  <DropdownMenuItem
                    onClick={() => onMoveToColumn(field.id, field.layoutColumn === 'left' ? 'right' : 'left')}
                    className="gap-2 cursor-pointer"
                  >
                    {field.layoutColumn === 'left' ? (
                      <>
                        <ArrowRight className="size-3.5 text-purple-500" /> Move to Right Form Column
                      </>
                    ) : (
                      <>
                        <ArrowLeft className="size-3.5 text-purple-500" /> Move to Left Hero Column
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}

              {/* Move to Step submenu */}
              {steps.length > 1 && onMoveToStep && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
                    <Layers className="size-3.5 text-amber-500" /> Move to Step
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="text-xs w-52">
                    {steps.map((step, idx) => (
                      <DropdownMenuItem
                        key={step.id}
                        onClick={() => onMoveToStep(field.id, step.id)}
                        className="gap-2 cursor-pointer"
                      >
                        <span className="size-4 rounded bg-muted flex items-center justify-center text-[9px] font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{step.title || `Step ${idx + 1}`}</span>
                        {field.stepId === step.id && <Check className="size-3.5 ml-auto text-emerald-600" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              <DropdownMenuSeparator />

              {/* Move Up / Down */}
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

              {(onMoveUp || onMoveDown) && <DropdownMenuSeparator />}

              {/* Duplicate */}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(field)} className="gap-2 cursor-pointer">
                  <Copy className="size-3.5" /> Duplicate Field
                </DropdownMenuItem>
              )}

              {/* Settings */}
              {onOpenSettings && (
                <DropdownMenuItem onClick={() => onOpenSettings(field.id)} className="gap-2 cursor-pointer">
                  <Settings className="size-3.5 text-emerald-600" /> Field Properties
                </DropdownMenuItem>
              )}

              {/* Delete */}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(field.id)} className="gap-2 cursor-pointer text-rose-600 font-semibold focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40">
                    <Trash2 className="size-3.5" /> Delete Field
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
