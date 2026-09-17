'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  FileText,
  ExternalLink,
  ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface ConsentValue {
  accepted: boolean;
  timestamp?: string;
  version?: string;
  policyUrl?: string;
  policyTitle?: string;
}

export function PrivacyPolicyAccept({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Privacy policy acceptance');
  const policyTitle = str(config.policyTitle, 'Privacy Policy');
  const policyUrl = str(config.policyUrl, '/privacy-policy');
  const policyBody = str(
    config.policyBody,
    'This is a placeholder privacy policy.\n\nReplace it with your organisation\'s actual policy text. It should describe what data you collect, how you use it, who you share it with, and the rights of the data subject.\n\nBy accepting, you confirm that you have read and understood this policy.',
  );
  const version = str(config.version, '1.0.0');
  const requireScroll = bool(config.requireScroll, true);
  const agreeLabel = str(config.agreeLabel, 'I have read and agree to the Privacy Policy');

  const v: ConsentValue = value && typeof value === 'object' ? (value as ConsentValue) : { accepted: false };

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const accept = () => {
    if (disabled) return;
    onChange({
      accepted: true,
      timestamp: new Date().toISOString(),
      version,
      policyUrl,
      policyTitle,
    });
    setOpen(false);
  };

  const revoke = () => {
    if (disabled) return;
    onChange({ accepted: false, timestamp: undefined, version, policyUrl, policyTitle });
  };

  if (v.accepted) {
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => {
          setScrolled(false);
          setOpen(true);
        }}
        className="text-xs h-9 gap-1.5"
      >
        <FileText className="size-3.5" /> Review {policyTitle}
      </Button>

      <div className="flex items-start gap-2">
        <Checkbox
          id={`pp-${str(field?.id, 'field')}`}
          checked={v.accepted}
          disabled={disabled}
          onCheckedChange={(c) => {
            if (c) accept();
            else revoke();
          }}
          className="mt-0.5"
        />
        <label
          htmlFor={`pp-${str(field?.id, 'field')}`}
          className="text-xs text-muted-foreground cursor-pointer"
        >
          {agreeLabel}
        </label>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Lock className="size-3" /> Not yet accepted.
        <a
          href={policyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-0.5 text-primary hover:underline"
        >
          Open policy <ExternalLink className="size-2.5" />
        </a>
      </div>

      <Badge variant="outline" className="text-[9px] gap-1">
        <ScrollText className="size-2.5" /> v{version}
      </Badge>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600" /> {policyTitle}
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
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={requireScroll && !scrolled}
                onClick={accept}
                className={cn('gap-1.5')}
              >
                <CheckCircle2 className="size-4" /> Accept
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PrivacyPolicyAccept;
