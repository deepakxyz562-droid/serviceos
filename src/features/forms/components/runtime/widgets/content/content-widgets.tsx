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
import { resolveIcon } from '@/lib/forms/icon-resolver';

// ─── Image Widget ─────────────────────────────────────────────────────

export function ImageWidget(props: {
  src?: string; alt?: string; width?: string; height?: string; alignment?: string;
  borderRadius?: string; linkUrl?: string; openInNewTab?: boolean;
  config?: Record<string, any>; field?: Record<string, any>;
}) {
  const cfg = props.config || props.field?.widgetConfig || {};
  const src = props.src || cfg.src || cfg.url || cfg.mediaUrl || cfg.imageUrl || '';
  const alt = props.alt || cfg.alt || (props.field?.label as string) || '';
  const width = props.width || cfg.width || '100%';
  const height = props.height || cfg.height || 'auto';
  const alignment = props.alignment || cfg.alignment || 'center';
  const borderRadius = props.borderRadius || cfg.borderRadius || '0px';
  const linkUrl = props.linkUrl || cfg.linkUrl || '';
  const openInNewTab = props.openInNewTab ?? cfg.openInNewTab ?? true;

  if (!src) return <div className="w-full h-32 bg-muted/30 rounded-lg flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border/80">No image URL set</div>;
  const alignClass = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';
  const img = <img src={src} alt={alt} style={{ width: width || '100%', height: height || 'auto', borderRadius: borderRadius || '0px' }} className="max-w-full object-cover" />;
  return (
    <div className={cn('flex w-full', alignClass)}>
      {linkUrl ? <a href={linkUrl} target={openInNewTab ? '_blank' : '_self'} rel="noopener noreferrer">{img}</a> : img}
    </div>
  );
}

// ─── Button Widget ────────────────────────────────────────────────────

export function ButtonWidget(props: {
  text?: string; linkUrl?: string; openInNewTab?: boolean;
  variant?: string; size?: string; alignment?: string; fullWidth?: boolean;
  config?: Record<string, any>; field?: Record<string, any>;
}) {
  const cfg = props.config || props.field?.widgetConfig || {};
  const text = props.text || cfg.text || (props.field?.label as string) || 'Click Here';
  const linkUrl = props.linkUrl || cfg.linkUrl || '';
  const openInNewTab = props.openInNewTab ?? cfg.openInNewTab ?? true;
  const variant = props.variant || cfg.variant || 'default';
  const size = props.size || cfg.size || 'medium';
  const alignment = props.alignment || cfg.alignment || 'center';
  const fullWidth = props.fullWidth ?? cfg.fullWidth ?? false;

  const alignClass = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';
  const btnSize = size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'default';
  return (
    <div className={cn('flex w-full', alignClass)}>
      <Button variant={variant as any || 'default'} size={btnSize as any} className={fullWidth ? 'w-full' : ''} asChild={!!linkUrl}>
        {linkUrl ? <a href={linkUrl} target={openInNewTab ? '_blank' : '_self'} rel="noopener noreferrer">{text}</a> : text}
      </Button>
    </div>
  );
}

// ─── Spacer Widget ────────────────────────────────────────────────────

export function SpacerWidget(props: { height?: number; config?: Record<string, any>; field?: Record<string, any> }) {
  const cfg = props.config || props.field?.widgetConfig || {};
  const height = props.height ?? cfg.height ?? 32;
  return <div style={{ height: `${height}px` }} className="w-full" />;
}

// ─── Icon Widget ──────────────────────────────────────────────────────

export function IconWidget(props: {
  iconName?: string; size?: number; color?: string; alignment?: string;
  config?: Record<string, any>; field?: Record<string, any>;
}) {
  const cfg = props.config || props.field?.widgetConfig || {};
  const iconName = props.iconName || cfg.iconName || cfg.icon || 'Star';
  const size = props.size ?? cfg.size ?? 24;
  const color = props.color || cfg.color || '#059669';
  const alignment = props.alignment || cfg.alignment || 'center';

  const IconComp = resolveIcon(iconName || 'Star');
  const alignClass = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';
  return (
    <div className={cn('flex w-full', alignClass)}>
      <IconComp size={size} color={color} />
    </div>
  );
}

// ─── Alert Widget ──────────────────────────────────────────────────────

export function AlertWidget(props: {
  text?: string; type?: string; showIcon?: boolean; dismissible?: boolean;
  config?: Record<string, any>; field?: Record<string, any>;
}) {
  const [dismissed, setDismissed] = React.useState(false);
  const cfg = props.config || props.field?.widgetConfig || {};
  const text = props.text || cfg.text || (props.field?.label as string) || 'Alert message';
  const type = props.type || cfg.type || 'info';
  const showIcon = props.showIcon ?? cfg.showIcon ?? true;
  const dismissible = props.dismissible ?? cfg.dismissible ?? false;

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
      <span className="flex-1">{text}</span>
      {dismissible && <button onClick={() => setDismissed(true)} className="shrink-0 opacity-60 hover:opacity-100"><X className="size-3" /></button>}
    </div>
  );
}

// ─── Badge Widget ─────────────────────────────────────────────────────

export function BadgeWidget(props: {
  text?: string; variant?: string; alignment?: string;
  config?: Record<string, any>; field?: Record<string, any>;
}) {
  const cfg = props.config || props.field?.widgetConfig || {};
  const text = props.text || cfg.text || (props.field?.label as string) || 'Badge';
  const variant = props.variant || cfg.variant || 'solid';
  const alignment = props.alignment || cfg.alignment || 'left';

  const alignClass = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';
  return (
    <div className={cn('flex w-full', alignClass)}>
      <Badge variant={variant === 'outline' ? 'outline' : variant === 'subtle' ? 'secondary' : 'default'} className="text-xs px-3 py-1 font-semibold">
        {text}
      </Badge>
    </div>
  );
}

// ─── List Widget ──────────────────────────────────────────────────────

export function ListWidget(props: {
  items?: string[] | string; style?: string; iconColor?: string;
  config?: Record<string, any>; field?: Record<string, any>;
}) {
  const cfg = props.config || props.field?.widgetConfig || {};
  const rawItems = props.items || cfg.items || [];
  const style = props.style || cfg.style || 'checkmark';
  const iconColor = props.iconColor || cfg.iconColor || '#10b981';

  const list = typeof rawItems === 'string' ? rawItems.split('\n').filter(Boolean) : Array.isArray(rawItems) ? rawItems : [];
  const icons = {
    checkmark: '✓', dot: '•', number: '', star: '★', none: '',
  };
  const bullet = icons[style as keyof typeof icons] || '✓';
  return (
    <ul className="w-full space-y-1.5">
      {list.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90">
          {style === 'number' ? (
            <span className="shrink-0 font-bold text-xs" style={{ color: iconColor }}>{idx + 1}.</span>
          ) : style !== 'none' ? (
            <span className="shrink-0 font-bold text-sm" style={{ color: iconColor }}>{bullet}</span>
          ) : null}
          <span className="flex-1">{item}</span>
        </li>
      ))}
    </ul>
  );
}
