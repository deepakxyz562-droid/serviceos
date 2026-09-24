'use client';

/**
 * Content Widget Runtime Components
 *
 * These render the Elementor-style content widgets:
 *   - ImageWidget
 *   - ButtonWidget
 *   - SpacerWidget
 *   - IconWidget
 *   - AlertWidget
 *   - BadgeWidget
 *   - ListWidget
 *
 * Each is a pure visual component — no form input, no data collection.
 * They render identically in editor, preview, and live.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// ─── Image Widget ─────────────────────────────────────────────────────

export function ImageWidget({ src, alt, width, height, alignment, borderRadius, linkUrl, openInNewTab }: {
  src?: string; alt?: string; width?: string; height?: string; alignment?: string;
  borderRadius?: string; linkUrl?: string; openInNewTab?: boolean;
}) {
  if (!src) return <div className="w-full h-32 bg-muted/30 rounded-lg flex items-center justify-center text-xs text-muted-foreground">No image URL set</div>;
  const alignClass = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';
  const img = <img src={src} alt={alt || ''} style={{ width: width || '100%', height: height || 'auto', borderRadius: borderRadius || '0px' }} className="max-w-full" />;
  return (
    <div className={cn('flex w-full', alignClass)}>
      {linkUrl ? <a href={linkUrl} target={openInNewTab ? '_blank' : '_self'} rel="noopener noreferrer">{img}</a> : img}
    </div>
  );
}

// ─── Button Widget ────────────────────────────────────────────────────

export function ButtonWidget({ text, linkUrl, openInNewTab, variant, size, alignment, fullWidth }: {
  text?: string; linkUrl?: string; openInNewTab?: boolean;
  variant?: string; size?: string; alignment?: string; fullWidth?: boolean;
}) {
  const alignClass = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';
  const btnSize = size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'default';
  return (
    <div className={cn('flex w-full', alignClass)}>
      <Button variant={variant as any || 'default'} size={btnSize as any} className={fullWidth ? 'w-full' : ''} asChild={!!linkUrl}>
        {linkUrl ? <a href={linkUrl} target={openInNewTab ? '_blank' : '_self'} rel="noopener noreferrer">{text || 'Button'}</a> : (text || 'Button')}
      </Button>
    </div>
  );
}

// ─── Spacer Widget ────────────────────────────────────────────────────

export function SpacerWidget({ height }: { height?: number }) {
  return <div style={{ height: `${height || 32}px` }} className="w-full" />;
}

// ─── Icon Widget ──────────────────────────────────────────────────────

export function IconWidget({ iconName, size, color, alignment }: {
  iconName?: string; size?: number; color?: string; alignment?: string;
}) {
  const IconComp = (LucideIcons as any)[iconName || 'Star'] || LucideIcons.Star;
  const alignClass = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';
  return (
    <div className={cn('flex w-full', alignClass)}>
      <IconComp size={size || 24} color={color || '#059669'} />
    </div>
  );
}

// ─── Alert Widget ──────────────────────────────────────────────────────

export function AlertWidget({ text, type, showIcon, dismissible }: {
  text?: string; type?: string; showIcon?: boolean; dismissible?: boolean;
}) {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;
  const icons = { info: Info, success: CheckCircle, warning: AlertTriangle, error: AlertCircle };
  const colors = {
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300',
    warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300',
    error: 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-300',
  };
  const Icon = icons[type as keyof typeof icons] || Info;
  return (
    <div className={cn('w-full p-3 rounded-lg border text-xs flex items-start gap-2', colors[type as keyof typeof colors] || colors.info)}>
      {showIcon !== false && <Icon className="size-4 shrink-0 mt-0.5" />}
      <span className="flex-1">{text || 'Alert message'}</span>
      {dismissible && <button onClick={() => setDismissed(true)} className="shrink-0 opacity-60 hover:opacity-100"><X className="size-3" /></button>}
    </div>
  );
}

// ─── Badge Widget ─────────────────────────────────────────────────────

export function BadgeWidget({ text, variant, alignment }: {
  text?: string; variant?: string; alignment?: string;
}) {
  const alignClass = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';
  return (
    <div className={cn('flex w-full', alignClass)}>
      <Badge variant={variant === 'outline' ? 'outline' : variant === 'subtle' ? 'secondary' : 'default'} className="text-xs px-3 py-1">
        {text || 'Badge'}
      </Badge>
    </div>
  );
}

// ─── List Widget ──────────────────────────────────────────────────────

export function ListWidget({ items, style, iconColor }: {
  items?: string[] | string; style?: string; iconColor?: string;
}) {
  const list = typeof items === 'string' ? items.split('\n').filter(Boolean) : Array.isArray(items) ? items : [];
  const icons = {
    checkmark: '✓', dot: '•', number: '', star: '★', none: '',
  };
  const bullet = icons[style as keyof typeof icons] || '✓';
  return (
    <ul className="w-full space-y-1.5">
      {list.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90">
          {style === 'number' ? (
            <span className="shrink-0 font-bold text-xs" style={{ color: iconColor || '#10b981' }}>{idx + 1}.</span>
          ) : style !== 'none' ? (
            <span className="shrink-0 font-bold text-sm" style={{ color: iconColor || '#10b981' }}>{bullet}</span>
          ) : null}
          <span className="flex-1">{item}</span>
        </li>
      ))}
    </ul>
  );
}
