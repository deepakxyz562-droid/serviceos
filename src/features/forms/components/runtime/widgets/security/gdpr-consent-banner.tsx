'use client';

import React, { useState } from 'react';
import { ShieldCheck, ExternalLink, CheckCircle2, FileText } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface ConsentValue {
  accepted: boolean;
  timestamp?: string;
  version?: string;
  policyUrl?: string;
}

export function GdprConsentBanner({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'GDPR consent');
  const policyUrl = str(config.policyUrl, '/privacy-policy');
  const policyLabel = str(config.policyLabel, 'Privacy Policy');
  const version = str(config.version, '1.0.0');
  const requireScroll = bool(config.requireScroll, false);
  const bannerText = str(
    config.bannerText,
    'We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.',
  );

  const v: ConsentValue = value && typeof value === 'object' ? (value as ConsentValue) : { accepted: false };
  const [open, setOpen] = useState(false);

  const accept = (accepted: boolean) => {
    if (disabled) return;
    onChange({
      accepted,
      timestamp: accepted ? new Date().toISOString() : undefined,
      version: accepted ? version : undefined,
      policyUrl,
    });
  };

  if (v.accepted) {
    return (
      <div className="space-y-1.5" aria-label={ariaLabel}>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Consent recorded</p>
            {v.timestamp && (
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                {new Date(v.timestamp).toLocaleString()} · v{v.version}
              </p>
            )}
          </div>
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={() => accept(false)}>
              Withdraw
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="rounded-lg border border-border bg-muted/40 p-2.5 space-y-2">
        <p className="text-[11px] text-foreground/90 leading-relaxed">{bannerText}</p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => setOpen(true)}
            className="text-[11px] h-7 gap-1"
          >
            <FileText className="size-3" /> Read {policyLabel}
          </Button>
          <a
            href={policyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] inline-flex items-center gap-1 text-primary hover:underline h-7 px-2"
          >
            <ExternalLink className="size-3" /> Open in new tab
          </a>
        </div>

        <div className="flex items-start gap-2 pt-1 border-t border-border/60">
          <Checkbox
            id={`gdpr-${str(field?.id, 'field')}`}
            checked={v.accepted}
            disabled={disabled}
            onCheckedChange={(c) => accept(c === true)}
            className="mt-0.5"
          />
          <label
            htmlFor={`gdpr-${str(field?.id, 'field')}`}
            className="text-[11px] text-muted-foreground cursor-pointer"
          >
            I consent to the processing of my personal data in accordance with the {policyLabel}.
          </label>
        </div>

        {!disabled && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="text-xs h-8 gap-1"
              onClick={() => accept(true)}
            >
              <ShieldCheck className="size-3.5" /> Accept all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => accept(false)}
            >
              Reject
            </Button>
          </div>
        )}
      </div>

      {requireScroll && (
        <p className="text-[9px] text-amber-600">Scroll through the policy to enable Accept.</p>
      )}

      <Badge variant="outline" className="text-[9px] gap-1">
        <ShieldCheck className="size-2.5" /> GDPR · v{version}
      </Badge>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={policyLabel}
          className={cn(
            'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40',
          )}
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-background border border-border rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[60vh] p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold flex items-center gap-1.5">
                <FileText className="size-4" /> {policyLabel}
              </h4>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto text-[11px] text-foreground/80 space-y-2 leading-relaxed">
              <p>This is a placeholder privacy policy. Replace it with your organisation's actual privacy policy text.</p>
              <p>It describes what data you collect, how you use it, who you share it with, and the rights of the data subject under GDPR.</p>
            </div>
            <Button
              type="button"
              size="sm"
              className="mt-2 gap-1.5"
              onClick={() => {
                accept(true);
                setOpen(false);
              }}
            >
              <ShieldCheck className="size-4" /> Accept & close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GdprConsentBanner;
