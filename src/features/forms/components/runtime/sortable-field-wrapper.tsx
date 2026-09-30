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
import {
  Copy, Trash2, Settings, ArrowLeft, ArrowRight, ArrowUp, ArrowDown,
  Layers, Columns, Check, AlignLeft, AlignCenter, AlignRight, ArrowRightLeft,
} from 'lucide-react';

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

  /** Field action callbacks (for the chevron dropdown and floating toolbar) */
  onDuplicate?: (field: FormField) => void;
  onDelete?: (fieldId: string) => void;
  onMoveUp?: (fieldId: string) => void;
  onMoveDown?: (fieldId: string) => void;
  onSetWidth?: (fieldId: string, width: 'full' | 'half' | 'third' | 'quarter') => void;
  onSetAlign?: (fieldId: string, align: 'left' | 'center' | 'right') => void;
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
  onSetAlign,
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
  const currentAlign = field.align || 'left';
  const hasActions = !!(onDuplicate || onDelete || onMoveUp || onMoveDown || onSetWidth || onSetAlign || onMoveToColumn || onMoveToStep || onOpenSettings);

  const alignClass =
    currentAlign === 'center'
      ? 'mx-auto text-center'
      : currentAlign === 'right'
      ? 'ml-auto text-right'
      : 'mr-auto text-left';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group transition-all',
        widthClass,
        alignClass,
        isDragging && 'z-50 shadow-lg ring-2 ring-emerald-500 rounded-lg',
      )}
    >
      {/* Wix-Style Floating Quick Positioning Bar (Appears on Selection) */}
      {isSelected && (
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-zinc-800/95 text-white backdrop-blur-md px-2 py-1 rounded-xl shadow-xl border border-white/10 flex items-center gap-1.5 select-none animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Horizontal Position / Alignment: Left, Center, Right */}
          {onSetAlign && (
            <div className="flex items-center bg-white/10 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => onSetAlign(field.id, 'left')}
                className={cn(
                  'size-6 rounded flex items-center justify-center transition-colors cursor-pointer',
                  currentAlign === 'left' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-white/70 hover:text-white'
                )}
                title="Align Left"
              >
                <AlignLeft className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onSetAlign(field.id, 'center')}
                className={cn(
                  'size-6 rounded flex items-center justify-center transition-colors cursor-pointer',
                  currentAlign === 'center' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-white/70 hover:text-white'
                )}
                title="Align Center"
              >
                <AlignCenter className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onSetAlign(field.id, 'right')}
                className={cn(
                  'size-6 rounded flex items-center justify-center transition-colors cursor-pointer',
                  currentAlign === 'right' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-white/70 hover:text-white'
                )}
                title="Align Right"
              >
                <AlignRight className="size-3.5" />
              </button>
            </div>
          )}

          <div className="h-3.5 w-px bg-white/20" />

          {/* Move Up / Down */}
          {onMoveUp && (
            <button
              type="button"
              onClick={() => onMoveUp(field.id)}
              className="size-6 rounded flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Move Up"
            >
              <ArrowUp className="size-3.5" />
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={() => onMoveDown(field.id)}
              className="size-6 rounded flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Move Down"
            >
              <ArrowDown className="size-3.5" />
            </button>
          )}

          <div className="h-3.5 w-px bg-white/20" />

          {/* Width Selector */}
          {onSetWidth && (
            <div className="flex items-center bg-white/10 rounded-lg p-0.5 text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => onSetWidth(field.id, 'quarter')}
                className={cn('px-1.5 py-0.5 rounded cursor-pointer transition-colors', currentWidth === 'quarter' ? 'bg-white text-slate-900 font-bold' : 'text-white/70 hover:text-white')}
                title="25% Width"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => onSetWidth(field.id, 'third')}
                className={cn('px-1.5 py-0.5 rounded cursor-pointer transition-colors', currentWidth === 'third' ? 'bg-white text-slate-900 font-bold' : 'text-white/70 hover:text-white')}
                title="33% Width"
              >
                33%
              </button>
              <button
                type="button"
                onClick={() => onSetWidth(field.id, 'half')}
                className={cn('px-1.5 py-0.5 rounded cursor-pointer transition-colors', currentWidth === 'half' ? 'bg-white text-slate-900 font-bold' : 'text-white/70 hover:text-white')}
                title="50% Width"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => onSetWidth(field.id, 'full')}
                className={cn('px-1.5 py-0.5 rounded cursor-pointer transition-colors', (currentWidth === 'full' || !field.width) ? 'bg-white text-slate-900 font-bold' : 'text-white/70 hover:text-white')}
                title="100% Full Width"
              >
                100%
              </button>
            </div>
          )}

          {/* Column Switcher (if split_media) */}
          {hasColumns && onMoveToColumn && (
            <>
              <div className="h-3.5 w-px bg-white/20" />
              <button
                type="button"
                onClick={() => onMoveToColumn(field.id, field.layoutColumn === 'left' ? 'right' : 'left')}
                className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10.5px] font-semibold text-white flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title={`Move to ${field.layoutColumn === 'left' ? 'Right' : 'Left'} Column`}
              >
                <ArrowRightLeft className="size-3" />
                <span>{field.layoutColumn === 'left' ? 'To Right' : 'To Left'}</span>
              </button>
            </>
          )}

          <div className="h-3.5 w-px bg-white/20" />

          {/* Duplicate & Delete */}
          {onDuplicate && (
            <button
              type="button"
              onClick={() => onDuplicate(field)}
              className="size-6 rounded flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Duplicate"
            >
              <Copy className="size-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(field.id)}
              className="size-6 rounded flex items-center justify-center text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
              title="Delete"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      )}

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
