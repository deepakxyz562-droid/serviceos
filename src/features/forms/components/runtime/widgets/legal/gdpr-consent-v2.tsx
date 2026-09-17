'use client';

import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, ChevronDown, ChevronRight, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str } from '../widget-props';

interface ConsentCategory {
  id: string;
  label: string;
  description: string;
  required: boolean;
}
interface GDPRConsentValue {
  accepted: boolean;
  timestamp?: string;
  version?: string;
  signature?: string;
  categories: Record<string, boolean>;
  partial?: boolean;
}

const DEFAULT_CATEGORIES: ConsentCategory[] = [
  { id: 'strictly-necessary', label: 'Strictly necessary', description: 'Required for the site to function. Cannot be disabled.', required: true },
  { id: 'functional', label: 'Functional', description: 'Preferences such as language and region.', required: false },
  { id: 'analytics', label: 'Analytics & performance', description: 'Anonymous usage statistics to help us improve.', required: false },
  { id: 'marketing', label: 'Marketing & personalization', description: 'Personalized ads and content measurement.', required: false },
  { id: 'third-party', label: 'Third-party sharing', description: 'Share data with advertising partners.', required: false },
];

export function GdprConsentV2({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'GDPR consent');
  const version = str(config.version, '2.0.0');
  const policyUrl = str(config.policyUrl, '/privacy-policy');
  const categories: ConsentCategory[] = Array.isArray(config.categories) && config.categories.length
    ? (config.categories as ConsentCategory[])
    : DEFAULT_CATEGORIES;

  const v: GDPRConsentValue = value && typeof value === 'object'
    ? (value as GDPRConsentValue)
    : {
        accepted: false,
        categories: Object.fromEntries(categories.map((c) => [c.id, c.required])),
      };

  const [open, setOpen] = useState(false);

  const setCategory = (id: string, enabled: boolean) => {
    if (disabled) return;
    const next = { ...v, categories: { ...v.categories, [id]: enabled } };
    next.partial = !categories.every((c) => next.categories[c.id]);
    onChange({ ...next, accepted: false, timestamp: undefined, version });
  };

  const acceptAll = () => {
    if (disabled) return;
    const cats = Object.fromEntries(categories.map((c) => [c.id, true]));
    onChange({ accepted: true, timestamp: new Date().toISOString(), version, categories: cats, partial: false, signature: undefined });
  };

  const rejectAll = () => {
    if (disabled) return;
    const cats = Object.fromEntries(categories.map((c) => [c.id, c.required]));
    onChange({ accepted: true, timestamp: new Date().toISOString(), version, categories: cats, partial: true, signature: undefined });
  };

  const savePrefs = () => {
    if (disabled) return;
    onChange({ ...v, accepted: true, timestamp: new Date().toISOString(), version });
  };

  if (v.accepted) {
    return (
      <div className="space-y-1.5" aria-label={ariaLabel}>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Consent {v.partial ? 'saved (partial)' : 'recorded'}
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
              Manage
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="rounded-lg border border-border bg-muted/40 p-2.5 space-y-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-primary" />
          <span className="text-xs font-semibold">GDPR consent — granular</span>
        </div>
        <p className="text-[11px] text-foreground/90 leading-relaxed">
          We process personal data for the purposes below. You can enable or disable each optional category.
        </p>

        <div className="space-y-1.5">
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
                  aria-label={`${cat.label} consent`}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-[10px] text-primary flex items-center gap-1 hover:underline"
          aria-expanded={open}
        >
          {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          View policy details
        </button>
        {open && (
          <div className="rounded-md border border-border/60 p-2 text-[10px] text-muted-foreground leading-relaxed">
            <p>This site processes data per the EU GDPR (Regulation 2016/679). You have rights to access, rectify, erase, restrict, port, and object.</p>
            <a href={policyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline mt-1">
              Read full policy <ExternalLink className="size-2.5" />
            </a>
          </div>
        )}

        {!disabled && (
          <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-border/60">
            <Button type="button" size="sm" onClick={acceptAll} className="text-[11px] h-8 gap-1">
              <CheckCircle2 className="size-3.5" /> Accept all
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={rejectAll} className="text-[11px] h-8">
              Reject all
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={savePrefs} className="text-[11px] h-8 gap-1">
              <FileText className="size-3.5" /> Save prefs
            </Button>
          </div>
        )}
      </div>

      <Badge variant="outline" className="text-[9px] gap-1">
        <ShieldCheck className="size-2.5" /> GDPR v{version}
      </Badge>
    </div>
  );
}

export default GdprConsentV2;
