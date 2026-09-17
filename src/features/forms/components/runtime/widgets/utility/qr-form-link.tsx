'use client';

import React, { useState } from 'react';
import { QrCode, Download, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';
import { str, num } from '../widget-props';

interface QrFormLinkValue {
  action: 'qr_generated';
  timestamp: string;
  url?: string;
  imageUrl?: string;
}

export function QrFormLink({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Form QR code');
  const defaultUrl = str(config.formUrl, typeof window !== 'undefined' ? window.location.href : 'https://example.com/form/123');
  const size = num(config.size, 200);
  const existing = (value as Partial<QrFormLinkValue> | undefined) ?? {};
  const [url, setUrl] = useState<string>(existing.url ?? defaultUrl);
  const [copied, setCopied] = useState(false);

  const imageUrl = url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`
    : '';

  const handleGenerate = () => {
    if (disabled) return;
    const next: QrFormLinkValue = { action: 'qr_generated', timestamp: new Date().toISOString(), url, imageUrl };
    onChange(next);
  };

  const copyUrl = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <QrCode className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">{ariaLabel}</span>
      </div>
      <Input
        type="url"
        value={url}
        disabled={disabled}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={handleGenerate}
        placeholder="https://your-form.url/abc123"
        className="text-xs h-8"
        aria-label="Form URL"
      />
      {imageUrl && (
        <div className="rounded-xl border border-border bg-white p-2 flex justify-center">
          <img src={imageUrl} alt={ariaLabel} width={size} height={size} className="max-w-full h-auto" />
        </div>
      )}
      <div className="flex gap-1.5">
        <Button type="button" variant="outline" size="sm" disabled={disabled || !imageUrl}
          onClick={copyUrl} className="text-xs gap-1 flex-1">
          {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
          {copied ? 'Copied!' : 'Copy URL'}
        </Button>
        {imageUrl && (
          <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
            <a href={imageUrl} download="form-qr.png">
              <Download className="size-3" /> Save
            </a>
          </Button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">Scan with a phone camera to open the form.</p>
    </div>
  );
}

export default QrFormLink;
