'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { WidgetProps } from '../widget-props';
import { str, bool } from '../widget-props';

interface FormCollapseValue {
  action: 'collapse_toggle';
  collapsed: boolean;
  timestamp: string;
}

export function FormCollapseWidget({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Section');
  const defaultCollapsed = bool(config.defaultCollapsed, false);
  const existing = (value as Partial<FormCollapseValue> | undefined) ?? {};
  const [collapsed, setCollapsed] = useState<boolean>(existing.collapsed ?? defaultCollapsed);

  const toggle = () => {
    if (disabled) return;
    const next = !collapsed;
    setCollapsed(next);
    const v: FormCollapseValue = { action: 'collapse_toggle', collapsed: next, timestamp: new Date().toISOString() };
    onChange(v);
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30" aria-label={ariaLabel}>
      <button
        type="button"
        disabled={disabled}
        onClick={toggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition rounded-xl"
        aria-expanded={!collapsed}
        aria-controls={`section-${ariaLabel.replace(/\s+/g, '-').toLowerCase()}`}
      >
        {collapsed
          ? <ChevronRight className="size-3.5 text-muted-foreground" />
          : <ChevronDown className="size-3.5 text-muted-foreground" />}
        <span className="text-xs font-semibold">{ariaLabel}</span>
      </button>
      {!collapsed && (
        <div id={`section-${ariaLabel.replace(/\s+/g, '-').toLowerCase()}`} className="px-3 pb-3 pt-1 border-t border-border">
          <p className="text-[11px] text-muted-foreground py-2">Collapsible section contents go here.</p>
        </div>
      )}
    </div>
  );
}

export default FormCollapseWidget;
