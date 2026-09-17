'use client';

import React, { useEffect } from 'react';
import { Facebook, AlertCircle } from 'lucide-react';
import type { WidgetProps } from '../widget-props';

interface FacebookPageValue {
  pageUrl: string;
  pageName: string;
  embedUrl: string;
  provider: 'facebook';
}

function toPageName(url: string): string {
  const m = url.match(/facebook\.com\/([^/?#]+)/);
  return m ? m[1] : '';
}

export function FacebookPagePlugin({ value, onChange, config, disabled, field }: WidgetProps) {
  const pageUrl = String(config?.pageUrl ?? (value as FacebookPageValue | undefined)?.pageUrl ?? '');
  const tabs = String(config?.tabs ?? 'timeline');
  const width = Number(config?.width ?? 340);
  const height = Number(config?.height ?? 500);
  const smallHeader = Boolean(config?.smallHeader ?? false);
  const ariaLabel = String(field?.label ?? 'Facebook page plugin');

  const pageName = toPageName(pageUrl);
  const embedUrl = pageUrl
    ? `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(pageUrl)}&tabs=${encodeURIComponent(tabs)}&width=${width}&height=${height}&small_header=${smallHeader ? 'true' : 'false'}&adapt_container_width=true`
    : '';

  useEffect(() => {
    if (pageUrl && !disabled) {
      const next: FacebookPageValue = {
        pageUrl, pageName: toPageName(pageUrl), embedUrl, provider: 'facebook',
      };
      onChange(next);
    }
     
  }, [pageUrl, tabs, width, height, smallHeader]);

  if (!pageUrl) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <Facebook className="size-6 mx-auto text-[#1877F2]" />
        <p className="text-xs mt-2 font-semibold">No Facebook page URL configured</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.pageUrl</code> to your Facebook Page URL.</p>
      </div>
    );
  }

  if (!pageName) {
    return (
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 p-3 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2" aria-label={ariaLabel}>
        <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
        <span>Invalid Facebook Page URL — should look like <code>facebook.com/yourpage</code>.</span>
      </div>
    );
  }

  return (
    <div className="space-y-1" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <Facebook className="size-4 text-[#1877F2]" />
        <p className="text-xs font-semibold truncate">@{pageName}</p>
      </div>
      <div className="rounded-xl overflow-hidden border border-border bg-muted/20" style={{ width: '100%', maxWidth: width }}>
        <iframe
          src={embedUrl}
          title={`Facebook Page — ${pageName}`}
          width={width}
          height={height}
          style={{ border: 'none', overflow: 'hidden', width: '100%', height }}
          scrolling="no"
          frameBorder={0}
          allow="encrypted-media"
          allowFullScreen
        />
      </div>
      <p className="text-[10px] text-muted-foreground">Tabs: {tabs} · {width}×{height}px</p>
    </div>
  );
}

export default FacebookPagePlugin;
