'use client';

import React, { useState } from 'react';
import { QrCode, Download, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';
import { str, num } from '../widget-props';
import { qrSvgMarkup } from '@/lib/qr-svg';

interface QrFormLinkValue {
  action: 'qr_generated';
  timestamp: string;
  url?: string;
  /** Legacy field — used to hold a third-party QR image URL. No longer emitted. */
  imageUrl?: string;
}

export function QrFormLink({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Form QR code');
  const defaultUrl = str(config.formUrl, typeof window !== 'undefined' ? window.location.href : 'https://example.com/form/123');
  const size = num(config.size, 200);
  const existing = (value as Partial<QrFormLinkValue> | undefined) ?? {};
  const [url, setUrl] = useState<string>(existing.url ?? defaultUrl);
  const [copied, setCopied] = useState(false);

  // QR generated fully on-device — the URL never leaves the browser.
  const qrMarkup = url ? qrSvgMarkup(url) : null;

  const handleGenerate = () => {
    if (disabled) return;
    const next: QrFormLinkValue = { action: 'qr_generated', timestamp: new Date().toISOString(), url };
    onChange(next);
  };

  // Rasterize the local SVG to a real PNG on the client.
  const handleSavePng = () => {
    if (!qrMarkup) return;
    const blob = new Blob([qrMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const objUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size * 4;
      canvas.height = size * 4;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objUrl);
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objUrl);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'form-qr.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.onerror = () => URL.revokeObjectURL(objUrl);
    img.src = objUrl;
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
      {qrMarkup && (
        <div className="rounded-xl border border-border bg-white p-2 flex justify-center">
          {/* Safe to inline: markup is generated entirely by our local
              encoder — no user-controlled attributes. */}
          <div
            style={{ width: size, height: size }}
            role="img"
            aria-label={ariaLabel}
            dangerouslySetInnerHTML={{ __html: qrMarkup }}
          />
        </div>
      )}
      <div className="flex gap-1.5">
        <Button type="button" variant="outline" size="sm" disabled={disabled || !qrMarkup}
          onClick={copyUrl} className="text-xs gap-1 flex-1">
          {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
          {copied ? 'Copied!' : 'Copy URL'}
        </Button>
        {qrMarkup && (
          <Button type="button" variant="ghost" size="sm" onClick={handleSavePng} className="text-xs gap-1">
            <Download className="size-3" /> Save
          </Button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">Scan with a phone camera to open the form.</p>
    </div>
  );
}

export default QrFormLink;
