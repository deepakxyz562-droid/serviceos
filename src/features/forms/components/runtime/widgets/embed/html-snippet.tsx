'use client';

import React, { useMemo } from 'react';
import { Code2, ShieldAlert } from 'lucide-react';
import type { WidgetProps } from '../widget-props';

interface HtmlSnippetValue {
  html: string;
  sanitized: boolean;
}

const DANGEROUS_TAGS = /<\/?(script|iframe|object|embed|link|meta|base|form|input|button|textarea|select|option|applet|frame|frameset)\b[^>]*>/gi;
const DANGEROUS_ATTRS = /\s+(on\w+|srcdoc|formaction|http-equiv|expression|javascript:|vbscript:|data:text\/html)[=\s]/gi;
const SRC_HREF_SCRIPT = /((src|href)\s*=\s*["']?\s*(javascript:|vbscript:|data:text\/html)[^"'\s]*)/gi;

function sanitize(html: string): string {
  if (!html) return '';
  return html
    .replace(DANGEROUS_TAGS, '')
    .replace(DANGEROUS_ATTRS, ' data-removed="$1"')
    .replace(SRC_HREF_SCRIPT, '$2="#"');
}

export function HtmlSnippet({ value, onChange, config, disabled, field }: WidgetProps) {
  const html = String(config?.html ?? (value as HtmlSnippetValue | undefined)?.html ?? '');
  const ariaLabel = String(field?.label ?? 'HTML snippet');

  const sanitized = useMemo(() => sanitize(html), [html]);

  React.useEffect(() => {
    if (!disabled && html) {
      onChange({ html, sanitized: true } as HtmlSnippetValue);
    }
     
  }, [html, disabled]);

  if (!html) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <Code2 className="size-6 mx-auto text-muted-foreground" />
        <p className="text-xs mt-2 font-semibold">No HTML snippet configured</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.html</code> to render custom HTML.</p>
      </div>
    );
  }

  const wasModified = sanitized !== html;

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      {wasModified && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800/60 p-2 text-[11px] text-amber-800 dark:text-amber-300">
          <ShieldAlert className="size-3.5 mt-0.5 shrink-0" />
          <span>Sanitized: removed script tags, inline event handlers, and <code>javascript:</code> URLs.</span>
        </div>
      )}
      <div
        className="prose prose-sm max-w-none rounded-xl border border-border bg-background p-3 overflow-auto"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </div>
  );
}

export default HtmlSnippet;
