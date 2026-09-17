'use client';

import React, { useRef, useState } from 'react';
import { Upload, ScanText, X, Loader2, AlertTriangle, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface OcrResult {
  image: { name: string; size: number; type: string; dataUrl: string };
  text?: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export function ImageScannerOcrWidget({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  const endpoint = String(config?.endpoint ?? '/api/forms/ocr');
  const ariaLabel = String(field?.label ?? 'Image OCR scanner');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const result: OcrResult | null = value ? (value as OcrResult) : null;

  const run = async (file: File) => {
    if (disabled) return;
    setBusy(true);
    const dataUrl = await readFileAsDataUrl(file);
    const base: OcrResult = {
      image: { name: file.name, size: file.size, type: file.type, dataUrl },
      status: 'pending',
    };
    onChange(base);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, filename: file.name }),
      });
      if (!res.ok) throw new Error(`OCR request failed (${res.status})`);
      const data = await res.json().catch(() => ({ text: '' }));
      onChange({ ...base, text: data.text ?? '', status: 'success' });
    } catch (err) {
      onChange({
        ...base,
        status: 'error',
        error: err instanceof Error ? err.message : 'OCR failed',
      });
    } finally {
      setBusy(false);
    }
  };

  const copyText = async () => {
    if (!result?.text) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) run(f);
        }}
      />

      {!result ? (
        <button
          type="button"
          onClick={() => !disabled && fileInputRef.current?.click()}
          disabled={disabled || busy}
          className={`w-full border-2 border-dashed border-border/80 hover:border-emerald-400/80 rounded-xl p-6 text-center transition-all ${
            disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {busy ? (
            <Loader2 className="size-6 mx-auto animate-spin text-emerald-600" />
          ) : (
            <ScanText className="size-6 mx-auto text-muted-foreground" />
          )}
          <p className="text-xs mt-2 font-semibold">
            {busy ? 'Scanning image…' : 'Upload an image to extract text'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Powered by OCR endpoint
          </p>
        </button>
      ) : (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden border border-border/80 bg-muted/40">
            <img src={result.image.dataUrl} alt={result.image.name} className="w-full max-h-48 object-contain" />
            {!disabled && (
              <button
                type="button"
                aria-label="Clear"
                onClick={() => {
                  onChange(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-2 right-2 size-7 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {result.status === 'pending' && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" /> Extracting text…
            </div>
          )}

          {result.status === 'error' && (
            <div className="text-[11px] text-red-600 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" /> {result.error}
            </div>
          )}

          {result.status === 'success' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-emerald-600 font-medium">
                  Extracted text
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[11px] gap-1 px-2"
                  onClick={copyText}
                  disabled={!result.text}
                >
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <pre className="text-[11px] whitespace-pre-wrap break-words rounded-md bg-muted/60 border border-border/60 p-2 max-h-40 overflow-auto">
                {result.text || '(no text detected)'}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ImageScannerOcrWidget;
