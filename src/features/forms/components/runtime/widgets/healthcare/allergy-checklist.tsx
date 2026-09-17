'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';
import type { WidgetProps } from '../widget-props';

const COMMON_ALLERGIES = [
  'Penicillin', 'Peanuts', 'Latex', 'Aspirin', 'Ibuprofen', 'Sulfa drugs',
  'Shellfish', 'Eggs', 'Milk', 'Wheat', 'Soy', 'Tree nuts', 'Bee stings',
  'Iodine', 'Contrast dye', 'Adhesive tape',
];

/**
 * Allergy Checklist — common allergies with severity + custom entries.
 * Produces: { selected: string[], custom: {name, severity, notes}[] }
 */
export function AllergyChecklist({ value, onChange, disabled, field }: WidgetProps) {
  const v = (value && typeof value === 'object' ? value : { selected: [], custom: [] }) as {
    selected?: string[];
    custom?: Array<{ name: string; severity: string; notes?: string }>;
  };
  const selected: string[] = Array.isArray(v.selected) ? v.selected : [];
  const custom: Array<{ name: string; severity: string; notes?: string }> = Array.isArray(v.custom) ? v.custom : [];
  const label = String(field?.label || 'Allergies');

  const toggle = (allergy: string) => {
    const next = selected.includes(allergy)
      ? selected.filter((a) => a !== allergy)
      : [...selected, allergy];
    onChange({ ...v, selected: next });
  };

  const addCustom = () => {
    onChange({ ...v, custom: [...custom, { name: '', severity: 'mild', notes: '' }] });
  };

  const updateCustom = (idx: number, key: string, val: string) => {
    const next = [...custom];
    next[idx] = { ...next[idx], [key]: val };
    onChange({ ...v, custom: next });
  };

  const removeCustom = (idx: number) => {
    onChange({ ...v, custom: custom.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-card">
      <Label className="text-xs font-bold flex items-center gap-1.5">
        <AlertTriangle className="size-3.5 text-amber-500" />
        {label}
      </Label>
      <div className="grid grid-cols-2 gap-2">
        {COMMON_ALLERGIES.map((allergy) => (
          <label key={allergy} className="flex items-center gap-2 text-[11px] cursor-pointer">
            <Checkbox
              checked={selected.includes(allergy)}
              onCheckedChange={() => toggle(allergy)}
              disabled={disabled}
              aria-label={allergy}
            />
            <span>{allergy}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <p className="text-[10px] text-amber-700 dark:text-amber-300">
          ⚠ {selected.length} known allerg{selected.length === 1 ? 'y' : 'ies'} flagged.
        </p>
      )}
      <div className="pt-2 border-t">
        <p className="text-[10px] font-semibold text-muted-foreground mb-1">Other allergies</p>
        {custom.map((c, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-1 mb-1 items-center">
            <Input
              className="col-span-5 h-7 text-xs"
              placeholder="Allergen name"
              value={c.name}
              onChange={(e) => updateCustom(idx, 'name', e.target.value)}
              disabled={disabled}
              aria-label={`Custom allergen ${idx + 1}`}
            />
            <select
              className="col-span-3 h-7 text-xs border rounded px-1 bg-background"
              value={c.severity}
              onChange={(e) => updateCustom(idx, 'severity', e.target.value)}
              disabled={disabled}
              aria-label={`Severity ${idx + 1}`}
            >
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
              <option value="life_threatening">Life-threatening</option>
            </select>
            <Input
              className="col-span-3 h-7 text-xs"
              placeholder="Notes"
              value={c.notes ?? ''}
              onChange={(e) => updateCustom(idx, 'notes', e.target.value)}
              disabled={disabled}
              aria-label={`Notes ${idx + 1}`}
            />
            <button
              type="button"
              onClick={() => removeCustom(idx)}
              disabled={disabled}
              className="col-span-1 text-muted-foreground hover:text-red-500 text-xs"
              aria-label={`Remove custom allergen ${idx + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addCustom}
          disabled={disabled}
          className="text-[10px] text-emerald-600 hover:underline"
        >
          + Add custom allergy
        </button>
      </div>
    </div>
  );
}

export default AllergyChecklist;
