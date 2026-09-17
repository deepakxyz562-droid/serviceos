'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface ThemeSwitcherValue {
  action: 'theme_toggle';
  theme: 'light' | 'dark';
  timestamp: string;
}

export function ThemeSwitcherWidget({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Theme');
  const existing = (value as Partial<ThemeSwitcherValue> | undefined) ?? {};
  const initial: 'light' | 'dark' = existing.theme ?? (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  const [theme, setTheme] = useState<'light' | 'dark'>(initial);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggle = () => {
    if (disabled) return;
    const next: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    onChange({ action: 'theme_toggle', theme: next, timestamp: new Date().toISOString() } as ThemeSwitcherValue);
  };

  return (
    <div className="space-y-1" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5 mb-1">
        {theme === 'dark' ? <Moon className="size-3.5 text-primary" /> : <Sun className="size-3.5 text-primary" />}
        <span className="text-xs font-semibold">{ariaLabel}</span>
        <span className="ml-auto text-[10px] text-muted-foreground capitalize">{theme}</span>
      </div>
      <Button type="button" variant="outline" disabled={disabled} onClick={toggle}
        className="w-full h-9 text-xs gap-1.5">
        {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        Switch to {theme === 'dark' ? 'light' : 'dark'} mode
      </Button>
    </div>
  );
}

export default ThemeSwitcherWidget;
