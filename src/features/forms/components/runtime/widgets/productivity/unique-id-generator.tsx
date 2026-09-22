'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import { Fingerprint, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WidgetProps, str, num, bool } from '../widget-props';

function pad(n: number, width: number): string {
  const s = String(n);
  return s.length >= width ? s : '0'.repeat(width - s.length) + s;
}

/**
 * Unique ID Generator widget.
 *
 * Reads settings from config:
 * - prefix: string prefix for the ID (e.g. 'INV', 'REF', 'TICKET')
 * - startNumber: starting counter value (e.g. 1001)
 * - padding: number of digits to pad (e.g. 5 → '00042')
 * - allowManualEdit: whether the user can override the generated ID
 *
 * The counter increments per-form-load using a sessionStorage counter keyed
 * by the field ID. This provides pseudo-sequential IDs within a single
 * browser session. True server-side sequential IDs require a backend
 * counter endpoint (future enhancement).
 */
export function UniqueIdGenerator({ value, onChange, config, disabled, field }: WidgetProps) {
  const prefix = str(config.prefix, 'ID');
  const startNumber = Math.max(1, num(config.startNumber, num(config.digits ? 1 : 1, 1)));
  const padding = Math.max(1, num(config.padding, num(config.digits, 5)));
  const allowManualEdit = bool(config.allowManualEdit, false);

  const fieldId = str(field?.id, 'unique_id');
  const storageKey = `fieseros_uid_counter_${fieldId}`;

  const existing = typeof value === 'string' ? value : '';

  const generate = useCallback(() => {
    // Read counter from sessionStorage (per-field, per-session)
    let counter = startNumber;
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        counter = parseInt(stored, 10) + 1;
      }
      sessionStorage.setItem(storageKey, String(counter));
    }
    return `${prefix}-${pad(counter, padding)}`;
  }, [prefix, startNumber, padding, storageKey]);

  // Auto-generate on mount if empty
  useEffect(() => {
    if (!existing && !disabled) {
      onChange(generate());
    }
     
  }, []);

  const preview = useMemo(() => {
    // Generate a preview without incrementing the counter
    const counter = startNumber;
    return `${prefix}-${pad(counter, padding)}`;
  }, [prefix, startNumber, padding]);

  function regenerate() {
    onChange(generate());
  }

  return (
    <div className="space-y-2" aria-label={String(field?.label ?? 'Unique ID generator')}>
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
        Format: <span className="font-mono">{prefix}-{'0'.repeat(padding)}</span>
        {' '}· Counter starts at {startNumber}
      </div>
    </div>
  );
}

export default UniqueIdGenerator;
