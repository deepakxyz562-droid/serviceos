'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import { Fingerprint, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { WidgetProps } from '../widget-props';

function pad(n: number, width: number): string {
  const s = String(n);
  return s.length >= width ? s : '0'.repeat(width - s.length) + s;
}

export function UniqueIdGenerator({ value, onChange, config, disabled, field }: WidgetProps) {
  const prefix = (config.prefix as string) || 'ID';
  const digits = Number(config.digits) || 5;
  const useCounter = config.useCounter !== false;
  const allowManualEdit = config.allowManualEdit === true;

  const existing = typeof value === 'string' ? value : '';

  const generate = useCallback(() => {
    if (useCounter) {
      const counter = Math.floor(Math.random() * Math.pow(10, digits)) + 1;
      return `${prefix}-${pad(counter, digits)}`;
    }
    // Full random fallback for collision-safety
    const rnd = Math.floor(Math.random() * Math.pow(36, digits));
    return `${prefix}-${rnd.toString(36).toUpperCase().padStart(digits, '0')}`;
  }, [prefix, digits, useCounter]);

  // Auto-generate on mount if empty
  useEffect(() => {
    if (!existing && !disabled) {
      onChange(generate());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preview = useMemo(() => generate(), [generate]);

  function regenerate() {
    onChange(generate());
  }

  return (
    <div className="space-y-2" aria-label={String(field?.['label'] ?? 'Unique ID generator')}>
      <div className="flex items-center gap-2">
        <Fingerprint className="size-5 text-emerald-600 shrink-0" />
        {allowManualEdit ? (
          <Input
            value={existing}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 text-sm font-mono font-bold"
            placeholder={preview}
          />
        ) : (
          <div className="flex-1 px-3 h-10 rounded-md border border-border/70 bg-muted/40 flex items-center text-sm font-mono font-bold text-foreground">
            {existing || <span className="text-muted-foreground">{preview}</span>}
          </div>
        )}
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={regenerate}
            className="h-10 px-3 gap-1.5 text-xs"
            aria-label="Regenerate ID"
          >
            <RefreshCw className="size-3.5" /> New
          </Button>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground">
        Format: <span className="font-mono">{prefix}-{'0'.repeat(digits)}</span>
        {useCounter ? ' (sequential-style)' : ' (random)'}
      </div>
    </div>
  );
}

export default UniqueIdGenerator;
