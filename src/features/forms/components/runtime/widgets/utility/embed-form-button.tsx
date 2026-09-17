'use client';

import React, { useState } from 'react';
import { Code, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface EmbedFormValue {
  action: 'embed_code_shown';
  timestamp: string;
  snippet?: string;
}

export function EmbedFormButton({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Embed form');
  const formUrl = str(config.formUrl, typeof window !== 'undefined' ? window.location.href : 'https://example.com/form/123');
  const width = str(config.width, '640');
  const height = str(config.height, '720');
  const existing = (value as Partial<EmbedFormValue> | undefined) ?? {};
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const snippet = `<iframe src="${formUrl}" width="${width}" height="${height}" frameborder="0" marginheight="0" marginwidth="0" title="Embedded Form">Loading…</iframe>\n<script src="${formUrl.replace(/\/+$/, '')}/embed.js" async defer></script>`;

  const show = () => {
    if (disabled) return;
    setOpen(true);
    const next: EmbedFormValue = { action: 'embed_code_shown', timestamp: new Date().toISOString(), snippet };
    onChange(next);
  };

  const copy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-1" aria-label={ariaLabel}>
      <Button type="button" disabled={disabled} onClick={show}
        variant="outline"
        className="w-full h-9 text-xs gap-1.5">
        <Code className="size-3.5" /> Embed form
      </Button>
      {open && (
        <div className="rounded-xl border border-border bg-muted/30 p-2 space-y-1.5">
          <p className="text-[10px] text-muted-foreground">Copy this snippet to embed your form:</p>
          <Textarea readOnly value={snippet} rows={4} className="font-mono text-[10px] leading-relaxed" aria-label="Embed snippet" />
          <div className="flex gap-1.5">
            <Button type="button" variant="outline" size="sm" onClick={copy} className="text-xs gap-1 flex-1">
              {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
              {copied ? 'Copied!' : 'Copy snippet'}
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
              <a href={formUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3" /> Preview
              </a>
            </Button>
          </div>
        </div>
      )}
      {existing.timestamp && !open && (
        <p className="text-[10px] text-muted-foreground text-center">Last snippet shown: {new Date(existing.timestamp).toLocaleTimeString()}</p>
      )}
    </div>
  );
}

export default EmbedFormButton;
