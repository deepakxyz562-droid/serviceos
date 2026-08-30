'use client';

/**
 * FieldEditorCard — one card per field in the form editor.
 *
 * Renders the basic header (label, type, required, remove, move up/down) plus
 * an expandable advanced-config section that composes FieldTypeConfig,
 * FieldConditionConfig, FieldCalculationConfig, and FieldScoringConfig.
 *
 * Pure presentational — the parent owns the fields array and passes onChange /
 * onMove / onRemove callbacks keyed by index or field id.
 *
 * Extracted from src/components/views/form-builder-view.tsx in Phase 6A2.
 */

import { useState } from 'react';
import {
  ChevronDown, ChevronUp, GripVertical, SlidersHorizontal, Trash2,
  Calculator, Star, EyeOff,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { FieldConfig } from '@/lib/form-field-types';
import { FIELD_TYPES } from '@/features/forms/types';
import type { FieldType, FormField } from '@/features/forms/types';
import { FieldTypeConfig, type FieldEditorChangeFn } from './field-type-config';
import { FieldConditionConfig } from './field-condition-config';
import { FieldCalculationConfig } from './field-calculation-config';
import { FieldScoringConfig } from './field-scoring-config';

export interface FieldEditorCardProps {
  field: FormField;
  index: number;
  total: number;
  allFields: FormField[];
  onMove: (index: number, direction: 'up' | 'down') => void;
  onChange: (
    key: keyof FormField,
    value:
      | string
      | boolean
      | string[]
      | FormField['condition']
      | FormField['calculation']
      | FormField['scoring']
      | FieldConfig
      | undefined,
  ) => void;
  onRemove: () => void;
}

export function FieldEditorCard({
  field,
  index,
  total,
  allFields,
  onMove,
  onChange,
  onRemove,
}: FieldEditorCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Badges showing what's configured on this field.
  const hasLogic = !!(field.condition || field.calculation || field.scoring);

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* ─── Header row ────────────────────────────────────────────────── */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <button
              className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
              disabled={index === 0}
              onClick={() => onMove(index, 'up')}
            >
              <ChevronUp className="size-3" />
            </button>
            <button
              className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
              disabled={index === total - 1}
              onClick={() => onMove(index, 'down')}
            >
              <ChevronDown className="size-3" />
            </button>
          </div>
          <GripVertical className="size-4 text-muted-foreground shrink-0" />
          <Input
            className="h-8 text-xs flex-1"
            placeholder="Field label"
            value={field.label}
            onChange={(e) => onChange('label', e.target.value)}
          />
          <Select
            value={field.type}
            onValueChange={(v) => onChange('type', v as FieldType)}
          >
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {FIELD_TYPES.map((t) => (
                <SelectItem key={`${t.value}-${t.label}`} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 shrink-0">
            <Switch
              checked={field.required}
              onCheckedChange={(v) => onChange('required', v)}
            />
            <span className="text-[10px] text-muted-foreground">Req</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 w-7 p-0 shrink-0',
              hasLogic ? 'text-emerald-600' : 'text-muted-foreground',
            )}
            onClick={() => setExpanded(!expanded)}
            title="Configure advanced logic"
          >
            {expanded ? (
              <ChevronUp className="size-3" />
            ) : (
              <SlidersHorizontal className="size-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 shrink-0 text-red-500 hover:text-red-700"
            onClick={onRemove}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
        <div className="flex gap-2 pl-8">
          <Input
            className="h-7 text-xs flex-1"
            placeholder="Placeholder text"
            value={field.placeholder || ''}
            onChange={(e) => onChange('placeholder', e.target.value)}
          />
          {(field.type === 'select' ||
            field.type === 'radio' ||
            field.type === 'dropdown' ||
            field.type === 'checkbox') && (
            <Input
              className="h-7 text-xs flex-1"
              placeholder="Options (comma-separated)"
              value={(field.options || field.config?.options || []).join(', ')}
              onChange={(e) => {
                const opts = e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean);
                onChange('options', opts);
              }}
            />
          )}
        </div>
        {/* Quick logic badges */}
        {hasLogic && (
          <div className="flex flex-wrap gap-1 pl-8">
            {field.condition && (
              <Badge variant="outline" className="text-[9px] h-4 gap-0.5">
                <EyeOff className="size-2.5" /> conditional
              </Badge>
            )}
            {field.calculation && (
              <Badge
                variant="outline"
                className="text-[9px] h-4 gap-0.5 bg-blue-50 text-blue-700 border-blue-200"
              >
                <Calculator className="size-2.5" /> calc
              </Badge>
            )}
            {field.scoring && (
              <Badge
                variant="outline"
                className="text-[9px] h-4 gap-0.5 bg-purple-50 text-purple-700 border-purple-200"
              >
                <Star className="size-2.5" /> scored (w={field.scoring.weight})
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* ─── Advanced config (collapsible) ─────────────────────────────── */}
      {expanded && (
        <div className="border-t bg-muted/20 p-3 space-y-3">
          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Description / Helper Text</Label>
            <Input
              className="h-7 text-xs"
              placeholder="Shown below the field label"
              value={field.description || ''}
              onChange={(e) => onChange('description', e.target.value)}
            />
          </div>

          {/* Type-specific config */}
          <FieldTypeConfig field={field} onChange={onChange as FieldEditorChangeFn} />

          {/* Conditional logic */}
          <FieldConditionConfig
            field={field}
            allFields={allFields}
            onChange={onChange as FieldEditorChangeFn}
          />

          {/* Calculation */}
          <FieldCalculationConfig
            field={field}
            allFields={allFields}
            onChange={onChange as FieldEditorChangeFn}
          />

          {/* Scoring */}
          <FieldScoringConfig
            field={field}
            onChange={onChange as FieldEditorChangeFn}
          />
        </div>
      )}
    </div>
  );
}
