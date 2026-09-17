'use client';

import React, { useState } from 'react';
import { Cookie, CheckCircle2, Settings2, X, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str } from '../widget-props';
import { cn } from '@/lib/utils';

interface CookieCategory {
  id: string;
  label: string;
  description: string;
  required: boolean;
}
interface CookieConsentValue {
  accepted: boolean;
  timestamp?: string;
  version?: string;
  signature?: string;
  categories: Record<string, boolean>;
  partial?: boolean;
}

const DEFAULT_CATEGORIES: CookieCategory[] = [
  { id: 'necessary', label: 'Strictly necessary cookies', description: 'Required for core site functionality. Always active.', required: true },
  { id: 'preferences', label: 'Preference cookies', description: 'Remember your settings (language, region, theme).', required: false },
  { id: 'analytics', label: 'Analytics cookies', description: 'Anonymous statistics about how the site is used.', required: false },
  { id: 'marketing', label: 'Marketing cookies', description: 'Used to deliver personalized ads.', required: false },
];

export function CookieConsentBanner({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Cookie consent banner');
  const version = str(config.version, '1.0.0');
  const policyUrl = str(config.policyUrl, '/cookie-policy');
  const bannerText = str(
    config.bannerText,
    'We use cookies to enhance your browsing experience, analyze traffic, and personalize content. Choose which categories to allow.',
  );
  const categories: CookieCategory[] = Array.isArray(config.categories) && config.categories.length
    ? (config.categories as CookieCategory[])
    : DEFAULT_CATEGORIES;

  const v: CookieConsentValue = value && typeof value === 'object'
    ? (value as CookieConsentValue)
    : {
        accepted: false,
        categories: Object.fromEntries(categories.map((c) => [c.id, c.required])),
      };

  const [expanded, setExpanded] = useState(false);

  const setCategory = (id: string, enabled: boolean) => {
    if (disabled) return;
    const next = { ...v, categories: { ...v.categories, [id]: enabled } };
    next.partial = !categories.every((c) => next.categories[c.id]);
    onChange({ ...next, accepted: false, timestamp: undefined, version });
  };

  const acceptAll = () => {
    if (disabled) return;
    onChange({
      accepted: true,
      timestamp: new Date().toISOString(),
      version,
      categories: Object.fromEntries(categories.map((c) => [c.id, true])),
      partial: false,
      signature: undefined,
    });
  };

  const rejectAll = () => {
    if (disabled) return;
    onChange({
      accepted: true,
      timestamp: new Date().toISOString(),
      version,
      categories: Object.fromEntries(categories.map((c) => [c.id, c.required])),
      partial: true,
      signature: undefined,
    });
  };

  const savePrefs = () => {
    if (disabled) return;
    onChange({ ...v, accepted: true, timestamp: new Date().toISOString(), version });
  };

  if (v.accepted) {
    return (
      <div className="space-y-1.5" aria-label={ariaLabel}>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-center gap-2">
          <Cookie className="size-4 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {v.partial ? 'Essential cookies only' : 'All cookies allowed'}
            </p>
            {v.timestamp && (
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                {new Date(v.timestamp).toLocaleString()} · v{v.version}
              </p>
            )}
          </div>
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" className="text-xs h-7"
              onClick={() => onChange({ ...v, accepted: false, timestamp: undefined })}>
              <Settings2 className="size-3" /> Manage
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="rounded-lg border border-border bg-muted/40 p-2.5 space-y-2 shadow-sm">
        <div className="flex items-start gap-2">
          <div className="rounded-md bg-primary/10 p-1.5">
            <Cookie className="size-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold">Cookie preferences</p>
            <p className="text-[11px] text-foreground/90 leading-relaxed mt-0.5">{bannerText}</p>
          </div>
          <a href={policyUrl} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline whitespace-nowrap">
            Policy
          </a>
        </div>

        {expanded && (
          <div className="space-y-1.5 pt-1 border-t border-border/60">
            {categories.map((cat) => (
              <div key={cat.id} className="rounded-md bg-background border border-border/60 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold flex items-center gap-1">
                      {cat.label}
                      {cat.required && <Badge variant="secondary" className="text-[8px] h-3 px-1">Required</Badge>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{cat.description}</p>
                  </div>
                  <Switch
                    checked={!!v.categories[cat.id]}
                    disabled={disabled || cat.required}
                    onCheckedChange={(c) => setCategory(cat.id, c)}
                    aria-label={`${cat.label} toggle`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {!disabled && (
          <>
            <div className={cn('grid gap-1.5', expanded ? 'grid-cols-3' : 'grid-cols-3')}>
              <Button type="button" size="sm" onClick={acceptAll} className="text-[11px] h-8 gap-1">
                <CheckCircle2 className="size-3.5" /> Accept all
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={rejectAll} className="text-[11px] h-8">
                Reject
              </Button>
              <Button
                type="button"
                variant={expanded ? 'secondary' : 'outline'}
                size="sm"
                onClick={expanded ? savePrefs : () => setExpanded(true)}
                className="text-[11px] h-8 gap-1"
              >
                {expanded ? (
                  <><ShieldCheck className="size-3.5" /> Save</>
                ) : (
                  <><Settings2 className="size-3.5" /> Customize</>
                )}
              </Button>
            </div>
            {expanded && (
              <Button type="button" variant="ghost" size="sm"
                onClick={() => setExpanded(false)}
                className="text-[10px] h-6 w-full gap-1">
                <X className="size-3" /> Collapse
              </Button>
            )}
          </>
        )}
      </div>

      <Badge variant="outline" className="text-[9px] gap-1">
        <Cookie className="size-2.5" /> Cookie banner v{version}
      </Badge>
    </div>
  );
}

export default CookieConsentBanner;
