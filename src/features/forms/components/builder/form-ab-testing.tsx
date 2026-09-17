'use client';

/**
 * Form A/B Testing (UI)
 * ----------------------
 * UI for setting up A/B test variants. Variant A vs B with field overrides.
 *
 * Exports types `ABTestConfig { enabled, variants, splitPercent }`.
 */
import { useState } from 'react';
import { FlaskConical, Plus, Trash2, Copy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { FormField } from '@/lib/forms/form-schema-types';

export interface ABTestVariant {
  id: string;
  label: string;
  fieldOverrides: FormField[];
}

export interface ABTestConfig {
  enabled: boolean;
  variants: ABTestVariant[];
  splitPercent: number; // 0-100, % of traffic to variant B (rest to variant A)
}

export interface FormABTestingProps {
  value?: ABTestConfig;
  baseFields?: FormField[];
  onChange?: (cfg: ABTestConfig) => void;
  className?: string;
}

function genId(): string {
  return `variant_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function FormABTesting({ value, baseFields = [], onChange, className }: FormABTestingProps) {
  const [cfg, setCfg] = useState<ABTestConfig>(
    value ?? {
      enabled: false,
      variants: [
        { id: 'variant_a', label: 'Variant A (Control)', fieldOverrides: baseFields },
        { id: 'variant_b', label: 'Variant B', fieldOverrides: baseFields.map((f) => ({ ...f })) },
      ],
      splitPercent: 50,
    },
  );

  function update(patch: Partial<ABTestConfig>) {
    const next = { ...cfg, ...patch };
    setCfg(next);
    onChange?.(next);
  }

  function updateVariant(id: string, patch: Partial<ABTestVariant>) {
    update({ variants: cfg.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)) });
  }

  function removeVariant(id: string) {
    update({ variants: cfg.variants.filter((v) => v.id !== id) });
  }

  function addVariant() {
    update({
      variants: [
        ...cfg.variants,
        { id: genId(), label: `Variant ${String.fromCharCode(65 + cfg.variants.length)}`, fieldOverrides: baseFields.map((f) => ({ ...f })) },
      ],
    });
  }

  const splitA = 100 - cfg.splitPercent;
  const splitB = cfg.splitPercent;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-4 w-4" />
          A/B Testing
          <Switch
            checked={cfg.enabled}
            onCheckedChange={(v) => update({ enabled: v })}
            aria-label="Enable A/B testing"
            className="ml-auto"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!cfg.enabled ? (
          <div className="flex items-center gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <Users className="h-4 w-4" />
            All visitors see the same form. Enable A/B testing to experiment with variants.
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Traffic Split</Label>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-[10px]">A: {splitA}%</Badge>
                  <Badge variant="outline" className="text-[10px]">B: {splitB}%</Badge>
                </div>
              </div>
              <Slider
                value={[cfg.splitPercent]}
                onValueChange={(v) => update({ splitPercent: v[0] })}
                min={0}
                max={100}
                step={5}
              />
              <p className="text-[10px] text-muted-foreground">
                Visitors are randomly assigned to a variant based on a stable hash of their session ID.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Variants</Label>
              {cfg.variants.map((v, idx) => (
                <div key={v.id} className="rounded-md border p-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={idx === 0 ? 'default' : 'secondary'} className="text-[10px]">
                      {String.fromCharCode(65 + idx)}
                    </Badge>
                    <Input
                      value={v.label}
                      onChange={(e) => updateVariant(v.id, { label: e.target.value })}
                      className="h-7 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateVariant(v.id, { fieldOverrides: [...v.fieldOverrides] })}
                      aria-label="Duplicate variant fields"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {cfg.variants.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500"
                        onClick={() => removeVariant(v.id)}
                        aria-label="Remove variant"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {v.fieldOverrides.length} field overrides
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addVariant} className="w-full">
                <Plus className="mr-1 h-3 w-3" /> Add Variant
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default FormABTesting;
