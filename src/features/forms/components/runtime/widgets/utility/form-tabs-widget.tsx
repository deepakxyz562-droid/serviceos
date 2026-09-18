'use client';

import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import type { WidgetProps } from '../widget-props';
import { str, bool } from '../widget-props';

interface FormTabsValue {
  action: 'tab_switch';
  activeTab: string;
  timestamp: string;
}

/**
 * Form Tabs — tabbed multi-section navigation widget.
 *
 * Jotform-parity settings (aligned with settingsSchema in phase-4-widgets.ts):
 *   - tabTitles: newline-separated string → parsed into tab objects
 *   - allowNavWithoutValidation: let respondents switch tabs freely
 *   - showHeading: display the field label as a heading above the tab bar
 *   - theme: visual style (default | pill | underline | boxed)
 *
 * Value: { action: 'tab_switch', activeTab: string, timestamp: ISO string }
 */
export function FormTabsWidget({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Form sections');
  const showHeading = bool(config.showHeading, true);
  const theme = str(config.theme, 'default');

  // Parse tabTitles: newline-separated string → array of {id, label}
  const tabTitlesRaw = config.tabTitles;
  let tabs: { id: string; label: string }[] = [];
  if (typeof tabTitlesRaw === 'string' && tabTitlesRaw.trim()) {
    tabs = tabTitlesRaw
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t, i) => ({ id: `tab-${i}-${t.toLowerCase().replace(/\s+/g, '-')}`, label: t }));
  } else if (Array.isArray(tabTitlesRaw) && tabTitlesRaw.length > 0) {
    // Backward compat: if tabs is already an array of strings/objects
    tabs = tabTitlesRaw.map((t: unknown, i: number) => {
      if (typeof t === 'string') return { id: t, label: t };
      if (t && typeof t === 'object') {
        const o = t as Record<string, unknown>;
        return { id: String(o.id ?? o.value ?? `tab-${i}`), label: String(o.label ?? o.name ?? `Tab ${i + 1}`) };
      }
      return { id: `tab-${i}`, label: String(t) };
    });
  }
  // Fallback to hardcoded defaults if nothing configured
  if (tabs.length === 0) {
    tabs = [
      { id: 'personal', label: 'Personal' },
      { id: 'contact', label: 'Contact' },
      { id: 'preferences', label: 'Preferences' },
    ];
  }

  const existing = (value as Partial<FormTabsValue> | undefined) ?? {};
  const [active, setActive] = useState<string>(existing.activeTab ?? tabs[0]?.id ?? '');

  const select = (id: string) => {
    if (disabled) return;
    setActive(id);
    const next: FormTabsValue = { action: 'tab_switch', activeTab: id, timestamp: new Date().toISOString() };
    onChange(next);
  };

  // Theme-specific tab classes
  const tabButtonClass = (isActive: boolean) => {
    const base = 'px-3 py-1.5 text-xs font-medium whitespace-nowrap transition disabled:opacity-50';
    switch (theme) {
      case 'pill':
        return `${base} rounded-full ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted'}`;
      case 'boxed':
        return `${base} border border-border ${isActive ? 'border-primary bg-primary/5 text-primary -mb-px' : 'border-transparent text-muted-foreground hover:text-foreground'}`;
      case 'underline':
      case 'default':
      default:
        return `${base} border-b-2 -mb-px ${isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`;
    }
  };

  const tabListClass =
    theme === 'pill'
      ? 'flex gap-1.5 flex-wrap'
      : theme === 'boxed'
        ? 'flex gap-0 border-b border-border'
        : 'flex border-b border-border overflow-x-auto';

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      {showHeading && (
        <div className="flex items-center gap-1.5 mb-1">
          <Layers className="size-3.5 text-primary" />
          <span className="text-xs font-semibold">{ariaLabel}</span>
        </div>
      )}
      <div role="tablist" className={tabListClass} aria-label={ariaLabel}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            disabled={disabled}
            onClick={() => select(t.id)}
            className={tabButtonClass(active === t.id)}
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
