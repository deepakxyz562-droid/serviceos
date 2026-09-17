'use client';

import React, { useState } from 'react';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Lock, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface HipaaValue {
  accepted: boolean;
  timestamp?: string;
  version?: string;
  practitionerName?: string;
  signature?: string;
}

const HIPAA_TEXT = `HIPAA Notice of Privacy Practices

This notice describes how medical information about you may be used and disclosed by this practice, and how you can access this information. Please review it carefully.

1. We may use and disclose your Protected Health Information (PHI) for treatment, payment, and healthcare operations.
2. We may contact you for appointment reminders, treatment alternatives, or other health-related benefits.
3. You have the right to: request restrictions on uses/disclosures, receive confidential communications, inspect and copy your PHI, amend your PHI, receive an accounting of disclosures, and obtain a paper copy of this notice.
4. We are required by law to maintain the privacy of your PHI, provide you with this notice, and abide by the terms of the notice currently in effect.
5. We will not use or disclose psychotherapy notes, sell your PHI, or use it for marketing without your written authorization.

This is a placeholder notice — replace it with your organisation's actual HIPAA Notice of Privacy Practices.`;

export function HipaaConsent({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'HIPAA consent');
  const version = str(config.version, '2024-09-01');
  const requireSignature = bool(config.requireSignature, true);
  const requireScroll = bool(config.requireScroll, true);

  const v: HipaaValue = value && typeof value === 'object' ? (value as HipaaValue) : { accepted: false };
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [open, setOpen] = useState(false);

  const accept = (accepted: boolean) => {
    if (disabled) return;
    onChange({
      accepted,
      timestamp: accepted ? new Date().toISOString() : undefined,
      version: accepted ? version : undefined,
      practitionerName: v.practitionerName,
      signature: v.signature,
    });
  };

  const setSignature = (sig: string) => {
    onChange({
      accepted: v.accepted,
      timestamp: v.timestamp,
      version,
      practitionerName: v.practitionerName,
      signature: sig,
    });
  };

  const canAccept = !requireScroll || scrolledToBottom;
  const sigMissing = requireSignature && v.accepted && !str(v.signature, '').trim();

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <Badge variant="outline" className="text-[10px] gap-1 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800">
        <ShieldCheck className="size-2.5" /> HIPAA Notice v{version}
      </Badge>

      {v.accepted ? (
        <div className="rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Consent recorded</p>
            {v.timestamp && (
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                {new Date(v.timestamp).toLocaleString()}
              </p>
            )}
          </div>
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => accept(false)}>Revoke</Button>
          )}
        </div>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => setOpen(true)}
            className="w-full text-xs h-8 gap-1.5"
          >
            <FileText className="size-3.5" /> Read HIPAA Notice
          </Button>

          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id={`hipaa-${str(field?.id, 'field')}`}
              checked={v.accepted}
              disabled={disabled || !canAccept}
              onCheckedChange={(c) => accept(c === true)}
              className="mt-0.5"
            />
            <label htmlFor={`hipaa-${str(field?.id, 'field')}`} className="text-[11px] text-muted-foreground">
              I acknowledge I have reviewed the HIPAA Notice of Privacy Practices and consent to the use and disclosure of my PHI for treatment, payment, and healthcare operations.
            </label>
          </div>

          {requireScroll && !canAccept && (
            <p className="text-[10px] text-amber-600">Scroll through the notice to enable consent.</p>
          )}

          {requireSignature && v.accepted && (
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Lock className="size-3" /> Type your full name as a digital signature
              </label>
              <input
                type="text"
                value={str(v.signature, '')}
                disabled={disabled}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Your full legal name"
                className="text-xs h-8 w-full rounded-md border border-border bg-background px-2"
                aria-label="HIPAA signature"
              />
              {sigMissing && (
                <p className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold">
                  <AlertCircle className="size-3" /> Signature required to complete consent.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="HIPAA Notice of Privacy Practices"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-background border border-border rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[70vh] p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-600" /> HIPAA Notice
              </h4>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>Close</Button>
            </div>
            <div
              className="flex-1 overflow-y-auto text-[11px] text-foreground/80 space-y-2 leading-relaxed whitespace-pre-line pr-1"
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollHeight - el.scrollTop - el.clientHeight < 8) setScrolledToBottom(true);
              }}
            >
              {HIPAA_TEXT}
            </div>
            <Button
              type="button"
              size="sm"
              className="mt-2 gap-1.5"
              disabled={!canAccept}
              onClick={() => {
                accept(true);
                setOpen(false);
              }}
            >
              <CheckCircle2 className="size-4" /> I have read this notice
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HipaaConsent;
