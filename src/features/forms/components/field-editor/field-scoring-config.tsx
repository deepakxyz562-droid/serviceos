'use client';

/**
 * FieldScoringConfig — toggle + 3-input grid for max score / weight / pass
 * threshold.
 *
 * Lets the form-builder mark a field as scored. Scoring is aggregated by
 * computeFormScore() in src/lib/form-field-types.ts at submission time.
 *
 * Extracted from src/components/views/form-builder-view.tsx in Phase 6A2.
 */

import { Star } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { FieldScoring } from '@/lib/form-field-types';
import type { FormField } from '@/features/forms/types';
import type { FieldEditorChangeFn } from './field-type-config';

export interface FieldScoringConfigProps {
  field: FormField;
  onChange: FieldEditorChangeFn;
}

export function FieldScoringConfig({ field, onChange }: FieldScoringConfigProps) {
  const sc = field.scoring;
  const enabled = !!sc;

  const toggle = () => {
    if (enabled) {
      onChange('scoring', undefined);
    } else {
      onChange('scoring', { maxScore: 5, weight: 1 } as FieldScoring);
    }
  };

  return (
    <div className="space-y-2 border-t pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Star className="size-3.5 text-purple-600" />
          <Label className="text-xs font-semibold">Auto-Scoring</Label>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} />
      </div>
      {enabled && sc && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground">
            Configure how this field is scored after submission.
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Max Score</Label>
              <Input
                className="h-7 text-xs"
                type="number"
                min={1}
                value={sc.maxScore}
                onChange={(e) =>
                  onChange('scoring', {
                    ...sc,
                    maxScore: Number(e.target.value) || 1,
                  } as FieldScoring)
                }
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Weight</Label>
              <Input
                className="h-7 text-xs"
                type="number"
                step="0.1"
                min={0}
                value={sc.weight}
                onChange={(e) =>
                  onChange('scoring', {
                    ...sc,
                    weight: Number(e.target.value) || 0,
                  } as FieldScoring)
                }
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Pass Threshold</Label>
              <Input
                className="h-7 text-xs"
                type="number"
                min={0}
                placeholder="—"
                value={sc.passThreshold ?? ''}
                onChange={(e) =>
                  onChange('scoring', {
                    ...sc,
                    passThreshold:
                      e.target.value === '' ? undefined : Number(e.target.value),
                  } as FieldScoring)
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
