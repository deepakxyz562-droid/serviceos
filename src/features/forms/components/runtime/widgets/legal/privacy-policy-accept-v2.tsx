'use client';

import React, { useState } from 'react';
import {
  ShieldCheck, Lock, CheckCircle2, FileText, ExternalLink, ScrollText, History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface PrivacyValue {
  accepted: boolean;
  timestamp?: string;
  version?: string;
  signature?: string;
  policyUrl?: string;
  policyTitle?: string;
  changelog?: Array<{ version: string; date: string; notes: string }>;
}

interface VersionEntry { version: string; date: string; notes: string; }

export function PrivacyPolicyAcceptV2({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Privacy policy acceptance');
  const policyTitle = str(config.policyTitle, 'Privacy Policy');
  const policyUrl = str(config.policyUrl, '/privacy-policy');
  const policyBody = str(
    config.policyBody,
    'This is a placeholder privacy policy.\n\nReplace it with your organisation\'s actual policy text describing data collection, use, sharing, retention, and data-subject rights.',
  );
  const currentVersion = str(config.version, '2.0.0');
  const requireScroll = bool(config.requireScroll, true);
  const agreeLabel = str(config.agreeLabel, 'I have read and agree to the Privacy Policy');
  const changelog: VersionEntry[] = Array.isArray(config.changelog)
    ? (config.changelog as VersionEntry[])
    : [
        { version: '2.0.0', date: new Date().toISOString().slice(0, 10), notes: 'Restructured sections; added GDPR data-subject rights; clarified third-party sharing.' },
        { version: '1.2.0', date: '2024-01-15', notes: 'Added cookie categories and consent mechanism.' },
        { version: '1.0.0', date: '2023-06-01', notes: 'Initial policy.' },
      ];

  const v: PrivacyValue = value && typeof value === 'object'
    ? (value as PrivacyValue)
    : { accepted: false };

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const needsReaccept = v.accepted && v.version !== currentVersion;

  const accept = () => {
    if (disabled) return;
    onChange({
      accepted: true,
      timestamp: new Date().toISOString(),
      version: currentVersion,
      policyUrl,
      policyTitle,
      changelog,
      signature: undefined,
    });
    setOpen(false);
  };

  const revoke = () => {
    if (disabled) return;
    onChange({ accepted: false, timestamp: undefined, version: currentVersion, policyUrl, policyTitle, changelog });
  };

  if (v.accepted && !needsReaccept) {
    return (
      <div className="space-y-1.5" aria-label={ariaLabel}>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Accepted {policyTitle}
            </p>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
              {v.timestamp ? new Date(v.timestamp).toLocaleString() : ''} · v{v.version}
            </p>
          </div>
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={revoke}>
              Revoke
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <FileText className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">{policyTitle}</span>
        <Badge variant="outline" className="text-[9px] h-4 ml-auto gap-0.5">
          <ScrollText className="size-2.5" /> v{currentVersion}
        </Badge>
      </div>

      {needsReaccept && (
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          <History className="size-3.5" />
          The policy has been updated since you last accepted. Please re-accept to continue.
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => { setScrolled(false); setOpen(true); }}
        className="text-xs h-9 gap-1.5 w-full"
      >
        <FileText className="size-3.5" /> Review {policyTitle}
      </Button>

      <div className="flex items-start gap-2">
        <Checkbox
          id={`pp2-${str(field?.id, 'field')}`}
          checked={v.accepted && !needsReaccept}
          disabled={disabled}
          onCheckedChange={(c) => c ? accept() : revoke()}
          className="mt-0.5"
        />
        <label htmlFor={`pp2-${str(field?.id, 'field')}`} className="text-xs text-muted-foreground cursor-pointer">
          {agreeLabel}
        </label>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Lock className="size-3" /> {v.accepted && !needsReaccept ? 'Accepted.' : 'Not yet accepted.'}
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowHistory(true)} className="inline-flex items-center gap-0.5 text-primary hover:underline">
            <History className="size-2.5" /> Version history
          </button>
          <a href={policyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
            Open <ExternalLink className="size-2.5" />
          </a>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600" /> {policyTitle}
              <Badge variant="outline" className="text-[9px] h-4">v{currentVersion}</Badge>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Full text of the {policyTitle}. Read through and accept to continue.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea
            className="h-[55vh] w-full rounded-md border border-border/60 p-4"
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollHeight - el.scrollTop - el.clientHeight < 24) setScrolled(true);
            }}
          >
            <div className="space-y-3 text-xs text-foreground/90 leading-relaxed">
              {policyBody.split(/\n\n+/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-muted-foreground">
              {requireScroll && !scrolled ? 'Scroll to the bottom to accept.' : 'Ready to accept.'}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Close</Button>
              <Button
                type="button" size="sm"
                disabled={requireScroll && !scrolled}
                onClick={accept}
                className={cn('gap-1.5')}
              >
                <CheckCircle2 className="size-4" /> Accept v{currentVersion}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <History className="size-4" /> Version history
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {changelog.map((entry, i) => (
              <div key={i} className="rounded-md border border-border/60 p-2">
                <div className="flex items-center justify-between">
                  <Badge variant={entry.version === currentVersion ? 'default' : 'secondary'} className="text-[9px]">
                    v{entry.version}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">{entry.date}</span>
                </div>
                <p className="text-[11px] mt-1 text-foreground/80">{entry.notes}</p>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowHistory(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PrivacyPolicyAcceptV2;
