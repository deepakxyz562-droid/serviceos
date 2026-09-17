'use client';

import React, { useState } from 'react';
import { Languages, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';
import { cn } from '@/lib/utils';

interface LanguageSelectorValue {
  action: 'language_change';
  language: string;
  timestamp: string;
}

const LANGS = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
];

export function LanguageSelector({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Language');
  const defaultLang = str(config.defaultLanguage, 'en');
  const existing = (value as Partial<LanguageSelectorValue> | undefined) ?? {};
  const [selected, setSelected] = useState<string>(existing.language ?? defaultLang);
  const [open, setOpen] = useState(false);

  const choose = (code: string) => {
    if (disabled) return;
    setSelected(code);
    setOpen(false);
    const next: LanguageSelectorValue = { action: 'language_change', language: code, timestamp: new Date().toISOString() };
    onChange(next);
  };

  const current = LANGS.find((l) => l.code === selected) ?? LANGS[0];

  return (
    <div className="space-y-1" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5 mb-1">
        <Languages className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">{ariaLabel}</span>
      </div>
      <div className="relative">
        <Button type="button" variant="outline" disabled={disabled}
          onClick={() => setOpen(!open)}
          className="w-full h-9 justify-between text-xs">
          <span className="flex items-center gap-1.5">
            <span className="text-base">{current.flag}</span>
            {current.label}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">{current.code.toUpperCase()}</span>
        </Button>
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-md max-h-60 overflow-y-auto p-1">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                disabled={disabled}
                onClick={() => choose(l.code)}
                className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-muted transition',
                  selected === l.code ? 'bg-primary/10 text-primary font-semibold' : '')}
              >
                <span className="text-base">{l.flag}</span>
                <span className="flex-1 text-left">{l.label}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{l.code.toUpperCase()}</span>
                {selected === l.code && <Check className="size-3" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LanguageSelector;
