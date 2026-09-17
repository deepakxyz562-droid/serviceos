'use client';

import React, { useMemo, useState } from 'react';
import { ScrollText, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WidgetProps } from '../widget-props';

export function TermsAndConditions({ value, onChange, config, disabled, field }: WidgetProps) {
  const accepted = value === true || value === 'true' || value === 1;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const title = (config.title as string) || 'Terms & Conditions';
  const body = (config.body as string) || 'Enter your terms and conditions here...';
  const agreeLabel = (config.agreeLabel as string) || 'I have read and agree to the terms and conditions';
  const requireScroll = config.requireScroll !== false;

  const paragraphs = useMemo(() => body.split(/\n\n+/), [body]);

  function openDialog(open: boolean) {
    if (open) setScrolledToBottom(false);
    setDialogOpen(open);
  }

  function toggleAccepted(checked: boolean) {
    onChange(checked);
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    if (atBottom) setScrolledToBottom(true);
  }

  const canAccept = !requireScroll || scrolledToBottom;

  return (
    <div className="space-y-2.5" aria-label={String(field?.['label'] ?? 'Terms and conditions')}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => openDialog(true)}
        className="text-xs h-8 gap-1.5"
      >
        <ScrollText className="size-3.5 text-emerald-600" />
        Read {title}
      </Button>

      <div className="flex items-start gap-2">
        <Checkbox
          id={`tac-${String(field?.['id'] || 'field')}`}
          checked={accepted}
          disabled={disabled}
          onCheckedChange={(v) => toggleAccepted(v === true)}
          className="mt-0.5"
        />
        <Label htmlFor={`tac-${String(field?.['id'] || 'field')}`} className="text-xs text-muted-foreground cursor-pointer">
          {agreeLabel}
        </Label>
      </div>

      {accepted ? (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
          <CheckCircle2 className="size-3.5" /> You have accepted the terms.
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock className="size-3.5" /> You must accept the terms to continue.
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={openDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="size-5 text-emerald-600" /> {title}
            </DialogTitle>
            <DialogDescription className="sr-only">Full text of the terms and conditions</DialogDescription>
          </DialogHeader>
          <ScrollArea
            className="h-[60vh] w-full rounded-md border border-border/60 p-4"
            onScroll={handleScroll as unknown as React.UIEventHandler<HTMLDivElement>}
          >
            <div className="space-y-3 text-xs text-foreground/90 leading-relaxed">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </ScrollArea>
          {requireScroll && !scrolledToBottom && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600">
              <AlertCircle className="size-3.5" /> Scroll to the bottom of the terms to continue.
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => openDialog(false)}>
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!canAccept}
              onClick={() => {
                onChange(true);
                openDialog(false);
              }}
              className="gap-1.5"
            >
              <CheckCircle2 className="size-4" /> I Agree
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TermsAndConditions;
