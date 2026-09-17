'use client';

import React, { useRef, useState } from 'react';
import { Type, RefreshCw, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface FontOption {
  label: string;
  family: string;
  className?: string;
  italic?: boolean;
}

const FONTS: FontOption[] = [
  { label: 'Cursive', family: '"Brush Script MT", "Segoe Script", cursive' },
  { label: 'Italic Serif', family: 'Georgia, serif', italic: true },
  { label: 'Hand', family: '"Comic Sans MS", "Bradley Hand", cursive' },
  { label: 'Sans', family: 'Inter, system-ui, sans-serif' },
  { label: 'Mono', family: 'ui-monospace, Menlo, monospace' },
];

const COLORS = ['#0f172a', '#1d4ed8', '#be123c', '#15803d'];

/**
 * Type-to-signature: renders the typed name as a stylized PNG data URL using
 * an offscreen canvas. The data URL is emitted via `onChange` so it can be
 * stored identically to a drawn signature.
 */
export function SignaturePadTypedWidget({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  const ariaLabel = String(field?.label ?? 'Typed signature');
  const placeholder = String(config?.placeholder ?? 'Type your full name');
  const defaultFontIdx = Number(config?.fontIndex ?? 0);
  const width = Number(config?.width ?? 480);
  const height = Number(config?.height ?? 160);

  const previewRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState<string>(
    typeof value === 'string' && value.startsWith('data:')
      ? ''
      : typeof value === 'string'
        ? value
        : ''
  );
  const [fontIdx, setFontIdx] = useState(defaultFontIdx);
  const [color, setColor] = useState(String(config?.color ?? '#0f172a'));
  const [committed, setCommitted] = useState(false);

  const font = FONTS[fontIdx] ?? FONTS[0];

  const commit = async () => {
    if (!text.trim()) return;
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = color;
    const fontSize = Math.min(64, Math.max(28, Math.floor(width / Math.max(text.length, 6))));
    ctx.font = `${font.italic ? 'italic ' : ''}${fontSize}px ${font.family}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, width / 2, height / 2);
    onChange(canvas.toDataURL('image/png'));
    setCommitted(true);
  };

  const clear = () => {
    if (disabled) return;
    setText('');
    setCommitted(false);
    onChange('');
  };

  const download = () => {
    if (typeof value !== 'string' || !value.startsWith('data:')) return;
    const link = document.createElement('a');
    link.download = `typed-signature-${Date.now()}.png`;
    link.href = value;
    link.click();
  };

  return (
    <div className="space-y-2">
      <div
        ref={previewRef}
        className="rounded-xl border border-border/80 bg-white overflow-hidden mx-auto flex items-center justify-center px-4"
        style={{ width, height }}
      >
        {typeof value === 'string' && value.startsWith('data:') ? (
          <img
            src={value}
            alt={ariaLabel}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <span
            className="text-muted-foreground/50 text-xs"
            style={{ fontFamily: font.family }}
          >
            {placeholder}
          </span>
        )}
      </div>

      <input
        type="text"
        value={text}
        disabled={disabled}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          setCommitted(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {FONTS.map((f, idx) => (
            <button
              key={f.label}
              type="button"
              disabled={disabled}
              onClick={() => {
                setFontIdx(idx);
                setCommitted(false);
              }}
              className={`px-2 py-1 rounded-md text-[11px] border transition-colors ${
                fontIdx === idx
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'border-border/60 text-muted-foreground hover:bg-muted/40'
              }`}
              style={{ fontFamily: f.family, fontStyle: f.italic ? 'italic' : 'normal' }}
            >
              <Type className="size-3 inline mr-1" />
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              disabled={disabled}
              aria-label={`Signature color ${c}`}
              onClick={() => {
                setColor(c);
                setCommitted(false);
              }}
              className={`size-5 rounded-full border-2 ${
                color === c ? 'border-foreground' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        {committed ? (
          <span className="text-[11px] text-emerald-600 flex items-center gap-1">
            <Check className="size-3.5" /> Signature ready
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            Type your name, then press Apply
          </span>
        )}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            disabled={disabled || !text.trim()}
            onClick={commit}
            className="text-xs gap-1.5"
          >
            <Type className="size-3.5" /> Apply
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || typeof value !== 'string' || !value.startsWith('data:')}
            onClick={download}
            className="size-8 p-0"
            aria-label="Download signature"
          >
            <Download className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || !text}
            onClick={clear}
            className="text-xs gap-1 px-2 h-8 text-muted-foreground hover:text-red-500"
          >
            <RefreshCw className="size-3.5" /> Clear
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SignaturePadTypedWidget;
