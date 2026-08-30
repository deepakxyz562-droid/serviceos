'use client';

/**
 * FieldConditionConfig — toggle + form for conditional display logic.
 *
 * Lets the form-builder mark a field as "show only when X" where X is a
 * (fieldId, operator, value) triple. The dependent field is selected from the
 * other labeled fields in the same form.
 *
 * Extracted from src/components/views/form-builder-view.tsx in Phase 6A2.
 */

import { EyeOff } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { FieldCondition } from '@/lib/form-field-types';
import type { FormField } from '@/features/forms/types';
import type { FieldEditorChangeFn } from './field-type-config';

export interface FieldConditionConfigProps {
  field: FormField;
  allFields: FormField[];
  onChange: FieldEditorChangeFn;
}

export function FieldConditionConfig({
  field,
  allFields,
  onChange,
}: FieldConditionConfigProps) {
  const cond = field.condition;
  const enabled = !!cond;
  const otherFields = allFields.filter(
    (f) => f.id !== field.id && f.label.trim(),
  );

  const toggle = () => {
    if (enabled) {
      onChange('condition', undefined);
    } else {
      onChange('condition', {
        fieldId: otherFields[0]?.id || '',
        operator: 'equals',
        value: '',
      });
    }
  };

  return (
    <div className="space-y-2 border-t pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <EyeOff className="size-3.5 text-amber-600" />
          <Label className="text-xs font-semibold">Conditional Display</Label>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} />
      </div>
      {enabled && cond && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground">
            Show this field only when the following condition is true:
          </p>
          <div className="grid grid-cols-12 gap-1.5">
            <Select
              value={cond.fieldId}
              onValueChange={(v) =>
                onChange('condition', { ...cond, fieldId: v } as FieldCondition)
              }
            >
              <SelectTrigger className="h-7 text-xs col-span-5">
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {otherFields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={cond.operator}
              onValueChange={(v) =>
                onChange('condition', {
                  ...cond,
                  operator: v as FieldCondition['operator'],
                } as FieldCondition)
              }
            >
              <SelectTrigger className="h-7 text-xs col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">equals</SelectItem>
                <SelectItem value="not_equals">not equals</SelectItem>
                <SelectItem value="contains">contains</SelectItem>
                <SelectItem value="greater_than">&gt;</SelectItem>
                <SelectItem value="less_than">&lt;</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="h-7 text-xs col-span-4"
              placeholder="Value"
              value={String(cond.value)}
              onChange={(e) =>
                onChange('condition', {
                  ...cond,
                  value: e.target.value,
                } as FieldCondition)
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
