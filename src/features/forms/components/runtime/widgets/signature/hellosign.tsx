'use client';

import React, { useState } from 'react';
import { ExternalLink, FileSignature, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

export interface HelloSignValue {
  embedUrl?: string;
  signatureRequestId?: string;
  signerEmail?: string;
  status: 'pending' | 'completed' | 'unknown';
}

export function HelloSignWidget({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  const ariaLabel = String(field?.label ?? 'HelloSign');
  const defaultEmbedUrl = String(config?.embedUrl ?? '');
  // Settings write `templateId`. Legacy runtime read `signatureRequestId`.
  // Read settings key first, fall back to legacy key.
  const signatureRequestId = String(config?.templateId ?? config?.signatureRequestId ?? '');

  const current: HelloSignValue =
    value && typeof value === 'object'
      ? (value as HelloSignValue)
      : { status: 'unknown' };

  const [embedUrl, setEmbedUrl] = useState(
    current.embedUrl ?? defaultEmbedUrl
  );
  const [signerEmail, setSignerEmail] = useState(current.signerEmail ?? '');

  const launch = () => {
    if (disabled || !embedUrl) return;
    onChange({
      embedUrl,
      signatureRequestId,
      signerEmail,
      status: 'pending',
    });
  };

  const markCompleted = () => {
    if (disabled) return;
    onChange({ ...current, status: 'completed' });
  };

  return (
    <div className="space-y-3 p-3 border border-border/80 rounded-xl bg-card">
      <div className="flex items-center gap-2">
        <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
          <FileSignature className="size-4" />
        </div>
        <div>
          <p className="text-xs font-semibold">{ariaLabel}</p>
          <p className="text-[11px] text-muted-foreground">
            Dropbox Sign (HelloSign) integration
          </p>
        </div>
      </div>

      {!current.embedUrl ? (
        <div className="space-y-2">
          <input
            type="url"
            value={embedUrl}
            disabled={disabled}
            aria-label="HelloSign embedded signing URL"
            placeholder="https://www.hellosign.com/editor/embeddedSign?…"
            onChange={(e) => setEmbedUrl(e.target.value)}
            className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-xs"
          />
          <input
            type="email"
            value={signerEmail}
            disabled={disabled}
            aria-label="Signer email"
            placeholder="signer@example.com"
            onChange={(e) => setSignerEmail(e.target.value)}
            className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-xs"
          />
          <Button
            type="button"
            size="sm"
            disabled={disabled || !embedUrl}
            onClick={launch}
            className="text-xs gap-1.5 w-full"
          >
            <ExternalLink className="size-3.5" /> Launch HelloSign
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="aspect-video w-full rounded-lg overflow-hidden border border-border/80 bg-muted/40">
            <iframe
              src={current.embedUrl}
              title={ariaLabel}
              className="w-full h-full"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              Status: <span className="capitalize">{current.status}</span>
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={markCompleted}
              className="text-xs gap-1.5"
            >
              Mark as signed
            </Button>
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="size-3.5" />
            Listen for HelloSign callback events to confirm signature completion.
          </p>
        </div>
      )}
    </div>
  );
}

export default HelloSignWidget;
