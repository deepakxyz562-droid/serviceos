'use client';

import React, { useState } from 'react';
import { Download, FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface PdfEmbedderValue {
  url: string;
  embedHtml: string;
  provider: 'native' | 'fallback';
}

function buildEmbed(url: string): PdfEmbedderValue {
  return {
    url,
    embedHtml: `<embed src="${url}" type="application/pdf" width="100%" height="100%" />`,
    provider: 'native',
  };
}

export function PdfEmbedder({ value, onChange, config, disabled, field }: WidgetProps) {
  const url = String(config?.url ?? (value as PdfEmbedderValue | undefined)?.url ?? '');
  const height = Number(config?.height ?? 480);
  const allowDownload = Boolean(config?.allowDownload ?? true);
  const ariaLabel = String(field?.label ?? 'PDF embedder');
  const [showFallback, setShowFallback] = useState(false);

  React.useEffect(() => {
    if (url && !disabled) onChange(buildEmbed(url));
     
  }, [url, disabled]);

  if (!url) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <FileText className="size-6 mx-auto text-muted-foreground" />
        <p className="text-xs mt-2 font-semibold">No PDF URL configured</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.url</code> to embed a PDF.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="rounded-xl overflow-hidden border border-border bg-muted/20" style={{ height }}>
        {showFallback ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
            <AlertCircle className="size-6 text-amber-600" />
            <p className="text-xs text-muted-foreground text-center">
              Inline PDF preview unavailable. Use the button below to open or download.
            </p>
          </div>
        ) : (
          <iframe
            src={`${url}#toolbar=1`}
            title={ariaLabel}
            className="w-full h-full"
            onError={() => setShowFallback(true)}
          />
        )}
      </div>
      {allowDownload && (
        <div className="flex items-center gap-2">
          <Button asChild type="button" variant="outline" size="sm" className="text-xs gap-1.5" disabled={disabled}>
            <a href={url} download target="_blank" rel="noopener noreferrer">
              <Download className="size-3.5" /> Download PDF
            </a>
          </Button>
          <Button asChild type="button" variant="ghost" size="sm" className="text-xs gap-1.5">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" /> Open in new tab
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

export default PdfEmbedder;
