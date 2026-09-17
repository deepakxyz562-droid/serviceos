'use client';

import React, { useState } from 'react';
import { ExternalLink, FileSignature, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

export interface AdobeSignValue {
  embedUrl?: string;
  agreementId?: string;
  signerEmail?: string;
  status: 'pending' | 'completed' | 'unknown';
}

export function AdobeSignWidget({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  const ariaLabel = String(field?.label ?? 'Adobe Sign');
  const defaultEmbedUrl = String(config?.embedUrl ?? '');
  const agreementId = String(config?.agreementId ?? '');

  const current: AdobeSignValue =
    value && typeof value === 'object'
      ? (value as AdobeSignValue)
      : { status: 'unknown' };

  const [embedUrl, setEmbedUrl] = useState(
    current.embedUrl ?? defaultEmbedUrl
  );
  const [signerEmail, setSignerEmail] = useState(current.signerEmail ?? '');

  const launch = () => {
    if (disabled || !embedUrl) return;
    onChange({
      embedUrl,
      agreementId,
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
        <div className="size-9 rounded-lg bg-red-100 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
          <FileSignature className="size-4" />
        </div>
        <div>
          <p className="text-xs font-semibold">{ariaLabel}</p>
          <p className="text-[11px] text-muted-foreground">
            Adobe Acrobat Sign integration
          </p>
        </div>
      </div>

      {!current.embedUrl ? (
        <div className="space-y-2">
          <input
            type="url"
            value={embedUrl}
            disabled={disabled}
            aria-label="Adobe Sign embed URL"
            placeholder="https://secure.na1.echosign.com/public/esign?pid=…"
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
            <ExternalLink className="size-3.5" /> Launch Adobe Sign
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
            Wire Adobe Sign webhooks for automatic completion detection.
          </p>
        </div>
      )}
    </div>
  );
}

export default AdobeSignWidget;
