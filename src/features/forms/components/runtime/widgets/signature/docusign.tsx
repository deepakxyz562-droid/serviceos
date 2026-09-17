'use client';

import React, { useState } from 'react';
import { ExternalLink, FileSignature, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

export interface DocuSignValue {
  embedUrl?: string;
  envelopeId?: string;
  signerEmail?: string;
  status: 'pending' | 'completed' | 'unknown';
}

export function DocuSignWidget({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  const ariaLabel = String(field?.label ?? 'DocuSign');
  const defaultEmbedUrl = String(config?.embedUrl ?? '');
  const envelopeId = String(config?.envelopeId ?? '');

  const current: DocuSignValue =
    value && typeof value === 'object'
      ? (value as DocuSignValue)
      : { status: 'unknown' };

  const [embedUrl, setEmbedUrl] = useState(
    current.embedUrl ?? defaultEmbedUrl
  );
  const [signerEmail, setSignerEmail] = useState(current.signerEmail ?? '');

  const launch = () => {
    if (disabled || !embedUrl) return;
    onChange({
      embedUrl,
      envelopeId,
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
        <div className="size-9 rounded-lg bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-500 flex items-center justify-center">
          <FileSignature className="size-4" />
        </div>
        <div>
          <p className="text-xs font-semibold">{ariaLabel}</p>
          <p className="text-[11px] text-muted-foreground">
            DocuSign eSignature integration
          </p>
        </div>
      </div>

      {!current.embedUrl ? (
        <div className="space-y-2">
          <input
            type="url"
            value={embedUrl}
            disabled={disabled}
            aria-label="DocuSign recipient view URL"
            placeholder="https://demo.docusign.net/Member/PowerFormForms/…"
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
            <ExternalLink className="size-3.5" /> Launch DocuSign
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
            Configure DocuSign Connect webhooks for automatic status updates.
          </p>
        </div>
      )}
    </div>
  );
}

export default DocuSignWidget;
