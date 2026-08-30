'use client';

/**
 * FieldCalculationConfig — toggle + formula editor for auto-calculation.
 *
 * Lets the form-builder define a `{{field_id}}`-token arithmetic formula that
 * is evaluated at submission time. Provides quick-insert buttons for up to 6
 * other labeled fields in the same form.
 *
 * Extracted from src/components/views/form-builder-view.tsx in Phase 6A2.
 */

import { Calculator } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { FieldCalculation } from '@/lib/form-field-types';
import type { FormField } from '@/features/forms/types';
import type { FieldEditorChangeFn } from './field-type-config';

export interface FieldCalculationConfigProps {
  field: FormField;
  allFields: FormField[];
  onChange: FieldEditorChangeFn;
}

export function FieldCalculationConfig({
  field,
  allFields,
  onChange,
}: FieldCalculationConfigProps) {
  const calc = field.calculation;
  const enabled = !!calc;
  const otherFields = allFields.filter(
    (f) => f.id !== field.id && f.label.trim(),
  );

  const toggle = () => {
    if (enabled) {
      onChange('calculation', undefined);
    } else {
      onChange('calculation', {
        formula: '',
        resultFieldId: field.id,
      } as FieldCalculation);
    }
  };

  return (
    <div className="space-y-2 border-t pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Calculator className="size-3.5 text-blue-600" />
          <Label className="text-xs font-semibold">Auto-Calculation</Label>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} />
      </div>
      {enabled && calc && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground">
            Use <code className="text-[10px] bg-muted px-1 rounded">{'{{field_id}}'}</code>{' '}
            tokens to reference other fields. Only basic arithmetic (+ − × ÷) is supported.
          </p>
          <Input
            className="h-7 text-xs font-mono"
            placeholder="{{field_a}} * {{field_b}}"
            value={calc.formula}
            onChange={(e) =>
              onChange('calculation', {
                ...calc,
                formula: e.target.value,
              } as FieldCalculation)
            }
          />
          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] text-muted-foreground self-center">Insert:</span>
            {otherFields.slice(0, 6).map((f) => (
              <button
                key={f.id}
                type="button"
                className="text-[10px] px-1.5 py-0.5 rounded border bg-card hover:bg-muted font-mono"
                onClick={() =>
                  onChange('calculation', {
                    ...calc,
                    formula: `${calc.formula}{{${f.id}}}`.trim(),
                  } as FieldCalculation)
                }
                title={f.label}
              >
                {f.label.slice(0, 14)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
