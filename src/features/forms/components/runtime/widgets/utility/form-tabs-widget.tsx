'use client';

import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface FormTabsValue {
  action: 'tab_switch';
  activeTab: string;
  timestamp: string;
}

export function FormTabsWidget({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Form sections');
  const tabsRaw = config.tabs;
  const tabs: { id: string; label: string }[] = Array.isArray(tabsRaw)
    ? tabsRaw.map((t: unknown, i: number) => {
        if (typeof t === 'string') return { id: t, label: t };
        if (t && typeof t === 'object') {
          const o = t as Record<string, unknown>;
          return { id: String(o.id ?? o.value ?? `tab-${i}`), label: String(o.label ?? o.name ?? o.id ?? `Tab ${i + 1}`) };
        }
        return { id: `tab-${i}`, label: String(t) };
      })
    : [
        { id: 'personal', label: 'Personal' },
        { id: 'contact', label: 'Contact' },
        { id: 'preferences', label: 'Preferences' },
      ];
  const existing = (value as Partial<FormTabsValue> | undefined) ?? {};
  const [active, setActive] = useState<string>(existing.activeTab ?? tabs[0]?.id ?? '');

  const select = (id: string) => {
    if (disabled) return;
    setActive(id);
    const next: FormTabsValue = { action: 'tab_switch', activeTab: id, timestamp: new Date().toISOString() };
    onChange(next);
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5 mb-1">
        <Layers className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">{ariaLabel}</span>
      </div>
      <div role="tablist" className="flex border-b border-border overflow-x-auto" aria-label={ariaLabel}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            disabled={disabled}
            onClick={() => select(t.id)}
            className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition ${
              active === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Active: <span className="font-semibold text-foreground">{tabs.find((t) => t.id === active)?.label ?? '—'}</span>
      </p>
    </div>
  );
}

export default FormTabsWidget;
