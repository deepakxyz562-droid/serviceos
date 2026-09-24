'use client';

/**
 * EditorFieldOverlay — Editor-only chrome that wraps a field.
 *
 * This component provides the editor selection outline, hover state,
 * drag handle, and contextual toolbar (duplicate/delete/move).
 *
 * It wraps FormFieldRenderer (the pure visual component) so the
 * runtime renderer stays completely clean — no editor code leaks
 * into the published form.
 *
 * Usage in the editor canvas:
 *   <EditorFieldOverlay
 *     field={field}
 *     selectedFieldId={selectedFieldId}
 *     onSelectField={onSelectField}
 *     onDuplicate={handleDuplicate}
 *     onDelete={handleDelete}
 *     onMoveUp={...}
 *     onMoveDown={...}
 *   >
 *     <FormFieldRenderer field={field} mode="live" ... />
 *   </EditorFieldOverlay>
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { FormField } from '@/lib/forms/form-schema-types';

export interface EditorFieldOverlayProps {
  field: FormField;
  selectedFieldId?: string | null;
  onSelectField?: (fieldId: string | null) => void;
  onDuplicate?: (fieldId: string) => void;
  onDelete?: (fieldId: string) => void;
  onMoveUp?: (fieldId: string) => void;
  onMoveDown?: (fieldId: string) => void;
  children: React.ReactNode;
}

export const EditorFieldOverlay = React.memo(function EditorFieldOverlay({
  field,
  selectedFieldId,
  onSelectField,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  children,
}: EditorFieldOverlayProps) {
  const isSelected = selectedFieldId === field.id;

  return (
    <div
      className={cn(
        'relative group cursor-pointer',
        // Selection: outline (non-layout-changing)
        isSelected && 'outline outline-2 outline-emerald-500 outline-offset-2 rounded-lg',
        // Hover: subtle outline
        !isSelected && 'hover:outline hover:outline-1 hover:outline-emerald-400/40 hover:rounded-lg',
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelectField?.(field.id);
      }}
    >
      {/* The actual field content (pure visual) */}
      {children}

      {/* Contextual toolbar — only shown when selected */}
      {isSelected && (
        <div className="absolute -top-7 right-0 flex items-center gap-0.5 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-md px-1 py-0.5 z-20">
          {onMoveUp && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onMoveUp(field.id); }}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground text-xs"
              title="Move up"
            >
              ↑
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onMoveDown(field.id); }}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground text-xs"
              title="Move down"
            >
              ↓
            </button>
          )}
          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDuplicate(field.id); }}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground text-xs"
              title="Duplicate"
            >
              ⧉
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(field.id); }}
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
