'use client';

/**
 * FieldPalette — categorized click-to-add palette of the 15 engine field types.
 *
 * Used by the Form Editor Dialog's "Fields" tab. Clicking a type calls onAdd
 * which delegates to createField() in the parent.
 *
 * Extracted from src/components/views/form-builder-view.tsx in Phase 6A2.
 */

import { Sparkles, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FIELD_TYPES as ENGINE_FIELD_TYPES } from '@/lib/form-field-types';
import {
  PALETTE_CATEGORIES, PALETTE_ICON_MAP,
} from '@/features/forms/types';
import type { EngineFieldType } from '@/features/forms/types';

export interface FieldPaletteProps {
  onAdd: (type: EngineFieldType) => void;
}

export function FieldPalette({ onAdd }: FieldPaletteProps) {
  return (
    <div className="border rounded-lg p-3 bg-muted/30 space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Sparkles className="size-3.5 text-emerald-600" />
        <span className="text-xs font-semibold">Field Type Palette</span>
        <span className="text-[10px] text-muted-foreground">— click to add</span>
      </div>
      <div className="space-y-2">
        {PALETTE_CATEGORIES.map((cat) => (
          <div key={cat.id} className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {cat.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {cat.types.map((type) => {
                const meta = ENGINE_FIELD_TYPES.find((t) => t.value === type);
                if (!meta) return null;
                const Icon = PALETTE_ICON_MAP[type] || Type;
                return (
                  <Button
                    key={type}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1"
                    onClick={() => onAdd(type)}
                    title={`Add ${meta.label} field`}
                  >
                    <Icon className="size-3" />
                    {meta.label}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
